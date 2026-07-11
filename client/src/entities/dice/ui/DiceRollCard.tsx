import { isDiceTermResult, type DiceRollMetadata } from '@dnd/shared';

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
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-1 rounded-md border border-indigo-300 bg-indigo-50 p-3 text-sm dark:border-indigo-800 dark:bg-indigo-950">
      <div className="flex items-baseline justify-between">
        <span className="font-semibold">
          🎲 {senderName} rolled {metadata.notation}
        </span>
        <time dateTime={createdAt} className="text-xs text-zinc-500">
          {new Date(createdAt).toLocaleTimeString()}
        </time>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
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
      <span className="text-base font-bold">Total: {metadata.total}</span>
    </div>
  );
}
