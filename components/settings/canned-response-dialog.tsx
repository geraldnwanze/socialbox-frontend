"use client";

import { useState, type FormEvent } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useCreateCannedResponse, useUpdateCannedResponse } from "@/hooks/use-canned-responses";
import { ApiError } from "@/lib/api-client";
import { PLACEHOLDERS } from "@/lib/canned-response-template";
import type { CannedResponse } from "@/lib/types";
import { Loader2 } from "lucide-react";

const MAX_CONTENT = 2000;

export function CannedResponseDialog({ reply, trigger }: { reply?: CannedResponse; trigger: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(reply?.title ?? "");
  const [shortcut, setShortcut] = useState(reply?.shortcut ?? "");
  const [content, setContent] = useState(reply?.content ?? "");
  const [error, setError] = useState<string | null>(null);
  const create = useCreateCannedResponse();
  const update = useUpdateCannedResponse();
  const mutation = reply ? update : create;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (reply) {
        await update.mutateAsync({ id: reply.id, title, shortcut, content });
        toast.success("Reply updated");
      } else {
        await create.mutateAsync({ title, shortcut, content });
        toast.success("Reply saved");
        setTitle("");
        setShortcut("");
        setContent("");
      }
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to save this reply");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{reply ? "Edit saved reply" : "New saved reply"}</DialogTitle>
            <DialogDescription>
              Agents insert this by typing <span className="font-mono">/</span> and the shortcut in the message box.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reply-title">Title</Label>
              <Input
                id="reply-title"
                required
                maxLength={80}
                placeholder="Shipping times"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reply-shortcut">Shortcut</Label>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-muted-foreground">/</span>
                <Input
                  id="reply-shortcut"
                  required
                  maxLength={31}
                  placeholder="shipping"
                  value={shortcut}
                  onChange={(e) => setShortcut(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">Letters, numbers, - or _ (up to 30).</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reply-content">Message</Label>
              <Textarea
                id="reply-content"
                required
                rows={5}
                maxLength={MAX_CONTENT}
                placeholder="Hi {{customer_name}}, we deliver within 2-3 business days."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <div className="flex justify-between gap-3 text-xs text-muted-foreground">
                <span>
                  {PLACEHOLDERS.map((p) => (
                    <span key={p.token} className="mr-2 whitespace-nowrap" title={p.description}>
                      <code>{p.token}</code>
                    </span>
                  ))}
                </span>
                <span className="shrink-0">
                  {content.length}/{MAX_CONTENT}
                </span>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {reply ? "Save changes" : "Save reply"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
