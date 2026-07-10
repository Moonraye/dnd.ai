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
  JoinSessionSchema,
  SendChatMessageSchema,
  WS_EVENTS,
  type AckResponse,
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
import { UserProvisioningService } from '../user/user-provisioning.service';
import { GameSessionService } from './game-session.service';

const sessionRoom = (sessionId: string): string => `session:${sessionId}`;

// socket.io types `socket.data` as `any`; funnel access through one cast.
interface SocketData {
  user?: User;
}

const getSocketUser = (socket: Socket): User | undefined =>
  (socket.data as SocketData).user;

@WebSocketGateway({
  cors: { origin: process.env.CLIENT_URL ?? 'http://localhost:3000' },
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
  ) {}

  // ADR 2: authenticate in the handshake, before any events flow. A socket.io
  // middleware (not a Nest guard) is the only hook that can reject upfront.
  afterInit(server: Server): void {
    server.use((socket, next) => {
      void this.authenticateSocket(socket)
        .then(() => next())
        .catch((error: Error) => next(error));
    });
  }

  handleConnection(socket: Socket): void {
    const user = getSocketUser(socket);
    this.logger.log(
      `Socket ${socket.id} connected (user=${user?.id ?? 'unknown'}, recovered=${socket.recovered})`,
    );
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

    try {
      const session = await this.gameSessionService.getSession(
        parsed.data.sessionId,
      );
      await socket.join(sessionRoom(session.id));
      const messages = await this.gameSessionService.getMessagesSince(
        session.id,
        parsed.data.since,
      );
      return { success: true, data: { session, messages } };
    } catch {
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
    return { success: true, data: message };
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
    } catch {
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
    } catch {
      return;
    }
    if (!exp) return;

    const timer = setTimeout(
      () => socket.disconnect(true),
      Math.max(exp * 1000 - Date.now(), 0),
    );
    socket.on('disconnect', () => clearTimeout(timer));
  }
}
