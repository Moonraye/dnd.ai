import { UnauthorizedException } from '@nestjs/common';
import { SignJWT } from 'jose';
import { Hs256TokenVerifier } from './hs256-token.verifier';

describe('Hs256TokenVerifier', () => {
  const secret = 'super-secret-supabase-jwt-secret-for-tests';
  const verifier = new Hs256TokenVerifier(secret);

  const signToken = (
    payload: Record<string, unknown>,
    signingSecret = secret,
    expiresIn = '1h',
  ) =>
    new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(new TextEncoder().encode(signingSecret));

  it('returns the authenticated user for a valid token', async () => {
    const token = await signToken({
      sub: 'user-uuid',
      email: 'player@example.com',
    });
    await expect(verifier.verify(token)).resolves.toEqual({
      id: 'user-uuid',
      email: 'player@example.com',
    });
  });

  it('returns null email when the claim is absent', async () => {
    const token = await signToken({ sub: 'user-uuid' });
    await expect(verifier.verify(token)).resolves.toEqual({
      id: 'user-uuid',
      email: null,
    });
  });

  it('rejects tokens signed with a different secret', async () => {
    const token = await signToken({ sub: 'user-uuid' }, 'wrong-secret');
    await expect(verifier.verify(token)).rejects.toThrow();
  });

  it('rejects tokens without a subject claim', async () => {
    const token = await signToken({ email: 'player@example.com' });
    await expect(verifier.verify(token)).rejects.toThrow(UnauthorizedException);
  });
});
