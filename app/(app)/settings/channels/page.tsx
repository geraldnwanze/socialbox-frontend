"use client";

import { toast } from "sonner";
import { useChannels, useDisconnectChannel } from "@/hooks/use-channels";
import { ConnectChannelDialog } from "@/components/settings/connect-channel-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChannelDot } from "@/components/channel-badge";
import { CHANNEL_LABEL } from "@/lib/channel-meta";
import { API_URL } from "@/lib/api-client";
import { Copy, Loader2, Plug, Settings2, Unplug } from "lucide-react";

export default function ChannelsSettingsPage() {
  const { data, isLoading } = useChannels();
  const disconnect = useDisconnectChannel();

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Settings of a disconnected connection, so reconnecting doesn't silently reset them
  // (e.g. the live chat's allowed websites) to defaults.
  const lastDisconnectedByType = new Map(
    (data?.connected ?? []).filter((c) => c.status === "DISCONNECTED").map((c) => [c.type, c]),
  );
  const connectedByType = new Map(
    (data?.connected ?? [])
      .filter((c) => c.status !== "DISCONNECTED")
      .map((c) => [c.type, c]),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <div>
        <h1 className="text-xl font-semibold">Channels</h1>
        <p className="text-sm text-muted-foreground">Connect the messaging channels your business uses.</p>
      </div>

      <div className="space-y-3">
        {data?.catalog.map((entry) => {
          const connection = connectedByType.get(entry.type);
          return (
            <Card key={entry.type}>
              <CardHeader className="flex-row items-center gap-3 space-y-0">
                <ChannelDot type={entry.type} className="h-8 w-8 text-sm" />
                <div className="flex-1">
                  <CardTitle className="text-base">{CHANNEL_LABEL[entry.type]}</CardTitle>
                  {connection ? (
                    <CardDescription>{connection.externalAccountName ?? connection.externalAccountId}</CardDescription>
                  ) : (
                    <CardDescription>{entry.reason ?? "Not connected"}</CardDescription>
                  )}
                </div>
                {connection && (
                  <Badge variant={connection.status === "CONNECTED" ? "default" : "secondary"}>
                    {connection.status}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {entry.type === "LIVE_CHAT" && connection && connection.externalAccountId && (
                  <EmbedSnippet widgetKey={connection.externalAccountId} />
                )}
                <div className="flex justify-end gap-2">
                {entry.type === "LIVE_CHAT" && connection && (
                  <ConnectChannelDialog
                    type={entry.type}
                    connection={connection}
                    trigger={
                      <Button variant="outline" size="sm">
                        <Settings2 className="h-4 w-4" /> Settings
                      </Button>
                    }
                  />
                )}
                {connection ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={disconnect.isPending}
                    onClick={() =>
                      disconnect.mutate(connection.id, {
                        onSuccess: () => toast.success(`${CHANNEL_LABEL[entry.type]} disconnected`),
                      })
                    }
                  >
                    <Unplug className="h-4 w-4" /> Disconnect
                  </Button>
                ) : entry.available ? (
                  <ConnectChannelDialog
                    type={entry.type}
                    prefillFrom={lastDisconnectedByType.get(entry.type)}
                    trigger={
                      <Button size="sm">
                        <Plug className="h-4 w-4" /> Connect
                      </Button>
                    }
                  />
                ) : (
                  <Button size="sm" disabled>
                    Coming soon
                  </Button>
                )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function EmbedSnippet({ widgetKey }: { widgetKey: string }) {
  const snippet = `<script src="${API_URL}/widget.js" data-key="${widgetKey}" async></script>`;
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">
        Paste this just before the closing <code>&lt;/body&gt;</code> tag of your website:
      </p>
      <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-2">
        <code className="flex-1 break-all text-xs">{snippet}</code>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          aria-label="Copy embed snippet"
          onClick={() => navigator.clipboard.writeText(snippet).then(() => toast.success("Snippet copied"))}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
