import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiQuery, api } from "@/lib/api";
import type { Inventory, InsertInventory } from "@shared/schema";

export function useInventory() {
  return useQuery({
    queryKey: ["inventory"],
    queryFn: () => apiQuery<Inventory[]>("/api/inventory"),
  });
}

export function useCreateInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InsertInventory) =>
      api.post<Inventory>("/api/inventory", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useUpdateInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<InsertInventory>;
    }) => api.patch<Inventory>(`/api/inventory/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useDeleteInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/inventory/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["checkouts"] });
    },
  });
}
