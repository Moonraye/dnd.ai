'use client';

import { countSessionRoles, MAX_PLAYERS_PER_SESSION } from '@dnd/shared';
import { useState } from 'react';
import { apiFetch } from '@/shared/api/httpClient';
import { useSessionStore } from '@/shared/store/sessionStore';
import { Button } from '@/shared/ui';
import { CreateCompanionDialog } from '@/features/companion-management';

const AI_PLAYER_NAMES = ['Gimli', 'Legolas', 'Gandalf', 'Aragorn', 'Boromir'];

const AI_PLAYER_BODY = {
  hpMax: 30,
  hpCurrent: 30,
  stats: { str: 12, dex: 12, con: 12, int: 12, wis: 12, cha: 12 },
  inventory: [],
  aiProvider: 'google',
  aiModel: 'gemini-flash-latest',
};

const AI_DM_BODY = {
  name: 'Dungeon Master',
  hpMax: 100,
  hpCurrent: 100,
  stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  inventory: [],
  aiProvider: 'google',
  aiModel: 'gemini-flash-latest',
};

export function SessionControls({ sessionId }: { sessionId: string }) {
  const characters = useSessionStore((state) => state.characters);
  const [isAdding, setIsAdding] = useState(false);
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(1);

  const { dms, players } = countSessionRoles(characters);
  const dmExists = dms >= 1;
  const remaining = Math.max(0, MAX_PLAYERS_PER_SESSION - players);
  const partyFull = remaining === 0;
  // Keep the chosen count within what's still addable.
  const toAdd = Math.min(count, Math.max(1, remaining));

  const postCharacter = (body: Record<string, unknown>) =>
    apiFetch(`/sessions/${sessionId}/characters`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

  const addAiDm = async () => {
    setIsAdding(true);
    setError(null);
    try {
      await postCharacter(AI_DM_BODY);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to summon the dungeon master',
      );
    } finally {
      setIsAdding(false);
    }
  };

  const addAiPlayers = async () => {
    const n = Math.min(toAdd, remaining);
    if (n <= 0) return;
    setIsAdding(true);
    setError(null);
    try {
      // Sequential so the party count updates cleanly and we stay gentle on
      // the API even for a full batch.
      for (let i = 0; i < n; i += 1) {
        const name = `${AI_PLAYER_NAMES[i % AI_PLAYER_NAMES.length]} (AI)`;
        await postCharacter({ ...AI_PLAYER_BODY, name });
      }
      setCount(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to summon AI players');
    } finally {
      setIsAdding(false);
    }
  };

  const stepperBtn =
    'inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-fg-muted transition-colors hover:border-border-strong hover:text-fg disabled:opacity-40';

  return (
    <div className="flex flex-col gap-3">
      <span className="font-mono text-xs uppercase tracking-[0.18em] text-fg-subtle">
        Summon
      </span>

      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        onClick={addAiDm}
        disabled={isAdding || dmExists}
        title={dmExists ? 'This table already has a dungeon master' : undefined}
      >
        Summon AI dungeon master
      </Button>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-fg-muted">AI players to add</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Fewer players"
              className={stepperBtn}
              onClick={() => setCount((c) => Math.max(1, c - 1))}
              disabled={isAdding || toAdd <= 1}
            >
              −
            </button>
            <span className="w-5 text-center font-mono text-sm tabular-nums text-fg">
              {toAdd}
            </span>
            <button
              type="button"
              aria-label="More players"
              className={stepperBtn}
              onClick={() => setCount((c) => Math.min(remaining, c + 1))}
              disabled={isAdding || toAdd >= remaining}
            >
              +
            </button>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={addAiPlayers}
          disabled={isAdding || partyFull}
          title={partyFull ? `Party is full (max ${MAX_PLAYERS_PER_SESSION})` : undefined}
        >
          {isAdding
            ? 'Summoning…'
            : `Summon ${toAdd} AI player${toAdd === 1 ? '' : 's'}`}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => setIsCustomOpen(true)}
          disabled={isAdding || partyFull}
          title={partyFull ? `Party is full (max ${MAX_PLAYERS_PER_SESSION})` : undefined}
        >
          Create Custom Companion
        </Button>
      </div>

      <p className="text-xs text-fg-subtle">
        {players}/{MAX_PLAYERS_PER_SESSION} players
        {dmExists ? ' · DM present' : ' · no DM yet'}
      </p>
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}

      <CreateCompanionDialog
        isOpen={isCustomOpen}
        onOpenChange={setIsCustomOpen}
        sessionId={sessionId}
      />
    </div>
  );
}
