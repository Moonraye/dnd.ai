import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/shared/api/supabaseClient';
import type { SignInInput, SignUpInput } from '../model/schemas';

/**
 * Thin, framework-free wrapper around Supabase Auth calls.
 * Throws Error with a user-facing message on failure.
 */
export async function signIn(input: SignInInput): Promise<Session> {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });
  if (error) throw new Error(error.message);
  return data.session;
}

export async function signUp(input: SignUpInput): Promise<Session | null> {
  const { data, error } = await getSupabaseClient().auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { username: input.username } },
  });
  if (error) throw new Error(error.message);
  // Session is null when email confirmation is required.
  return data.session;
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) throw new Error(error.message);
}

/**
 * Starts the Google OAuth flow. Supabase redirects the browser to Google and
 * back to `/auth/callback`, where the session is picked up. On success this
 * never returns (the browser navigates away).
 */
export async function signInWithGoogle(): Promise<void> {
  const redirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : undefined;
  const { error } = await getSupabaseClient().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) throw new Error(error.message);
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error) throw new Error(error.message);
  return data.session;
}

export function onAuthStateChange(
  callback: (session: Session | null) => void,
): () => void {
  const { data } = getSupabaseClient().auth.onAuthStateChange(
    (_event, session) => callback(session),
  );
  return () => data.subscription.unsubscribe();
}
