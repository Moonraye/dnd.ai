import { createZodDto } from 'nestjs-zod';
import { CreateLobbySchema } from '@dnd/shared';

export class CreateLobbyDto extends createZodDto(CreateLobbySchema) {}
