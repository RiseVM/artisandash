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
      item_text,
    }: {
      id: number;
      teamMemberId: number;
      is_checked?: boolean;
      checked_by_name?: string;
      item_text?: string;
    }) => {
      const body: Record<string, unknown> = {};
      if (item_text !== undefined) body.item_text = item_text;
      if (is_checked !== undefined) body.is_checked = is_checked;
      if (checked_by_name !== undefined) body.checked_by_name = checked_by_name;
      return api.patch<TeamSetupItem>(`/api/team/setup-items/${id}`, body);
    },
    onSuccess: (_, { teamMemberId }) => {
      qc.invalidateQueries({ queryKey: ["team-members", teamMemberId] });
    },
  });
}

export function useCreateSetupItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      teamMemberId,
      section,
      item_text,
    }: {
      teamMemberId: number;
      section: string;
      item_text: string;
    }) =>
      api.post<TeamSetupItem>(`/api/team/members/${teamMemberId}/setup-items`, {
        section,
        item_text,
      }),
    onSuccess: (_, { teamMemberId }) => {
      qc.invalidateQueries({ queryKey: ["team-members", teamMemberId] });
    },
  });
}

export function useDeleteSetupItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, teamMemberId }: { id: number; teamMemberId: number }) =>
      api.delete(`/api/team/setup-items/${id}`),
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
