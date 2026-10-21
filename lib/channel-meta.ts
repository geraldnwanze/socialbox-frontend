import type { ChannelType } from "./types";

export const CHANNEL_LABEL: Record<ChannelType, string> = {
  WHATSAPP: "WhatsApp",
  TELEGRAM: "Telegram",
  FACEBOOK_MESSENGER: "Messenger",
  INSTAGRAM: "Instagram",
  X: "X",
  TIKTOK: "TikTok",
  LIVE_CHAT: "Live chat",
  EMAIL: "Email",
};

export const CHANNEL_COLOR: Record<ChannelType, string> = {
  WHATSAPP: "#25D366",
  TELEGRAM: "#229ED9",
  FACEBOOK_MESSENGER: "#0084FF",
  INSTAGRAM: "#E1306C",
  X: "#000000",
  TIKTOK: "#000000",
  LIVE_CHAT: "#4F46E5",
  EMAIL: "#EA580C",
};

export function channelInitial(type: ChannelType): string {
  return CHANNEL_LABEL[type]?.[0] ?? "?";
}

/** How a contact is shown on a channel: "@handle" where that is the convention, the address for email. */
export function identityLabel(identity: { channel: ChannelType; username?: string; externalUserId: string }): string {
  if (identity.channel === "EMAIL") return identity.externalUserId;
  return identity.username ? `@${identity.username}` : identity.externalUserId;
}
