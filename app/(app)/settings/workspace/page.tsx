"use client";

import { useState, type FormEvent } from "react";
import { useWorkspace } from "@/providers/workspace-provider";
import { useCreateTag, useDeleteTag, useTags } from "@/hooks/use-tags";
import { useUpdateWorkspaceSettings } from "@/hooks/use-workspaces";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, X } from "lucide-react";

const TAG_COLORS = ["#6366F1", "#F59E0B", "#10B981", "#3B82F6", "#EF4444", "#8B5CF6", "#EC4899"];

export default function WorkspaceSettingsPage() {
  const { activeWorkspace } = useWorkspace();
  const { data: tags, isLoading } = useTags();
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();
  const updateSettings = useUpdateWorkspaceSettings();
  const [name, setName] = useState("");
  const [color, setColor] = useState(TAG_COLORS[0]);
  const isAdmin = activeWorkspace?.role === "OWNER" || activeWorkspace?.role === "ADMIN";

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await createTag.mutateAsync({ name: name.trim(), color });
    setName("");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Workspace</h1>
        <p className="text-sm text-muted-foreground">General settings for {activeWorkspace?.name}.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Name</CardTitle>
          <CardDescription>{activeWorkspace?.name}</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-base">Read receipts</CardTitle>
            <CardDescription>
              Let customers see when you&apos;ve read their message: &quot;seen&quot; on WhatsApp and Messenger, and
              &quot;Seen&quot; in the website chat. Email stays private (it only marks the mail read in your own
              mailbox), and Telegram doesn&apos;t support read receipts.
            </CardDescription>
          </div>
          <Switch
            aria-label="Send read receipts"
            checked={activeWorkspace?.sendReadReceipts ?? true}
            disabled={!isAdmin || updateSettings.isPending}
            onCheckedChange={(checked) =>
              updateSettings.mutate(
                { sendReadReceipts: checked },
                {
                  onSuccess: () => toast.success(checked ? "Read receipts on" : "Read receipts off"),
                  onError: () => toast.error("Unable to update this setting"),
                },
              )
            }
          />
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tags</CardTitle>
          <CardDescription>Used to categorize conversations (VIP, Lead, Support, ...).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags?.map((tag) => (
                <Badge key={tag.id} style={{ backgroundColor: tag.color, color: "white" }} className="gap-1 pr-1">
                  {tag.name}
                  {isAdmin && (
                    <button onClick={() => deleteTag.mutate(tag.id)} className="rounded-full hover:bg-black/20">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
              {!tags?.length && <p className="text-sm text-muted-foreground">No tags yet.</p>}
            </div>
          )}

          {isAdmin && (
            <form onSubmit={handleCreate} className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="tag-name">New tag</Label>
                <Input id="tag-name" placeholder="Follow-up" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="flex gap-1">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-6 w-6 rounded-full ${color === c ? "ring-2 ring-offset-2 ring-ring" : ""}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <Button type="submit" size="sm" disabled={createTag.isPending || !name.trim()}>
                {createTag.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
