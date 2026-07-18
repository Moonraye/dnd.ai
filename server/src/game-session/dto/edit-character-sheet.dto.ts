import { createZodDto } from 'nestjs-zod';
import { EditCharacterSheetSchema } from '@dnd/shared';

export class EditCharacterSheetDto extends createZodDto(EditCharacterSheetSchema) {}
