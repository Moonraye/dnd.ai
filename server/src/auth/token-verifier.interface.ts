export interface AuthenticatedUser {
  /** Supabase Auth UUID (JWT `sub` claim). */
  id: string;
  email: string | null;
}

export interface TokenVerifier {
  /** Verifies a Supabase access token; throws on invalid/expired tokens. */
  verify(token: string): Promise<AuthenticatedUser>;
}

export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');
