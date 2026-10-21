"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings/channels", label: "Channels" },
  { href: "/settings/replies", label: "Saved replies" },
  { href: "/settings/automations", label: "Automations" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/workspace", label: "Workspace" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="overflow-x-auto border-b px-2 sm:px-6">
        <nav className="flex min-w-max gap-1">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                pathname === tab.href
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
