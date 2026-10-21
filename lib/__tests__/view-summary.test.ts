import { describe, expect, it } from "vitest";
import { describeFilters } from "@/lib/view-summary";
import type { ChannelConnection, Tag, WorkspaceMember } from "@/lib/types";

const ctx = {
  channels: [{ id: "c1", type: "EMAIL", externalAccountName: "Support <s@x.com>" } as ChannelConnection],
  tags: [{ id: "t1", name: "Refund" } as Tag],
  members: [{ id: "m1", user: { fullName: "Ann Lee" } } as unknown as WorkspaceMember],
};

describe("describeFilters", () => {
  it("defaults to Open", () => {
    expect(describeFilters({}, ctx)).toBe("Open");
  });

  it("lists everything that is set, in a stable order", () => {
    expect(
      describeFilters(
        { status: "PENDING", unreadOnly: true, assignedTo: "me", priority: "URGENT", channelConnectionId: "c1", tagId: "t1", search: "refund", sort: "oldest" },
        ctx,
      ),
    ).toBe('Pending · Unread · Assigned to me · Urgent priority · Support <s@x.com> · Tag: Refund · "refund" · Oldest first');
  });

  it("names teammates, and copes with ones it can't find", () => {
    expect(describeFilters({ assignedTo: "m1" }, ctx)).toBe("Open · Assigned to Ann Lee");
    expect(describeFilters({ assignedTo: "gone" }, ctx)).toBe("Open · Assigned to a teammate");
    expect(describeFilters({ assignedTo: "unassigned", tagId: "gone" }, ctx)).toBe("Open · Unassigned · Tag: …");
  });
});
