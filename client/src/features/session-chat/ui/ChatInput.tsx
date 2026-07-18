'use client';

import { useState, type FormEvent } from 'react';
import { useTranslation } from '@/shared/i18n';
import { Button, Input } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useSessionStore } from '@/shared/store/sessionStore';
import { useSendChat } from '../model/useSendChat';

interface ChatInputProps {
  sessionId: string;
  disabled?: boolean;
  /** When set, a `/roll <expr>` message is routed here instead of chat. */
  onRollCommand?: (notation: string) => Promise<boolean>;
  /** Dice-tray toggle wiring (owned by the session view). */
  diceOpen?: boolean;
  onToggleDice?: () => void;
}

const ROLL_COMMAND = /^\/roll\s+(.+)$/i;

export function ChatInput({
  sessionId,
  disabled = false,
  onRollCommand,
  diceOpen = false,
  onToggleDice,
}: ChatInputProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const { send, isSending, error: sendError } = useSendChat(sessionId);
  const characters = useSessionStore((state) => state.characters);

  // Check if user is typing a target mention after a command
  const atMatch = text.match(/\/(say|shout|whisper|s|w)\s+(?:to\s+)?@(\S*)$/i);
  const showCandidates = !!atMatch;
  const searchName = atMatch ? atMatch[2] : '';

  const candidates = characters.filter((c) =>
    c.name.toLowerCase().includes(searchName.toLowerCase()),
  );

  const handleSelectCandidate = (name: string) => {
    setText((prev) => {
      const idx = prev.lastIndexOf('@');
      if (idx >= 0) {
        return prev.slice(0, idx + 1) + name + ' ';
      }
      return prev;
    });
    setLocalError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSending || isRolling) return;
    setLocalError(null);
    const trimmed = text.trim();
    if (trimmed.length === 0) return;

    // 1. Roll Command
    const rollMatch = onRollCommand ? ROLL_COMMAND.exec(trimmed) : null;
    if (rollMatch) {
      setIsRolling(true);
      try {
        const ok = await onRollCommand!(rollMatch[1]);
        if (ok) setText('');
      } finally {
        setIsRolling(false);
      }
      return;
    }

    // 2. Targeted Chat Command
    const prefixMatch = trimmed.match(/^\/(say|shout|whisper|s|w)\s+/i);
    if (prefixMatch) {
      const commandPart = prefixMatch[1].toLowerCase();
      const command =
        commandPart === 'w' || commandPart === 'whisper'
          ? 'WHISPER'
          : commandPart === 'shout'
          ? 'SHOUT'
          : 'SAY';

      let rest = trimmed.slice(prefixMatch[0].length).trim();
      if (rest.toLowerCase().startsWith('to ')) {
        rest = rest.slice(3).trim();
      }

      if (rest.startsWith('@')) {
        rest = rest.slice(1); // remove '@'

        // Find the character name that is a prefix of `rest`
        const sortedChars = [...characters].sort((a, b) => b.name.length - a.name.length);
        let foundChar = null;
        let messageText = '';

        for (const char of sortedChars) {
          if (rest.toLowerCase().startsWith(char.name.toLowerCase())) {
            foundChar = char;
            messageText = rest.slice(char.name.length).trim();
            break;
          }
        }

        // Fallback for partial matches (up to space)
        if (!foundChar) {
          const spaceIdx = rest.indexOf(' ');
          const firstWord = spaceIdx >= 0 ? rest.slice(0, spaceIdx) : rest;
          foundChar = characters.find((c) =>
            c.name.toLowerCase().startsWith(firstWord.toLowerCase()),
          );
          if (foundChar) {
            messageText = spaceIdx >= 0 ? rest.slice(spaceIdx).trim() : '';
          }
        }

        if (foundChar) {
          if (!messageText) {
            setLocalError(t.chat.emptyMessageBody);
            return;
          }
          const ok = await send(messageText, command, foundChar.id);
          if (ok) setText('');
          return;
        } else {
          setLocalError(t.chat.recipientNotFound);
          return;
        }
      }
    }

    // 3. Normal public chat message
    const ok = await send(trimmed);
    if (ok) setText('');
  };

  const activeError = localError || sendError;

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-1.5 relative">
      <div className="flex items-center gap-2 relative">
        {onToggleDice ? (
          <button
            type="button"
            onClick={onToggleDice}
            aria-label={t.chat.toggleDiceTray}
            aria-pressed={diceOpen}
            disabled={disabled}
            className={cn(
              'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border font-mono text-xs font-semibold transition-colors disabled:opacity-50',
              diceOpen
                ? 'border-dice bg-dice-subtle text-dice'
                : 'border-border text-fg-muted hover:border-border-strong hover:text-fg',
            )}
          >
            d20
          </button>
        ) : null}
        
        <div className="relative flex-1 flex">
          <Input
            type="text"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setLocalError(null);
            }}
            placeholder={t.chat.inputPlaceholder}
            disabled={disabled || isSending || isRolling}
            className="flex-1"
          />

          {/* Autocomplete candidates popover */}
          {showCandidates && candidates.length > 0 && (
            <div className="absolute bottom-full mb-2 max-h-48 w-64 overflow-y-auto rounded-md border border-border bg-bg-popover p-1 shadow-lg z-50">
              <p className="px-2 py-1 text-[10px] font-semibold text-fg-subtle uppercase tracking-wider border-b border-border mb-1">
                {t.chat.chooseRecipient}
              </p>
              {candidates.map((char) => (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => handleSelectCandidate(char.name)}
                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs text-fg hover:bg-bg-subtle/85 cursor-pointer transition-colors"
                >
                  <span>{char.name}</span>
                  {char.aiProvider && (
                    <span className="text-[9px] bg-border px-1.5 py-0.5 rounded text-fg-muted font-mono leading-none">
                      {t.common.badges.ai}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          type="submit"
          disabled={disabled || isSending || isRolling || text.trim().length === 0}
        >
          {t.chat.send}
        </Button>
      </div>
      {activeError ? (
        <p role="alert" className="text-xs text-danger font-medium">
          {activeError}
        </p>
      ) : null}
    </form>
  );
}
