import { describe, expect, it } from "vitest";
import { formatDuration } from "@/lib/format-duration";

describe("formatDuration", () => {
  it("shows a dash when there is no data", () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(undefined)).toBe("—");
  });

  it("uses at most two units and rounds", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(24.4)).toBe("24s");
    expect(formatDuration(59.6)).toBe("1m 0s");
    expect(formatDuration(252)).toBe("4m 12s");
    expect(formatDuration(3600 * 2 + 300)).toBe("2h 5m");
    expect(formatDuration(86400 * 3 + 3600 * 4)).toBe("3d 4h");
  });
});
