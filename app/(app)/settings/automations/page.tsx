"use client";

import { toast } from "sonner";
import { formatDistanceToNowStrict } from "date-fns";
import { useWorkspace } from "@/providers/workspace-provider";
import {
  useAutomationRules,
  useDeleteAutomationRule,
  useReorderAutomationRules,
  useUpdateAutomationRule,
} from "@/hooks/use-automation";
import { useTags } from "@/hooks/use-tags";
import { useTeamMembers } from "@/hooks/use-team";
import { summarize } from "@/lib/automation-form";
import { AutomationRuleDialog } from "@/components/settings/automation-rule-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, ChevronUp, Loader2, Pencil, Plus, Trash2, Zap } from "lucide-react";

export default function AutomationsSettingsPage() {
  const { activeWorkspace } = useWorkspace();
  const isAdmin = activeWorkspace?.role === "OWNER" || activeWorkspace?.role === "ADMIN";
  const { data: rules, isLoading, isError } = useAutomationRules(isAdmin);
  const { data: tags } = useTags();
  const { data: members } = useTeamMembers();
  const update = useUpdateAutomationRule();
  const remove = useDeleteAutomationRule();
  const reorder = useReorderAutomationRules();

  function move(index: number, by: -1 | 1) {
    if (!rules) return;
    const ids = rules.map((r) => r.id);
    const target = index + by;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder.mutate(ids);
  }

  if (activeWorkspace && !isAdmin) {
    return <div className="mx-auto max-w-2xl p-4 sm:p-6 text-sm text-muted-foreground">Automations are managed by workspace admins.</div>;
  }

  const lookup = {
    memberName: (id: string) => members?.find((m) => m.id === id)?.user.fullName,
    tagName: (id: string) => tags?.find((t) => t.id === id)?.name,
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Automations</h1>
          <p className="text-sm text-muted-foreground">
            Handle routine work automatically: route, tag and prioritise conversations, or send an automatic reply. Rules
            run top to bottom on every new customer message (use the arrows to change the order), and everything they do shows in the conversation&apos;s activity.
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
        {rules?.map((rule, index) => {
          const { when, then } = summarize(rule, lookup);
          return (
            <div key={rule.id} className="flex items-start gap-3 p-4">
              <div className="flex shrink-0 flex-col items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  aria-label={`Run ${rule.name} earlier`}
                  disabled={index === 0 || reorder.isPending}
                  onClick={() => move(index, -1)}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <span className="text-[11px] tabular-nums text-muted-foreground" title="Rules run in this order">
                  {index + 1}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  aria-label={`Run ${rule.name} later`}
                  disabled={index === rules.length - 1 || reorder.isPending}
                  onClick={() => move(index, 1)}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
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
