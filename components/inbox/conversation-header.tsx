"use client";

import Link from "next/link";
import type { Conversation } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CustomerPanel } from "@/components/inbox/customer-panel";
import { ChevronLeft, PanelRight } from "lucide-react";

/** Below the desktop width the customer details live in a slide-over; on phones a back button returns to the list. */
export function ConversationHeader({ conversation }: { conversation: Conversation }) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b px-2 xl:hidden">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Back to conversations"
        render={<Link href="/inbox" />}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <p className="min-w-0 flex-1 truncate px-1 text-sm font-medium">
        {conversation.contact?.displayName ?? "Conversation"}
      </p>
      <Sheet>
        <SheetTrigger render={<Button variant="outline" size="sm" />}>
          <PanelRight className="h-4 w-4" />
          Details
        </SheetTrigger>
        <SheetContent>
          <SheetTitle className="sr-only">Conversation details</SheetTitle>
          <CustomerPanel conversation={conversation} className="w-full flex-1 border-l-0 pt-12" />
        </SheetContent>
      </Sheet>
    </div>
  );
}
