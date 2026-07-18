import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { User } from '../generated/prisma/client';
import { UserProvisioningService } from '../user/user-provisioning.service';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import type {
  AuthenticatedUser,
  TokenVerifier,
} from './token-verifier.interface';

describe('SupabaseAuthGuard', () => {
  const authUser: AuthenticatedUser = {
    id: '9f1b6a3e-8f39-4a2b-9df0-1c2d3e4f5a6b',
    email: 'player@example.com',
  };
  const dbUser = {
    id: authUser.id,
    email: authUser.email,
    username: null,
    createdAt: new Date(),
  } as User;

  let verifyMock: jest.Mock;
  let ensureUserMock: jest.Mock;
  let guard: SupabaseAuthGuard;

  const contextFor = (authorization?: string) => {
    const request: {
      headers: Record<string, string | undefined>;
      user?: User;
    } = { headers: { authorization } };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { context, request };
  };

  beforeEach(() => {
    verifyMock = jest.fn();
    ensureUserMock = jest.fn();
    const verifier: TokenVerifier = { verify: verifyMock };
    const provisioning = {
      ensureUser: ensureUserMock,
    } as unknown as UserProvisioningService;
    guard = new SupabaseAuthGuard(verifier, provisioning);
  });

  it('rejects requests without a bearer token', async () => {
    const { context } = contextFor(undefined);
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it('rejects requests with a non-bearer authorization header', async () => {
    const { context } = contextFor('Basic abc123');
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('maps verifier failures to UnauthorizedException', async () => {
    verifyMock.mockRejectedValue(new Error('expired'));
    const { context } = contextFor('Bearer bad-token');
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Invalid or expired token',
    );
  });

  it('attaches the lazily provisioned user to the request', async () => {
    verifyMock.mockResolvedValue(authUser);
    ensureUserMock.mockResolvedValue(dbUser);
    const { context, request } = contextFor('Bearer good-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verifyMock).toHaveBeenCalledWith('good-token');
    expect(ensureUserMock).toHaveBeenCalledWith(authUser);
    expect(request.user).toBe(dbUser);
  });
});
