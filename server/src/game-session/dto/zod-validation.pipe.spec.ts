import { BadRequestException } from '@nestjs/common';
import type { ArgumentMetadata } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { CreateLobbyDto } from './create-lobby.dto';

describe('ZodValidationPipe (global pipe wiring)', () => {
  const pipe = new ZodValidationPipe();
  const bodyMetadata: ArgumentMetadata = {
    type: 'body',
    metatype: CreateLobbyDto,
  };

  it('returns parsed data for a valid body', () => {
    const result: unknown = pipe.transform(
      { title: 'The Sunken Crypt' },
      bodyMetadata,
    );
    expect(result).toEqual({ title: 'The Sunken Crypt' });
  });

  it('strips unknown keys from the body', () => {
    const result: unknown = pipe.transform(
      { title: 'The Sunken Crypt', extra: 'ignored' },
      bodyMetadata,
    );
    expect(result).toEqual({ title: 'The Sunken Crypt' });
  });

  it('throws BadRequestException for an invalid body', () => {
    expect(() => void pipe.transform({ title: 'ab' }, bodyMetadata)).toThrow(
      BadRequestException,
    );
  });

  it('passes values through untouched for non-DTO metatypes', () => {
    const metadata: ArgumentMetadata = { type: 'body', metatype: String };
    const value = { anything: 'goes' };
    expect(pipe.transform(value, metadata)).toBe(value);
  });
});
