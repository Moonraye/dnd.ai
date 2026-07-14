import type { CharacterSheetInput } from '@dnd/shared';
import { act, renderHook } from '@testing-library/react';
import { useSessionStore } from '@/shared/store/sessionStore';
import { createCharacter } from '../api/characterApi';
import { useCreateCharacter } from './useCreateCharacter';

jest.mock('../api/characterApi', () => ({
  createCharacter: jest.fn(),
}));

const createCharacterMock = createCharacter as jest.MockedFunction<
  typeof createCharacter
>;

const SESSION_ID = '3b241101-e2bb-4255-8caf-4136c566a962';

const validInput: CharacterSheetInput = {
  name: 'Thorin',
  hpCurrent: 12,
  hpMax: 12,
  stats: { str: 15, dex: 12, con: 14, int: 10, wis: 11, cha: 8 },
  inventory: [],
  aiProvider: null,
  aiModel: null,
  persona: null,
};

describe('useCreateCharacter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSessionStore.getState().reset();
  });

  it('rejects invalid input without calling the API', async () => {
    const { result } = renderHook(() => useCreateCharacter(SESSION_ID));

    let ok = true;
    await act(async () => {
      ok = await result.current.submit({ ...validInput, hpMax: 0 });
    });

    expect(ok).toBe(false);
    expect(result.current.error).toBeTruthy();
    expect(createCharacterMock).not.toHaveBeenCalled();
  });

  it('creates the sheet and seeds it into the store', async () => {
    const created = {
      ...validInput,
      id: 'sheet-uuid',
      userId: 'user-uuid',
      ownerId: null,
      sessionId: SESSION_ID,
    };
    createCharacterMock.mockResolvedValue(created);
    const { result } = renderHook(() => useCreateCharacter(SESSION_ID));

    let ok = false;
    await act(async () => {
      ok = await result.current.submit(validInput);
    });

    expect(ok).toBe(true);
    expect(createCharacterMock).toHaveBeenCalledWith(SESSION_ID, validInput);
    expect(useSessionStore.getState().characters).toHaveLength(1);
  });

  it('surfaces a 409 conflict message', async () => {
    createCharacterMock.mockRejectedValue(
      new Error('You already have a character in this session'),
    );
    const { result } = renderHook(() => useCreateCharacter(SESSION_ID));

    await act(async () => {
      await result.current.submit(validInput);
    });

    expect(result.current.error).toBe(
      'You already have a character in this session',
    );
  });
});
