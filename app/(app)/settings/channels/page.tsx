"use client";

import { toast } from "sonner";
import { useChannels, useDisconnectChannel } from "@/hooks/use-channels";
import { ConnectChannelDialog } from "@/components/settings/connect-channel-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChannelDot } from "@/components/channel-badge";
import { CHANNEL_LABEL } from "@/lib/channel-meta";
import { Loader2, Plug, Unplug } from "lucide-react";

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

  const connectedByType = new Map((data?.connected ?? []).map((c) => [c.type, c]));

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
              <CardContent className="flex justify-end gap-2">
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
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
