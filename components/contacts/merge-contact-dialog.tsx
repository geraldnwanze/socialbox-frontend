"use client";

import { useState } from "react";
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
import { ChannelLabel } from "@/components/channel-badge";
import { useContacts, useMergeContact } from "@/hooks/use-contacts";
import { ApiError } from "@/lib/api-client";
import type { Contact } from "@/lib/types";
import { Loader2, Search } from "lucide-react";

export function MergeContactDialog({ target, trigger }: { target: Contact; trigger: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<Contact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data, isLoading } = useContacts(search);
  const merge = useMergeContact(target.id);
  const candidates = (data?.items ?? []).filter((c) => c.id !== target.id);

  function reset(next: boolean) {
    setOpen(next);
    if (!next) {
      setSearch("");
      setSource(null);
      setError(null);
    }
  }

  async function handleMerge() {
    if (!source) return;
    setError(null);
    try {
      await merge.mutateAsync(source.id);
      toast.success(`Merged ${source.displayName ?? "contact"} into ${target.displayName ?? "this contact"}`);
      reset(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to merge these contacts");
    }
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Merge a duplicate into {target.displayName ?? "this contact"}</DialogTitle>
          <DialogDescription>
            Pick the duplicate. Its channels and conversations move to this contact, then the duplicate is removed. This
            can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSource(null);
              }}
            />
          </div>
          <div className="max-h-56 overflow-y-auto rounded-md border">
            {isLoading && (
              <div className="flex justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!isLoading && candidates.length === 0 && (
              <p className="p-3 text-sm text-muted-foreground">No other contacts found</p>
            )}
            {candidates.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSource(c)}
                aria-pressed={source?.id === c.id}
                className={`flex w-full flex-col items-start gap-1 border-b p-3 text-left last:border-b-0 hover:bg-accent ${
                  source?.id === c.id ? "bg-accent" : ""
                }`}
              >
                <span className="text-sm font-medium">{c.displayName ?? "Unknown"}</span>
                <span className="flex flex-wrap gap-2">
                  {c.identities.map((i) => (
                    <ChannelLabel key={i.id} type={i.channel} />
                  ))}
                </span>
              </button>
            ))}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="destructive" disabled={!source || merge.isPending} onClick={handleMerge}>
            {merge.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {source ? `Merge ${source.displayName ?? "contact"} in` : "Select a contact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
