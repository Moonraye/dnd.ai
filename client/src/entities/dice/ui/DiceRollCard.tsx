'use client';

import { isDiceTermResult, type DiceRollMetadata } from '@dnd/shared';
import { format, useTranslation } from '@/shared/i18n';

interface DiceRollCardProps {
  senderName: string;
  createdAt: string;
  metadata: DiceRollMetadata;
}

export function DiceRollCard({
  senderName,
  createdAt,
  metadata,
}: DiceRollCardProps) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-1 rounded-md border border-dice/40 bg-dice-subtle p-3 text-sm">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold text-fg">
          {format(t.dice.rolledNotation, {
            name: senderName,
            notation: metadata.notation,
          })}
        </span>
        <time dateTime={createdAt} className="font-mono text-xs text-fg-subtle">
          {new Date(createdAt).toLocaleTimeString()}
        </time>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-fg-muted">
        {metadata.terms.map((term, index) =>
          isDiceTermResult(term) ? (
            <span key={index}>
              {term.count}d{term.sides} → [{term.rolls.join(', ')}]
            </span>
          ) : (
            <span key={index}>
              {term.constant >= 0 ? `+${term.constant}` : term.constant}
            </span>
          ),
        )}
      </div>
      <span className="text-base font-bold text-dice">
        {format(t.dice.total, { total: metadata.total })}
      </span>
    </div>
  );
}
