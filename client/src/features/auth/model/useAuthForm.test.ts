import { act, renderHook } from '@testing-library/react';
import { SignInSchema } from './schemas';
import { useAuthForm } from './useAuthForm';

describe('useAuthForm', () => {
  const validInput = {
    email: 'player@example.com',
    password: 'longenough',
  };

  it('reports field errors and skips the action on invalid input', async () => {
    const action = jest.fn();
    const { result } = renderHook(() => useAuthForm(SignInSchema, action));

    let ok = true;
    await act(async () => {
      ok = await result.current.submit({ email: 'bad', password: '1' });
    });

    expect(ok).toBe(false);
    expect(action).not.toHaveBeenCalled();
    expect(result.current.fieldErrors.email).toBeDefined();
    expect(result.current.fieldErrors.password).toBeDefined();
  });

  it('runs the action with parsed data on valid input', async () => {
    const action = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuthForm(SignInSchema, action));

    let ok = false;
    await act(async () => {
      ok = await result.current.submit(validInput);
    });

    expect(ok).toBe(true);
    expect(action).toHaveBeenCalledWith(validInput);
    expect(result.current.error).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });

  it('exposes the error message when the action rejects', async () => {
    const action = jest.fn().mockRejectedValue(new Error('Invalid login'));
    const { result } = renderHook(() => useAuthForm(SignInSchema, action));

    let ok = true;
    await act(async () => {
      ok = await result.current.submit(validInput);
    });

    expect(ok).toBe(false);
    expect(result.current.error).toBe('Invalid login');
    expect(result.current.isSubmitting).toBe(false);
  });
});
