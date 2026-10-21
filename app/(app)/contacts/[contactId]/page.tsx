"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { toast } from "sonner";
import { useWorkspace } from "@/providers/workspace-provider";
import { useContact, useContactConversations, useUpdateContact } from "@/hooks/use-contacts";
import { ApiError } from "@/lib/api-client";
import { ChannelLabel } from "@/components/channel-badge";
import { identityLabel } from "@/lib/channel-meta";
import { MergeContactDialog } from "@/components/contacts/merge-contact-dialog";
import { PageSpinner } from "@/components/page-spinner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, GitMerge, Loader2 } from "lucide-react";
import type { Contact } from "@/lib/types";

function initialsOf(name?: string) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function ContactForm({ contact }: { contact: Contact }) {
  const update = useUpdateContact(contact.id);
  const [name, setName] = useState(contact.displayName ?? "");
  const [email, setEmail] = useState(contact.email ?? "");
  const [phone, setPhone] = useState(contact.phone ?? "");
  const [notes, setNotes] = useState(contact.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const dirty =
    name !== (contact.displayName ?? "") ||
    email !== (contact.email ?? "") ||
    phone !== (contact.phone ?? "") ||
    notes !== (contact.notes ?? "");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await update.mutateAsync({ displayName: name, email, phone, notes });
      toast.success("Contact saved");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to save this contact");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
      <h2 className="font-medium">Details</h2>
      <div className="space-y-2">
        <Label htmlFor="contact-name">Name</Label>
        <Input id="contact-name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contact-email">Email</Label>
          <Input
            id="contact-email"
            type="email"
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-phone">Phone</Label>
          <Input id="contact-phone" maxLength={40} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-notes">Internal notes</Label>
        <Textarea
          id="contact-notes"
          rows={4}
          maxLength={5000}
          placeholder="Only your team sees this."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={!dirty || update.isPending}>
        {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save changes
      </Button>
    </form>
  );
}

export default function ContactDetailPage() {
  const { contactId } = useParams<{ contactId: string }>();
  const { activeWorkspace } = useWorkspace();
  const { data: contact, isLoading, isError } = useContact(contactId);
  const { data: conversations } = useContactConversations(contactId);
  const isAdmin = activeWorkspace?.role === "OWNER" || activeWorkspace?.role === "ADMIN";

  if (isLoading) return <PageSpinner />;
  if (isError || !contact) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">This contact doesn&apos;t exist (it may have been merged).</p>
        <Link href="/contacts" className="text-sm underline">
          Back to contacts
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
        <Link href="/contacts" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Contacts
        </Link>

        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-lg">{initialsOf(contact.displayName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold">{contact.displayName ?? "Unknown"}</h1>
            <p className="text-sm text-muted-foreground">
              Contact since {new Date(contact.createdAt).toLocaleDateString()}
            </p>
          </div>
          {isAdmin && (
            <MergeContactDialog
              target={contact}
              trigger={
                <Button variant="outline" size="sm">
                  <GitMerge className="h-4 w-4" /> Merge duplicate
                </Button>
              }
            />
          )}
        </div>

        {/* Remount when the saved values change (own save, merge, another agent) so the form shows the server copy. */}
        <ContactForm
          key={[contact.displayName, contact.email, contact.phone, contact.notes].join("\u0000")}
          contact={contact}
        />

        <section className="space-y-2">
          <h2 className="font-medium">Channels</h2>
          <div className="divide-y rounded-lg border empty:hidden">
            {contact.identities.map((identity) => {
              const country = identity.metadata?.countryCode as string | undefined;
              return (
                <div key={identity.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <ChannelLabel type={identity.channel} />
                  <span className="truncate text-muted-foreground">
                    {identityLabel(identity)}
                    {country ? ` · ${country}` : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="font-medium">Conversations</h2>
          {conversations?.length === 0 && <p className="text-sm text-muted-foreground">No conversations yet.</p>}
          <div className="divide-y rounded-lg border empty:hidden">
            {conversations?.map((c) => (
              <Link key={c.id} href={`/inbox/${c.id}`} className="flex items-center gap-3 p-3 hover:bg-accent">
                {c.channelConnection && <ChannelLabel type={c.channelConnection.type} />}
                <span className="min-w-0 flex-1 truncate text-sm">{c.lastMessagePreview ?? "No messages"}</span>
                <Badge variant={c.status === "RESOLVED" ? "secondary" : "outline"}>{c.status}</Badge>
                {c.lastMessageAt && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDistanceToNowStrict(new Date(c.lastMessageAt))}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
