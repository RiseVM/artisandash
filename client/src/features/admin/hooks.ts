import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { apiQuery, api } from "@/lib/api";

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: string;
  createdAt: string;
}

interface RolePermission {
  id: number;
  role: string;
  permission: string;
  enabled: string;
}

interface ActivityLog {
  id: number;
  userId: string | null;
  userEmail: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

interface BugReport {
  id: number;
  reporter_email: string | null;
  reporter_name: string | null;
  title: string;
  description: string;
  status: string;
  priority: string | null;
  created_at: string;
  updated_at: string;
}

// ---- User hooks ----

export function useUsers() {
  return useQuery<User[]>({
    queryKey: ["/api/users"],
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role: string;
    }) => {
      return apiRequest("POST", "/api/users", data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/users"] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Record<string, any>) => {
      return apiRequest("PATCH", `/api/users/${id}`, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/users"] }),
  });
}

export function useArchiveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/users/${id}/archive`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/users"] }),
  });
}

export function useRestoreUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/users/${id}/restore`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/users"] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/users"] }),
  });
}

// ---- Permission hooks ----

export function useRolePermissions(enabled = true) {
  return useQuery<RolePermission[]>({
    queryKey: ["/api/role-permissions"],
    enabled,
  });
}

export function useUpdatePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { role: string; permission: string; enabled: boolean }) => {
      return apiRequest("PUT", "/api/role-permissions", data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/role-permissions"] }),
  });
}

// ---- Activity log hooks ----

export function useActivityLogs(filters: {
  userId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const queryParams = new URLSearchParams();
  if (filters.userId) queryParams.append("userId", filters.userId);
  if (filters.startDate) queryParams.append("startDate", filters.startDate);
  if (filters.endDate) queryParams.append("endDate", filters.endDate);

  return useQuery<ActivityLog[]>({
    queryKey: ["/api/activity-logs", filters],
    queryFn: async () => {
      const response = await fetch(`/api/activity-logs?${queryParams.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch logs");
      return response.json();
    },
  });
}

// ---- Bug report hooks ----

export function useBugReports() {
  return useQuery<BugReport[]>({
    queryKey: ["/api/bug-reports"],
  });
}

export function useUpdateBugReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<BugReport> }) => {
      await apiRequest("PATCH", `/api/bug-reports/${id}`, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/bug-reports"] }),
  });
}

export function useDeleteBugReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/bug-reports/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/bug-reports"] }),
  });
}
