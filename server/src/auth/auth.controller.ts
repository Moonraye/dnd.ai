import { Controller, Get, UseGuards } from '@nestjs/common';
import type { User } from '../generated/prisma/client';
import { CurrentUser } from './current-user.decorator';
import { SupabaseAuthGuard } from './supabase-auth.guard';

@Controller('auth')
export class AuthController {
  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  getMe(@CurrentUser() user: User): User {
    return user;
  }
}
