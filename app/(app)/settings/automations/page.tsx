"use client";

import { toast } from "sonner";
import { formatDistanceToNowStrict } from "date-fns";
import { useWorkspace } from "@/providers/workspace-provider";
import { useAutomationRules, useDeleteAutomationRule, useUpdateAutomationRule } from "@/hooks/use-automation";
import { useTags } from "@/hooks/use-tags";
import { useTeamMembers } from "@/hooks/use-team";
import { summarize } from "@/lib/automation-form";
import { AutomationRuleDialog } from "@/components/settings/automation-rule-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Pencil, Plus, Trash2, Zap } from "lucide-react";

export default function AutomationsSettingsPage() {
  const { activeWorkspace } = useWorkspace();
  const isAdmin = activeWorkspace?.role === "OWNER" || activeWorkspace?.role === "ADMIN";
  const { data: rules, isLoading, isError } = useAutomationRules(isAdmin);
  const { data: tags } = useTags();
  const { data: members } = useTeamMembers();
  const update = useUpdateAutomationRule();
  const remove = useDeleteAutomationRule();

  if (activeWorkspace && !isAdmin) {
    return <div className="mx-auto max-w-2xl p-6 text-sm text-muted-foreground">Automations are managed by workspace admins.</div>;
  }

  const lookup = {
    memberName: (id: string) => members?.find((m) => m.id === id)?.user.fullName,
    tagName: (id: string) => tags?.find((t) => t.id === id)?.name,
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Automations</h1>
          <p className="text-sm text-muted-foreground">
            Handle routine work automatically: route, tag and prioritise conversations, or send an automatic reply. Rules
            run in order on every new customer message, and everything they do shows in the conversation&apos;s activity.
          </p>
        </div>
        <AutomationRuleDialog
          trigger={
            <Button size="sm">
              <Plus className="h-4 w-4" /> New rule
            </Button>
          }
        />
      </div>

      {isLoading && (
        <div className="flex justify-center p-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {isError && <p className="text-sm text-destructive">Unable to load rules. Try reloading the page.</p>}

      {rules?.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-12 text-center">
          <Zap className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">No rules yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Try: &quot;When a message mentions refund, tag it, set it to High priority and assign it to Support.&quot;
          </p>
        </div>
      )}

      <div className="divide-y rounded-lg border empty:hidden">
        {rules?.map((rule) => {
          const { when, then } = summarize(rule, lookup);
          return (
            <div key={rule.id} className="flex items-start gap-3 p-4">
              <Switch
                aria-label={`${rule.enabled ? "Disable" : "Enable"} ${rule.name}`}
                checked={rule.enabled}
                disabled={update.isPending}
                onCheckedChange={(enabled) => update.mutate({ id: rule.id, enabled })}
              />
              <div className="min-w-0 flex-1 space-y-1">
                <p className={rule.enabled ? "font-medium" : "font-medium text-muted-foreground"}>{rule.name}</p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground/80">When</span> {when}{" "}
                  <span className="font-medium text-foreground/80">→</span> {then}
                </p>
                <p className="text-xs text-muted-foreground">
                  {rule.triggerCount === 0
                    ? "Hasn't run yet"
                    : `Ran ${rule.triggerCount} time${rule.triggerCount === 1 ? "" : "s"}${
                        rule.lastTriggeredAt ? `, last ${formatDistanceToNowStrict(new Date(rule.lastTriggeredAt), { addSuffix: true })}` : ""
                      }`}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <AutomationRuleDialog
                  rule={rule}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label={`Edit ${rule.name}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${rule.name}`}
                  disabled={remove.isPending}
                  onClick={() => {
                    if (confirm(`Delete the rule "${rule.name}"?`)) {
                      remove.mutate(rule.id, { onSuccess: () => toast.success("Rule deleted") });
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
