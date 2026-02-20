import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiQuery, api } from "@/lib/api";
import type { Contract, InsertContract } from "@shared/schema";

export function useContracts() {
  return useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
    queryFn: () => apiQuery("/api/contracts"),
  });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation<Contract, Error, Partial<InsertContract>>({
    mutationFn: (data) => api.post("/api/contracts", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/contracts"] });
    },
  });
}

export function useDeleteContract() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => api.delete(`/api/contracts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/contracts"] });
    },
  });
}
