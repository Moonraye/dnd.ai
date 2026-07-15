import { en } from '@/shared/i18n';
import { resolveValidationMessage } from './resolveValidationMessage';

describe('resolveValidationMessage', () => {
  it('resolves a known "validation.*" key to its dictionary copy', () => {
    expect(resolveValidationMessage(en, 'validation.emailInvalid')).toBe(
      en.validation.emailInvalid,
    );
  });

  it('passes non-prefixed messages through unchanged', () => {
    expect(resolveValidationMessage(en, 'Some other message')).toBe(
      'Some other message',
    );
  });

  it('falls back to validation.generic for an unknown "validation.*" key', () => {
    expect(resolveValidationMessage(en, 'validation.bogusKey')).toBe(
      en.validation.generic,
    );
  });
});
