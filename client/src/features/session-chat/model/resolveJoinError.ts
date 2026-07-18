import type { Dictionary } from '@/shared/i18n';

/**
 * Stable keys `useSessionSocket` stores in `joinError` instead of translated
 * strings — the socket effect's deps deliberately exclude `t` (a language
 * switch mid-session must not tear down and rejoin the live connection), so
 * storing a translated string would freeze it in whatever language was
 * active when the error occurred.
 */
export const JOIN_ERROR_KEYS = {
  connectionTimedOut: 'errors.connectionTimedOut',
  unableToConnect: 'errors.unableToConnect',
} as const;

/**
 * Resolves a `joinError` to display copy in the active language. Mirrors
 * `resolveValidationMessage`'s shape but stays scoped to the two keys above
 * — anything else (e.g. a raw `response.error` string from the server) is
 * rendered as-is.
 */
export function resolveJoinError(t: Dictionary, joinError: string): string {
  if (joinError === JOIN_ERROR_KEYS.connectionTimedOut) {
    return t.errors.connectionTimedOut;
  }
  if (joinError === JOIN_ERROR_KEYS.unableToConnect) {
    return t.errors.unableToConnect;
  }
  return joinError;
}
