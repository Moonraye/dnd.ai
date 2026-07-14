'use client';

import type { ChatMessagePayload } from '@dnd/shared';
import { useEffect, useRef, memo } from 'react';
import { DiceRollCard } from '@/entities/dice';
import { useSessionStore } from '@/shared/store/sessionStore';

interface ChatWindowProps {
  messages: ChatMessagePayload[];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const MessageRow = memo(function MessageRow({
  message,
}: {
  message: ChatMessagePayload;
}) {
  // Dice rolls — the indigo result card.
  if (
    message.senderType === 'SYSTEM' &&
    message.metadata?.kind === 'dice_roll'
  ) {
    return (
      <DiceRollCard
        senderName={message.senderName}
        createdAt={message.createdAt}
        metadata={message.metadata}
      />
    );
  }

  // Plain system lines — quiet, centered.
  if (message.senderType === 'SYSTEM') {
    return (
      <p className="text-center text-xs text-fg-subtle">{message.messageText}</p>
    );
  }

  // Custom styled whispers (private messages)
  if (message.visibility === 'WHISPER') {
    const isDm = message.senderType === 'AI_DM';
    return (
      <div className="flex flex-col gap-1 rounded-lg border border-dashed border-accent/30 bg-gradient-to-r from-accent/5 via-primary/5 to-transparent px-3.5 py-3 shadow-sm max-w-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-accent font-mono uppercase tracking-wider">
              {message.senderName}
            </span>
            {message.senderType === 'AI_PLAYER' && (
              <span className="rounded-full bg-primary-subtle px-1.5 py-px text-[0.6rem] font-semibold uppercase tracking-wide text-primary">
                AI
              </span>
            )}
            {isDm && (
              <span className="rounded-full bg-accent-subtle px-1.5 py-px text-[0.6rem] font-semibold uppercase tracking-wide text-accent">
                DM
              </span>
            )}
            <span className="flex items-center gap-1 text-[10px] text-fg-subtle font-medium">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-3.5 w-3.5 text-accent/70"
              >
                <path
                  fillRule="evenodd"
                  d="M8 1a3.5 3.5 0 0 0-3 3.5V6H4.5A1.5 1.5 0 0 0 3 7.5v6A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 11.5 6H11v-1.5A3.5 3.5 0 0 0 8 1Zm1.5 5h-3v-1.5a1.5 1.5 0 0 1 3 0V6Z"
                  clipRule="evenodd"
                />
              </svg>
              <span>whispered to {message.recipientName || 'someone'}</span>
            </span>
          </div>
          <time dateTime={message.createdAt} className="font-mono text-[10px] text-fg-subtle">
            {formatTime(message.createdAt)}
          </time>
        </div>
        <p className="font-serif italic text-base leading-relaxed text-fg/90 whitespace-pre-wrap pl-1">
          {message.messageText}
        </p>
      </div>
    );
  }

  // AI dungeon master — full-width scene prose (the read-aloud voice from the
  // landing). Serif, violet rule, ember eyebrow. This is "the story."
  if (message.senderType === 'AI_DM') {
    return (
      <div className="border-l-2 border-primary/60 pl-4">
        <p className="mb-1 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-accent">
          {message.senderName}
        </p>
        <p className="font-display text-lg leading-relaxed text-fg whitespace-pre-wrap">
          {message.messageText}
        </p>
      </div>
    );
  }

  // Players — compact bubbles. AI party members get a small marker.
  const isAi = message.senderType === 'AI_PLAYER';
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-semibold text-fg">
          {message.senderName}
        </span>
        {isAi ? (
          <span className="rounded-full bg-primary-subtle px-1.5 py-px text-[0.6rem] font-semibold uppercase tracking-wide text-primary">
            AI
          </span>
        ) : null}
        <time dateTime={message.createdAt} className="font-mono text-xs text-fg-subtle">
          {formatTime(message.createdAt)}
        </time>
      </div>
      <p className="w-fit max-w-[46ch] rounded-lg rounded-tl-sm bg-surface px-3 py-2 text-sm text-fg whitespace-pre-wrap">
        {message.messageText}
      </p>
    </div>
  );
});

export const ChatWindow = memo(function ChatWindow({
  messages,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(messages.length);
  const characters = useSessionStore((state) => state.characters);
  
  const thinkingCharacters = characters.filter((c) => c.thinking);

  useEffect(() => {
    const prevCount = prevCountRef.current;
    const currentCount = messages.length;
    prevCountRef.current = currentCount;

    if (currentCount === 0) return;

    const isSingleAppend = currentCount - prevCount === 1;
    bottomRef.current?.scrollIntoView({
      behavior: isSingleAppend ? 'smooth' : 'auto',
    });
  }, [messages]);

  return (
    <div
      aria-live="polite"
      className="flex w-full flex-1 flex-col gap-5 overflow-y-auto pr-1"
    >
      {messages.length === 0 ? (
        <p className="m-auto max-w-sm text-center font-display text-lg text-fg-muted">
          The tavern is quiet. Your dungeon master is waiting for you to speak.
        </p>
      ) : (
        messages.map((message) => (
          <MessageRow key={message.id} message={message} />
        ))
      )}

      {/* Pulsing thinking indicators for enqueued AI companions */}
      {thinkingCharacters.map((char) => (
        <div key={`thinking-${char.id}`} className="flex items-center gap-2 pl-1 py-1 animate-pulse">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
          </span>
          <span className="text-xs italic text-fg-muted font-medium font-serif">
            {char.name} is formulating a response...
          </span>
        </div>
      ))}

      <div ref={bottomRef} />
    </div>
  );
});
