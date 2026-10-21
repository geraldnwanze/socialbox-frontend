import { describe, expect, it } from "vitest";
import { expandCannedResponse, isGeneratedName } from "@/lib/canned-response-template";

describe("expandCannedResponse", () => {
  it("fills the customer's and the agent's first names", () => {
    expect(
      expandCannedResponse("Hi {{customer_name}}, it's {{agent_name}}.", { customerName: "Ann Lee", agentName: "Bob Stone" }),
    ).toBe("Hi Ann, it's Bob.");
  });

  it("is forgiving about spacing and case in placeholders", () => {
    expect(expandCannedResponse("{{ Customer_Name }}!", { customerName: "Ann" })).toBe("Ann!");
  });

  it('falls back to "there" for unknown or generated names', () => {
    for (const customerName of [undefined, null, "", "   ", "Website visitor 3D74", "Unknown"]) {
      expect(expandCannedResponse("Hi {{customer_name}}", { customerName })).toBe("Hi there");
    }
  });

  it("leaves unknown placeholders visible so the agent notices them", () => {
    expect(expandCannedResponse("Order {{order_id}}", {})).toBe("Order {{order_id}}");
  });
});

describe("isGeneratedName", () => {
  it("recognises placeholders the app generates, not real names", () => {
    expect(isGeneratedName("Website visitor 088E")).toBe(true);
    expect(isGeneratedName("unknown")).toBe(true);
    expect(isGeneratedName(undefined)).toBe(true);
    expect(isGeneratedName("Visitor Vincent")).toBe(false);
  });
});
