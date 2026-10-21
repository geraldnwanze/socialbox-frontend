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

export type ConversationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type ConversationEventType =
  | "CREATED"
  | "ASSIGNED"
  | "UNASSIGNED"
  | "STATUS_CHANGED"
  | "PRIORITY_CHANGED"
  | "TAG_ADDED"
  | "TAG_REMOVED"
  | "NOTE";

export interface ConversationEvent {
  id: string;
  type: ConversationEventType;
  data: Record<string, unknown>;
  createdAt: string;
  /** Null when the system did it (e.g. a customer message reopened the conversation). */
  actor: { id: string; name: string } | null;
}

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
  /** Lets agents use AI assist, which sends the open conversation to Anthropic. */
  aiAssistEnabled: boolean;
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
  priority: ConversationPriority;
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
  byTag: {
    tagId: string;
    name: string;
    color: string;
    conversations: number;
    answered: number;
    unanswered: number;
    medianFirstResponseSeconds: number | null;
  }[];
  /** Conversations in the period that carry no tag at all. */
  untagged: number;
  workload: {
    members: WorkloadRow[];
    unassigned: WorkloadRow;
    backlog: { awaitingReply: number; oldestWaitingSince: string | null };
  };
}

export interface WorkloadRow {
  memberId: string | null;
  name: string;
  open: number;
  pending: number;
  unread: number;
  awaitingReply: number;
  oldestWaitingSince: string | null;
  highPriority: number;
  resolved: number;
  messagesSent: number;
  medianFirstResponseSeconds: number | null;
}

export type AutomationCondition =
  | { type: "CHANNEL"; channels: ChannelType[] }
  | { type: "KEYWORDS"; keywords: string[] }
  | { type: "FIRST_MESSAGE" }
  | { type: "UNASSIGNED" }
  | { type: "OUTSIDE_HOURS"; hours: { enabled: boolean; timezone: string; days: number[]; start: string; end: string } };

export type AutomationAction =
  | { type: "ASSIGN"; memberIds: string[] }
  | { type: "ADD_TAG"; tagId: string }
  | { type: "SET_PRIORITY"; priority: ConversationPriority }
  | { type: "AUTO_REPLY"; text: string; cooldownMinutes: number }
  | { type: "RESOLVE" };

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  position: number;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  triggerCount: number;
  lastTriggeredAt?: string | null;
}

export interface InboxViewFilters {
  status?: ConversationStatus;
  channelConnectionId?: string;
  /** "me", "unassigned", or a member id. */
  assignedTo?: string;
  unreadOnly?: boolean;
  search?: string;
  priority?: ConversationPriority;
  tagId?: string;
  sort?: "newest" | "oldest";
}

export interface InboxView {
  id: string;
  name: string;
  shared: boolean;
  filters: InboxViewFilters;
  ownerName: string | null;
  canEdit: boolean;
}

export type BulkAction =
  | { type: "RESOLVE" | "REOPEN" | "PENDING" | "MARK_READ" }
  | { type: "ASSIGN"; memberId: string | null }
  | { type: "PRIORITY"; priority: ConversationPriority }
  | { type: "ADD_TAG" | "REMOVE_TAG"; tagId: string };

export interface BulkResult {
  updated: number;
  failed: { id: string; reason: string }[];
}

export interface AiStatus {
  /** The server has an API key. */
  configured: boolean;
  /** An admin switched AI assist on for this workspace. */
  enabled: boolean;
}

export interface AiSummary {
  summary: string;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  intent: string;
  needsReply: boolean;
  nextStep: string;
  cached: boolean;
}

export type RewriteTone = "friendlier" | "more_formal" | "shorter" | "fix_grammar";
