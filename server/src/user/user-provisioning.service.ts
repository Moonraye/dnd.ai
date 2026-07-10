import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/token-verifier.interface';
import type { User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * ADR 8: guarantees a Postgres User row exists for a verified Supabase
 * identity, creating it on the first authenticated request.
 */
@Injectable()
export class UserProvisioningService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureUser(authUser: AuthenticatedUser): Promise<User> {
    return this.prisma.user.upsert({
      where: { id: authUser.id },
      update: {},
      create: { id: authUser.id, email: authUser.email },
    });
  }
}
