'use client';

import type { ChatMessagePayload } from '@dnd/shared';
import { useEffect, useRef, memo } from 'react';
import { DiceRollCard } from '@/entities/dice';

interface ChatWindowProps {
  messages: ChatMessagePayload[];
}

const MessageRow = memo(function MessageRow({ message }: { message: ChatMessagePayload }) {
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

  if (message.senderType === 'SYSTEM') {
    return (
      <p className="text-center text-xs text-zinc-500">{message.messageText}</p>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-semibold">{message.senderName}</span>
        <time dateTime={message.createdAt} className="text-xs text-zinc-500">
          {new Date(message.createdAt).toLocaleTimeString()}
        </time>
      </div>
      <p className="whitespace-pre-wrap text-sm">{message.messageText}</p>
    </div>
  );
});

export const ChatWindow = memo(function ChatWindow({ messages }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(messages.length);

  useEffect(() => {
    const prevCount = prevCountRef.current;
    const currentCount = messages.length;
    prevCountRef.current = currentCount;

    if (currentCount === 0) return;

    // Use smooth scroll only when appending a single new message (active chat).
    // Use instant 'auto' scroll for initial history load or large catch-up batches.
    const isSingleAppend = currentCount - prevCount === 1;
    bottomRef.current?.scrollIntoView({
      behavior: isSingleAppend ? 'smooth' : 'auto',
    });
  }, [messages]);

  return (
    <div className="flex w-full flex-1 flex-col gap-3 overflow-y-auto rounded-md border border-zinc-300 p-4 dark:border-zinc-700">
      {messages.length === 0 ? (
        <p className="text-sm text-zinc-500">
          The tavern is quiet… say something!
        </p>
      ) : (
        messages.map((message) => (
          <MessageRow key={message.id} message={message} />
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
});
