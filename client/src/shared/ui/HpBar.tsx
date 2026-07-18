interface HpBarProps {
  hpCurrent: number;
  hpMax: number;
}

/** Horizontal hit-point bar. Green→amber→red is reserved for HP/status. */
export function HpBar({ hpCurrent, hpMax }: HpBarProps) {
  const ratio = hpMax > 0 ? Math.max(0, Math.min(1, hpCurrent / hpMax)) : 0;
  const color =
    ratio > 0.5 ? 'bg-success' : ratio > 0.25 ? 'bg-warning' : 'bg-danger';

  return (
    <div className="flex items-center gap-2">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuenow={hpCurrent}
        aria-valuemax={hpMax}
        className="h-2 flex-1 overflow-hidden rounded-full bg-border"
      >
        <div
          className={`h-full ${color}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <span className="font-mono text-xs tabular-nums text-fg-muted">
        {hpCurrent}/{hpMax}
      </span>
    </div>
  );
}
