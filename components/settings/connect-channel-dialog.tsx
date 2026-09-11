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
import { useConnectChannel } from "@/hooks/use-channels";
import { ApiError } from "@/lib/api-client";
import type { ChannelType } from "@/lib/types";
import { CHANNEL_LABEL } from "@/lib/channel-meta";
import { Loader2 } from "lucide-react";

interface FieldConfig {
  name: string;
  label: string;
  placeholder?: string;
  helpText?: string;
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
};

export function ConnectChannelDialog({ type, trigger }: { type: ChannelType; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const connect = useConnectChannel();
  const fields = FIELDS_BY_TYPE[type] ?? [];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await connect.mutateAsync({ type, credentials: values });
      toast.success(`${CHANNEL_LABEL[type]} connected`);
      setOpen(false);
      setValues({});
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
            <DialogTitle>Connect {CHANNEL_LABEL[type]}</DialogTitle>
            <DialogDescription>
              Enter the credentials for the {CHANNEL_LABEL[type]} account you want to connect.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>{field.label}</Label>
                <Input
                  id={field.name}
                  required
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
            <Button type="submit" disabled={connect.isPending}>
              {connect.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Connect
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
