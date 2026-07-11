interface HpBarProps {
  hpCurrent: number;
  hpMax: number;
}

export function HpBar({ hpCurrent, hpMax }: HpBarProps) {
  const ratio = hpMax > 0 ? Math.max(0, Math.min(1, hpCurrent / hpMax)) : 0;
  const color =
    ratio > 0.5
      ? 'bg-green-500'
      : ratio > 0.25
        ? 'bg-amber-500'
        : 'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <div
        role="progressbar"
        aria-valuenow={hpCurrent}
        aria-valuemax={hpMax}
        className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
      >
        <div
          className={`h-full ${color}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
        {hpCurrent}/{hpMax}
      </span>
    </div>
  );
}
