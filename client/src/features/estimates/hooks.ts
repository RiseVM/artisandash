import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiQuery, api } from "@/lib/api";
import type {
  Estimate,
  EstimateWithCustomer,
  EstimateWithDetails,
  EstimateLineItem,
  InsertEstimate,
  InsertEstimateLineItem,
} from "@shared/schema";

// ============================================
// ESTIMATES HOOKS
// ============================================

export function useEstimates() {
  return useQuery({
    queryKey: ["estimates"],
    queryFn: () => apiQuery<EstimateWithCustomer[]>("/api/estimates"),
  });
}

export function useEstimate(id: number) {
  return useQuery({
    queryKey: ["estimates", id],
    queryFn: () => apiQuery<EstimateWithDetails>(`/api/estimates/${id}`),
    enabled: !!id,
  });
}

export function useCreateEstimate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<InsertEstimate>) =>
      api.post<Estimate>("/api/estimates", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estimates"] });
    },
  });
}

export function useUpdateEstimate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertEstimate> }) =>
      api.patch<Estimate>(`/api/estimates/${id}`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["estimates"] });
      qc.invalidateQueries({ queryKey: ["estimates", id] });
    },
  });
}

export function useDeleteEstimate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/estimates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estimates"] });
    },
  });
}

// ============================================
// ESTIMATE LINE ITEMS HOOKS
// ============================================

export function useEstimateLineItems(estimateId: number) {
  return useQuery({
    queryKey: ["estimates", estimateId, "lineItems"],
    queryFn: () => apiQuery<EstimateLineItem[]>(`/api/estimates/${estimateId}/line-items`),
    enabled: !!estimateId,
  });
}

export function useCreateEstimateLineItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ estimateId, data }: { estimateId: number; data: Partial<InsertEstimateLineItem> }) =>
      api.post<EstimateLineItem>("/api/estimate-line-items", { ...data, estimate_id: estimateId }),
    onSuccess: (_, { estimateId }) => {
      qc.invalidateQueries({ queryKey: ["estimates", estimateId] });
      qc.invalidateQueries({ queryKey: ["estimates", estimateId, "lineItems"] });
      qc.invalidateQueries({ queryKey: ["estimates"] });
    },
  });
}

export function useUpdateEstimateLineItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estimateId, data }: { id: number; estimateId: number; data: Partial<InsertEstimateLineItem> }) =>
      api.patch<EstimateLineItem>(`/api/estimate-line-items/${id}`, data),
    onSuccess: (_, { estimateId }) => {
      qc.invalidateQueries({ queryKey: ["estimates", estimateId] });
      qc.invalidateQueries({ queryKey: ["estimates", estimateId, "lineItems"] });
      qc.invalidateQueries({ queryKey: ["estimates"] });
    },
  });
}

export function useDeleteEstimateLineItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estimateId }: { id: number; estimateId: number }) =>
      api.delete(`/api/estimate-line-items/${id}`),
    onSuccess: (_, { estimateId }) => {
      qc.invalidateQueries({ queryKey: ["estimates", estimateId] });
      qc.invalidateQueries({ queryKey: ["estimates", estimateId, "lineItems"] });
      qc.invalidateQueries({ queryKey: ["estimates"] });
    },
  });
}
