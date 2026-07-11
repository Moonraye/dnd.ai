import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import type { CharacterSheetInput } from '@dnd/shared';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { AiService } from './ai.service';
import { GenerateCharacterDraftDto } from './dto/generate-character-draft.dto';

@Controller('ai')
@UseGuards(SupabaseAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('character-draft')
  generateCharacterDraft(
    @Body() dto: GenerateCharacterDraftDto,
  ): Promise<CharacterSheetInput> {
    return this.aiService.generateCharacterDraft(dto.prompt);
  }
}
