import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignInForm } from './SignInForm';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const signInMock = jest.fn();
jest.mock('../api/authApi', () => ({
  signIn: (input: unknown) => signInMock(input) as Promise<unknown>,
}));

describe('SignInForm', () => {
  beforeEach(() => {
    pushMock.mockReset();
    signInMock.mockReset();
  });

  it('shows validation errors without calling the API', async () => {
    const user = userEvent.setup();
    render(<SignInForm />);

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(signInMock).not.toHaveBeenCalled();
  });

  it('signs in and redirects home on success', async () => {
    signInMock.mockResolvedValue({ user: { id: 'user-uuid' } });
    const user = userEvent.setup();
    render(<SignInForm />);

    await user.type(screen.getByLabelText(/email/i), 'player@example.com');
    await user.type(screen.getByLabelText(/password/i), 'longenough');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(signInMock).toHaveBeenCalledWith({
      email: 'player@example.com',
      password: 'longenough',
    });
    expect(pushMock).toHaveBeenCalledWith('/');
  });

  it('shows the API error message on failure', async () => {
    signInMock.mockRejectedValue(new Error('Invalid login credentials'));
    const user = userEvent.setup();
    render(<SignInForm />);

    await user.type(screen.getByLabelText(/email/i), 'player@example.com');
    await user.type(screen.getByLabelText(/password/i), 'longenough');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(
      await screen.findByText(/invalid login credentials/i),
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
