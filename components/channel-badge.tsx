import { CHANNEL_COLOR, CHANNEL_LABEL, channelInitial } from "@/lib/channel-meta";
import type { ChannelType } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ChannelDot({ type, className }: { type: ChannelType; className?: string }) {
  return (
    <span
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white",
        className,
      )}
      style={{ backgroundColor: CHANNEL_COLOR[type] }}
      title={CHANNEL_LABEL[type]}
    >
      {channelInitial(type)}
    </span>
  );
}

export function ChannelLabel({ type }: { type: ChannelType }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <ChannelDot type={type} />
      {CHANNEL_LABEL[type]}
    </span>
  );
}
