"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Contact, Conversation, Paginated } from "@/lib/types";

export function useContacts(search?: string) {
  return useQuery({
    queryKey: ["contacts", search],
    queryFn: () => api.get<Paginated<Contact>>(`/contacts${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  });
}

export function useContact(id: string | null | undefined) {
  return useQuery({
    queryKey: ["contact", id],
    queryFn: () => api.get<Contact>(`/contacts/${id}`),
    enabled: !!id,
  });
}

export function useContactConversations(contactId: string | null | undefined) {
  return useQuery({
    queryKey: ["contact-conversations", contactId],
    queryFn: () => api.get<Conversation[]>(`/contacts/${contactId}/conversations`),
    enabled: !!contactId,
  });
}

export interface ContactChanges {
  displayName?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export function useUpdateContact(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: ContactChanges) => api.patch<Contact>(`/contacts/${id}`, changes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact", id] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      // Conversation lists and the customer panel show the contact's name.
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversation"] });
    },
  });
}

export function useMergeContact(targetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sourceContactId: string) => api.post<Contact>(`/contacts/${targetId}/merge`, { sourceContactId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversation"] });
    },
  });
}
