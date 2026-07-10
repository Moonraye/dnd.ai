import { createZodDto } from 'nestjs-zod';
import { SendChatMessageSchema } from '@dnd/shared';

export class SendChatMessageDto extends createZodDto(SendChatMessageSchema) {}
