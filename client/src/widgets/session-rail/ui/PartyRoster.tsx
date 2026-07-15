'use client';

import { useState } from 'react';
import { isDungeonMasterSheet, type CharacterSheetPayload } from '@dnd/shared';
import { useMyCharacter } from '@/features/character-sheet';
import { format, useTranslation } from '@/shared/i18n';
import { useSessionStore } from '@/shared/store/sessionStore';
import { useAuthStore } from '@/shared/store/authStore';
import { EditCompanionDialog } from '@/features/companion-management';
import { Badge, HpBar } from '@/shared/ui';
import { apiFetch } from '@/shared/api/httpClient';

export function PartyRoster() {
  const { t } = useTranslation();
  const characters = useSessionStore((state) => state.characters);
  const session = useSessionStore((state) => state.session);
  const user = useAuthStore((state) => state.user);
  const { myCharacter } = useMyCharacter();

  const [editingChar, setEditingChar] = useState<CharacterSheetPayload | null>(null);

  if (characters.length === 0) {
    return (
      <p className="text-xs text-fg-subtle">
        {t.sessionRail.emptyParty}
      </p>
    );
  }

  const handleDismiss = async (charId: string, name: string) => {
    const confirmed = window.confirm(format(t.companions.confirmDismiss, { name }));
    if (!confirmed) return;
    try {
      await apiFetch(`/sessions/${session?.id}/characters/${charId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : t.errors.dismissCompanionFailed);
    }
  };

  return (
    <>
      <ul className="flex flex-col gap-3">
        {characters.map((character) => {
          const isDm = isDungeonMasterSheet(character);
          const isAi = character.aiProvider !== null;
          const isMe = character.id === myCharacter?.id;

          // Permission rules
          const isHost = user && session && user.id === session.creatorId;
          const isOwner = user && user.id === character.ownerId;
          const canManage = isAi && (isDm ? isHost : (isHost || isOwner));

          return (
            <li
              key={character.id}
              className="group flex flex-col gap-1.5 rounded-md p-1.5 hover:bg-bg-subtle/50 transition-colors duration-150"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-fg">
                    {character.name}
                  </span>
                  {isMe ? (
                    <Badge variant="primary">{t.common.badges.you}</Badge>
                  ) : isDm ? (
                    <Badge variant="accent">{t.common.badges.dm}</Badge>
                  ) : isAi ? (
                    <Badge variant="neutral">{t.common.badges.ai}</Badge>
                  ) : null}
                </div>

                {canManage && (
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <button
                      type="button"
                      onClick={() => setEditingChar(character)}
                      className="text-xs text-fg-muted hover:text-fg font-medium cursor-pointer px-1 py-0.5 rounded hover:bg-border transition-colors"
                      title={t.sessionRail.editProfileTitle}
                    >
                      {t.sessionRail.edit}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDismiss(character.id, character.name)}
                      className="text-xs text-danger/80 hover:text-danger font-medium cursor-pointer px-1 py-0.5 rounded hover:bg-danger/10 transition-colors"
                      title={t.sessionRail.dismissCompanionTitle}
                    >
                      {t.sessionRail.dismiss}
                    </button>
                  </div>
                )}
              </div>
              {!isDm ? (
                <HpBar hpCurrent={character.hpCurrent} hpMax={character.hpMax} />
              ) : null}
            </li>
          );
        })}
      </ul>

      <EditCompanionDialog
        isOpen={editingChar !== null}
        onOpenChange={(open) => {
          if (!open) setEditingChar(null);
        }}
        sessionId={session?.id ?? ''}
        character={editingChar}
      />
    </>
  );
}
