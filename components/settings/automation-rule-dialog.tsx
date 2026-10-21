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
import { Textarea } from "@/components/ui/textarea";
import { useCreateAutomationRule, useUpdateAutomationRule } from "@/hooks/use-automation";
import { useTags } from "@/hooks/use-tags";
import { useTeamMembers } from "@/hooks/use-team";
import { ApiError } from "@/lib/api-client";
import { AUTOMATION_CHANNELS, emptyForm, formFromRule, toPayload, type RuleForm } from "@/lib/automation-form";
import { CHANNEL_LABEL } from "@/lib/channel-meta";
import { PRIORITIES } from "@/lib/priority";
import type { AutomationRule } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Pill({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "rounded-md border px-2.5 py-1 text-xs",
        selected ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" className="h-4 w-4" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function AutomationRuleDialog({ rule, trigger }: { rule?: AutomationRule; trigger: ReactElement }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<RuleForm>(() => (rule ? formFromRule(rule) : emptyForm()));
  const [error, setError] = useState<string | null>(null);
  const { data: tags } = useTags();
  const { data: members } = useTeamMembers();
  const create = useCreateAutomationRule();
  const update = useUpdateAutomationRule();
  const mutation = rule ? update : create;
  const set = <K extends keyof RuleForm>(key: K, value: RuleForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = toPayload(form);
    try {
      if (rule) await update.mutateAsync({ id: rule.id, ...payload });
      else await create.mutateAsync(payload);
      toast.success(rule ? "Rule saved" : "Rule created");
      if (!rule) setForm(emptyForm());
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to save this rule");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{rule ? "Edit rule" : "New automation rule"}</DialogTitle>
            <DialogDescription>
              When a customer message matches <strong>all</strong> the conditions, the actions run. Leave every condition
              empty to run on every message.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="rule-name">Name</Label>
              <Input
                id="rule-name"
                required
                maxLength={80}
                placeholder="Refund requests"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>

            <fieldset className="space-y-3 rounded-lg border p-3">
              <legend className="px-1 text-sm font-medium">When…</legend>
              <div className="space-y-1.5">
                <Label>Channel is</Label>
                <div className="flex flex-wrap gap-1.5">
                  {AUTOMATION_CHANNELS.map((c) => (
                    <Pill key={c} selected={form.channels.includes(c)} onClick={() => set("channels", toggle(form.channels, c))}>
                      {CHANNEL_LABEL[c]}
                    </Pill>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">None selected means any channel.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rule-keywords">Message mentions any of</Label>
                <Input
                  id="rule-keywords"
                  placeholder="refund, chargeback, cancel"
                  value={form.keywords}
                  onChange={(e) => set("keywords", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Comma separated. Not case sensitive; &quot;refund&quot; also matches &quot;refunds&quot;.</p>
              </div>
              <Check checked={form.firstMessage} onChange={(v) => set("firstMessage", v)}>
                It&apos;s the first message of a new conversation
              </Check>
              <Check checked={form.unassigned} onChange={(v) => set("unassigned", v)}>
                Nobody owns the conversation yet
              </Check>
              <Check checked={form.outsideHours} onChange={(v) => set("outsideHours", v)}>
                It arrives outside opening hours
              </Check>
              {form.outsideHours && (
                <div className="space-y-3 rounded-md bg-muted/40 p-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="rule-tz">Time zone</Label>
                    <Input id="rule-tz" value={form.timezone} onChange={(e) => set("timezone", e.target.value)} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {DAY_LABELS.map((label, day) => (
                      <Pill key={label} selected={form.days.includes(day)} onClick={() => set("days", toggle(form.days, day).sort())}>
                        {label}
                      </Pill>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    Open
                    <Input type="time" className="w-28" value={form.start} onChange={(e) => set("start", e.target.value)} />
                    to
                    <Input type="time" className="w-28" value={form.end} onChange={(e) => set("end", e.target.value)} />
                  </div>
                </div>
              )}
            </fieldset>

            <fieldset className="space-y-3 rounded-lg border p-3">
              <legend className="px-1 text-sm font-medium">Then…</legend>
              <div className="space-y-1.5">
                <Label htmlFor="rule-assign">Assign to</Label>
                <select
                  id="rule-assign"
                  className={selectClass}
                  value={form.assignMode}
                  onChange={(e) => set("assignMode", e.target.value as RuleForm["assignMode"])}
                >
                  <option value="none">Nobody (don&apos;t assign)</option>
                  <option value="anyone">Whoever is least busy</option>
                  <option value="specific">The least busy of specific teammates</option>
                </select>
                {form.assignMode === "specific" && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {members?.map((m) => (
                      <Pill
                        key={m.id}
                        selected={form.assignMembers.includes(m.id)}
                        onClick={() => set("assignMembers", toggle(form.assignMembers, m.id))}
                      >
                        {m.user.fullName}
                      </Pill>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Never takes a conversation away from someone who already owns it.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rule-tag">Add tag</Label>
                <select id="rule-tag" className={selectClass} value={form.tagId} onChange={(e) => set("tagId", e.target.value)}>
                  <option value="">None</option>
                  {tags?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rule-priority">Set priority</Label>
                <select
                  id="rule-priority"
                  className={selectClass}
                  value={form.priority}
                  onChange={(e) => set("priority", e.target.value as RuleForm["priority"])}
                >
                  <option value="">Leave as is</option>
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rule-reply">Send an automatic reply</Label>
                <Textarea
                  id="rule-reply"
                  rows={3}
                  maxLength={2000}
                  placeholder="Hi {{customer_name}}, thanks for getting in touch! We'll reply as soon as we can."
                  value={form.replyText}
                  onChange={(e) => set("replyText", e.target.value)}
                />
                {form.replyText.trim() && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    At most once per conversation every
                    <Input
                      type="number"
                      min={1}
                      max={720}
                      className="h-7 w-16"
                      value={form.replyCooldownHours}
                      onChange={(e) => set("replyCooldownHours", Number(e.target.value) || 1)}
                    />
                    hours
                  </div>
                )}
              </div>
              <Check checked={form.resolve} onChange={(v) => set("resolve", v)}>
                Mark the conversation resolved (for spam and notifications)
              </Check>
            </fieldset>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {rule ? "Save changes" : "Create rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
