export const PLACEHOLDERS = [
  { token: "{{customer_name}}", description: "Customer's first name (\"there\" if unknown)" },
  { token: "{{agent_name}}", description: "Your first name" },
] as const;

function firstName(fullName?: string | null): string | null {
  const first = fullName?.trim().split(/\s+/)[0];
  return first || null;
}

/** Live chat visitors and unnamed contacts get a generated label, which reads badly in "Hi X". */
export function isGeneratedName(name?: string | null): boolean {
  return !name || /^(website visitor|unknown)\b/i.test(name.trim());
}

/** Fills the known placeholders. Anything else is left as typed so the agent notices it. */
export function expandCannedResponse(
  content: string,
  context: { customerName?: string | null; agentName?: string | null },
): string {
  const customer = isGeneratedName(context.customerName) ? "there" : (firstName(context.customerName) ?? "there");
  const agent = firstName(context.agentName) ?? "";
  return content
    .replace(/\{\{\s*customer_name\s*\}\}/gi, customer)
    .replace(/\{\{\s*agent_name\s*\}\}/gi, agent);
}
