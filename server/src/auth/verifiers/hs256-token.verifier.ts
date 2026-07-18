import { Injectable } from '@nestjs/common';
import { jwtVerify } from 'jose';
import type {
  AuthenticatedUser,
  TokenVerifier,
} from '../token-verifier.interface';
import { toAuthenticatedUser } from './jwks-token.verifier';

/**
 * Verifies Supabase access tokens signed with the legacy shared JWT secret
 * (HS256). Used when SUPABASE_JWT_SECRET is configured.
 */
@Injectable()
export class Hs256TokenVerifier implements TokenVerifier {
  private readonly secret: Uint8Array;
  private readonly issuer: string;

  constructor(jwtSecret: string, supabaseUrl: string) {
    this.secret = new TextEncoder().encode(jwtSecret);
    // Trailing slashes in the env var would otherwise yield `//auth/v1`,
    // which never matches the token's `iss` claim.
    this.issuer = `${supabaseUrl.replace(/\/+$/, '')}/auth/v1`;
  }

  async verify(token: string): Promise<AuthenticatedUser> {
    const { payload } = await jwtVerify(token, this.secret, {
      algorithms: ['HS256'],
      issuer: this.issuer,
      audience: 'authenticated',
    });
    return toAuthenticatedUser(payload);
  }
}
