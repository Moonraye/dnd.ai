import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getSocket } from '@/shared/api/socketClient';
import { DiceRollerPanel } from './DiceRollerPanel';

jest.mock('@/shared/api/socketClient', () => ({
  getSocket: jest.fn(),
}));

const SESSION_ID = '3b241101-e2bb-4255-8caf-4136c566a962';

const emitWithAck = jest.fn();
const socket = { timeout: jest.fn().mockReturnValue({ emitWithAck }) };

describe('DiceRollerPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    socket.timeout.mockReturnValue({ emitWithAck });
    (getSocket as jest.Mock).mockReturnValue(socket);
    emitWithAck.mockResolvedValue({ success: true, data: {} });
  });

  it('builds notation from the die pick and modifier and rolls it', async () => {
    const user = userEvent.setup();
    render(<DiceRollerPanel sessionId={SESSION_ID} />);

    await user.click(screen.getByRole('button', { name: 'd6' }));
    await user.clear(screen.getByLabelText('Dice count'));
    await user.type(screen.getByLabelText('Dice count'), '2');
    await user.clear(screen.getByLabelText('Modifier'));
    await user.type(screen.getByLabelText('Modifier'), '3');
    await user.click(screen.getByRole('button', { name: /^roll$/i }));

    expect(emitWithAck).toHaveBeenCalledWith('dice:roll', {
      sessionId: SESSION_ID,
      notation: '2d6+3',
    });
  });
});
