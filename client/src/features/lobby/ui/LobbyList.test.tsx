import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SessionSummary } from '@dnd/shared';
import { useLanguageStore } from '@/shared/store/languageStore';
import { useLobbyList } from '../model/useLobbyList';
import { LobbyList } from './LobbyList';

jest.mock('../model/useLobbyList', () => ({
  useLobbyList: jest.fn(),
}));

const useLobbyListMock = useLobbyList as jest.MockedFunction<typeof useLobbyList>;

const LOBBIES: SessionSummary[] = [
  {
    id: 'en-lobby',
    title: 'The Sunless Citadel',
    creatorId: 'user-1',
    status: 'LOBBY',
    createdAt: '2026-07-10T12:00:00.000Z',
    language: 'en',
  },
  {
    id: 'uk-lobby',
    title: 'Тіні Вечірньої Варти',
    creatorId: 'user-2',
    status: 'LOBBY',
    createdAt: '2026-07-10T12:00:00.000Z',
    language: 'uk',
  },
];

describe('LobbyList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLobbyListMock.mockReturnValue({
      lobbies: LOBBIES,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
  });

  afterEach(() => {
    useLanguageStore.setState({ language: 'en' });
  });

  it('defaults the active filter tab to the viewer current UI language', () => {
    useLanguageStore.setState({ language: 'uk' });
    render(<LobbyList />);

    expect(screen.getByRole('tab', { name: 'Українська' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByText('Тіні Вечірньої Варти')).toBeInTheDocument();
    expect(screen.queryByText('The Sunless Citadel')).not.toBeInTheDocument();
  });

  it('filters the list by tab, and lets a manual choice override the language default', async () => {
    const user = userEvent.setup();
    render(<LobbyList />);

    // Defaults to English (the store's default in tests).
    expect(screen.getByText('The Sunless Citadel')).toBeInTheDocument();
    expect(screen.queryByText('Тіні Вечірньої Варти')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Українська' }));
    expect(screen.getByText('Тіні Вечірньої Варти')).toBeInTheDocument();
    expect(screen.queryByText('The Sunless Citadel')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'All' }));
    expect(screen.getByText('The Sunless Citadel')).toBeInTheDocument();
    expect(screen.getByText('Тіні Вечірньої Варти')).toBeInTheDocument();
  });
});
