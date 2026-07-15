'use client';

import type { InventoryItem } from '@dnd/shared';
import { useEffect, useState, useMemo } from 'react';
import {
  useMyCharacter,
  useUpdateCharacter,
  ABILITY_KEYS,
} from '@/features/character-sheet';
import { format, useTranslation } from '@/shared/i18n';
import { Button, HpBar, Input } from '@/shared/ui';

interface CharacterHudProps {
  sessionId: string;
}

/** The player's own sheet: identity, HP, ability scores, inventory. */
export function CharacterHud({ sessionId }: CharacterHudProps) {
  const { t } = useTranslation();
  const { myCharacter } = useMyCharacter();
  const { update, isSaving, error } = useUpdateCharacter(sessionId);
  const [inventory, setInventory] = useState<
    Array<InventoryItem & { client_id: string }>
  >([]);
  const [hpAmountInput, setHpAmountInput] = useState('1');

  const inventoryKey = useMemo(
    () => JSON.stringify(myCharacter?.inventory ?? []),
    [myCharacter?.inventory],
  );

  useEffect(() => {
    const items = JSON.parse(inventoryKey) as InventoryItem[];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs local inventory rows from the server payload
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

  const clampHpAmount = (value: number) => {
    const max = Math.max(1, Math.min(999, myCharacter.hpMax));
    return Math.min(max, Math.max(1, Math.round(value) || 1));
  };

  const hpAmount = clampHpAmount(Number(hpAmountInput));

  const stepHpAmount = (delta: number) =>
    setHpAmountInput(String(clampHpAmount(hpAmount + delta)));

  const commitHpAmount = () => setHpAmountInput(String(hpAmount));

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
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            aria-label={t.character.takeDamage}
            onClick={() => changeHp(-hpAmount)}
            disabled={isSaving}
          >
            − {t.character.damage}
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="px-2"
              aria-label={t.character.decreaseHpAmount}
              onClick={() => stepHpAmount(-1)}
              disabled={isSaving}
            >
              −
            </Button>
            <Input
              type="number"
              min={1}
              max={999}
              aria-label={t.character.hpChangeAmount}
              value={hpAmountInput}
              onChange={(event) => setHpAmountInput(event.target.value)}
              onBlur={commitHpAmount}
              className="h-8 w-14 text-center font-mono tabular-nums"
            />
            <Button
              variant="ghost"
              size="sm"
              className="px-2"
              aria-label={t.character.increaseHpAmount}
              onClick={() => stepHpAmount(1)}
              disabled={isSaving}
            >
              +
            </Button>
          </div>
          <Button
            variant="secondary"
            size="sm"
            aria-label={t.character.heal}
            onClick={() => changeHp(hpAmount)}
            disabled={isSaving}
          >
            + {t.character.heal}
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
              {t.character.abilities[key]}
            </div>
            <div className="font-mono text-lg tabular-nums text-fg">
              {myCharacter.stats[key]}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-fg">{t.character.inventory}</span>
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
            {t.character.add}
          </Button>
        </div>
        {inventory.map((item, index) => (
          <div key={item.client_id} className="flex items-center gap-2">
            <Input
              aria-label={format(t.character.itemName, { index: index + 1 })}
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
              className="h-9 w-16"
            />
            <button
              type="button"
              aria-label={format(t.character.removeItem, { index: index + 1 })}
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
          {t.character.saveInventory}
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
