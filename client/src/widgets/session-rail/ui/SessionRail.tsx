'use client';

import { useTranslation } from '@/shared/i18n';
import { PartyRoster } from './PartyRoster';
import { SessionControls } from './SessionControls';

/** Left rail of the game table: who is here, and how to fill empty seats. */
export function SessionRail({ sessionId }: { sessionId: string }) {
  const { t } = useTranslation();
  return (
    <aside className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-fg-subtle">
          {t.session.theParty}
        </h3>
        <PartyRoster />
      </section>
      <section className="border-t border-border pt-5">
        <SessionControls sessionId={sessionId} />
      </section>
    </aside>
  );
}
