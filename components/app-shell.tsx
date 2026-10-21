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
    <div className="flex h-screen flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <MessagesSquare className="h-4 w-4" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className="text-sm font-semibold hover:text-muted-foreground">
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

          <nav className="flex items-center gap-1">
            {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => {
              const isActive = pathname.startsWith(item.matchPrefix ?? item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
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

      <div className="flex flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
