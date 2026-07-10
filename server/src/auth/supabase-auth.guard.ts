import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { UserProvisioningService } from '../user/user-provisioning.service';
import {
  TOKEN_VERIFIER,
  type AuthenticatedUser,
  type TokenVerifier,
} from './token-verifier.interface';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_VERIFIER) private readonly tokenVerifier: TokenVerifier,
    private readonly userProvisioning: UserProvisioningService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    let authUser: AuthenticatedUser;
    try {
      authUser = await this.tokenVerifier.verify(token);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired token');
    }

    // ADR 8: lazily create the Postgres user row on first authenticated request.
    request.user = await this.userProvisioning.ensureUser(authUser);
    return true;
  }

  private extractBearerToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header) return null;
    const [scheme, token] = header.split(' ');
    return scheme === 'Bearer' && token ? token : null;
  }
}
