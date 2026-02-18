import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiQuery, api } from "@/lib/api";
import type { Customer, InsertCustomer } from "@shared/schema";

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: () => apiQuery<Customer[]>("/api/customers"),
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InsertCustomer) =>
      api.post<Customer>("/api/customers", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertCustomer> }) =>
      api.patch<Customer>(`/api/customers/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/customers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["checkouts"] });
    },
  });
}
