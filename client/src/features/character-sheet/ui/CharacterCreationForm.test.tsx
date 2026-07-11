import type { CharacterSheetInput } from '@dnd/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSessionStore } from '@/shared/store/sessionStore';
import { createCharacter, generateCharacterDraft } from '../api/characterApi';
import { CharacterCreationForm } from './CharacterCreationForm';

jest.mock('../api/characterApi', () => ({
  createCharacter: jest.fn(),
  generateCharacterDraft: jest.fn(),
}));

const createCharacterMock = createCharacter as jest.MockedFunction<
  typeof createCharacter
>;
const generateDraftMock = generateCharacterDraft as jest.MockedFunction<
  typeof generateCharacterDraft
>;

const SESSION_ID = '3b241101-e2bb-4255-8caf-4136c566a962';

const draft: CharacterSheetInput = {
  name: 'Gimli',
  hpCurrent: 18,
  hpMax: 18,
  stats: { str: 16, dex: 12, con: 15, int: 9, wis: 11, cha: 8 },
  inventory: [{ name: 'Battleaxe', qty: 2 }],
  aiProvider: null,
  aiModel: null,
};

describe('CharacterCreationForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSessionStore.getState().reset();
  });

  it('shows a validation error and does not call the API for a blank name', async () => {
    const user = userEvent.setup();
    render(<CharacterCreationForm sessionId={SESSION_ID} />);

    await user.click(
      screen.getByRole('button', { name: /create character/i }),
    );

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(createCharacterMock).not.toHaveBeenCalled();
  });

  it('fills the ability scores from the standard array button', async () => {
    const user = userEvent.setup();
    render(<CharacterCreationForm sessionId={SESSION_ID} />);

    await user.click(screen.getByRole('button', { name: /standard array/i }));

    expect(screen.getByLabelText('STR')).toHaveValue(15);
    expect(screen.getByLabelText('CHA')).toHaveValue(8);
  });

  it('prefills the form from an AI draft', async () => {
    generateDraftMock.mockResolvedValue(draft);
    const user = userEvent.setup();
    render(<CharacterCreationForm sessionId={SESSION_ID} />);

    await user.type(
      screen.getByPlaceholderText(/grizzled dwarf/i),
      'a dwarf warrior',
    );
    await user.click(screen.getByRole('button', { name: /generate draft/i }));

    expect(await screen.findByDisplayValue('Gimli')).toBeInTheDocument();
    expect(screen.getByLabelText('STR')).toHaveValue(16);
  });
});
