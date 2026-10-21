import { describe, expect, it } from "vitest";
import { emptyForm, formFromRule, summarize, toPayload } from "@/lib/automation-form";
import type { AutomationRule } from "@/lib/types";

const rule = (over: Partial<AutomationRule> = {}): AutomationRule => ({
  id: "r1",
  name: "Refunds",
  enabled: true,
  position: 0,
  conditions: [],
  actions: [{ type: "RESOLVE" }],
  triggerCount: 0,
  ...over,
});

describe("toPayload", () => {
  it("only emits the conditions and actions that were switched on", () => {
    const payload = toPayload({
      ...emptyForm(),
      name: "  Refunds  ",
      channels: ["EMAIL"],
      keywords: " refund, , chargeback ",
      firstMessage: true,
      assignMode: "specific",
      assignMembers: ["m1"],
      tagId: "t1",
      priority: "HIGH",
      replyText: "  Hi {{customer_name}}  ",
      replyCooldownHours: 2,
      resolve: true,
    });
    expect(payload.name).toBe("Refunds");
    expect(payload.conditions).toEqual([
      { type: "CHANNEL", channels: ["EMAIL"] },
      { type: "KEYWORDS", keywords: ["refund", "chargeback"] },
      { type: "FIRST_MESSAGE" },
    ]);
    expect(payload.actions).toEqual([
      { type: "ASSIGN", memberIds: ["m1"] },
      { type: "ADD_TAG", tagId: "t1" },
      { type: "SET_PRIORITY", priority: "HIGH" },
      { type: "AUTO_REPLY", text: "Hi {{customer_name}}", cooldownMinutes: 120 },
      { type: "RESOLVE" },
    ]);
  });

  it("an empty form yields no conditions (every message) and no actions", () => {
    expect(toPayload(emptyForm())).toMatchObject({ conditions: [], actions: [] });
  });

  it('"anyone" assignment sends an empty teammate list', () => {
    expect(toPayload({ ...emptyForm(), assignMode: "anyone" }).actions).toEqual([{ type: "ASSIGN", memberIds: [] }]);
  });

  it("includes opening hours only when requested", () => {
    const withHours = toPayload({ ...emptyForm(), outsideHours: true, timezone: "Europe/London", days: [1, 2], start: "08:00", end: "18:00" });
    expect(withHours.conditions).toEqual([
      { type: "OUTSIDE_HOURS", hours: { enabled: true, timezone: "Europe/London", days: [1, 2], start: "08:00", end: "18:00" } },
    ]);
  });
});

describe("formFromRule (round trip)", () => {
  it("loads a rule back into the form so editing then saving changes nothing", () => {
    const original = rule({
      conditions: [
        { type: "CHANNEL", channels: ["LIVE_CHAT"] },
        { type: "KEYWORDS", keywords: ["refund"] },
        { type: "UNASSIGNED" },
      ],
      actions: [
        { type: "ASSIGN", memberIds: [] },
        { type: "AUTO_REPLY", text: "Hello", cooldownMinutes: 720 },
      ],
    });
    const payload = toPayload(formFromRule(original));
    expect(payload.conditions).toEqual(original.conditions);
    expect(payload.actions).toEqual(original.actions);
  });
});

describe("summarize", () => {
  const lookup = {
    memberName: (id: string) => ({ m1: "Ann Lee" })[id as "m1"],
    tagName: (id: string) => ({ t1: "Refund" })[id as "t1"],
  };

  it("describes a rule in plain English", () => {
    const s = summarize(
      rule({
        conditions: [{ type: "KEYWORDS", keywords: ["refund", "cancel"] }, { type: "CHANNEL", channels: ["EMAIL", "TELEGRAM"] }],
        actions: [{ type: "ADD_TAG", tagId: "t1" }, { type: "SET_PRIORITY", priority: "URGENT" }, { type: "ASSIGN", memberIds: ["m1"] }],
      }),
      lookup,
    );
    expect(s.when).toBe('it mentions "refund" or "cancel", and on Email or Telegram');
    expect(s.then).toBe('tag "Refund", set priority to Urgent, assign to the least busy of Ann Lee');
  });

  it('says "any message arrives" when there are no conditions, and tolerates deleted tags and members', () => {
    const s = summarize(rule({ actions: [{ type: "ADD_TAG", tagId: "gone" }, { type: "ASSIGN", memberIds: ["gone"] }] }), lookup);
    expect(s.when).toBe("any message arrives");
    expect(s.then).toContain('tag "a tag"');
    expect(s.then).toContain("a teammate");
  });
});
