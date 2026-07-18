import { act, renderHook } from '@testing-library/react';
import { en } from '@/shared/i18n';
import { createLobby } from '../api/lobbyApi';
import { useCreateLobby } from './useCreateLobby';

const push = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

jest.mock('../api/lobbyApi', () => ({
  createLobby: jest.fn(),
}));

const createLobbyMock = createLobby as jest.MockedFunction<typeof createLobby>;

describe('useCreateLobby', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects titles that fail the shared schema without calling the API', async () => {
    const { result } = renderHook(() => useCreateLobby());

    let ok = true;
    await act(async () => {
      ok = await result.current.submit('ab', 'en');
    });

    expect(ok).toBe(false);
    expect(result.current.error).toBe(en.validation.lobbyTitleLength);
    expect(createLobbyMock).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('creates the lobby and navigates to its session page', async () => {
    createLobbyMock.mockResolvedValue({
      id: 'session-uuid',
      title: 'The Sunless Citadel',
      creatorId: 'user-uuid',
      status: 'LOBBY',
      createdAt: '2026-07-10T12:00:00.000Z',
      language: 'en',
    });
    const { result } = renderHook(() => useCreateLobby());

    let ok = false;
    await act(async () => {
      ok = await result.current.submit('The Sunless Citadel', 'en');
    });

    expect(ok).toBe(true);
    expect(createLobbyMock).toHaveBeenCalledWith({
      title: 'The Sunless Citadel',
      language: 'en',
    });
    expect(push).toHaveBeenCalledWith('/session/session-uuid');
  });

  it('passes the selected language through to the API', async () => {
    createLobbyMock.mockResolvedValue({
      id: 'session-uuid',
      title: 'The Sunless Citadel',
      creatorId: 'user-uuid',
      status: 'LOBBY',
      createdAt: '2026-07-10T12:00:00.000Z',
      language: 'uk',
    });
    const { result } = renderHook(() => useCreateLobby());

    await act(async () => {
      await result.current.submit('The Sunless Citadel', 'uk');
    });

    expect(createLobbyMock).toHaveBeenCalledWith({
      title: 'The Sunless Citadel',
      language: 'uk',
    });
  });

  it('surfaces API failures as a user-facing error', async () => {
    createLobbyMock.mockRejectedValue(new Error('Request failed (500)'));
    const { result } = renderHook(() => useCreateLobby());

    await act(async () => {
      await result.current.submit('The Sunless Citadel', 'en');
    });

    expect(result.current.error).toBe('Request failed (500)');
    expect(push).not.toHaveBeenCalled();
  });
});
