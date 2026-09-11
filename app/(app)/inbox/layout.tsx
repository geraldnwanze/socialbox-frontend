import { InboxFiltersProvider } from "@/components/inbox/inbox-filters-context";
import { FiltersSidebar } from "@/components/inbox/filters-sidebar";
import { ConversationList } from "@/components/inbox/conversation-list";

export default function InboxLayout({ children }: { children: React.ReactNode }) {
  return (
    <InboxFiltersProvider>
      <div className="flex flex-1 overflow-hidden">
        <FiltersSidebar />
        <ConversationList />
        {children}
      </div>
    </InboxFiltersProvider>
  );
}
