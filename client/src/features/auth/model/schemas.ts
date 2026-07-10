import { z } from 'zod';

export const SignInSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const SignUpSchema = SignInSchema.extend({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(24, 'Username must be at most 24 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username may only contain letters, numbers, hyphens and underscores',
    ),
});

export type SignInInput = z.infer<typeof SignInSchema>;
export type SignUpInput = z.infer<typeof SignUpSchema>;
