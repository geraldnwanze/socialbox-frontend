"use client";

import { useEffect, useRef } from "react";
import { useMessages } from "@/hooks/use-messages";
import { MessageBubble } from "./message-bubble";
import { Button } from "@/components/ui/button";
import { Loader2, MessagesSquare } from "lucide-react";

export function MessageThread({ conversationId }: { conversationId: string }) {
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useMessages(conversationId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);

  // Pages come back newest-first; flatten and reverse so the DOM reads oldest -> newest.
  const messages = data?.pages.flatMap((page) => page.items).reverse() ?? [];

  useEffect(() => {
    if (isFirstLoad.current && messages.length > 0) {
      bottomRef.current?.scrollIntoView();
      isFirstLoad.current = false;
    }
  }, [messages.length]);

  useEffect(() => {
    isFirstLoad.current = true;
  }, [conversationId]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <MessagesSquare className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="font-medium">No messages yet</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Once your customer sends a message, it will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-4">
      {hasNextPage && (
        <div className="flex justify-center pb-2">
          <Button variant="outline" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Load older messages
          </Button>
        </div>
      )}
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
