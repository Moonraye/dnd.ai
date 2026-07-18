import { SignInSchema, SignUpSchema } from './schemas';

describe('SignInSchema', () => {
  it('accepts a valid email and password', () => {
    const result = SignInSchema.safeParse({
      email: 'player@example.com',
      password: 'longenough',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = SignInSchema.safeParse({
      email: 'not-an-email',
      password: 'longenough',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a password shorter than 8 characters', () => {
    const result = SignInSchema.safeParse({
      email: 'player@example.com',
      password: 'short',
    });
    expect(result.success).toBe(false);
  });
});

describe('SignUpSchema', () => {
  const valid = {
    email: 'player@example.com',
    password: 'longenough',
    username: 'dungeon_lord',
  };

  it('accepts a valid signup payload', () => {
    expect(SignUpSchema.safeParse(valid).success).toBe(true);
  });

  it.each(['ab', 'a'.repeat(25), 'bad name!'])(
    'rejects invalid username %p',
    (username) => {
      expect(SignUpSchema.safeParse({ ...valid, username }).success).toBe(
        false,
      );
    },
  );
});
