"use client";

import { useParams } from "next/navigation";
import { InboxFiltersProvider } from "@/components/inbox/inbox-filters-context";
import { FiltersSidebar } from "@/components/inbox/filters-sidebar";
import { ConversationList } from "@/components/inbox/conversation-list";
import { cn } from "@/lib/utils";

export default function InboxLayout({ children }: { children: React.ReactNode }) {
  const { conversationId } = useParams<{ conversationId?: string }>();
  // On a phone the list and the open conversation are separate screens; from tablet width they sit side by side.
  const hasConversation = Boolean(conversationId);

  return (
    <InboxFiltersProvider>
      <div className="flex min-w-0 flex-1 overflow-hidden">
        <FiltersSidebar className="hidden lg:flex" />
        <ConversationList className={cn(hasConversation && "hidden md:flex")} />
        {children}
      </div>
    </InboxFiltersProvider>
  );
}
