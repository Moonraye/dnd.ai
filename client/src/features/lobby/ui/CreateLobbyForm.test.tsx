import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createLobby } from '../api/lobbyApi';
import { CreateLobbyForm } from './CreateLobbyForm';

const push = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

jest.mock('../api/lobbyApi', () => ({
  createLobby: jest.fn(),
}));

const createLobbyMock = createLobby as jest.MockedFunction<typeof createLobby>;

describe('CreateLobbyForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows a validation error for a too-short title', async () => {
    const user = userEvent.setup();
    render(<CreateLobbyForm />);

    await user.type(screen.getByLabelText(/campaign title/i), 'ab');
    await user.click(screen.getByRole('button', { name: /create campaign/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(createLobbyMock).not.toHaveBeenCalled();
  });

  it('submits a valid title and navigates to the new session', async () => {
    createLobbyMock.mockResolvedValue({
      id: 'session-uuid',
      title: 'The Sunless Citadel',
      creatorId: 'user-uuid',
      status: 'LOBBY',
      createdAt: '2026-07-10T12:00:00.000Z',
      language: 'en',
    });
    const user = userEvent.setup();
    render(<CreateLobbyForm />);

    await user.type(
      screen.getByLabelText(/campaign title/i),
      'The Sunless Citadel',
    );
    await user.click(screen.getByRole('button', { name: /create campaign/i }));

    expect(createLobbyMock).toHaveBeenCalledWith({
      title: 'The Sunless Citadel',
      language: 'en',
    });
    expect(push).toHaveBeenCalledWith('/session/session-uuid');
  });

  it('defaults the language selector to the current UI language and includes the chosen language in the payload', async () => {
    createLobbyMock.mockResolvedValue({
      id: 'session-uuid',
      title: 'The Sunless Citadel',
      creatorId: 'user-uuid',
      status: 'LOBBY',
      createdAt: '2026-07-10T12:00:00.000Z',
      language: 'uk',
    });
    const user = userEvent.setup();
    render(<CreateLobbyForm />);

    // Defaults to English (the UI language in tests).
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'Українська' }));
    await user.type(
      screen.getByLabelText(/campaign title/i),
      'The Sunless Citadel',
    );
    await user.click(screen.getByRole('button', { name: /create campaign/i }));

    expect(createLobbyMock).toHaveBeenCalledWith({
      title: 'The Sunless Citadel',
      language: 'uk',
    });
  });
});
