'use client';

import type {
  AbilityScores,
  CharacterSheetInput,
  InventoryItem,
} from '@dnd/shared';
import { useState, type FormEvent } from 'react';
import { format, useTranslation } from '@/shared/i18n';
import { Button, Input, Panel, Textarea } from '@/shared/ui';
import { useCharacterDraft } from '../model/useCharacterDraft';
import { useCreateCharacter } from '../model/useCreateCharacter';
import { ABILITY_KEYS, applyStandardArray } from '../model/standardArray';

interface CharacterCreationFormProps {
  sessionId: string;
}

const DEFAULT_STATS: AbilityScores = {
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10,
};

export function CharacterCreationForm({
  sessionId,
}: CharacterCreationFormProps) {
  const { t } = useTranslation();
  const { submit, isSubmitting, error } = useCreateCharacter(sessionId);
  const { generate, isGenerating, error: draftError } = useCharacterDraft();

  const [name, setName] = useState('');
  const [hpMax, setHpMax] = useState('10');
  const [stats, setStats] = useState<AbilityScores>(DEFAULT_STATS);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [concept, setConcept] = useState('');

  const prefill = (draft: CharacterSheetInput) => {
    setName(draft.name);
    setHpMax(String(draft.hpMax));
    setStats(draft.stats);
    setInventory(draft.inventory);
  };

  const handleGenerate = async () => {
    const draft = await generate(concept);
    if (draft) prefill(draft);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const max = Number(hpMax);
    const input: CharacterSheetInput = {
      name,
      hpMax: max,
      hpCurrent: max,
      stats,
      inventory: inventory.filter((item) => item.name.trim().length > 0),
      aiProvider: null,
      aiModel: null,
      persona: null,
    };
    await submit(input);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-6"
      noValidate
    >
      <Panel className="flex flex-col gap-2 bg-bg-subtle">
        <span className="text-sm font-medium text-fg">
          {t.character.generateWithAi}
        </span>
        <Textarea
          value={concept}
          onChange={(event) => setConcept(event.target.value)}
          placeholder={t.character.conceptPlaceholder}
          rows={2}
        />
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating || concept.trim().length === 0}
          >
            {isGenerating ? t.character.generating : t.character.generateDraft}
          </Button>
          <span className="text-xs text-fg-subtle">
            {t.character.draftHint}
          </span>
        </div>
        {draftError ? (
          <p role="alert" className="text-sm text-danger">
            {draftError}
          </p>
        ) : null}
      </Panel>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-fg">{t.character.name}</span>
        <Input
          name="name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t.character.namePlaceholder}
        />
      </label>

      <label className="flex w-32 flex-col gap-1.5 text-sm">
        <span className="font-medium text-fg">{t.character.maxHp}</span>
        <Input
          name="hpMax"
          type="number"
          min={1}
          value={hpMax}
          onChange={(event) => setHpMax(event.target.value)}
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <legend className="text-sm font-medium text-fg">{t.character.abilityScores}</legend>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStats(applyStandardArray())}
          >
            {t.character.standardArray}
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {ABILITY_KEYS.map((key) => (
            <label key={key} className="flex flex-col gap-1 text-xs text-fg-muted">
              <span className="font-medium">{t.character.abilities[key]}</span>
              <Input
                aria-label={t.character.abilities[key]}
                type="number"
                min={1}
                max={30}
                value={stats[key]}
                onChange={(event) =>
                  setStats((prev) => ({
                    ...prev,
                    [key]: Number(event.target.value),
                  }))
                }
              />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <legend className="text-sm font-medium text-fg">{t.character.inventory}</legend>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setInventory((prev) => [...prev, { name: '', qty: 1 }])
            }
          >
            {t.character.addItem}
          </Button>
        </div>
        {inventory.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              aria-label={format(t.character.itemName, { index: index + 1 })}
              type="text"
              value={item.name}
              placeholder={t.character.itemPlaceholder}
              onChange={(event) =>
                setInventory((prev) =>
                  prev.map((row, i) =>
                    i === index ? { ...row, name: event.target.value } : row,
                  ),
                )
              }
              className="flex-1"
            />
            <Input
              aria-label={format(t.character.itemQuantity, { index: index + 1 })}
              type="number"
              min={1}
              value={item.qty}
              onChange={(event) =>
                setInventory((prev) =>
                  prev.map((row, i) =>
                    i === index
                      ? { ...row, qty: Number(event.target.value) }
                      : row,
                  ),
                )
              }
              className="w-20"
            />
            <button
              type="button"
              aria-label={format(t.character.removeItem, { index: index + 1 })}
              onClick={() =>
                setInventory((prev) => prev.filter((_, i) => i !== index))
              }
              className="px-2 py-1 text-sm text-danger hover:opacity-80"
            >
              ✕
            </button>
          </div>
        ))}
      </fieldset>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={isSubmitting} className="self-start">
        {isSubmitting ? t.character.saving : t.character.createCharacter}
      </Button>
    </form>
  );
}
