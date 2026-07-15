import { z } from 'zod';

// Messages are stable dictionary keys (`t.validation.*`), not display text —
// resolved at render time via `resolveValidationMessage` so the same schema
// works for every locale. See useAuthForm/AuthField for the raw-message
// fallback when a key isn't recognized.
export const SignInSchema = z.object({
  email: z.email('validation.emailInvalid'),
  password: z.string().min(8, 'validation.passwordMinLength'),
});

export const SignUpSchema = SignInSchema.extend({
  username: z
    .string()
    .min(3, 'validation.usernameMinLength')
    .max(24, 'validation.usernameMaxLength')
    .regex(/^[a-zA-Z0-9_-]+$/, 'validation.usernamePattern'),
});

export type SignInInput = z.infer<typeof SignInSchema>;
export type SignUpInput = z.infer<typeof SignUpSchema>;
