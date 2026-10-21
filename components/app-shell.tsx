"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useWorkspace } from "@/providers/workspace-provider";
import { useNotifications, useMarkAllNotificationsRead } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Bell, Inbox, MessagesSquare, Settings, Users, Volume2, VolumeX } from "lucide-react";
import { isSoundEnabled, playMessageSound, setSoundEnabled } from "@/lib/notification-sound";
import { cn } from "@/lib/utils";

const NAV_ITEMS: { href: string; label: string; icon: typeof Inbox; matchPrefix?: string; adminOnly?: boolean }[] = [
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart3, adminOnly: true },
  { href: "/settings/channels", label: "Settings", icon: Settings, matchPrefix: "/settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { activeWorkspace, workspaces, switchWorkspace } = useWorkspace();
  const isAdmin = activeWorkspace?.role === "OWNER" || activeWorkspace?.role === "ADMIN";
  const { data: notifications } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();
  const pathname = usePathname();
  const router = useRouter();
  const [soundOn, setSoundOn] = useState(isSoundEnabled);

  const unreadNotifications = notifications?.filter((n) => !n.readAt).length ?? 0;
  const initials = (user?.fullName ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-6">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <MessagesSquare className="h-4 w-4" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className="max-w-[40vw] truncate text-sm font-semibold hover:text-muted-foreground sm:max-w-xs">
                    {activeWorkspace?.name ?? "SocialBox"}
                  </button>
                }
              />
              <DropdownMenuContent align="start">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
                  {workspaces.map((workspace) => (
                    <DropdownMenuItem key={workspace.id} onClick={() => switchWorkspace(workspace.id)}>
                      {workspace.name}
                      {workspace.id === activeWorkspace?.id && (
                        <Badge variant="secondary" className="ml-auto">
                          Active
                        </Badge>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/workspaces")}>
                  Manage workspaces
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>


          <nav
            aria-label="Main"
            className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-background pb-[env(safe-area-inset-bottom)] md:static md:inset-auto md:items-center md:gap-1 md:border-t-0 md:bg-transparent md:pb-0"
          >
            {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => {
              const isActive = pathname.startsWith(item.matchPrefix ?? item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors md:flex-none md:flex-row md:gap-1.5 md:rounded-md md:px-3 md:py-1.5 md:text-sm",
                    isActive
                      ? "text-primary md:bg-accent md:text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <item.icon className="h-5 w-5 md:h-4 md:w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            title={soundOn ? "Mute message sounds" : "Unmute message sounds"}
            aria-label={soundOn ? "Mute message sounds" : "Unmute message sounds"}
            onClick={() => {
              const next = !soundOn;
              setSoundEnabled(next);
              setSoundOn(next);
              if (next) void playMessageSound();
            }}
          >
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <DropdownMenu onOpenChange={(open) => open && unreadNotifications > 0 && markAllRead.mutate()}>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  {unreadNotifications > 0 && (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
                  )}
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                {!notifications?.length && (
                  <p className="px-2 py-4 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
                )}
                {notifications?.slice(0, 8).map((n) => (
                  <DropdownMenuItem key={n.id} className="flex-col items-start gap-0.5">
                    <span className="text-sm">
                      {n.type === "CONVERSATION_ASSIGNED" ? "A conversation was assigned to you" : n.type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <p className="font-medium">{user?.fullName}</p>
                  <p className="text-xs font-normal text-muted-foreground">{user?.email}</p>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/settings/team")}>Team settings</DropdownMenuItem>
              <DropdownMenuItem onClick={() => logout()}>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">{children}</div>
    </div>
  );
}
