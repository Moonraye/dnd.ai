'use client';

import type { InventoryItem } from '@dnd/shared';
import { useEffect, useState, useMemo } from 'react';
import {
  useMyCharacter,
  useUpdateCharacter,
  ABILITY_KEYS,
  ABILITY_LABELS,
} from '@/features/character-sheet';
import { Button, HpBar, Input } from '@/shared/ui';

interface CharacterHudProps {
  sessionId: string;
}

/** The player's own sheet: identity, HP, ability scores, inventory. */
export function CharacterHud({ sessionId }: CharacterHudProps) {
  const { myCharacter } = useMyCharacter();
  const { update, isSaving, error } = useUpdateCharacter(sessionId);
  const [inventory, setInventory] = useState<
    Array<InventoryItem & { client_id: string }>
  >([]);

  const inventoryKey = useMemo(
    () => JSON.stringify(myCharacter?.inventory ?? []),
    [myCharacter?.inventory],
  );

  useEffect(() => {
    const items = JSON.parse(inventoryKey) as InventoryItem[];
    setInventory(
      items.map((item) => ({
        name: item.name,
        qty: item.qty,
        client_id: crypto.randomUUID(),
      })),
    );
  }, [inventoryKey]);

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
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-semibold text-fg">
          {myCharacter.name}
        </h2>
        <HpBar hpCurrent={myCharacter.hpCurrent} hpMax={myCharacter.hpMax} />
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            aria-label="Take damage"
            onClick={() => changeHp(-1)}
            disabled={isSaving}
          >
            − Damage
          </Button>
          <Button
            variant="secondary"
            size="sm"
            aria-label="Heal"
            onClick={() => changeHp(1)}
            disabled={isSaving}
          >
            + Heal
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {ABILITY_KEYS.map((key) => (
          <div
            key={key}
            className="rounded-md border border-border bg-bg-subtle py-2"
          >
            <div className="text-[0.65rem] font-medium uppercase tracking-wide text-fg-subtle">
              {ABILITY_LABELS[key]}
            </div>
            <div className="font-mono text-lg tabular-nums text-fg">
              {myCharacter.stats[key]}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-fg">Inventory</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setInventory((prev) => [
                ...prev,
                { client_id: crypto.randomUUID(), name: '', qty: 1 },
              ])
            }
          >
            Add
          </Button>
        </div>
        {inventory.map((item, index) => (
          <div key={item.client_id} className="flex items-center gap-2">
            <Input
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
              className="h-9 flex-1"
            />
            <Input
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
              className="h-9 w-16"
            />
            <button
              type="button"
              aria-label={`Remove item ${index + 1}`}
              onClick={() =>
                setInventory((prev) => prev.filter((_, i) => i !== index))
              }
              className="px-1 text-sm text-danger hover:opacity-80"
            >
              ✕
            </button>
          </div>
        ))}
        <Button
          variant="secondary"
          size="sm"
          onClick={saveInventory}
          disabled={isSaving}
          className="self-start"
        >
          Save inventory
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
