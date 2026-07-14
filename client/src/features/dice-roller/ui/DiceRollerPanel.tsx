'use client';

import {
  DICE_SIDES,
  MAX_CONSTANT,
  MAX_DICE,
  parseDiceNotation,
} from '@dnd/shared';
import { useState } from 'react';
import { Button, Input } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
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
  // String state so a cleared field stays empty while the user retypes;
  // parseable values are clamped to the shared grammar's limits so typed
  // input can't silently produce an invalid notation that disables Roll.
  const [countStr, setCountStr] = useState('1');
  const [sides, setSides] = useState(20);
  const [modifierStr, setModifierStr] = useState('0');

  const clampInput = (raw: string, min: number, max: number): string => {
    if (raw.trim() === '') return '';
    const value = Number(raw);
    if (Number.isNaN(value)) return '';
    return String(Math.min(max, Math.max(min, Math.trunc(value))));
  };

  const count = Number(countStr);
  const modifier = modifierStr === '' ? 0 : Number(modifierStr);
  const notation =
    `${count}d${sides}` +
    (modifier === 0 ? '' : modifier > 0 ? `+${modifier}` : `${modifier}`);
  const preview = parseDiceNotation(notation);
  const canRoll = !disabled && !isRolling && preview.success;

  const handleRoll = async () => {
    if (preview.success) await roll(preview.data.notation);
  };

  return (
    <div className="flex w-full flex-col gap-3 rounded-md border border-border bg-surface p-3">
      <div className="flex flex-wrap gap-1.5">
        {DICE_SIDES.map((die) => (
          <button
            key={die}
            type="button"
            onClick={() => setSides(die)}
            aria-pressed={die === sides}
            disabled={disabled}
            className={cn(
              'rounded-md px-2.5 py-1 font-mono text-xs font-semibold transition-colors disabled:opacity-50',
              die === sides
                ? 'bg-primary text-primary-fg'
                : 'border border-border text-fg-muted hover:border-border-strong hover:text-fg',
            )}
          >
            d{die}
          </button>
        ))}
      </div>
      <div className="flex items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-fg-muted">
          <span className="font-medium">Count</span>
          <Input
            aria-label="Dice count"
            type="number"
            min={1}
            max={MAX_DICE}
            value={countStr}
            onChange={(event) =>
              setCountStr(clampInput(event.target.value, 1, MAX_DICE))
            }
            disabled={disabled}
            className="h-9 w-16"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-fg-muted">
          <span className="font-medium">Modifier</span>
          <Input
            aria-label="Modifier"
            type="number"
            min={-MAX_CONSTANT}
            max={MAX_CONSTANT}
            value={modifierStr}
            onChange={(event) =>
              setModifierStr(
                clampInput(event.target.value, -MAX_CONSTANT, MAX_CONSTANT),
              )
            }
            disabled={disabled}
            className="h-9 w-20"
          />
        </label>
        <span className="flex-1 font-mono text-sm text-fg-subtle">
          {preview.success ? preview.data.notation : '—'}
        </span>
        <Button
          type="button"
          onClick={handleRoll}
          disabled={!canRoll}
          className="bg-dice text-white hover:bg-dice hover:opacity-90"
        >
          {isRolling ? 'Rolling…' : 'Roll'}
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
