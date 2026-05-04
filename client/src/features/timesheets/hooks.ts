import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiQuery, api } from "@/lib/api";
import type { TimeClock, TimeClockWithDetails, TimeEntryWithPhase } from "@shared/schema";

type TimeEntryWithProject = TimeEntryWithPhase & { project_name?: string };
type ClockEntryWithUser = TimeClockWithDetails & {
  user?: { id: string; firstName: string | null; lastName: string | null; email: string } | null;
};

// ── TIME CLOCK ────────────────────────────

export function useActiveClock() {
  return useQuery<TimeClock | null>({
    queryKey: ["timesheets", "clock", "active"],
    queryFn: () => apiQuery("/api/timesheets/clock/active"),
    refetchInterval: 60_000, // Poll every minute to keep clock updated
  });
}

export function useClockEntries(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  const qs = params.toString();

  return useQuery<TimeClockWithDetails[]>({
    queryKey: ["timesheets", "clock", startDate, endDate],
    queryFn: () => apiQuery(`/api/timesheets/clock${qs ? `?${qs}` : ""}`),
  });
}

export function useClockIn() {
  const qc = useQueryClient();
  return useMutation<TimeClock, Error, { project_id?: number | null; notes?: string | null }>({
    mutationFn: (data) => api.post("/api/timesheets/clock/in", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timesheets", "clock"] });
    },
  });
}

export function useClockOut() {
  const qc = useQueryClient();
  return useMutation<TimeClock, Error, { break_minutes?: number; notes?: string }>({
    mutationFn: (data) => api.post("/api/timesheets/clock/out", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timesheets", "clock"] });
    },
  });
}

export function useUpdateClockEntry() {
  const qc = useQueryClient();
  return useMutation<TimeClock, Error, { id: number; data: Record<string, any> }>({
    mutationFn: ({ id, data }) => api.patch(`/api/timesheets/clock/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timesheets", "clock"] });
    },
  });
}

export function useDeleteClockEntry() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => api.delete(`/api/timesheets/clock/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timesheets", "clock"] });
    },
  });
}

// ── TIME ENTRIES (cross-project) ────────────────

export function useMyTimeEntries(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  const qs = params.toString();

  return useQuery<TimeEntryWithProject[]>({
    queryKey: ["timesheets", "entries", startDate, endDate],
    queryFn: () => apiQuery(`/api/timesheets/entries${qs ? `?${qs}` : ""}`),
  });
}

// ── ADMIN ────────────────

export function useAdminClockEntries(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  const qs = params.toString();

  return useQuery<ClockEntryWithUser[]>({
    queryKey: ["admin", "timesheets", "clock", startDate, endDate],
    queryFn: () => apiQuery(`/api/admin/timesheets/clock${qs ? `?${qs}` : ""}`),
  });
}

/**
 * Admin-only adjustment of a clock entry. Hits the hardened admin route at
 * /api/admin/timesheets/clock/:id, which gates on `manage_projects`,
 * validates clock_in/out, and writes an audit log row. Use this from
 * AdminTimesheets — not the staff-facing useUpdateClockEntry.
 */
export function useAdminUpdateClockEntry() {
  const qc = useQueryClient();
  return useMutation<
    TimeClock,
    Error,
    { id: number; clock_in?: string; clock_out?: string | null; reason?: string }
  >({
    mutationFn: ({ id, ...data }) => api.patch(`/api/admin/timesheets/clock/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "timesheets", "clock"] });
      qc.invalidateQueries({ queryKey: ["timesheets", "clock"] });
    },
  });
}

export function useAdminTimeEntries(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  const qs = params.toString();

  return useQuery<TimeEntryWithProject[]>({
    queryKey: ["admin", "timesheets", "entries", startDate, endDate],
    queryFn: () => apiQuery(`/api/admin/timesheets/entries${qs ? `?${qs}` : ""}`),
  });
}
