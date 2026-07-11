'use client';

import { DICE_SIDES, parseDiceNotation } from '@dnd/shared';
import { useState } from 'react';
import { useRollDice } from '../model/useRollDice';

interface DiceRollerPanelProps {
  sessionId: string;
  disabled?: boolean;
}

export function DiceRollerPanel({
  sessionId,
  disabled = false,
}: DiceRollerPanelProps) {
  const { roll, isRolling, error } = useRollDice(sessionId);
  const [count, setCount] = useState(1);
  const [sides, setSides] = useState(20);
  const [modifier, setModifier] = useState(0);

  const notation =
    `${count}d${sides}` +
    (modifier === 0 ? '' : modifier > 0 ? `+${modifier}` : `${modifier}`);
  const preview = parseDiceNotation(notation);
  const canRoll = !disabled && !isRolling && preview.success;

  const handleRoll = async () => {
    if (preview.success) await roll(preview.data.notation);
  };

  return (
    <div className="flex w-full flex-col gap-2 rounded-md border border-zinc-300 p-3 dark:border-zinc-700">
      <div className="flex flex-wrap gap-1">
        {DICE_SIDES.map((die) => (
          <button
            key={die}
            type="button"
            onClick={() => setSides(die)}
            disabled={disabled}
            className={
              die === sides
                ? 'rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium dark:border-zinc-700'
            }
          >
            d{die}
          </button>
        ))}
      </div>
      <div className="flex items-end gap-3">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium">Count</span>
          <input
            aria-label="Dice count"
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
            disabled={disabled}
            className="w-16 rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium">Modifier</span>
          <input
            aria-label="Modifier"
            type="number"
            value={modifier}
            onChange={(event) => setModifier(Number(event.target.value))}
            disabled={disabled}
            className="w-20 rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <span className="flex-1 text-sm text-zinc-500">
          {preview.success ? preview.data.notation : '—'}
        </span>
        <button
          type="button"
          onClick={handleRoll}
          disabled={!canRoll}
          className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {isRolling ? 'Rolling…' : 'Roll'}
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
