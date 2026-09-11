"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useWorkspace } from "@/providers/workspace-provider";
import { useCreateWorkspace } from "@/hooks/use-workspaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSpinner } from "@/components/page-spinner";
import { Loader2, MessagesSquare, Plus } from "lucide-react";

export default function WorkspacesPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const { workspaces, isLoading, switchWorkspace } = useWorkspace();
  const createWorkspace = useCreateWorkspace();
  const [name, setName] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  if (authLoading || isLoading) return <PageSpinner />;

  function selectWorkspace(id: string) {
    switchWorkspace(id);
    router.push("/inbox");
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const workspace = await createWorkspace.mutateAsync(name.trim());
    selectWorkspace(workspace.id);
  }

  return (
    <div className="min-h-screen bg-muted/40 px-4 py-12">
      <div className="mx-auto max-w-lg space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <MessagesSquare className="h-4 w-4" />
            </div>
            <span className="font-semibold">SocialBox</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => logout()}>
            Sign out
          </Button>
        </div>

        {workspaces.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Choose a workspace</CardTitle>
              <CardDescription>Pick which workspace&apos;s inbox to open.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  onClick={() => selectWorkspace(workspace.id)}
                  className="flex w-full items-center justify-between rounded-md border px-4 py-3 text-left transition-colors hover:bg-accent"
                >
                  <div>
                    <p className="font-medium">{workspace.name}</p>
                    <p className="text-xs text-muted-foreground">{workspace.role}</p>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{workspaces.length > 0 ? "Create another workspace" : "Create your workspace"}</CardTitle>
            <CardDescription>
              A workspace is where your team, channels, and conversations live.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="workspace-name" className="sr-only">
                  Workspace name
                </Label>
                <Input
                  id="workspace-name"
                  placeholder="Acme Fashion"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={createWorkspace.isPending || !name.trim()}>
                {createWorkspace.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
