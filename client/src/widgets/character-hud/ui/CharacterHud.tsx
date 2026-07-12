'use client';

import type { InventoryItem } from '@dnd/shared';
import { countSessionRoles, MAX_PLAYERS_PER_SESSION } from '@dnd/shared';
import { useEffect, useState, useMemo } from 'react';
import {
  useMyCharacter,
  useUpdateCharacter,
  ABILITY_KEYS,
  ABILITY_LABELS,
} from '@/features/character-sheet';
import { useSessionStore } from '@/shared/store/sessionStore';
import { HpBar } from './HpBar';
import { PartyStrip } from './PartyStrip';
import { apiFetch } from '@/shared/api/httpClient';

interface CharacterHudProps {
  sessionId: string;
}

export function CharacterHud({ sessionId }: CharacterHudProps) {
  const { myCharacter } = useMyCharacter();
  const { update, isSaving, error } = useUpdateCharacter(sessionId);
  const characters = useSessionStore((state) => state.characters);
  const [inventory, setInventory] = useState<Array<InventoryItem & { client_id: string }>>([]);
  const [isAddingAi, setIsAddingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Per-session role caps: one DM, up to MAX_PLAYERS_PER_SESSION non-DM sheets.
  const { dms, players } = countSessionRoles(characters);
  const dmExists = dms >= 1;
  const partyFull = players >= MAX_PLAYERS_PER_SESSION;

  const addAiDm = async () => {
    setIsAddingAi(true);
    setAiError(null);
    try {
      await apiFetch(`/sessions/${sessionId}/characters`, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Dungeon Master',
          hpMax: 100,
          hpCurrent: 100,
          stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
          inventory: [],
          aiProvider: 'google',
          aiModel: 'gemini-flash-latest',
        }),
      });
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to add AI DM');
    } finally {
      setIsAddingAi(false);
    }
  };

  const addAiPlayer = async () => {
    setIsAddingAi(true);
    setAiError(null);
    const names = ['Gimli', 'Legolas', 'Gandalf', 'Aragorn', 'Boromir'];
    const selectedName = names[Math.floor(Math.random() * names.length)] + ' (AI)';
    try {
      await apiFetch(`/sessions/${sessionId}/characters`, {
        method: 'POST',
        body: JSON.stringify({
          name: selectedName,
          hpMax: 30,
          hpCurrent: 30,
          stats: { str: 12, dex: 12, con: 12, int: 12, wis: 12, cha: 12 },
          inventory: [],
          aiProvider: 'google',
          aiModel: 'gemini-flash-latest',
        }),
      });
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to add AI Companion');
    } finally {
      setIsAddingAi(false);
    }
  };

  // Re-sync the editable inventory buffer whenever the stored sheet changes
  // (owner-only edits, so no risk of clobbering someone else's change).
  const inventoryKey = useMemo(() => {
    return JSON.stringify(myCharacter?.inventory ?? []);
  }, [myCharacter?.inventory]);

  useEffect(() => {
    setInventory(
      (myCharacter?.inventory ?? []).map((item) => ({
        name: item.name,
        qty: item.qty,
        client_id: crypto.randomUUID(),
      }))
    );
  }, [inventoryKey, myCharacter?.inventory]);

  if (!myCharacter) return null;

  const changeHp = (delta: number) => {
    const next = Math.max(
      0,
      Math.min(myCharacter.hpMax, myCharacter.hpCurrent + delta),
    );
    if (next !== myCharacter.hpCurrent) void update({ hpCurrent: next });
  };

  const saveInventory = () =>
    void update({
      inventory: inventory.filter((item) => item.name.trim().length > 0),
    });

  return (
    <aside className="flex flex-col gap-4 rounded-md border border-zinc-300 p-4 dark:border-zinc-700">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{myCharacter.name}</h2>
        <HpBar
          hpCurrent={myCharacter.hpCurrent}
          hpMax={myCharacter.hpMax}
        />
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Take damage"
            onClick={() => changeHp(-1)}
            disabled={isSaving}
            className="rounded-md border border-zinc-400 px-3 py-1 text-sm font-medium disabled:opacity-50 dark:border-zinc-600"
          >
            −
          </button>
          <button
            type="button"
            aria-label="Heal"
            onClick={() => changeHp(1)}
            disabled={isSaving}
            className="rounded-md border border-zinc-400 px-3 py-1 text-sm font-medium disabled:opacity-50 dark:border-zinc-600"
          >
            +
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        {ABILITY_KEYS.map((key) => (
          <div
            key={key}
            className="rounded-md bg-zinc-100 py-1 dark:bg-zinc-800"
          >
            <div className="font-medium">{ABILITY_LABELS[key]}</div>
            <div className="text-sm tabular-nums">{myCharacter.stats[key]}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Inventory</span>
          <button
            type="button"
            onClick={() =>
              setInventory((prev) => [...prev, { client_id: crypto.randomUUID(), name: '', qty: 1 }])
            }
            className="rounded-md border border-zinc-400 px-2 py-0.5 text-xs font-medium dark:border-zinc-600"
          >
            Add
          </button>
        </div>
        {inventory.map((item, index) => (
          <div key={item.client_id} className="flex items-center gap-2">
            <input
              aria-label={`Item ${index + 1} name`}
              type="text"
              value={item.name}
              onChange={(event) =>
                setInventory((prev) =>
                  prev.map((row, i) =>
                    i === index ? { ...row, name: event.target.value } : row,
                  ),
                )
              }
              className="flex-1 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
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
              className="w-16 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button
              type="button"
              aria-label={`Remove item ${index + 1}`}
              onClick={() =>
                setInventory((prev) => prev.filter((_, i) => i !== index))
              }
              className="px-1 text-sm text-red-600"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={saveInventory}
          disabled={isSaving}
          className="self-start rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Save inventory
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
        <span className="text-sm font-medium">AI Companions</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={addAiDm}
            disabled={isAddingAi || dmExists}
            title={dmExists ? 'This session already has a Dungeon Master' : undefined}
            className="flex-1 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1.5 text-xs font-semibold hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200"
          >
            Spawn AI DM
          </button>
          <button
            type="button"
            onClick={addAiPlayer}
            disabled={isAddingAi || partyFull}
            title={
              partyFull
                ? `Party is full (max ${MAX_PLAYERS_PER_SESSION} players)`
                : undefined
            }
            className="flex-1 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1.5 text-xs font-semibold hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200"
          >
            Spawn AI Player
          </button>
        </div>
        <p className="text-xs text-zinc-500">
          {players}/{MAX_PLAYERS_PER_SESSION} players
          {dmExists ? ' · DM present' : ' · no DM yet'}
        </p>
        {aiError ? (
          <p role="alert" className="text-xs text-red-600">
            {aiError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
        <span className="text-sm font-medium">Party</span>
        <PartyStrip ownCharacterId={myCharacter.id} />
      </div>
    </aside>
  );
}
