'use client';

import type {
  AbilityScores,
  CharacterSheetInput,
  InventoryItem,
} from '@dnd/shared';
import { useState, type FormEvent } from 'react';
import { useCharacterDraft } from '../model/useCharacterDraft';
import { useCreateCharacter } from '../model/useCreateCharacter';
import {
  ABILITY_KEYS,
  ABILITY_LABELS,
  applyStandardArray,
} from '../model/standardArray';

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

const inputClass =
  'rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900';

export function CharacterCreationForm({
  sessionId,
}: CharacterCreationFormProps) {
  const { submit, isSubmitting, error } = useCreateCharacter(sessionId);
  const {
    generate,
    isGenerating,
    error: draftError,
  } = useCharacterDraft();

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
      // Drop blank rows so they don't trip the shared schema.
      inventory: inventory.filter((item) => item.name.trim().length > 0),
      aiProvider: null,
      aiModel: null,
    };
    await submit(input);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-xl flex-col gap-6"
      noValidate
    >
      <div className="flex flex-col gap-2 rounded-md border border-zinc-300 p-4 dark:border-zinc-700">
        <span className="text-sm font-medium">Generate with AI (optional)</span>
        <textarea
          value={concept}
          onChange={(event) => setConcept(event.target.value)}
          placeholder="A grizzled dwarf cleric who lost their faith…"
          rows={2}
          className={inputClass}
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || concept.trim().length === 0}
            className="rounded-md border border-zinc-400 px-3 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-zinc-600"
          >
            {isGenerating ? 'Generating…' : 'Generate draft'}
          </button>
          <span className="text-xs text-zinc-500">
            A draft — review and edit before saving.
          </span>
        </div>
        {draftError ? (
          <p role="alert" className="text-sm text-red-600">
            {draftError}
          </p>
        ) : null}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Name</span>
        <input
          name="name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Thorin Oakenshield"
          className={inputClass}
        />
      </label>

      <label className="flex w-32 flex-col gap-1 text-sm">
        <span className="font-medium">Max HP</span>
        <input
          name="hpMax"
          type="number"
          min={1}
          value={hpMax}
          onChange={(event) => setHpMax(event.target.value)}
          className={inputClass}
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <legend className="text-sm font-medium">Ability scores</legend>
          <button
            type="button"
            onClick={() => setStats(applyStandardArray())}
            className="rounded-md border border-zinc-400 px-3 py-1 text-xs font-medium dark:border-zinc-600"
          >
            Standard array
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {ABILITY_KEYS.map((key) => (
            <label key={key} className="flex flex-col gap-1 text-xs">
              <span className="font-medium">{ABILITY_LABELS[key]}</span>
              <input
                aria-label={ABILITY_LABELS[key]}
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
                className={inputClass}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <legend className="text-sm font-medium">Inventory</legend>
          <button
            type="button"
            onClick={() =>
              setInventory((prev) => [...prev, { name: '', qty: 1 }])
            }
            className="rounded-md border border-zinc-400 px-3 py-1 text-xs font-medium dark:border-zinc-600"
          >
            Add item
          </button>
        </div>
        {inventory.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              aria-label={`Item ${index + 1} name`}
              type="text"
              value={item.name}
              placeholder="Longsword"
              onChange={(event) =>
                setInventory((prev) =>
                  prev.map((row, i) =>
                    i === index ? { ...row, name: event.target.value } : row,
                  ),
                )
              }
              className={`flex-1 ${inputClass}`}
            />
            <input
              aria-label={`Item ${index + 1} quantity`}
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
              className={`w-20 ${inputClass}`}
            />
            <button
              type="button"
              aria-label={`Remove item ${index + 1}`}
              onClick={() =>
                setInventory((prev) => prev.filter((_, i) => i !== index))
              }
              className="rounded-md px-2 py-1 text-sm text-red-600"
            >
              ✕
            </button>
          </div>
        ))}
      </fieldset>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {isSubmitting ? 'Saving…' : 'Create character'}
      </button>
    </form>
  );
}
