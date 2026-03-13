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

export function useUpdateContract() {
  const qc = useQueryClient();
  return useMutation<Contract, Error, { id: number; data: Partial<InsertContract> }>({
    mutationFn: ({ id, data }) => api.patch(`/api/contracts/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/contracts"] });
    },
  });
}

export function useSignContract() {
  const qc = useQueryClient();
  return useMutation<Contract, Error, { id: number; signature_data: string }>({
    mutationFn: ({ id, signature_data }) => api.post(`/api/contracts/${id}/sign`, { signature_data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/contracts"] });
    },
  });
}

export function useSendForSignature() {
  const qc = useQueryClient();
  return useMutation<Contract, Error, number>({
    mutationFn: (id) => api.post(`/api/contracts/${id}/send-for-signature`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/contracts"] });
    },
  });
}

export function useResendContractEmail() {
  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: (id) => api.post(`/api/contracts/${id}/resend-email`, {}),
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
