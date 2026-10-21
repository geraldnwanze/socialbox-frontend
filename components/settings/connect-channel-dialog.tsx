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

interface FieldConfig {
  name: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  optional?: boolean;
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
  LIVE_CHAT: [
    { name: "title", label: "Widget title", placeholder: "Chat with us", optional: true },
    { name: "greeting", label: "Greeting", placeholder: "Hi! How can we help?", optional: true },
    { name: "color", label: "Brand color", placeholder: "#4F46E5", helpText: "Hex value, e.g. #4F46E5.", optional: true },
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

function initialValues(connection?: ChannelConnection): Record<string, string> {
  const meta = connection?.metadata;
  if (!meta) return {};
  const origins = Array.isArray(meta.allowedOrigins) ? (meta.allowedOrigins as string[]).join(", ") : "";
  return {
    title: String(meta.title ?? ""),
    greeting: String(meta.greeting ?? ""),
    color: String(meta.color ?? ""),
    allowedOrigins: origins,
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
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(connection ?? prefillFrom));
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
        setValues({});
      }
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to connect this channel");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{connection ? `${CHANNEL_LABEL[type]} settings` : `Connect ${CHANNEL_LABEL[type]}`}</DialogTitle>
            <DialogDescription>
              {type === "LIVE_CHAT"
                ? "Set up the chat widget for your website. You'll get a snippet to paste into your site."
                : `Enter the credentials for the ${CHANNEL_LABEL[type]} account you want to connect.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>{field.label}</Label>
                <Input
                  id={field.name}
                  required={!field.optional}
                  placeholder={field.placeholder}
                  value={values[field.name] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                />
                {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
              </div>
            ))}
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
