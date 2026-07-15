'use client';

import { useState } from 'react';
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
import { useTranslation } from '@/shared/i18n';

interface CreateCompanionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
}

export function CreateCompanionDialog({
  isOpen,
  onOpenChange,
  sessionId,
}: CreateCompanionDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [persona, setPersona] = useState('');
  const [hpMax, setHpMax] = useState(30);
  const [stats, setStats] = useState({
    str: 12,
    dex: 12,
    con: 12,
    int: 12,
    wis: 12,
    cha: 12,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setIsSubmitting(true);
    setError(null);

    try {
      await apiFetch(`/sessions/${sessionId}/characters`, {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          hpMax,
          hpCurrent: hpMax,
          stats,
          inventory: [],
          aiProvider: 'google',
          aiModel: 'gemini-flash-latest',
          persona: persona.trim() || null,
        }),
      });
      // Reset form
      setName('');
      setPersona('');
      setHpMax(30);
      setStats({ str: 12, dex: 12, con: 12, int: 12, wis: 12, cha: 12 });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.createCompanionFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle>{t.companions.createTitle}</DialogTitle>
        <DialogDescription>
          {t.companions.createDescription}
        </DialogDescription>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="comp-name" className="text-xs font-medium text-fg-muted">
              {t.companions.nameLabel}
            </label>
            <Input
              id="comp-name"
              type="text"
              placeholder={t.companions.namePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="comp-persona" className="text-xs font-medium text-fg-muted">
              {t.companions.personaLabel}
            </label>
            <Textarea
              id="comp-persona"
              placeholder={t.companions.personaPlaceholderCreate}
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="comp-hp" className="text-xs font-medium text-fg-muted">
                {t.companions.maxHitPoints}
              </label>
              <Input
                id="comp-hp"
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
                  <label htmlFor={`stat-${stat}`} className="text-[10px] font-mono uppercase text-fg-subtle">
                    {stat}
                  </label>
                  <Input
                    id={`stat-${stat}`}
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

          <div className="flex justify-end gap-2 mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t.companions.cancel}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t.companions.summoning : t.companions.summonCompanion}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
