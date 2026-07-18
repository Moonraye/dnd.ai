import { en } from './en';
import type { Dictionary } from './dictionary';
import type { Language } from './language';
import { uk } from './uk';

export const dictionaries: Record<Language, Dictionary> = { en, uk };
