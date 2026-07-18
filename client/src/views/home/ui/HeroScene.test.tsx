import { render, screen } from '@testing-library/react';
import { useAuthStore } from '@/shared/store/authStore';
import { HeroScene } from './HeroScene';

beforeEach(() => {
  // Bypass the typewriter effect (and jsdom's lack of a real matchMedia) by
  // reporting reduced-motion, which renders the full opening scene synchronously.
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })) as unknown as typeof window.matchMedia;
});

describe('HeroScene', () => {
  it('sends unauthenticated visitors to the login page', () => {
    useAuthStore.setState({ status: 'unauthenticated' });
    render(<HeroScene />);

    expect(
      screen.getByRole('link', { name: /start your adventure/i }),
    ).toHaveAttribute('href', '/login');
  });

  it('sends authenticated visitors straight into lobby creation', () => {
    useAuthStore.setState({ status: 'authenticated' });
    render(<HeroScene />);

    expect(
      screen.getByRole('link', { name: /start your adventure/i }),
    ).toHaveAttribute('href', '/lobby?create=1');
  });

  it('sends visitors to login while auth status is still loading', () => {
    useAuthStore.setState({ status: 'loading' });
    render(<HeroScene />);

    expect(
      screen.getByRole('link', { name: /start your adventure/i }),
    ).toHaveAttribute('href', '/login');
  });
});
