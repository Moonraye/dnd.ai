/**
 * Transient-error retry for Gemini calls. The `@google/genai` SDK surfaces
 * two flavours of retryable failure: an `ApiError` with an HTTP `status`
 * (429/5xx — "model is experiencing high demand", etc.) and undici network
 * errors (`TypeError: fetch failed`, usually with a `cause.code` like
 * ECONNRESET). Everything else — 4xx, schema/parse errors — is non-retryable
 * and rethrown immediately.
 */

const TRANSIENT_STATUS = new Set([429, 500, 502, 503, 504]);
const TRANSIENT_NET_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'EAI_AGAIN',
  'EPIPE',
]);

export function isTransientGeminiError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const err = error as {
    status?: number;
    name?: string;
    message?: string;
    cause?: { code?: string };
  };
  if (typeof err.status === 'number' && TRANSIENT_STATUS.has(err.status)) {
    return true;
  }
  // httpOptions.timeout aborts a stalled request; a retry may well succeed.
  // (No caller passes a user-driven abortSignal, so aborts are always ours.)
  if (err.name === 'AbortError' || err.name === 'TimeoutError') return true;
  const code = err.cause?.code;
  if (typeof code === 'string' && TRANSIENT_NET_CODES.has(code)) return true;
  // undici collapses most connection failures to this bare message.
  return err.message === 'fetch failed';
}

export interface GeminiRetryOptions {
  /** Total attempts including the first (default 3 → 2 retries). */
  attempts?: number;
  /** Delay before the first retry; doubles each subsequent retry. */
  baseDelayMs?: number;
}

/**
 * Run `fn`, retrying only transient Gemini failures with exponential backoff
 * (baseDelay, 2×baseDelay, …) plus small jitter. Rethrows the last error once
 * attempts are exhausted or the error is non-transient.
 */
export async function withGeminiRetry<T>(
  fn: () => Promise<T>,
  { attempts = 3, baseDelayMs = 500 }: GeminiRetryOptions = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isTransientGeminiError(error)) throw error;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      const jitter = Math.floor(Math.random() * 100);
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
    }
  }
  throw lastError;
}
