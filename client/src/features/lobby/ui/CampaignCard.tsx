'use client';

import Link from 'next/link';
import type { SessionStatus, SessionSummary } from '@dnd/shared';
import { format, useTranslation, type Dictionary } from '@/shared/i18n';
import { Badge, type BadgeProps } from '@/shared/ui';

const STATUS_VARIANT: Record<SessionStatus, BadgeProps['variant']> = {
  LOBBY: 'primary',
  ACTIVE: 'success',
  COMPLETED: 'neutral',
};

function timeAgo(iso: string, t: Dictionary): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return t.lobby.time.justNow;
  if (minutes < 60) return format(t.lobby.time.minutesAgo, { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return format(t.lobby.time.hoursAgo, { n: hours });
  return format(t.lobby.time.daysAgo, { n: Math.floor(hours / 24) });
}

export function CampaignCard({ lobby }: { lobby: SessionSummary }) {
  const { t } = useTranslation();
  const variant = STATUS_VARIANT[lobby.status] ?? STATUS_VARIANT.LOBBY;
  const label = t.lobby.status[lobby.status] ?? t.lobby.status.LOBBY;

  return (
    <Link
      href={`/session/${lobby.id}`}
      className="group flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 transition-colors hover:border-border-strong hover:bg-surface-raised"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-lg leading-snug font-semibold text-fg">
          {lobby.title}
        </h3>
        <Badge variant={variant}>{label}</Badge>
      </div>
      <div className="flex items-center justify-between text-sm text-fg-subtle">
        <span className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wide text-fg-subtle">
            {t.lobby.languageBadge[lobby.language]}
          </span>
          <span>
            {t.lobby.createdPrefix} {timeAgo(lobby.createdAt, t)}
          </span>
        </span>
        <span className="font-medium text-fg-muted transition-colors group-hover:text-primary">
          {t.lobby.join}
        </span>
      </div>
    </Link>
  );
}
