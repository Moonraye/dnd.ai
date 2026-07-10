'use client';

import type { ReactNode } from 'react';
import { useAuthListener } from '../model/useAuthListener';

/** Mounts the Supabase auth listener once for the whole app. */
export function AuthProvider({ children }: { children: ReactNode }) {
  useAuthListener();
  return <>{children}</>;
}
