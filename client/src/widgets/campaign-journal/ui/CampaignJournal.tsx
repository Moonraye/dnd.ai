'use client';

import { Badge } from '@/shared/ui';
import { useSessionStore } from '@/shared/store/sessionStore';

const EYEBROW = 'font-mono text-xs uppercase tracking-[0.18em] text-fg-subtle';

/**
 * Read-only view of the AI-maintained campaign memory (quests, NPC
 * relationships, story summary). Hydrates from the join ack and live-updates
 * on STATE_LOG_UPDATED whenever the AI mutates state.
 */
export function CampaignJournal() {
  const stateLog = useSessionStore((state) => state.stateLog);

  const quests = stateLog?.activeQuests ?? [];
  const npcs = Object.entries(stateLog?.npcRelationships ?? {});
  const summary = stateLog?.campaignSummary ?? '';
  const keyFacts = stateLog?.keyFacts ?? [];
  const isEmpty =
    quests.length === 0 &&
    npcs.length === 0 &&
    keyFacts.length === 0 &&
    summary === '';

  if (isEmpty) {
    return (
      <p className="text-sm leading-relaxed text-fg-subtle">
        The tale has yet to be written. Play on — your dungeon master will
        remember it here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {summary ? (
        <section className="flex flex-col gap-1.5">
          <h3 className={EYEBROW}>Story so far</h3>
          <p className="text-sm leading-relaxed text-fg-muted whitespace-pre-wrap">
            {summary}
          </p>
        </section>
      ) : null}

      {quests.length > 0 ? (
        <section className="flex flex-col gap-1.5">
          <h3 className={EYEBROW}>Active quests</h3>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-fg">
            {quests.map((quest, index) => (
              <li key={index}>{quest}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {npcs.length > 0 ? (
        <section className="flex flex-col gap-1.5">
          <h3 className={EYEBROW}>NPCs</h3>
          <ul className="flex flex-col gap-2 text-sm">
            {npcs.map(([name, status]) => (
              <li key={name} className="flex flex-col">
                <span className="font-medium text-fg">{name}</span>
                <span className="text-fg-muted">{status}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {keyFacts.length > 0 ? (
        <section className="flex flex-col gap-1.5">
          <h3 className={EYEBROW}>Established canon</h3>
          <ul className="flex flex-col gap-2 text-sm text-fg">
            {keyFacts.map((fact, index) => (
              <li key={index} className="flex items-start gap-2">
                <Badge variant={fact.source === 'player' ? 'warning' : 'success'}>
                  {fact.source === 'player' ? 'claim' : 'canon'}
                </Badge>
                <span>{fact.text}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
