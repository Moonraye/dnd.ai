import type { User } from '../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { UserProvisioningService } from './user-provisioning.service';

describe('UserProvisioningService', () => {
  const upsert = jest.fn();
  const prisma = { user: { upsert } } as unknown as PrismaService;
  const service = new UserProvisioningService(prisma);

  beforeEach(() => upsert.mockReset());

  it('upserts the user keyed by the Supabase auth id', async () => {
    const dbUser = {
      id: 'user-uuid',
      email: 'player@example.com',
      username: null,
      createdAt: new Date(),
    } as User;
    upsert.mockResolvedValue(dbUser);

    const result = await service.ensureUser({
      id: 'user-uuid',
      email: 'player@example.com',
    });

    expect(upsert).toHaveBeenCalledWith({
      where: { id: 'user-uuid' },
      update: {},
      create: { id: 'user-uuid', email: 'player@example.com' },
    });
    expect(result).toBe(dbUser);
  });
});
