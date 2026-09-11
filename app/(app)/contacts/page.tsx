"use client";

import { useState } from "react";
import { useContacts } from "@/hooks/use-contacts";
import { ChannelLabel } from "@/components/channel-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Users } from "lucide-react";

function initialsOf(name?: string) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useContacts(search);
  const contacts = data?.items ?? [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden p-6">
      <h1 className="mb-1 text-xl font-semibold">Contacts</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Everyone who has messaged you, across every connected channel.
      </p>

      <div className="relative mb-4">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, username, or phone number..."
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto rounded-lg border">
        {isLoading && (
          <div className="flex justify-center p-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && contacts.length === 0 && (
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <Users className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No contacts yet</p>
            <p className="text-sm text-muted-foreground">
              Contacts are created automatically when a customer messages you.
            </p>
          </div>
        )}

        {contacts.map((contact, i) => (
          <div key={contact.id} className={`flex items-center gap-3 p-4 ${i > 0 ? "border-t" : ""}`}>
            <Avatar className="h-10 w-10">
              <AvatarFallback>{initialsOf(contact.displayName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{contact.displayName ?? "Unknown"}</p>
              <div className="mt-0.5 flex flex-wrap gap-2">
                {contact.identities.map((identity) => (
                  <ChannelLabel key={identity.id} type={identity.channel} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
