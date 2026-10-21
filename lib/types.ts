export type WorkspaceRole = "OWNER" | "ADMIN" | "AGENT";

export type ChannelType =
  | "WHATSAPP"
  | "TELEGRAM"
  | "FACEBOOK_MESSENGER"
  | "INSTAGRAM"
  | "X"
  | "TIKTOK"
  | "LIVE_CHAT"
  | "EMAIL";

export type ChannelConnectionStatus = "CONNECTED" | "DISCONNECTED" | "ERROR" | "PENDING";

export type ConversationStatus = "OPEN" | "PENDING" | "RESOLVED";

export type MessageDirection = "INBOUND" | "OUTBOUND";

export type MessageType =
  | "TEXT"
  | "IMAGE"
  | "VIDEO"
  | "AUDIO"
  | "DOCUMENT"
  | "STICKER"
  | "SYSTEM"
  | "UNKNOWN";

export type MessageStatus =
  | "RECEIVED"
  | "QUEUED"
  | "SENDING"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED";

export interface User {
  id: string;
  email: string;
  fullName: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  /** Tell customers when an agent has read their message. */
  sendReadReceipts: boolean;
  role: WorkspaceRole;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: string;
  user: User;
}

export interface ChannelCapabilities {
  sendText: boolean;
  sendImage: boolean;
  sendVideo: boolean;
  sendAudio: boolean;
  sendDocument: boolean;
  markAsRead: boolean;
  deliveryReceipts: boolean;
  readReceipts: boolean;
}

export interface ChannelCatalogEntry {
  type: ChannelType;
  available: boolean;
  capabilities?: ChannelCapabilities;
  reason?: string;
}

export interface ChannelConnection {
  id: string;
  workspaceId: string;
  type: ChannelType;
  provider: string;
  status: ChannelConnectionStatus;
  externalAccountId?: string;
  externalAccountName?: string;
  lastErrorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ContactIdentity {
  id: string;
  channel: ChannelType;
  channelConnectionId: string;
  externalUserId: string;
  username?: string;
  displayName?: string;
  /** Channel-specific facts, e.g. IP / country / page for live chat visitors. */
  metadata?: Record<string, unknown>;
}

export interface Contact {
  id: string;
  workspaceId: string;
  displayName?: string;
  avatarUrl?: string;
  email?: string;
  phone?: string;
  /** Internal notes, never sent to the customer. */
  notes?: string;
  identities: ContactIdentity[];
  createdAt: string;
}

export interface Tag {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
}

export interface ConversationTagLink {
  id: string;
  tagId: string;
  tag: Tag;
}

export interface Conversation {
  id: string;
  workspaceId: string;
  channelConnectionId: string;
  contactId: string;
  externalConversationId: string;
  status: ConversationStatus;
  assignedTo?: string | null;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  contact?: Contact;
  channelConnection?: ChannelConnection;
  assignee?: WorkspaceMember;
}

export interface MessageAttachment {
  id: string;
  messageId: string;
  storageKey?: string;
  mimeType?: string;
  fileName?: string;
  fileSize?: number;
  sourceUrl?: string;
}

export interface Message {
  id: string;
  workspaceId: string;
  conversationId: string;
  channelConnectionId: string;
  externalMessageId?: string;
  senderType: "CONTACT" | "AGENT" | "SYSTEM";
  senderExternalId?: string;
  senderMemberId?: string;
  direction: MessageDirection;
  messageType: MessageType;
  content?: string;
  status: MessageStatus;
  failureReason?: string;
  sentAt: string;
  createdAt: string;
  /** Channel facts about this message, e.g. an email's subject. */
  metadata?: Record<string, unknown>;
  attachments?: MessageAttachment[];
}

export interface Notification {
  id: string;
  workspaceId: string;
  userId: string;
  type: string;
  payload: Record<string, unknown>;
  readAt?: string;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

export interface CannedResponse {
  id: string;
  workspaceId: string;
  title: string;
  /** Typed after "/" in the composer, e.g. "shipping". */
  shortcut: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface DurationStats {
  count: number;
  avgSeconds: number | null;
  medianSeconds: number | null;
  p90Seconds: number | null;
}

export interface AnalyticsOverview {
  range: { days: number; from: string; to: string };
  totals: {
    newConversations: number;
    answered: number;
    unanswered: number;
    resolved: number;
    inboundMessages: number;
    outboundMessages: number;
  };
  firstResponse: DurationStats;
  resolution: DurationStats;
  daily: { date: string; conversations: number }[];
  byChannel: {
    channelConnectionId: string;
    type: ChannelType;
    name: string | null;
    conversations: number;
    answered: number;
    medianFirstResponseSeconds: number | null;
  }[];
  byAgent: {
    memberId: string;
    name: string | null;
    firstReplies: number;
    medianFirstResponseSeconds: number | null;
  }[];
}
