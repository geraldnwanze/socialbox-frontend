"use client";

import { toast } from "sonner";
import { useWorkspace } from "@/providers/workspace-provider";
import { useCannedResponses, useDeleteCannedResponse } from "@/hooks/use-canned-responses";
import { CannedResponseDialog } from "@/components/settings/canned-response-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquareText, Pencil, Plus, Trash2 } from "lucide-react";

export default function RepliesSettingsPage() {
  const { activeWorkspace } = useWorkspace();
  const { data: replies, isLoading, isError } = useCannedResponses();
  const remove = useDeleteCannedResponse();
  const isAdmin = activeWorkspace?.role === "OWNER" || activeWorkspace?.role === "ADMIN";

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Saved replies</h1>
          <p className="text-sm text-muted-foreground">
            Reusable answers your team can insert by typing <span className="font-mono">/</span> in any conversation.
          </p>
        </div>
        {isAdmin && (
          <CannedResponseDialog
            trigger={
              <Button size="sm">
                <Plus className="h-4 w-4" /> New reply
              </Button>
            }
          />
        )}
      </div>

      {!isAdmin && (
        <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Only admins can add or edit saved replies. You can use them in any conversation.
        </p>
      )}

      {isLoading && (
        <div className="flex justify-center p-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && <p className="text-sm text-destructive">Unable to load saved replies. Try reloading the page.</p>}

      {!isLoading && !isError && replies?.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-12 text-center">
          <MessageSquareText className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">No saved replies yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {isAdmin
              ? "Add the answers you give most often — shipping times, refund policy, greetings — so agents can send them in two keystrokes."
              : "Ask an admin to add some."}
          </p>
        </div>
      )}

      <div className="divide-y rounded-lg border empty:hidden">
        {replies?.map((reply) => (
          <div key={reply.id} className="flex items-start gap-3 p-4">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{reply.title}</span>
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/{reply.shortcut}</code>
              </div>
              <p className="line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">{reply.content}</p>
            </div>
            {isAdmin && (
              <div className="flex shrink-0 gap-1">
                <CannedResponseDialog
                  reply={reply}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label={`Edit ${reply.title}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${reply.title}`}
                  disabled={remove.isPending}
                  onClick={() => {
                    if (confirm(`Delete the saved reply "${reply.title}"?`)) {
                      remove.mutate(reply.id, { onSuccess: () => toast.success("Reply deleted") });
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
