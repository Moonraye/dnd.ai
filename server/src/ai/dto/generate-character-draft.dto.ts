import { createZodDto } from 'nestjs-zod';
import { GenerateCharacterDraftSchema } from '@dnd/shared';

export class GenerateCharacterDraftDto extends createZodDto(
  GenerateCharacterDraftSchema,
) {}
