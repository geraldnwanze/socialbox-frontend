"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Contact, Paginated } from "@/lib/types";

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
