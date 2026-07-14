'use client';

import { useState, type FormEvent } from 'react';
import { useSendChat } from '../model/useSendChat';

interface ChatInputProps {
  sessionId: string;
  disabled?: boolean;
  /** When set, a `/roll <expr>` message is routed here instead of chat. */
  onRollCommand?: (notation: string) => Promise<boolean>;
}

const ROLL_COMMAND = /^\/roll\s+(.+)$/i;

export function ChatInput({
  sessionId,
  disabled = false,
  onRollCommand,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const { send, isSending, error } = useSendChat(sessionId);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const rollMatch = onRollCommand ? ROLL_COMMAND.exec(text.trim()) : null;
    const ok = rollMatch
      ? await onRollCommand!(rollMatch[1])
      : await send(text);
    if (ok) setText('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-1">
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Speak, adventurer…"
          disabled={disabled || isSending}
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={disabled || isSending || text.trim().length === 0}
          className="rounded-md bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Send
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </form>
  );
}
