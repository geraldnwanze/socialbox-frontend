import type { AutomationAction, AutomationCondition, AutomationRule, ChannelType, ConversationPriority } from "./types";
import { CHANNEL_LABEL } from "./channel-meta";
import { PRIORITY_LABEL } from "./priority";

/** What the rule dialog edits. Converted to and from the API's condition/action lists. */
export interface RuleForm {
  name: string;
  channels: ChannelType[];
  keywords: string;
  firstMessage: boolean;
  unassigned: boolean;
  outsideHours: boolean;
  timezone: string;
  days: number[];
  start: string;
  end: string;
  assignMode: "none" | "anyone" | "specific";
  assignMembers: string[];
  tagId: string;
  priority: ConversationPriority | "";
  replyText: string;
  replyCooldownHours: number;
  resolve: boolean;
}

export const AUTOMATION_CHANNELS: ChannelType[] = [
  "LIVE_CHAT",
  "EMAIL",
  "WHATSAPP",
  "TELEGRAM",
  "FACEBOOK_MESSENGER",
  "INSTAGRAM",
];

export function emptyForm(): RuleForm {
  return {
    name: "",
    channels: [],
    keywords: "",
    firstMessage: false,
    unassigned: false,
    outsideHours: false,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    days: [1, 2, 3, 4, 5],
    start: "09:00",
    end: "17:00",
    assignMode: "none",
    assignMembers: [],
    tagId: "",
    priority: "",
    replyText: "",
    replyCooldownHours: 12,
    resolve: false,
  };
}

export function formFromRule(rule: AutomationRule): RuleForm {
  const form = { ...emptyForm(), name: rule.name };
  for (const c of rule.conditions) {
    if (c.type === "CHANNEL") form.channels = c.channels;
    if (c.type === "KEYWORDS") form.keywords = c.keywords.join(", ");
    if (c.type === "FIRST_MESSAGE") form.firstMessage = true;
    if (c.type === "UNASSIGNED") form.unassigned = true;
    if (c.type === "OUTSIDE_HOURS") {
      form.outsideHours = true;
      form.timezone = c.hours.timezone;
      form.days = c.hours.days;
      form.start = c.hours.start;
      form.end = c.hours.end;
    }
  }
  for (const a of rule.actions) {
    if (a.type === "ASSIGN") {
      form.assignMode = a.memberIds.length ? "specific" : "anyone";
      form.assignMembers = a.memberIds;
    }
    if (a.type === "ADD_TAG") form.tagId = a.tagId;
    if (a.type === "SET_PRIORITY") form.priority = a.priority;
    if (a.type === "AUTO_REPLY") {
      form.replyText = a.text;
      form.replyCooldownHours = Math.max(1, Math.round(a.cooldownMinutes / 60));
    }
    if (a.type === "RESOLVE") form.resolve = true;
  }
  return form;
}

export function toPayload(form: RuleForm): { name: string; conditions: AutomationCondition[]; actions: AutomationAction[] } {
  const conditions: AutomationCondition[] = [];
  if (form.channels.length) conditions.push({ type: "CHANNEL", channels: form.channels });
  const keywords = form.keywords.split(",").map((k) => k.trim()).filter(Boolean);
  if (keywords.length) conditions.push({ type: "KEYWORDS", keywords });
  if (form.firstMessage) conditions.push({ type: "FIRST_MESSAGE" });
  if (form.unassigned) conditions.push({ type: "UNASSIGNED" });
  if (form.outsideHours) {
    conditions.push({
      type: "OUTSIDE_HOURS",
      hours: { enabled: true, timezone: form.timezone, days: form.days, start: form.start, end: form.end },
    });
  }

  const actions: AutomationAction[] = [];
  if (form.assignMode === "anyone") actions.push({ type: "ASSIGN", memberIds: [] });
  if (form.assignMode === "specific") actions.push({ type: "ASSIGN", memberIds: form.assignMembers });
  if (form.tagId) actions.push({ type: "ADD_TAG", tagId: form.tagId });
  if (form.priority) actions.push({ type: "SET_PRIORITY", priority: form.priority });
  if (form.replyText.trim()) {
    actions.push({ type: "AUTO_REPLY", text: form.replyText.trim(), cooldownMinutes: Math.max(1, form.replyCooldownHours) * 60 });
  }
  if (form.resolve) actions.push({ type: "RESOLVE" });
  return { name: form.name.trim(), conditions, actions };
}

/** One-line plain-English description for the rules list. */
export function summarize(
  rule: AutomationRule,
  lookup: { memberName: (id: string) => string | undefined; tagName: (id: string) => string | undefined },
): { when: string; then: string } {
  const when = rule.conditions.length
    ? rule.conditions
        .map((c) => {
          switch (c.type) {
            case "CHANNEL":
              return `on ${c.channels.map((ch) => CHANNEL_LABEL[ch]).join(" or ")}`;
            case "KEYWORDS":
              return `it mentions ${c.keywords.map((k) => `"${k}"`).join(" or ")}`;
            case "FIRST_MESSAGE":
              return "it's a new conversation";
            case "UNASSIGNED":
              return "nobody owns the conversation";
            case "OUTSIDE_HOURS":
              return `it arrives outside ${c.hours.start}–${c.hours.end} (${c.hours.timezone})`;
          }
        })
        .join(", and ")
    : "any message arrives";
  const then = rule.actions
    .map((a) => {
      switch (a.type) {
        case "ASSIGN":
          return a.memberIds.length
            ? `assign to the least busy of ${a.memberIds.map((id) => lookup.memberName(id) ?? "a teammate").join(", ")}`
            : "assign to the least busy teammate";
        case "ADD_TAG":
          return `tag "${lookup.tagName(a.tagId) ?? "a tag"}"`;
        case "SET_PRIORITY":
          return `set priority to ${PRIORITY_LABEL[a.priority]}`;
        case "AUTO_REPLY":
          return "send an automatic reply";
        case "RESOLVE":
          return "mark it resolved";
      }
    })
    .join(", ");
  return { when, then };
}
