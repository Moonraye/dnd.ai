import { Inject, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  DiceRollSchema,
  JoinSessionSchema,
  SendChatMessageSchema,
  UpdateCharacterSheetSchema,
  WS_EVENTS,
  type AckResponse,
  type CharacterSheetPayload,
  type ChatMessagePayload,
  type JoinSessionResult,
} from '@dnd/shared';
import { decodeJwt } from 'jose';
import type { Server, Socket } from 'socket.io';
import {
  TOKEN_VERIFIER,
  type TokenVerifier,
} from '../auth/token-verifier.interface';
import type { User } from '../generated/prisma/client';
import { CharacterSheetService } from '../user/character-sheet.service';
import { UserProvisioningService } from '../user/user-provisioning.service';
import { DiceService } from './dice.service';
import { GameSessionService } from './game-session.service';
import { AiOrchestrationService } from '../ai/ai-orchestration.service';

export const sessionRoom = (sessionId: string): string =>
  `session:${sessionId}`;

// socket.io types `socket.data` as `any`; funnel access through one cast.
interface SocketData {
  user?: User;
}

const getSocketUser = (socket: Socket): User | undefined =>
  (socket.data as SocketData).user;

@WebSocketGateway({
  cors: { origin: process.env.CLIENT_URL ?? true },
  // ADR 6: brief drops keep rooms + socket.data and replay missed packets.
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    // Recovered sockets skip re-auth; acceptable within the 2-minute window.
    skipMiddlewares: true,
  },
})
export class GameSessionGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(GameSessionGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject(TOKEN_VERIFIER) private readonly tokenVerifier: TokenVerifier,
    private readonly userProvisioning: UserProvisioningService,
    private readonly gameSessionService: GameSessionService,
    private readonly characterSheetService: CharacterSheetService,
    private readonly diceService: DiceService,
    private readonly aiOrchestrationService: AiOrchestrationService,
  ) {}

  // ADR 2: authenticate in the handshake, before any events flow. A socket.io
  // middleware (not a Nest guard) is the only hook that can reject upfront.
  afterInit(server: Server): void {
    server.use((socket, next) => {
      void this.authenticateSocket(socket)
        .then(() => next())
        .catch((error: Error) => next(error));
    });

    if (server && typeof server.on === 'function') {
      server.on('connection', (socket) => {
        const requestTimestamps: number[] = [];
        socket.use((packet, next) => {
          const now = Date.now();
          while (requestTimestamps.length > 0 && requestTimestamps[0] < now - 5000) {
            requestTimestamps.shift();
          }
          if (requestTimestamps.length >= 15) {
            this.logger.warn(`Socket ${socket.id} throttled: 15 requests per 5s limit exceeded`);
            return next(new Error('Rate limit exceeded: too many requests'));
          }
          requestTimestamps.push(now);
          next();
        });
      });
    }
  }

  handleConnection(socket: Socket): void {
    const user = getSocketUser(socket);
    this.logger.log(
      `Socket ${socket.id} connected (user=${user?.id ?? 'unknown'}, recovered=${socket.recovered})`,
    );

    if (socket.recovered) {
      const token = (socket.handshake.auth as Record<string, unknown>)?.token;
      if (typeof token === 'string' && token.length > 0) {
        try {
          const exp = decodeJwt(token).exp;
          if (exp) {
            const msRemaining = exp * 1000 - Date.now();
            if (msRemaining <= 0) {
              this.logger.warn(`Recovered socket ${socket.id} has expired token; disconnecting`);
              socket.disconnect(true);
              return;
            }
            this.scheduleExpiryDisconnect(socket, token);
          }
        } catch (error) {
          this.logger.error(`Failed to verify token expiry on recovered socket: ${error instanceof Error ? error.message : error}`);
          socket.disconnect(true);
          return;
        }
      } else {
        this.logger.warn(`Recovered socket ${socket.id} is missing token; disconnecting`);
        socket.disconnect(true);
        return;
      }
    }
  }

  @SubscribeMessage(WS_EVENTS.JOIN_SESSION)
  async onJoinSession(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<AckResponse<JoinSessionResult>> {
    // ADR 3: the global ZodValidationPipe does not cover gateways, so WS
    // payloads are parsed explicitly and errors returned inside the ack.
    const parsed = JoinSessionSchema.safeParse(body);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const user = getSocketUser(socket);
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    try {
      const isMember = await this.gameSessionService.isMember(
        parsed.data.sessionId,
        user.id,
      );
      if (!isMember) {
        return { success: false, error: 'You are not a member of this session' };
      }

      const session = await this.gameSessionService.getSession(
        parsed.data.sessionId,
      );
      await socket.join(sessionRoom(session.id));
      const messages = await this.gameSessionService.getMessagesSince(
        session.id,
        parsed.data.since,
      );
      const characters = await this.characterSheetService.listSessionSheets(
        session.id,
      );
      return { success: true, data: { session, messages, characters } };
    } catch (error) {
      this.logger.error(
        `Error joining session ${parsed.data.sessionId}: ${error instanceof Error ? error.stack : error}`,
      );
      return { success: false, error: 'Session not found' };
    }
  }

  @SubscribeMessage(WS_EVENTS.SEND_CHAT)
  async onSendChat(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<AckResponse<ChatMessagePayload>> {
    const parsed = SendChatMessageSchema.safeParse(body);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const room = sessionRoom(parsed.data.sessionId);
    if (!socket.rooms.has(room)) {
      return { success: false, error: 'Join the session before chatting' };
    }

    const user = getSocketUser(socket);
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }
    const message = await this.gameSessionService.addChatMessage(
      parsed.data.sessionId,
      user.username ?? user.email ?? 'Player',
      parsed.data.messageText,
    );
    // server.to (not socket.to) so the sender receives the broadcast too and
    // the client renders every message through one path.
    this.server.to(room).emit(WS_EVENTS.CHAT_MESSAGE, message);
    void this.evaluateAiTurns(parsed.data.sessionId);
    return { success: true, data: message };
  }

  @SubscribeMessage(WS_EVENTS.ROLL_DICE)
  async onRollDice(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<AckResponse<ChatMessagePayload>> {
    const parsed = DiceRollSchema.safeParse(body);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const room = sessionRoom(parsed.data.sessionId);
    if (!socket.rooms.has(room)) {
      return { success: false, error: 'Join the session before rolling' };
    }

    const user = getSocketUser(socket);
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }
    // Rolls are attributed to the character (guaranteed by the creation gate).
    const sheet = await this.characterSheetService.getOwnSheet(
      user.id,
      parsed.data.sessionId,
    );
    if (!sheet) {
      return { success: false, error: 'Create a character first' };
    }

    const { messageText, metadata } = this.diceService.roll(
      parsed.data.notation,
      sheet.name,
    );
    const message = await this.gameSessionService.addSystemMessage(
      parsed.data.sessionId,
      sheet.name,
      messageText,
      metadata,
    );
    // The dice result rides the normal chat broadcast so every client renders
    // it through one path (and catch-up replays it unchanged).
    this.server.to(room).emit(WS_EVENTS.CHAT_MESSAGE, message);
    void this.evaluateAiTurns(parsed.data.sessionId);
    return { success: true, data: message };
  }

  @SubscribeMessage(WS_EVENTS.UPDATE_CHARACTER)
  async onUpdateCharacter(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<AckResponse<CharacterSheetPayload>> {
    const parsed = UpdateCharacterSheetSchema.safeParse(body);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const room = sessionRoom(parsed.data.sessionId);
    if (!socket.rooms.has(room)) {
      return { success: false, error: 'Join the session before updating' };
    }

    const user = getSocketUser(socket);
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    try {
      // updateSheet is owner-scoped by construction (userId in the query).
      const sheet = await this.characterSheetService.updateSheet(
        user.id,
        parsed.data,
      );
      this.server.to(room).emit(WS_EVENTS.CHARACTER_UPDATED, sheet);
      return { success: true, data: sheet };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Update failed',
      };
    }
  }

  private async authenticateSocket(socket: Socket): Promise<void> {
    const token = (socket.handshake.auth as Record<string, unknown>)?.token;
    if (typeof token !== 'string' || token.length === 0) {
      throw new Error('Missing auth token');
    }

    let user: User;
    try {
      const authUser = await this.tokenVerifier.verify(token);
      // ADR 8: lazily create the Postgres user row on first connection.
      user = await this.userProvisioning.ensureUser(authUser);
    } catch (error) {
      this.logger.warn(`JWT verification failed for socket ${socket.id}: ${error instanceof Error ? error.stack : error}`);
      throw new Error('Unauthorized');
    }
    (socket.data as SocketData).user = user;
    this.scheduleExpiryDisconnect(socket, token);
  }

  // ADR 2: when the token expires mid-game, drop the socket so the client
  // reconnects with a refreshed JWT.
  private scheduleExpiryDisconnect(socket: Socket, token: string): void {
    let exp: number | undefined;
    try {
      exp = decodeJwt(token).exp;
    } catch (error) {
      this.logger.error(`Failed to decode JWT to schedule expiry disconnect: ${error instanceof Error ? error.message : error}`);
      return;
    }
    if (!exp) return;

    const timer = setTimeout(
      () => socket.disconnect(true),
      Math.max(exp * 1000 - Date.now(), 0),
    );
    socket.on('disconnect', () => clearTimeout(timer));
  }

  private async evaluateAiTurns(sessionId: string): Promise<void> {
    try {
      await this.aiOrchestrationService.evaluateTurns(
        sessionId,
        (message, updatedCharacters) => {
          const room = sessionRoom(sessionId);
          this.server.to(room).emit(WS_EVENTS.CHAT_MESSAGE, message);
          for (const char of updatedCharacters) {
            this.server.to(room).emit(WS_EVENTS.CHARACTER_UPDATED, char);
          }
        },
      );
    } catch (error) {
      this.logger.error(
        `AI Orchestration evaluation failed: ${
          error instanceof Error ? error.stack : error
        }`,
      );
    }
  }
}
