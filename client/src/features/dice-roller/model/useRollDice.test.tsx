import { act, renderHook } from '@testing-library/react';
import { getSocket } from '@/shared/api/socketClient';
import { useRollDice } from './useRollDice';

jest.mock('@/shared/api/socketClient', () => ({
  getSocket: jest.fn(),
}));

const SESSION_ID = '3b241101-e2bb-4255-8caf-4136c566a962';

const emitWithAck = jest.fn();
const socket = { timeout: jest.fn().mockReturnValue({ emitWithAck }) };

describe('useRollDice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    socket.timeout.mockReturnValue({ emitWithAck });
    (getSocket as jest.Mock).mockReturnValue(socket);
  });

  it('rejects invalid notation without emitting', async () => {
    const { result } = renderHook(() => useRollDice(SESSION_ID));

    let ok = true;
    await act(async () => {
      ok = await result.current.roll('3d7');
    });

    expect(ok).toBe(false);
    expect(result.current.error).toBeTruthy();
    expect(emitWithAck).not.toHaveBeenCalled();
  });

  it('emits dice:roll with the canonical notation', async () => {
    emitWithAck.mockResolvedValue({ success: true, data: {} });
    const { result } = renderHook(() => useRollDice(SESSION_ID));

    let ok = false;
    await act(async () => {
      ok = await result.current.roll('d20 + 3');
    });

    expect(ok).toBe(true);
    expect(emitWithAck).toHaveBeenCalledWith('dice:roll', {
      sessionId: SESSION_ID,
      notation: '1d20+3',
    });
  });

  it('surfaces server-side ack errors', async () => {
    emitWithAck.mockResolvedValue({
      success: false,
      error: 'Create a character first',
    });
    const { result } = renderHook(() => useRollDice(SESSION_ID));

    await act(async () => {
      await result.current.roll('1d20');
    });

    expect(result.current.error).toBe('Create a character first');
  });
});
