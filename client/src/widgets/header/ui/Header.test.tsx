import { render, screen } from '@testing-library/react';
import type { Session, User } from '@supabase/supabase-js';
import { useAuthStore } from '@/shared/store/authStore';
import { Header } from './Header';

jest.mock('../../../features/auth', () => ({
  SignOutButton: () => <button type="button">Sign out</button>,
}));

const resetStore = () =>
  useAuthStore.setState({ session: null, user: null, status: 'loading' });

describe('Header', () => {
  beforeEach(resetStore);

  it('shows a loading placeholder before the session is known', () => {
    render(<Header />);
    expect(screen.getByTestId('auth-loading')).toBeInTheDocument();
  });

  it('shows sign in / sign up links when unauthenticated', () => {
    useAuthStore.getState().setSession(null);
    render(<Header />);
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(screen.getByRole('link', { name: /sign up/i })).toHaveAttribute(
      'href',
      '/signup',
    );
  });

  it('shows the username and sign out when authenticated', () => {
    const user = {
      id: 'user-uuid',
      email: 'player@example.com',
      user_metadata: { username: 'dungeon_lord' },
    } as unknown as User;
    useAuthStore.getState().setSession({ user } as Session);
    render(<Header />);

    expect(screen.getByText('dungeon_lord')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sign out/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /sign in/i })).toBeNull();
  });

  it('falls back to the email when no username is set', () => {
    const user = {
      id: 'user-uuid',
      email: 'player@example.com',
      user_metadata: {},
    } as unknown as User;
    useAuthStore.getState().setSession({ user } as Session);
    render(<Header />);

    expect(screen.getByText('player@example.com')).toBeInTheDocument();
  });
});
