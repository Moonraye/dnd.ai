import { BadGatewayException } from '@nestjs/common';
import type { GoogleGenAI } from '@google/genai';
import { AiService } from './ai.service';

describe('AiService', () => {
  const generateContent = jest.fn();
  const genai = {
    models: { generateContent },
  } as unknown as GoogleGenAI;
  const service = new AiService(genai);

  const validDraft = {
    name: 'Thorin',
    hpCurrent: 12,
    hpMax: 12,
    stats: { str: 15, dex: 12, con: 14, int: 10, wis: 11, cha: 8 },
    inventory: [{ name: 'Axe', qty: 1 }],
  };

  beforeEach(() => jest.resetAllMocks());

  it('returns a validated draft with AI fields forced to null', async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify(validDraft) });

    const result = await service.generateCharacterDraft('a dwarf fighter');

    expect(result.name).toBe('Thorin');
    expect(result.aiProvider).toBeNull();
    expect(result.aiModel).toBeNull();
  });

  it('strips any AI ownership the model tries to set', async () => {
    generateContent.mockResolvedValue({
      text: JSON.stringify({
        ...validDraft,
        aiProvider: 'google',
        aiModel: 'gemini-2.5-flash',
      }),
    });

    const result = await service.generateCharacterDraft('a dwarf fighter');

    expect(result.aiProvider).toBeNull();
    expect(result.aiModel).toBeNull();
  });

  it('throws BadGateway on malformed JSON', async () => {
    generateContent.mockResolvedValue({ text: 'not json' });

    await expect(service.generateCharacterDraft('x')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('throws BadGateway on a schema-violating draft', async () => {
    generateContent.mockResolvedValue({
      text: JSON.stringify({ ...validDraft, hpMax: 0 }),
    });

    await expect(service.generateCharacterDraft('x')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('throws BadGateway when the SDK call fails', async () => {
    generateContent.mockRejectedValue(new Error('network'));

    await expect(service.generateCharacterDraft('x')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});
