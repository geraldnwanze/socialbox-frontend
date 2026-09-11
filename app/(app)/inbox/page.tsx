import { MessagesSquare } from "lucide-react";

export default function InboxIndexPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <MessagesSquare className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="font-medium">Select a conversation</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Choose a conversation from the list to see the full message history.
      </p>
    </div>
  );
}
