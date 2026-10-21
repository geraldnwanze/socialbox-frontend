"use client";

import { useState, type FormEvent, type ReactElement } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateInboxView } from "@/hooks/use-inbox-views";
import { useChannels } from "@/hooks/use-channels";
import { useTags } from "@/hooks/use-tags";
import { useTeamMembers } from "@/hooks/use-team";
import { useWorkspace } from "@/providers/workspace-provider";
import { ApiError } from "@/lib/api-client";
import { describeFilters } from "@/lib/view-summary";
import type { InboxView, InboxViewFilters } from "@/lib/types";
import { Loader2 } from "lucide-react";

export function SaveViewDialog({
  filters,
  trigger,
  onSaved,
}: {
  filters: InboxViewFilters;
  trigger: ReactElement;
  onSaved?: (view: InboxView) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [shared, setShared] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const create = useCreateInboxView();
  const { activeWorkspace } = useWorkspace();
  const { data: channelData } = useChannels();
  const { data: tags } = useTags();
  const { data: members } = useTeamMembers();
  const isAdmin = activeWorkspace?.role === "OWNER" || activeWorkspace?.role === "ADMIN";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const view = await create.mutateAsync({ name: name.trim(), filters, shared: isAdmin && shared });
      toast.success(`Saved view "${view.name}"`);
      setName("");
      setShared(false);
      setOpen(false);
      onSaved?.(view);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to save this view");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Save this view</DialogTitle>
            <DialogDescription>
              {describeFilters(filters, { channels: channelData?.connected, tags, members })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="view-name">Name</Label>
              <Input
                id="view-name"
                required
                maxLength={60}
                placeholder="Urgent refunds"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            {isAdmin && (
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-0.5 h-4 w-4" checked={shared} onChange={(e) => setShared(e.target.checked)} />
                <span>
                  Share with the whole team
                  <span className="block text-xs text-muted-foreground">Everyone sees it in their sidebar; only admins can change it.</span>
                </span>
              </label>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!name.trim() || create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save view
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
