import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { InboxFiltersProvider, useInboxFilters } from "@/components/inbox/inbox-filters-context";
import type { InboxView } from "@/lib/types";

const wrapper = ({ children }: { children: ReactNode }) => <InboxFiltersProvider>{children}</InboxFiltersProvider>;
const setup = () => renderHook(() => useInboxFilters(), { wrapper });

const view = (filters: InboxView["filters"], id = "v1"): InboxView => ({ id, name: "My view", shared: false, filters, ownerName: null, canEdit: true });

describe("inbox filters", () => {
  it("starts on open conversations with nothing customised", () => {
    const { result } = setup();
    expect(result.current.filters).toEqual({ status: "OPEN" });
    expect(result.current.isCustomised).toBe(false);
    expect(result.current.activeViewId).toBeNull();
  });

  it("combines the tab, search and sidebar choice into the request filters", () => {
    const { result } = setup();
    act(() => result.current.setStatus("PENDING"));
    act(() => result.current.setSearch("  refund "));
    act(() => result.current.setSidebar({ assignedTo: "me" }));
    expect(result.current.filters).toEqual({ status: "PENDING", search: "refund", assignedTo: "me" });
    expect(result.current.isCustomised).toBe(true);
  });

  it("selecting an inbox in the sidebar clears priority/tag/order but keeps the tab and search", () => {
    const { result } = setup();
    act(() => result.current.setExtras({ priority: "HIGH", tagId: "t1", sort: "oldest" }));
    act(() => result.current.setSearch("hello"));
    act(() => result.current.setStatus("RESOLVED"));
    expect(result.current.filters).toMatchObject({ priority: "HIGH", tagId: "t1", sort: "oldest" });

    act(() => result.current.selectInbox({ unreadOnly: true }));

    expect(result.current.filters).toEqual({ status: "RESOLVED", search: "hello", unreadOnly: true });
  });

  it("applying a saved view sets everything it remembers and marks it active", () => {
    const { result } = setup();
    act(() => result.current.setSearch("stale"));
    act(() =>
      result.current.applyView(
        view({ status: "PENDING", assignedTo: "unassigned", priority: "URGENT", tagId: "t9", sort: "oldest", unreadOnly: true, channelConnectionId: "c1" }),
      ),
    );
    expect(result.current.filters).toEqual({
      status: "PENDING",
      assignedTo: "unassigned",
      unreadOnly: true,
      channelConnectionId: "c1",
      priority: "URGENT",
      tagId: "t9",
      sort: "oldest",
    });
    expect(result.current.activeViewId).toBe("v1");
  });

  it("a view without a status shows open conversations, and clears a previous search", () => {
    const { result } = setup();
    act(() => result.current.setStatus("RESOLVED"));
    act(() => result.current.setSearch("old"));
    act(() => result.current.applyView(view({ priority: "LOW" })));
    expect(result.current.filters).toEqual({ status: "OPEN", priority: "LOW" });
  });

  it("any manual change after applying a view means it is no longer 'the view'", () => {
    for (const change of [
      (r: ReturnType<typeof setup>["result"]) => r.current.setStatus("PENDING"),
      (r: ReturnType<typeof setup>["result"]) => r.current.setSearch("x"),
      (r: ReturnType<typeof setup>["result"]) => r.current.setSidebar({}),
      (r: ReturnType<typeof setup>["result"]) => r.current.setExtras({}),
      (r: ReturnType<typeof setup>["result"]) => r.current.selectInbox({}),
    ]) {
      const { result } = setup();
      act(() => result.current.applyView(view({ priority: "HIGH" })));
      expect(result.current.activeViewId).toBe("v1");
      act(() => change(result));
      expect(result.current.activeViewId).toBeNull();
    }
  });

  it("snapshot captures exactly what's on screen, and reset goes back to the start", () => {
    const { result } = setup();
    act(() => result.current.setExtras({ tagId: "t1" }));
    act(() => result.current.setStatus("PENDING"));
    expect(result.current.snapshot()).toEqual({ status: "PENDING", tagId: "t1" });
    act(() => result.current.reset());
    expect(result.current.filters).toEqual({ status: "OPEN" });
    expect(result.current.isCustomised).toBe(false);
  });
});
