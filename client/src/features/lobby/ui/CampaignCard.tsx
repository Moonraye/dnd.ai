import Link from 'next/link';
import type { SessionStatus, SessionSummary } from '@dnd/shared';
import { Badge, type BadgeProps } from '@/shared/ui';

const STATUS: Record<
  SessionStatus,
  { label: string; variant: BadgeProps['variant'] }
> = {
  LOBBY: { label: 'Open', variant: 'primary' },
  ACTIVE: { label: 'In session', variant: 'success' },
  COMPLETED: { label: 'Ended', variant: 'neutral' },
};

function timeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function CampaignCard({ lobby }: { lobby: SessionSummary }) {
  const status = STATUS[lobby.status] ?? STATUS.LOBBY;

  return (
    <Link
      href={`/session/${lobby.id}`}
      className="group flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 transition-colors hover:border-border-strong hover:bg-surface-raised"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-lg leading-snug font-semibold text-fg">
          {lobby.title}
        </h3>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>
      <div className="flex items-center justify-between text-sm text-fg-subtle">
        <span>Created {timeAgo(lobby.createdAt)}</span>
        <span className="font-medium text-fg-muted transition-colors group-hover:text-primary">
          Join →
        </span>
      </div>
    </Link>
  );
}
