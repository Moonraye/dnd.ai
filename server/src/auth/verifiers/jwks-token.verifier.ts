import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type {
  AuthenticatedUser,
  TokenVerifier,
} from '../token-verifier.interface';

/**
 * Verifies Supabase access tokens signed with asymmetric signing keys
 * (default for current Supabase projects) via the project's JWKS endpoint.
 */
@Injectable()
export class JwksTokenVerifier implements TokenVerifier {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly issuer: string;

  constructor(supabaseUrl: string) {
    // Trailing slashes in the env var would otherwise yield `//auth/v1`,
    // breaking both the JWKS URL and the `iss` claim match.
    const baseUrl = supabaseUrl.replace(/\/+$/, '');
    this.jwks = createRemoteJWKSet(
      new URL(`${baseUrl}/auth/v1/.well-known/jwks.json`),
    );
    this.issuer = `${baseUrl}/auth/v1`;
  }

  async verify(token: string): Promise<AuthenticatedUser> {
    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: this.issuer,
      audience: 'authenticated',
    });
    return toAuthenticatedUser(payload);
  }
}

export function toAuthenticatedUser(payload: JWTPayload): AuthenticatedUser {
  if (!payload.sub) {
    throw new UnauthorizedException('Token is missing a subject claim');
  }
  return {
    id: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : null,
  };
}
