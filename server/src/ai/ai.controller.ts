import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { CharacterSheetInput } from '@dnd/shared';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { AiService } from './ai.service';
import { GenerateCharacterDraftDto } from './dto/generate-character-draft.dto';

@Controller('ai')
@UseGuards(SupabaseAuthGuard)
@Throttle({
  default: { limit: 5, ttl: 60000 },
  ai: { limit: 5, ttl: 60000 },
})
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('character-draft')
  generateCharacterDraft(
    @Body() dto: GenerateCharacterDraftDto,
  ): Promise<CharacterSheetInput> {
    return this.aiService.generateCharacterDraft(dto.prompt);
  }
}
