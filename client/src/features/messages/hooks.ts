import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiQuery, api } from "@/lib/api";
import type {
  InternalMessage,
  InternalMessageThread,
  InsertInternalMessage,
} from "@shared/schema";

export function useInternalMessages(projectId?: number) {
  const url = projectId
    ? `/api/internal-messages?projectId=${projectId}`
    : "/api/internal-messages";
  return useQuery({
    queryKey: ["internalMessages", projectId || "all"],
    queryFn: () => apiQuery<InternalMessageThread[]>(url),
  });
}

export function useInternalMessageThread(id: number) {
  return useQuery({
    queryKey: ["internalMessages", "thread", id],
    queryFn: () => apiQuery<InternalMessageThread>(`/api/internal-messages/${id}`),
    enabled: !!id,
  });
}

export function useSendInternalMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<InsertInternalMessage>) =>
      api.post<InternalMessage>("/api/internal-messages", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["internalMessages"] });
    },
  });
}

export function useDeleteInternalMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/internal-messages/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["internalMessages"] });
    },
  });
}

export function useMarkThreadRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/api/internal-messages/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["internalMessages"] });
    },
  });
}
