"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConnectChannel, useReconnectChannel } from "@/hooks/use-channels";
import { ApiError } from "@/lib/api-client";
import type { ChannelConnection, ChannelType } from "@/lib/types";
import { CHANNEL_LABEL } from "@/lib/channel-meta";
import { Loader2 } from "lucide-react";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface FieldConfig {
  name: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  optional?: boolean;
  secret?: boolean;
  /** Non-text inputs. Values are always stored as strings: "true"/"false", "09:00", "1,2,3". */
  kind?: "checkbox" | "time" | "days";
  /** Only shown while another field has this value (e.g. hours fields while hours are enabled). */
  showWhen?: { field: string; equals: string };
  defaultValue?: string;
  /** Renders a dropdown instead of a text box. */
  options?: { value: string; label: string }[];
}

const FIELDS_BY_TYPE: Partial<Record<ChannelType, FieldConfig[]>> = {
  TELEGRAM: [
    {
      name: "botToken",
      label: "Bot token",
      placeholder: "123456789:AAExampleTokenFromBotFather",
      helpText: "Create a bot with @BotFather on Telegram — no review required.",
    },
  ],
  WHATSAPP: [
    { name: "accessToken", label: "Access token" },
    { name: "phoneNumberId", label: "Phone number ID" },
  ],
  FACEBOOK_MESSENGER: [
    { name: "pageAccessToken", label: "Page access token" },
    { name: "pageId", label: "Page ID" },
  ],
  INSTAGRAM: [
    { name: "pageAccessToken", label: "Page access token" },
    { name: "instagramAccountId", label: "Instagram account ID" },
  ],
  EMAIL: [
    {
      name: "email",
      label: "Email address",
      placeholder: "support@yourcompany.com",
      helpText: "The mailbox customers write to. Replies are sent from this address.",
    },
    { name: "fromName", label: "Sender name", placeholder: "Acme Support", optional: true },
    {
      name: "username",
      label: "Username",
      helpText: "Leave empty to use the email address.",
      optional: true,
    },
    {
      name: "password",
      label: "Password",
      secret: true,
      helpText: "Gmail and Outlook require an app password, not your normal one. Stored encrypted.",
    },
    { name: "imapHost", label: "IMAP server (incoming)", placeholder: "imap.gmail.com" },
    { name: "imapPort", label: "IMAP port", defaultValue: "993" },
    {
      name: "imapSecurity",
      label: "IMAP security",
      defaultValue: "SSL",
      options: [
        { value: "SSL", label: "SSL/TLS (port 993)" },
        { value: "STARTTLS", label: "STARTTLS (port 143)" },
        { value: "NONE", label: "None (local testing only)" },
      ],
    },
    { name: "smtpHost", label: "SMTP server (outgoing)", placeholder: "smtp.gmail.com" },
    { name: "smtpPort", label: "SMTP port", defaultValue: "587" },
    {
      name: "smtpSecurity",
      label: "SMTP security",
      defaultValue: "STARTTLS",
      options: [
        { value: "STARTTLS", label: "STARTTLS (port 587)" },
        { value: "SSL", label: "SSL/TLS (port 465)" },
        { value: "NONE", label: "None (local testing only)" },
      ],
    },
  ],
  LIVE_CHAT: [
    { name: "title", label: "Widget title", placeholder: "Chat with us", optional: true },
    { name: "greeting", label: "Greeting", placeholder: "Hi! How can we help?", optional: true },
    { name: "color", label: "Brand color", placeholder: "#4F46E5", helpText: "Hex value, e.g. #4F46E5.", optional: true },
    {
      name: "askName",
      label: "Ask for the visitor's name before they chat",
      kind: "checkbox",
      optional: true,
      helpText: "The visitor's email is always required, so every chat can be followed up.",
    },
    {
      name: "hoursEnabled",
      label: "Show as offline outside opening hours",
      kind: "checkbox",
      optional: true,
      helpText: "Visitors can still leave messages; they just see your offline note.",
    },
    {
      name: "timezone",
      label: "Time zone",
      placeholder: "Europe/London",
      helpText: "Opening hours are read in this zone (an IANA name, e.g. America/New_York).",
      defaultValue: Intl.DateTimeFormat().resolvedOptions().timeZone,
      showWhen: { field: "hoursEnabled", equals: "true" },
    },
    {
      name: "hoursDays",
      label: "Open on",
      kind: "days",
      defaultValue: "1,2,3,4,5",
      showWhen: { field: "hoursEnabled", equals: "true" },
    },
    {
      name: "hoursStart",
      label: "Opens at",
      kind: "time",
      defaultValue: "09:00",
      showWhen: { field: "hoursEnabled", equals: "true" },
    },
    {
      name: "hoursEnd",
      label: "Closes at",
      kind: "time",
      defaultValue: "17:00",
      showWhen: { field: "hoursEnabled", equals: "true" },
    },
    {
      name: "offlineMessage",
      label: "Offline message",
      placeholder: "We're offline right now. Leave a message and we'll get back to you.",
      optional: true,
      showWhen: { field: "hoursEnabled", equals: "true" },
    },
    {
      name: "allowedOrigins",
      label: "Allowed websites",
      placeholder: "https://example.com, https://shop.example.com",
      helpText:
        "Comma-separated. Only these sites can use the widget. Leave empty to allow any site that has your snippet.",
      optional: true,
    },
  ],
};

function defaultsFor(type: ChannelType): Record<string, string> {
  return Object.fromEntries(
    (FIELDS_BY_TYPE[type] ?? []).filter((f) => f.defaultValue).map((f) => [f.name, f.defaultValue as string]),
  );
}

function initialValues(type: ChannelType, connection?: ChannelConnection): Record<string, string> {
  const meta = connection?.metadata;
  const defaults = defaultsFor(type);
  if (!meta) return defaults;
  if (type === "EMAIL") {
    // Secrets and ports aren't returned by the API, so only the visible parts come back.
    return {
      ...defaults,
      email: String(meta.email ?? ""),
      imapHost: String(meta.imapHost ?? ""),
      smtpHost: String(meta.smtpHost ?? ""),
    };
  }
  const origins = Array.isArray(meta.allowedOrigins) ? (meta.allowedOrigins as string[]).join(", ") : "";
  const hours = (meta.hours ?? {}) as { enabled?: boolean; timezone?: string; days?: number[]; start?: string; end?: string };
  return {
    ...defaults,
    title: String(meta.title ?? ""),
    greeting: String(meta.greeting ?? ""),
    color: String(meta.color ?? ""),
    allowedOrigins: origins,
    askName: String(meta.askName === true),
    offlineMessage: String(meta.offlineMessage ?? ""),
    hoursEnabled: String(hours.enabled === true),
    ...(hours.timezone && { timezone: hours.timezone }),
    ...(hours.days && { hoursDays: hours.days.join(",") }),
    ...(hours.start && { hoursStart: hours.start }),
    ...(hours.end && { hoursEnd: hours.end }),
  };
}

export function ConnectChannelDialog({
  type,
  trigger,
  connection,
  prefillFrom,
}: {
  type: ChannelType;
  trigger: React.ReactNode;
  /** When set, the dialog edits this existing connection's settings instead of creating one. */
  connection?: ChannelConnection;
  /** A previously disconnected connection whose settings should pre-fill a fresh connect. */
  prefillFrom?: ChannelConnection;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(type, connection ?? prefillFrom));
  const [error, setError] = useState<string | null>(null);
  const connect = useConnectChannel();
  const reconnect = useReconnectChannel();
  const mutation = connection ? reconnect : connect;
  const fields = FIELDS_BY_TYPE[type] ?? [];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (connection) {
        await reconnect.mutateAsync({ id: connection.id, credentials: values });
        toast.success(`${CHANNEL_LABEL[type]} settings saved`);
      } else {
        await connect.mutateAsync({ type, credentials: values });
        toast.success(`${CHANNEL_LABEL[type]} connected`);
        setValues(defaultsFor(type));
      }
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to connect this channel");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{connection ? `${CHANNEL_LABEL[type]} settings` : `Connect ${CHANNEL_LABEL[type]}`}</DialogTitle>
            <DialogDescription>
              {type === "LIVE_CHAT"
                ? "Set up the chat widget for your website. You'll get a snippet to paste into your site."
                : type === "EMAIL"
                  ? "Connect any mailbox over IMAP/SMTP. New mail from now on appears in your inbox within a minute; existing mail isn't imported."
                  : `Enter the credentials for the ${CHANNEL_LABEL[type]} account you want to connect.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {fields
              .filter((field) => !field.showWhen || values[field.showWhen.field] === field.showWhen.equals)
              .map((field) =>
                field.kind === "checkbox" ? (
                  <label key={field.name} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4"
                      checked={values[field.name] === "true"}
                      onChange={(e) => setValues((v) => ({ ...v, [field.name]: String(e.target.checked) }))}
                    />
                    <span>
                      {field.label}
                      {field.helpText && <span className="block text-xs text-muted-foreground">{field.helpText}</span>}
                    </span>
                  </label>
                ) : field.kind === "days" ? (
                  <div key={field.name} className="space-y-2">
                    <Label>{field.label}</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {DAY_LABELS.map((label, day) => {
                        const selected = (values[field.name] ?? "").split(",").filter(Boolean).includes(String(day));
                        return (
                          <button
                            key={label}
                            type="button"
                            aria-pressed={selected}
                            onClick={() =>
                              setValues((v) => {
                                const set = new Set((v[field.name] ?? "").split(",").filter(Boolean));
                                if (set.has(String(day))) set.delete(String(day));
                                else set.add(String(day));
                                return { ...v, [field.name]: [...set].sort().join(",") };
                              })
                            }
                            className={`rounded-md border px-2.5 py-1 text-xs ${selected ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>{field.label}</Label>
                {field.options ? (
                  <select
                    id={field.name}
                    value={values[field.name] ?? field.defaultValue ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {field.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={field.name}
                    type={field.secret ? "password" : field.kind === "time" ? "time" : "text"}
                    autoComplete={field.secret ? "new-password" : "off"}
                    required={!field.optional}
                    placeholder={field.placeholder}
                    value={values[field.name] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                  />
                )}
                {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
                  </div>
                ),
              )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {connection ? "Save" : "Connect"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
