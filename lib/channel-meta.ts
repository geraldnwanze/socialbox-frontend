import type { ChannelType } from "./types";

export const CHANNEL_LABEL: Record<ChannelType, string> = {
  WHATSAPP: "WhatsApp",
  TELEGRAM: "Telegram",
  FACEBOOK_MESSENGER: "Messenger",
  INSTAGRAM: "Instagram",
  X: "X",
  TIKTOK: "TikTok",
};

export const CHANNEL_COLOR: Record<ChannelType, string> = {
  WHATSAPP: "#25D366",
  TELEGRAM: "#229ED9",
  FACEBOOK_MESSENGER: "#0084FF",
  INSTAGRAM: "#E1306C",
  X: "#000000",
  TIKTOK: "#000000",
};

export function channelInitial(type: ChannelType): string {
  return CHANNEL_LABEL[type]?.[0] ?? "?";
}
