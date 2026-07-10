import { createZodDto } from 'nestjs-zod';
import { CharacterSheetSchema } from '@dnd/shared';

export class CharacterSheetDto extends createZodDto(CharacterSheetSchema) {}
