import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiQuery, api } from "@/lib/api";
import type {
  TeamMember,
  TeamMemberWithItems,
  TeamSetupItem,
  TeamResource,
} from "@shared/schema";

// ============================================
// TEAM MEMBERS HOOKS
// ============================================

export function useTeamMembers() {
  return useQuery({
    queryKey: ["team-members"],
    queryFn: () => apiQuery<TeamMember[]>("/api/team/members"),
  });
}

export function useTeamMember(id: number) {
  return useQuery({
    queryKey: ["team-members", id],
    queryFn: () => apiQuery<TeamMemberWithItems>(`/api/team/members/${id}`),
    enabled: !!id,
  });
}

export function useCreateTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TeamMember>) =>
      api.post<TeamMember>("/api/team/members", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team-members"] });
    },
  });
}

export function useUpdateTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TeamMember> }) =>
      api.patch<TeamMember>(`/api/team/members/${id}`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["team-members"] });
      qc.invalidateQueries({ queryKey: ["team-members", id] });
    },
  });
}

export function useDeleteTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/team/members/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team-members"] });
    },
  });
}

// ============================================
// SETUP ITEMS HOOKS
// ============================================

export function useUpdateSetupItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      teamMemberId,
      is_checked,
      checked_by_name,
    }: {
      id: number;
      teamMemberId: number;
      is_checked: boolean;
      checked_by_name: string;
    }) => api.patch<TeamSetupItem>(`/api/team/setup-items/${id}`, { is_checked, checked_by_name }),
    onSuccess: (_, { teamMemberId }) => {
      qc.invalidateQueries({ queryKey: ["team-members", teamMemberId] });
    },
  });
}

// ============================================
// TEAM RESOURCES HOOKS
// ============================================

export function useTeamResources(category?: string) {
  return useQuery({
    queryKey: ["team-resources", category || "all"],
    queryFn: () =>
      apiQuery<TeamResource[]>(
        category && category !== "all"
          ? `/api/team/resources?category=${category}`
          : "/api/team/resources",
      ),
  });
}

export function useCreateTeamResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TeamResource>) =>
      api.post<TeamResource>("/api/team/resources", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team-resources"] });
    },
  });
}

export function useDeleteTeamResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/team/resources/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team-resources"] });
    },
  });
}
