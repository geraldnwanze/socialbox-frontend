export type WorkspaceRole = "OWNER" | "ADMIN" | "AGENT";

export type ChannelType =
  | "WHATSAPP"
  | "TELEGRAM"
  | "FACEBOOK_MESSENGER"
  | "INSTAGRAM"
  | "X"
  | "TIKTOK"
  | "LIVE_CHAT";

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
