import { isTransientGeminiError, withGeminiRetry } from './gemini-retry';

describe('isTransientGeminiError', () => {
  it('flags retryable HTTP statuses', () => {
    expect(isTransientGeminiError({ status: 503 })).toBe(true);
    expect(isTransientGeminiError({ status: 429 })).toBe(true);
  });

  it('flags undici network failures', () => {
    expect(isTransientGeminiError({ message: 'fetch failed' })).toBe(true);
    expect(
      isTransientGeminiError({ message: 'x', cause: { code: 'ECONNRESET' } }),
    ).toBe(true);
  });

  it('does not flag client errors or arbitrary values', () => {
    expect(isTransientGeminiError({ status: 400 })).toBe(false);
    expect(isTransientGeminiError(new Error('bad schema'))).toBe(false);
    expect(isTransientGeminiError(null)).toBe(false);
  });
});

describe('withGeminiRetry', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('returns the first successful result without retrying', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    await expect(withGeminiRetry(fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries a transient failure then succeeds', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce({ status: 503 })
      .mockResolvedValueOnce('recovered');

    const promise = withGeminiRetry(fn, { baseDelayMs: 10 });
    await jest.runAllTimersAsync();

    await expect(promise).resolves.toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('rethrows a non-transient error immediately', async () => {
    const fn = jest.fn().mockRejectedValue({ status: 400 });
    await expect(withGeminiRetry(fn)).rejects.toEqual({ status: 400 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('gives up after exhausting attempts and throws the last error', async () => {
    const fn = jest.fn().mockRejectedValue({ status: 503 });

    // Attach the rejection handler before advancing timers so the eventual
    // failure is never a momentarily-unhandled rejection.
    const promise = withGeminiRetry(fn, { attempts: 3, baseDelayMs: 10 });
    const assertion = expect(promise).rejects.toEqual({ status: 503 });
    await jest.runAllTimersAsync();
    await assertion;

    expect(fn).toHaveBeenCalledTimes(3);
  });
});
