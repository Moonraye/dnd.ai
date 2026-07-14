'use client';

import { useSessionStore } from '@/shared/store/sessionStore';

/**
 * Read-only view of the AI-maintained campaign memory (quests, NPC
 * relationships, story summary). Hydrates from the join ack and live-updates
 * on the STATE_LOG_UPDATED broadcast whenever the AI mutates state.
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

  return (
    <aside className="flex flex-col gap-4 rounded-md border border-zinc-300 p-4 dark:border-zinc-700">
      <h2 className="text-lg font-semibold">Campaign Journal</h2>

      {isEmpty ? (
        <p className="text-xs text-zinc-500">
          The tale has yet to be written…
        </p>
      ) : (
        <>
          {summary ? (
            <section className="flex flex-col gap-1">
              <span className="text-sm font-medium">Story so far</span>
              <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
                {summary}
              </p>
            </section>
          ) : null}

          {quests.length > 0 ? (
            <section className="flex flex-col gap-1">
              <span className="text-sm font-medium">Active quests</span>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
                {quests.map((quest, index) => (
                  <li key={index}>{quest}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {npcs.length > 0 ? (
            <section className="flex flex-col gap-1">
              <span className="text-sm font-medium">NPCs</span>
              <ul className="flex flex-col gap-1 text-sm">
                {npcs.map(([name, status]) => (
                  <li key={name} className="flex flex-col">
                    <span className="font-medium">{name}</span>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {status}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {keyFacts.length > 0 ? (
            <section className="flex flex-col gap-1">
              <span className="text-sm font-medium">Established canon</span>
              <ul className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
                {keyFacts.map((fact, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span
                      className={
                        fact.source === 'player'
                          ? 'mt-0.5 shrink-0 rounded bg-amber-100 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'mt-0.5 shrink-0 rounded bg-emerald-100 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                      }
                    >
                      {fact.source === 'player' ? 'claim' : 'canon'}
                    </span>
                    <span>{fact.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </aside>
  );
}
