import { render, screen } from '@testing-library/react';
import type { Session, User } from '@supabase/supabase-js';
import { useAuthStore } from '@/shared/store/authStore';
import { ThemeProvider } from '@/features/theme';
import { Header } from './Header';

jest.mock('../../../features/auth', () => ({
  useSignOut: () => ({ signOut: jest.fn(), isSigningOut: false }),
}));

// Header renders the ThemeToggle, which requires the theme context.
const renderHeader = () => render(<Header />, { wrapper: ThemeProvider });

const resetStore = () =>
  useAuthStore.setState({ session: null, user: null, status: 'loading' });

describe('Header', () => {
  beforeEach(resetStore);

  it('shows a loading placeholder before the session is known', () => {
    renderHeader();
    expect(screen.getByTestId('auth-loading')).toBeInTheDocument();
  });

  it('shows sign in / sign up links when unauthenticated', () => {
    useAuthStore.getState().setSession(null);
    renderHeader();
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(screen.getByRole('link', { name: /sign up/i })).toHaveAttribute(
      'href',
      '/signup',
    );
  });

  it('shows the username in a user menu when authenticated', () => {
    const user = {
      id: 'user-uuid',
      email: 'player@example.com',
      user_metadata: { username: 'dungeon_lord' },
    } as unknown as User;
    useAuthStore.getState().setSession({ user } as Session);
    renderHeader();

    // Sign out now lives inside the (closed) user-menu dropdown; assert the
    // trigger surfaces the username and the sign-in link is gone.
    expect(
      screen.getByRole('button', { name: /dungeon_lord/i }),
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
    renderHeader();

    expect(screen.getByText('player@example.com')).toBeInTheDocument();
  });
});
