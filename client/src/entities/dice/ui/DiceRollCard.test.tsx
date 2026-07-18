import type { DiceRollMetadata } from '@dnd/shared';
import { render, screen } from '@testing-library/react';
import { DiceRollCard } from './DiceRollCard';

const metadata: DiceRollMetadata = {
  kind: 'dice_roll',
  notation: '2d6+3',
  terms: [
    { count: 2, sides: 6, rolls: [4, 5], subtotal: 9 },
    { constant: 3 },
  ],
  modifierTotal: 3,
  total: 12,
  characterName: 'Thorin',
};

describe('DiceRollCard', () => {
  it('renders the notation, per-term rolls, and total', () => {
    render(
      <DiceRollCard
        senderName="Thorin"
        createdAt="2026-07-10T12:00:00.000Z"
        metadata={metadata}
      />,
    );

    expect(screen.getByText(/Thorin rolled 2d6\+3/)).toBeInTheDocument();
    expect(screen.getByText(/2d6 → \[4, 5\]/)).toBeInTheDocument();
    expect(screen.getByText(/Total: 12/)).toBeInTheDocument();
  });
});
