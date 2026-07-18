import { en } from './en';

/**
 * The dictionary shape, derived from `en.ts`. Every locale (see `uk.ts`)
 * must satisfy this type, so a missing or mistyped key fails `tsc`
 * instead of silently falling back to English at runtime.
 */
export type Dictionary = typeof en;
