import { act, renderHook } from '@testing-library/react';
import { getSocket } from '@/shared/api/socketClient';
import { useSendChat } from './useSendChat';

jest.mock('@/shared/api/socketClient', () => ({
  getSocket: jest.fn(),
}));

const SESSION_ID = '3b241101-e2bb-4255-8caf-4136c566a962';

const emitWithAck = jest.fn();
const socket = { timeout: jest.fn().mockReturnValue({ emitWithAck }) };

describe('useSendChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    socket.timeout.mockReturnValue({ emitWithAck });
    (getSocket as jest.Mock).mockReturnValue(socket);
  });

  it('rejects payloads that fail the shared schema without emitting', async () => {
    const { result } = renderHook(() => useSendChat(SESSION_ID));

    let ok = true;
    await act(async () => {
      ok = await result.current.send('');
    });

    expect(ok).toBe(false);
    expect(result.current.error).toBeTruthy();
    expect(emitWithAck).not.toHaveBeenCalled();
  });

  it('emits chat:send with an ack and reports success', async () => {
    emitWithAck.mockResolvedValue({ success: true, data: {} });
    const { result } = renderHook(() => useSendChat(SESSION_ID));

    let ok = false;
    await act(async () => {
      ok = await result.current.send('Roll for initiative!');
    });

    expect(ok).toBe(true);
    expect(emitWithAck).toHaveBeenCalledWith('chat:send', {
      sessionId: SESSION_ID,
      messageText: 'Roll for initiative!',
    });
    expect(result.current.error).toBeNull();
  });

  it('emits chat:send with command and targetId properties', async () => {
    emitWithAck.mockResolvedValue({ success: true, data: {} });
    const { result } = renderHook(() => useSendChat(SESSION_ID));

    let ok = false;
    await act(async () => {
      ok = await result.current.send('Hello Legolas!', 'WHISPER', '3b241101-e2bb-4255-8caf-4136c566a962');
    });

    expect(ok).toBe(true);
    expect(emitWithAck).toHaveBeenCalledWith('chat:send', {
      sessionId: SESSION_ID,
      messageText: 'Hello Legolas!',
      command: 'WHISPER',
      targetId: '3b241101-e2bb-4255-8caf-4136c566a962',
    });
    expect(result.current.error).toBeNull();
  });

  it('surfaces server-side ack errors', async () => {
    emitWithAck.mockResolvedValue({
      success: false,
      error: 'Join the session before chatting',
    });
    const { result } = renderHook(() => useSendChat(SESSION_ID));

    let ok = true;
    await act(async () => {
      ok = await result.current.send('Hello?');
    });

    expect(ok).toBe(false);
    expect(result.current.error).toBe('Join the session before chatting');
  });

  it('reports a timeout when the ack never arrives', async () => {
    emitWithAck.mockRejectedValue(new Error('operation has timed out'));
    const { result } = renderHook(() => useSendChat(SESSION_ID));

    await act(async () => {
      await result.current.send('Anyone there?');
    });

    expect(result.current.error).toBe('Message could not be sent');
  });
});
