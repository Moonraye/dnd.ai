import { en } from '@/shared/i18n';
import { JOIN_ERROR_KEYS, resolveJoinError } from './resolveJoinError';

describe('resolveJoinError', () => {
  it('resolves the connection-timed-out key to its dictionary copy', () => {
    expect(resolveJoinError(en, JOIN_ERROR_KEYS.connectionTimedOut)).toBe(
      en.errors.connectionTimedOut,
    );
  });

  it('resolves the unable-to-connect key to its dictionary copy', () => {
    expect(resolveJoinError(en, JOIN_ERROR_KEYS.unableToConnect)).toBe(
      en.errors.unableToConnect,
    );
  });

  it('passes any other value through unchanged (e.g. a raw server error)', () => {
    expect(resolveJoinError(en, 'Session is full')).toBe('Session is full');
  });
});
