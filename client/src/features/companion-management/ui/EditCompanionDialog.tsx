'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Textarea,
} from '@/shared/ui';
import { apiFetch } from '@/shared/api/httpClient';
import { format, useTranslation } from '@/shared/i18n';
import type { CharacterSheetPayload } from '@dnd/shared';

interface EditCompanionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  character: CharacterSheetPayload | null;
}

export function EditCompanionDialog({
  isOpen,
  onOpenChange,
  sessionId,
  character,
}: EditCompanionDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [persona, setPersona] = useState('');
  const [hpMax, setHpMax] = useState(30);
  const [hpCurrent, setHpCurrent] = useState(30);
  const [stats, setStats] = useState({
    str: 12,
    dex: 12,
    con: 12,
    int: 12,
    wis: 12,
    cha: 12,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Syncs local form fields from the character prop when the dialog opens.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (character) {
      setName(character.name);
      setPersona(character.persona || '');
      setHpMax(character.hpMax);
      setHpCurrent(character.hpCurrent);
      setStats({
        str: character.stats?.str ?? 12,
        dex: character.stats?.dex ?? 12,
        con: character.stats?.con ?? 12,
        int: character.stats?.int ?? 12,
        wis: character.stats?.wis ?? 12,
        cha: character.stats?.cha ?? 12,
      });
      setError(null);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [character, isOpen]);

  if (!character) return null;

  const handleStatChange = (key: keyof typeof stats, val: string) => {
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed)) {
      setStats((prev) => ({
        ...prev,
        [key]: Math.max(1, Math.min(30, parsed)),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t.companions.nameRequired);
      return;
    }
    if (hpCurrent > hpMax) {
      setError(t.companions.hpExceedsMax);
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      await apiFetch(`/sessions/${sessionId}/characters/${character.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          persona: persona.trim() || null,
          hpMax,
          hpCurrent,
          stats,
        }),
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.updateCompanionFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      format(t.companions.confirmDismiss, { name: character.name }),
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      await apiFetch(`/sessions/${sessionId}/characters/${character.id}`, {
        method: 'DELETE',
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.dismissCompanionFailed);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle>{t.companions.editTitle}</DialogTitle>
        <DialogDescription>
          {t.companions.editDescription}
        </DialogDescription>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-name" className="text-xs font-medium text-fg-muted">
              {t.companions.nameLabel}
            </label>
            <Input
              id="edit-name"
              type="text"
              placeholder={t.companions.namePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-persona" className="text-xs font-medium text-fg-muted">
              {t.companions.personaLabel}
            </label>
            <Textarea
              id="edit-persona"
              placeholder={t.companions.personaPlaceholderEdit}
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-hp-current" className="text-xs font-medium text-fg-muted">
                {t.companions.currentHp}
              </label>
              <Input
                id="edit-hp-current"
                type="number"
                min={0}
                max={hpMax}
                value={hpCurrent}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) setHpCurrent(Math.max(0, val));
                }}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-hp-max" className="text-xs font-medium text-fg-muted">
                {t.companions.maxHp}
              </label>
              <Input
                id="edit-hp-max"
                type="number"
                min={1}
                max={9999}
                value={hpMax}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) setHpMax(Math.max(1, val));
                }}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-muted">{t.companions.abilityScores}</span>
            <div className="grid grid-cols-6 gap-2">
              {(Object.keys(stats) as Array<keyof typeof stats>).map((stat) => (
                <div key={stat} className="flex flex-col items-center gap-1">
                  <label htmlFor={`edit-stat-${stat}`} className="text-[10px] font-mono uppercase text-fg-subtle">
                    {stat}
                  </label>
                  <Input
                    id={`edit-stat-${stat}`}
                    type="number"
                    min={1}
                    max={30}
                    value={stats[stat]}
                    onChange={(e) => handleStatChange(stat, e.target.value)}
                    className="h-8 w-12 text-center p-0 font-mono text-sm tabular-nums"
                  />
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p role="alert" className="text-xs text-danger">
              {error}
            </p>
          )}

          <div className="flex justify-between items-center mt-2">
            <Button
              type="button"
              variant="secondary"
              className="text-danger border-danger hover:bg-danger/10"
              onClick={handleDelete}
              disabled={isDeleting || isSubmitting}
            >
              {isDeleting ? t.companions.dismissing : t.companions.dismiss}
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting || isDeleting}
              >
                {t.companions.cancel}
              </Button>
              <Button type="submit" disabled={isSubmitting || isDeleting}>
                {isSubmitting ? t.companions.saving : t.companions.saveChanges}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
