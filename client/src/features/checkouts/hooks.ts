import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiQuery, api } from "@/lib/api";
import type { CheckoutView, InsertCheckout, Checkout } from "@shared/schema";

export function useCheckouts() {
  return useQuery({
    queryKey: ["checkouts"],
    queryFn: () => apiQuery<CheckoutView[]>("/api/checkouts"),
  });
}

export function useCheckout(id: number) {
  return useQuery({
    queryKey: ["checkouts", id],
    queryFn: () => apiQuery<CheckoutView>(`/api/checkouts/${id}`),
    enabled: !!id,
  });
}

export function useCreateCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InsertCheckout) =>
      api.post<Checkout>("/api/checkouts", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checkouts"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useUpdateCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertCheckout> }) =>
      api.patch<Checkout>(`/api/checkouts/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checkouts"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useDeleteCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/checkouts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checkouts"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useReturnAllCheckouts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<{ success: boolean; returned: number; message: string }>(
        "/api/checkouts/return-all",
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checkouts"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useSendReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.post<{ success: boolean; message: string }>(
        `/api/checkouts/${id}/send-reminder`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checkouts"] });
    },
  });
}

export function useSendFollowUpEmails() {
  return useMutation({
    mutationFn: (data: {
      customer_id: number;
      needs_installer?: string;
      wants_designer?: string;
      has_special_request?: string;
      special_request?: string;
      project_type?: string;
      start_date?: string;
      notes?: string;
    }) => api.post<{ success: boolean; emailsSent: string[] }>("/api/send-followup-emails", data),
  });
}
