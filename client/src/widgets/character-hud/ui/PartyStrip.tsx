'use client';

import { useSessionStore } from '@/shared/store/sessionStore';
import { HpBar } from './HpBar';

interface PartyStripProps {
  /** The caller's own sheet id, excluded from the read-only party list. */
  ownCharacterId?: string;
}

export function PartyStrip({ ownCharacterId }: PartyStripProps) {
  const characters = useSessionStore((state) => state.characters);
  const party = characters.filter(
    (character) => character.id !== ownCharacterId,
  );

  if (party.length === 0) {
    return (
      <p className="text-xs text-zinc-500">No other adventurers yet.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {party.map((character) => (
        <li key={character.id} className="flex flex-col gap-1">
          <span className="text-sm font-medium">{character.name}</span>
          <HpBar hpCurrent={character.hpCurrent} hpMax={character.hpMax} />
        </li>
      ))}
    </ul>
  );
}
