import { act, renderHook } from '@testing-library/react';
import { getSocket } from '@/shared/api/socketClient';
import { useSessionStore } from '@/shared/store/sessionStore';
import { useUpdateCharacter } from './useUpdateCharacter';

jest.mock('@/shared/api/socketClient', () => ({
  getSocket: jest.fn(),
}));

const SESSION_ID = '3b241101-e2bb-4255-8caf-4136c566a962';

const emitWithAck = jest.fn();
const socket = { timeout: jest.fn().mockReturnValue({ emitWithAck }) };

const sheet = {
  id: 'sheet-uuid',
  userId: 'user-uuid',
  sessionId: SESSION_ID,
  name: 'Thorin',
  hpCurrent: 5,
  hpMax: 12,
  stats: { str: 15, dex: 12, con: 14, int: 10, wis: 11, cha: 8 },
  inventory: [],
  aiProvider: null,
  aiModel: null,
};

describe('useUpdateCharacter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSessionStore.getState().reset();
    socket.timeout.mockReturnValue({ emitWithAck });
    (getSocket as jest.Mock).mockReturnValue(socket);
  });

  it('rejects an empty patch without emitting', async () => {
    const { result } = renderHook(() => useUpdateCharacter(SESSION_ID));

    let ok = true;
    await act(async () => {
      ok = await result.current.update({});
    });

    expect(ok).toBe(false);
    expect(emitWithAck).not.toHaveBeenCalled();
  });

  it('emits character:update and upserts the returned sheet', async () => {
    emitWithAck.mockResolvedValue({ success: true, data: sheet });
    const { result } = renderHook(() => useUpdateCharacter(SESSION_ID));

    let ok = false;
    await act(async () => {
      ok = await result.current.update({ hpCurrent: 5 });
    });

    expect(ok).toBe(true);
    expect(emitWithAck).toHaveBeenCalledWith('character:update', {
      sessionId: SESSION_ID,
      hpCurrent: 5,
    });
    expect(useSessionStore.getState().characters[0].hpCurrent).toBe(5);
  });

  it('surfaces server-side ack errors', async () => {
    emitWithAck.mockResolvedValue({
      success: false,
      error: 'hpCurrent cannot exceed hpMax',
    });
    const { result } = renderHook(() => useUpdateCharacter(SESSION_ID));

    await act(async () => {
      await result.current.update({ hpCurrent: 999 });
    });

    expect(result.current.error).toBe('hpCurrent cannot exceed hpMax');
  });
});
