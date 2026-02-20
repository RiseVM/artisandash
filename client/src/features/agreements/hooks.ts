import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiQuery, api } from "@/lib/api";
import type { SignedAgreement, InsertSignedAgreement } from "@shared/schema";

export function useSignedAgreements() {
  return useQuery<SignedAgreement[]>({
    queryKey: ["/api/agreements"],
    queryFn: () => apiQuery("/api/agreements"),
  });
}

export function useSignedAgreementsByCustomer(customerId: number) {
  return useQuery<SignedAgreement[]>({
    queryKey: ["/api/agreements/customer", customerId],
    queryFn: () => apiQuery(`/api/agreements/customer/${customerId}`),
    enabled: !!customerId,
  });
}

export function useCreateSignedAgreement() {
  const qc = useQueryClient();
  return useMutation<SignedAgreement, Error, Partial<InsertSignedAgreement>>({
    mutationFn: (data) => api.post("/api/agreements", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/agreements"] });
    },
  });
}

export function useDeleteSignedAgreement() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => api.delete(`/api/agreements/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/agreements"] });
    },
  });
}
