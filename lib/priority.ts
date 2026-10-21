import type { ConversationPriority } from "./types";

export const PRIORITIES: { value: ConversationPriority; label: string }[] = [
  { value: "URGENT", label: "Urgent" },
  { value: "HIGH", label: "High" },
  { value: "NORMAL", label: "Normal" },
  { value: "LOW", label: "Low" },
];

export const PRIORITY_LABEL: Record<ConversationPriority, string> = {
  URGENT: "Urgent",
  HIGH: "High",
  NORMAL: "Normal",
  LOW: "Low",
};

/** Only the ones that need attention get a badge in the list; "Normal" would just be noise. */
export const PRIORITY_BADGE_CLASS: Partial<Record<ConversationPriority, string>> = {
  URGENT: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
};
