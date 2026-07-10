'use client';

import type { ChatMessagePayload } from '@dnd/shared';
import { useEffect, useRef } from 'react';

interface ChatWindowProps {
  messages: ChatMessagePayload[];
}

export function ChatWindow({ messages }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex w-full flex-1 flex-col gap-3 overflow-y-auto rounded-md border border-zinc-300 p-4 dark:border-zinc-700">
      {messages.length === 0 ? (
        <p className="text-sm text-zinc-500">
          The tavern is quiet… say something!
        </p>
      ) : (
        messages.map((message) => (
          <div key={message.id} className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold">
                {message.senderName}
              </span>
              <time
                dateTime={message.createdAt}
                className="text-xs text-zinc-500"
              >
                {new Date(message.createdAt).toLocaleTimeString()}
              </time>
            </div>
            <p className="whitespace-pre-wrap text-sm">{message.messageText}</p>
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}
