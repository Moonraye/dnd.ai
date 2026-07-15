import {
  CreateLobbySchema,
  CharacterSheetSchema,
  SendChatMessageSchema,
} from '@dnd/shared';

const validSheet = {
  name: 'Tordek',
  hpCurrent: 10,
  hpMax: 12,
  stats: { str: 16, dex: 12, con: 14, int: 8, wis: 10, cha: 10 },
};

describe('CreateLobbySchema', () => {
  it('accepts a valid title', () => {
    const result = CreateLobbySchema.safeParse({ title: 'The Sunken Crypt' });
    expect(result.success).toBe(true);
  });

  it('rejects a title shorter than 3 characters', () => {
    const result = CreateLobbySchema.safeParse({ title: 'ab' });
    expect(result.success).toBe(false);
  });

  it('defaults language to "en" when not provided', () => {
    const result = CreateLobbySchema.safeParse({ title: 'The Sunken Crypt' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.language).toBe('en');
    }
  });

  it('accepts an explicit supported language', () => {
    const result = CreateLobbySchema.safeParse({
      title: 'The Sunken Crypt',
      language: 'uk',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.language).toBe('uk');
    }
  });

  it('rejects an unsupported language code', () => {
    const result = CreateLobbySchema.safeParse({
      title: 'The Sunken Crypt',
      language: 'fr',
    });
    expect(result.success).toBe(false);
  });
});

describe('CharacterSheetSchema', () => {
  it('accepts a valid sheet and applies defaults', () => {
    const result = CharacterSheetSchema.safeParse(validSheet);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inventory).toEqual([]);
      expect(result.data.aiProvider).toBeNull();
      expect(result.data.aiModel).toBeNull();
    }
  });

  it('rejects hpCurrent greater than hpMax', () => {
    const result = CharacterSheetSchema.safeParse({
      ...validSheet,
      hpCurrent: 20,
      hpMax: 12,
    });
    expect(result.success).toBe(false);
  });

  it('rejects aiProvider without aiModel', () => {
    const result = CharacterSheetSchema.safeParse({
      ...validSheet,
      aiProvider: 'google',
    });
    expect(result.success).toBe(false);
  });

  it('accepts an AI-controlled sheet with provider and model', () => {
    const result = CharacterSheetSchema.safeParse({
      ...validSheet,
      aiProvider: 'google',
      aiModel: 'gemini-2.5-flash',
    });
    expect(result.success).toBe(true);
  });

  it('rejects ability scores outside 1-30', () => {
    const result = CharacterSheetSchema.safeParse({
      ...validSheet,
      stats: { ...validSheet.stats, str: 31 },
    });
    expect(result.success).toBe(false);
  });
});

describe('SendChatMessageSchema', () => {
  it('accepts a valid message', () => {
    const result = SendChatMessageSchema.safeParse({
      sessionId: 'a3bb189e-8bf9-3888-9912-ace4e6543002',
      messageText: 'I roll for initiative!',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-uuid sessionId', () => {
    const result = SendChatMessageSchema.safeParse({
      sessionId: 'not-a-uuid',
      messageText: 'hello',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty message', () => {
    const result = SendChatMessageSchema.safeParse({
      sessionId: 'a3bb189e-8bf9-3888-9912-ace4e6543002',
      messageText: '',
    });
    expect(result.success).toBe(false);
  });

  // Language is no longer a per-message field: it is chosen once at lobby
  // creation (see CreateLobbySchema) and applies to the whole campaign.
  it('does not accept a language field', () => {
    const result = SendChatMessageSchema.safeParse({
      sessionId: 'a3bb189e-8bf9-3888-9912-ace4e6543002',
      messageText: 'hello',
      language: 'uk',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('language');
    }
  });
});
