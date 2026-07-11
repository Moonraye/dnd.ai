import type { CharacterSheetPayload } from '@dnd/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getSocket } from '@/shared/api/socketClient';
import { useAuthStore } from '@/shared/store/authStore';
import { useSessionStore } from '@/shared/store/sessionStore';
import { CharacterHud } from './CharacterHud';

jest.mock('@/shared/api/socketClient', () => ({
  getSocket: jest.fn(),
}));

const SESSION_ID = '3b241101-e2bb-4255-8caf-4136c566a962';

const emitWithAck = jest.fn();
const socket = { timeout: jest.fn().mockReturnValue({ emitWithAck }) };

const character: CharacterSheetPayload = {
  id: 'sheet-me',
  userId: 'user-me',
  sessionId: SESSION_ID,
  name: 'Thorin',
  hpCurrent: 12,
  hpMax: 12,
  stats: { str: 15, dex: 12, con: 14, int: 10, wis: 11, cha: 8 },
  inventory: [],
  aiProvider: null,
  aiModel: null,
};

describe('CharacterHud', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSessionStore.getState().reset();
    useAuthStore.setState({ user: { id: 'user-me' } as never });
    socket.timeout.mockReturnValue({ emitWithAck });
    (getSocket as jest.Mock).mockReturnValue(socket);
    emitWithAck.mockResolvedValue({ success: true, data: character });
    useSessionStore.getState().setCharacters([character]);
  });

  it('emits a clamped hpCurrent when taking damage', async () => {
    const user = userEvent.setup();
    render(<CharacterHud sessionId={SESSION_ID} />);

    await user.click(screen.getByRole('button', { name: /take damage/i }));

    expect(emitWithAck).toHaveBeenCalledWith('character:update', {
      sessionId: SESSION_ID,
      hpCurrent: 11,
    });
  });

  it('does not heal past hpMax', async () => {
    const user = userEvent.setup();
    render(<CharacterHud sessionId={SESSION_ID} />);

    await user.click(screen.getByRole('button', { name: /heal/i }));

    expect(emitWithAck).not.toHaveBeenCalled();
  });
});
