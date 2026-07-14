import { getSupabaseClient } from './supabaseClient';

const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * ADR 1: out-of-game setup actions talk to the NestJS backend over REST.
 * Attaches the Supabase access token and throws Error with a user-facing
 * message on failure. Every request is aborted after `timeoutMs` so a hung
 * backend can never leave a caller's loading state stuck forever.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const { data } = await getSupabaseClient().auth.getSession();
  const token = data.session?.access_token;

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      signal: AbortSignal.timeout(timeoutMs),
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new Error('Request timed out — please try again');
    }
    throw err;
  }

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }
  return response.json() as Promise<T>;
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (body.message) {
      return Array.isArray(body.message)
        ? body.message.join(', ')
        : body.message;
    }
  } catch {
    // Non-JSON error body; fall through to the generic message.
  }
  return `Request failed (${response.status})`;
}
