'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getSupabaseClient } from '@/shared/api/supabaseClient';

/**
 * OAuth landing route. The Supabase browser client parses the auth response
 * from the URL on load (detectSessionInUrl); we wait for the resulting session
 * and route into the app, or bounce back to /login on failure.
 */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const client = getSupabaseClient();
    let settled = false;

    const finish = (path: string) => {
      if (settled) return;
      settled = true;
      router.replace(path);
    };

    // Surface a provider-side error passed back in the URL.
    const params = new URLSearchParams(
      window.location.hash.slice(1) || window.location.search,
    );
    const hadError = Boolean(
      params.get('error') || params.get('error_description'),
    );

    void client.auth.getSession().then(({ data }) => {
      if (data.session) finish('/lobby');
      else if (hadError) finish('/login');
    });

    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      if (session) finish('/lobby');
    });

    // Fallback if nothing resolves (e.g. user closed the consent screen).
    const timeout = window.setTimeout(() => finish('/login'), 6000);

    return () => {
      sub.subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, [router]);

  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="font-display text-2xl text-fg">Signing you in…</p>
      <p className="text-sm text-fg-muted">
        One moment while we open the tavern doors.
      </p>
    </main>
  );
}
