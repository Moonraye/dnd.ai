import type { CharacterSheetPayload } from '@dnd/shared';
import { fireEvent, render, screen } from '@testing-library/react';
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
  ownerId: null,
  persona: null,
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

  it('applies the chosen amount and clamps at 0 when taking damage', async () => {
    const user = userEvent.setup();
    render(<CharacterHud sessionId={SESSION_ID} />);

    const amountInput = screen.getByRole('spinbutton', {
      name: /hp change amount/i,
    });
    await user.clear(amountInput);
    await user.type(amountInput, '20');
    await user.click(screen.getByRole('button', { name: /take damage/i }));

    expect(emitWithAck).toHaveBeenCalledWith('character:update', {
      sessionId: SESSION_ID,
      hpCurrent: 0,
    });
  });

  it('increases the amount via the stepper and applies it on heal', async () => {
    const user = userEvent.setup();
    const damaged = { ...character, hpCurrent: 5 };
    useSessionStore.getState().setCharacters([damaged]);
    emitWithAck.mockResolvedValue({ success: true, data: damaged });
    render(<CharacterHud sessionId={SESSION_ID} />);

    await user.click(
      screen.getByRole('button', { name: /increase hp change amount/i }),
    );
    await user.click(
      screen.getByRole('button', { name: /increase hp change amount/i }),
    );
    await user.click(screen.getByRole('button', { name: /heal/i }));

    expect(emitWithAck).toHaveBeenCalledWith('character:update', {
      sessionId: SESSION_ID,
      hpCurrent: 8,
    });
  });

  it('does not decrease the stepper amount below 1', async () => {
    const user = userEvent.setup();
    render(<CharacterHud sessionId={SESSION_ID} />);

    const amountInput = screen.getByRole('spinbutton', {
      name: /hp change amount/i,
    });
    await user.click(
      screen.getByRole('button', { name: /decrease hp change amount/i }),
    );
    await user.click(
      screen.getByRole('button', { name: /decrease hp change amount/i }),
    );

    expect(amountInput).toHaveValue(1);
  });

  it('clamps a typed amount to hpMax on blur when hpMax is below 999', async () => {
    const user = userEvent.setup();
    render(<CharacterHud sessionId={SESSION_ID} />);

    const amountInput = screen.getByRole('spinbutton', {
      name: /hp change amount/i,
    });
    await user.clear(amountInput);
    await user.type(amountInput, '500');
    fireEvent.blur(amountInput);

    expect(amountInput).toHaveValue(character.hpMax);
  });

  it('clamps a typed amount to 999 on blur when hpMax exceeds it', async () => {
    const user = userEvent.setup();
    const tanky = { ...character, hpCurrent: 2000, hpMax: 2000 };
    useSessionStore.getState().setCharacters([tanky]);
    render(<CharacterHud sessionId={SESSION_ID} />);

    const amountInput = screen.getByRole('spinbutton', {
      name: /hp change amount/i,
    });
    await user.clear(amountInput);
    await user.type(amountInput, '5000');
    fireEvent.blur(amountInput);

    expect(amountInput).toHaveValue(999);
  });

  it('falls back to 1 on blur when the amount field is set to a non-numeric value', () => {
    render(<CharacterHud sessionId={SESSION_ID} />);

    const amountInput = screen.getByRole('spinbutton', {
      name: /hp change amount/i,
    });
    fireEvent.change(amountInput, { target: { value: 'abc' } });
    fireEvent.blur(amountInput);

    expect(amountInput).toHaveValue(1);
  });

  it('does not concatenate onto the snapped-back value after clearing and retyping', async () => {
    const user = userEvent.setup();
    const tanky = { ...character, hpCurrent: 100, hpMax: 500 };
    useSessionStore.getState().setCharacters([tanky]);
    emitWithAck.mockResolvedValue({ success: true, data: tanky });
    render(<CharacterHud sessionId={SESSION_ID} />);

    const amountInput = screen.getByRole('spinbutton', {
      name: /hp change amount/i,
    });
    await user.clear(amountInput);
    await user.type(amountInput, '50');
    fireEvent.blur(amountInput);

    expect(amountInput).toHaveValue(50);

    await user.click(screen.getByRole('button', { name: /heal/i }));

    expect(emitWithAck).toHaveBeenCalledWith('character:update', {
      sessionId: SESSION_ID,
      hpCurrent: 150,
    });
  });
});
