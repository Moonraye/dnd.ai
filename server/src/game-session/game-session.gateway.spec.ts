import { WS_EVENTS, type SessionSummary } from '@dnd/shared';
import type { Server, Socket } from 'socket.io';
import type { User } from '../generated/prisma/client';
import type { UserProvisioningService } from '../user/user-provisioning.service';
import { GameSessionGateway } from './game-session.gateway';
import type { GameSessionService } from './game-session.service';

describe('GameSessionGateway', () => {
  const verify = jest.fn();
  const ensureUser = jest.fn();
  const getSession = jest.fn();
  const getMessagesSince = jest.fn();
  const addChatMessage = jest.fn();
  const emit = jest.fn();
  const to = jest.fn().mockReturnValue({ emit });

  const user = { id: 'user-uuid', email: 'player@example.com' } as User;
  const summary: SessionSummary = {
    id: '3b241101-e2bb-4255-8caf-4136c566a962',
    title: 'Test Lobby',
    creatorId: 'user-uuid',
    status: 'LOBBY',
    createdAt: '2026-07-10T12:00:00.000Z',
  };
  const room = `session:${summary.id}`;

  let gateway: GameSessionGateway;

  const makeSocket = (overrides: Partial<Socket> = {}): Socket =>
    ({
      id: 'socket-1',
      data: { user },
      rooms: new Set<string>(),
      join: jest.fn(),
      on: jest.fn(),
      disconnect: jest.fn(),
      handshake: { auth: {} },
      ...overrides,
    }) as unknown as Socket;

  beforeEach(() => {
    jest.clearAllMocks();
    to.mockReturnValue({ emit });
    gateway = new GameSessionGateway(
      { verify },
      { ensureUser } as unknown as UserProvisioningService,
      {
        getSession,
        getMessagesSince,
        addChatMessage,
      } as unknown as GameSessionService,
    );
    gateway.server = { to } as unknown as Server;
  });

  describe('handshake middleware', () => {
    const runMiddleware = async (socket: Socket): Promise<Error | undefined> =>
      new Promise((resolve) => {
        const use = jest.fn(
          (middleware: (s: Socket, next: (e?: Error) => void) => void) =>
            middleware(socket, resolve),
        );
        gateway.afterInit({ use } as unknown as Server);
      });

    it('rejects a connection without a token', async () => {
      const error = await runMiddleware(makeSocket());

      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe('Missing auth token');
      expect(verify).not.toHaveBeenCalled();
    });

    it('rejects a connection when verification fails', async () => {
      verify.mockRejectedValue(new Error('bad token'));
      const socket = makeSocket({
        handshake: { auth: { token: 'invalid' } },
      } as Partial<Socket>);

      const error = await runMiddleware(socket);

      expect(error?.message).toBe('Unauthorized');
    });

    it('provisions the user and attaches it to socket.data', async () => {
      verify.mockResolvedValue({ id: user.id, email: user.email });
      ensureUser.mockResolvedValue(user);
      const socket = makeSocket({
        data: {},
        handshake: { auth: { token: 'valid-but-not-a-jwt' } },
      } as Partial<Socket>);

      const error = await runMiddleware(socket);

      expect(error).toBeUndefined();
      expect(ensureUser).toHaveBeenCalledWith({
        id: user.id,
        email: user.email,
      });
      expect((socket.data as { user?: User }).user).toBe(user);
    });
  });

  describe('session:join', () => {
    it('returns an error ack for an invalid payload', async () => {
      const result = await gateway.onJoinSession(makeSocket(), {
        sessionId: 'not-a-uuid',
      });

      expect(result.success).toBe(false);
      expect(getSession).not.toHaveBeenCalled();
    });

    it('joins the room and returns the session with missed messages', async () => {
      getSession.mockResolvedValue(summary);
      getMessagesSince.mockResolvedValue([]);
      const join = jest.fn();
      const socket = makeSocket({ join } as Partial<Socket>);

      const result = await gateway.onJoinSession(socket, {
        sessionId: summary.id,
        since: '2026-07-10T12:00:00.000Z',
      });

      expect(join).toHaveBeenCalledWith(room);
      expect(getMessagesSince).toHaveBeenCalledWith(
        summary.id,
        '2026-07-10T12:00:00.000Z',
      );
      expect(result).toEqual({
        success: true,
        data: { session: summary, messages: [] },
      });
    });

    it('returns an error ack when the session does not exist', async () => {
      getSession.mockRejectedValue(new Error('not found'));

      const result = await gateway.onJoinSession(makeSocket(), {
        sessionId: summary.id,
      });

      expect(result).toEqual({ success: false, error: 'Session not found' });
    });
  });

  describe('chat:send', () => {
    const payload = { sessionId: summary.id, messageText: 'Hello party!' };

    it('rejects sending before joining the session room', async () => {
      const result = await gateway.onSendChat(makeSocket(), payload);

      expect(result).toEqual({
        success: false,
        error: 'Join the session before chatting',
      });
      expect(addChatMessage).not.toHaveBeenCalled();
    });

    it('persists the message and broadcasts it to the room', async () => {
      const message = {
        id: 'message-uuid',
        sessionId: summary.id,
        senderType: 'HUMAN',
        senderName: user.email,
        messageText: payload.messageText,
        createdAt: '2026-07-10T12:05:00.000Z',
      };
      addChatMessage.mockResolvedValue(message);
      const socket = makeSocket({ rooms: new Set([room]) } as Partial<Socket>);

      const result = await gateway.onSendChat(socket, payload);

      expect(addChatMessage).toHaveBeenCalledWith(
        summary.id,
        user.email,
        payload.messageText,
      );
      expect(to).toHaveBeenCalledWith(room);
      expect(emit).toHaveBeenCalledWith(WS_EVENTS.CHAT_MESSAGE, message);
      expect(result).toEqual({ success: true, data: message });
    });
  });
});
