import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiQuery, api } from "@/lib/api";
import type {
  Project,
  ProjectWithCustomer,
  ProjectWithDetails,
  ProjectPhase,
  ProjectTask,
  InsertProject,
  InsertProjectPhase,
  InsertProjectTask,
  ProjectTemplate,
  ProjectTemplateWithDetails,
  PhaseTemplate,
  TaskTemplate,
  InsertProjectTemplate,
  InsertPhaseTemplate,
  InsertTaskTemplate,
  ProjectDelivery,
  ProjectDeliveryWithPhase,
  InsertProjectDelivery,
  ChangeOrder,
  ChangeOrderWithPhase,
  InsertChangeOrder,
  TimeEntry,
  TimeEntryWithPhase,
  InsertTimeEntry,
  ProjectLineItem,
  ProjectLineItemWithRelations,
  InsertProjectLineItem,
  ProjectPayment,
  InsertProjectPayment,
  ProjectFile,
  InsertProjectFile,
  ProjectUpdate,
  InsertProjectUpdate,
  ProjectMessage,
  InsertProjectMessage,
} from "@shared/schema";

// ============================================
// PROJECTS HOOKS
// ============================================

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => apiQuery<ProjectWithCustomer[]>("/api/projects"),
  });
}

export function useProject(id: number) {
  return useQuery({
    queryKey: ["projects", id],
    queryFn: () => apiQuery<ProjectWithDetails>(`/api/projects/${id}`),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InsertProject) =>
      api.post<Project>("/api/projects", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertProject> }) =>
      api.patch<Project>(`/api/projects/${id}`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["projects", id] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/projects/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

// ============================================
// PROJECT PHASES HOOKS
// ============================================

export function useCreatePhase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: Partial<InsertProjectPhase> }) =>
      api.post<ProjectPhase>(`/api/projects/${projectId}/phases`, data),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdatePhase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, projectId }: { id: number; data: Partial<InsertProjectPhase>; projectId: number }) =>
      api.patch<ProjectPhase>(`/api/phases/${id}`, data),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDeletePhase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: number; projectId: number }) =>
      api.delete(`/api/phases/${id}`),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useReorderPhases() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, phaseIds }: { projectId: number; phaseIds: number[] }) =>
      api.post(`/api/projects/${projectId}/phases/reorder`, { phaseIds }),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId] });
    },
  });
}

// ============================================
// PROJECT TASKS HOOKS
// ============================================

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ phaseId, data, projectId }: { phaseId: number; data: Partial<InsertProjectTask>; projectId: number }) =>
      api.post<ProjectTask>(`/api/phases/${phaseId}/tasks`, data),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, projectId }: { id: number; data: Partial<InsertProjectTask>; projectId: number }) =>
      api.patch<ProjectTask>(`/api/tasks/${id}`, data),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: number; projectId: number }) =>
      api.delete(`/api/tasks/${id}`),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

// ============================================
// PROJECT TEMPLATE HOOKS
// ============================================

export function useProjectTemplates() {
  return useQuery({
    queryKey: ["projectTemplates"],
    queryFn: () => apiQuery<ProjectTemplate[]>("/api/project-templates"),
  });
}

export function useProjectTemplate(id: number) {
  return useQuery({
    queryKey: ["projectTemplates", id],
    queryFn: () => apiQuery<ProjectTemplateWithDetails>(`/api/project-templates/${id}`),
    enabled: !!id,
  });
}

export function useCreateProjectTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<InsertProjectTemplate>) =>
      api.post<ProjectTemplate>("/api/project-templates", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projectTemplates"] });
    },
  });
}

export function useUpdateProjectTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertProjectTemplate> }) =>
      api.patch<ProjectTemplate>(`/api/project-templates/${id}`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["projectTemplates"] });
      qc.invalidateQueries({ queryKey: ["projectTemplates", id] });
    },
  });
}

export function useDeleteProjectTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/project-templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projectTemplates"] });
    },
  });
}

export function useDuplicateProjectTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.post<ProjectTemplate>(`/api/project-templates/${id}/duplicate`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projectTemplates"] });
    },
  });
}

// ============================================
// PHASE TEMPLATE HOOKS
// ============================================

export function useCreatePhaseTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: number; data: Partial<InsertPhaseTemplate> }) =>
      api.post<PhaseTemplate>(`/api/project-templates/${templateId}/phases`, data),
    onSuccess: (_, { templateId }) => {
      qc.invalidateQueries({ queryKey: ["projectTemplates", templateId] });
      qc.invalidateQueries({ queryKey: ["projectTemplates"] });
    },
  });
}

export function useUpdatePhaseTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, templateId }: { id: number; data: Partial<InsertPhaseTemplate>; templateId: number }) =>
      api.patch<PhaseTemplate>(`/api/phase-templates/${id}`, data),
    onSuccess: (_, { templateId }) => {
      qc.invalidateQueries({ queryKey: ["projectTemplates", templateId] });
      qc.invalidateQueries({ queryKey: ["projectTemplates"] });
    },
  });
}

export function useDeletePhaseTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, templateId }: { id: number; templateId: number }) =>
      api.delete(`/api/phase-templates/${id}`),
    onSuccess: (_, { templateId }) => {
      qc.invalidateQueries({ queryKey: ["projectTemplates", templateId] });
      qc.invalidateQueries({ queryKey: ["projectTemplates"] });
    },
  });
}

export function useReorderPhaseTemplates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, phaseIds }: { templateId: number; phaseIds: number[] }) =>
      api.post(`/api/project-templates/${templateId}/phases/reorder`, { phaseIds }),
    onSuccess: (_, { templateId }) => {
      qc.invalidateQueries({ queryKey: ["projectTemplates", templateId] });
    },
  });
}

// ============================================
// TASK TEMPLATE HOOKS
// ============================================

export function useCreateTaskTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ phaseId, data, templateId }: { phaseId: number; data: Partial<InsertTaskTemplate>; templateId: number }) =>
      api.post<TaskTemplate>(`/api/phase-templates/${phaseId}/tasks`, data),
    onSuccess: (_, { templateId }) => {
      qc.invalidateQueries({ queryKey: ["projectTemplates", templateId] });
      qc.invalidateQueries({ queryKey: ["projectTemplates"] });
    },
  });
}

export function useUpdateTaskTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, templateId }: { id: number; data: Partial<InsertTaskTemplate>; templateId: number }) =>
      api.patch<TaskTemplate>(`/api/task-templates/${id}`, data),
    onSuccess: (_, { templateId }) => {
      qc.invalidateQueries({ queryKey: ["projectTemplates", templateId] });
      qc.invalidateQueries({ queryKey: ["projectTemplates"] });
    },
  });
}

export function useDeleteTaskTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, templateId }: { id: number; templateId: number }) =>
      api.delete(`/api/task-templates/${id}`),
    onSuccess: (_, { templateId }) => {
      qc.invalidateQueries({ queryKey: ["projectTemplates", templateId] });
      qc.invalidateQueries({ queryKey: ["projectTemplates"] });
    },
  });
}

// ============================================
// CREATE PROJECT FROM TEMPLATE HOOKS
// ============================================

export function useCreateProjectFromTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: number; data: Partial<InsertProject> }) =>
      api.post<Project>(`/api/projects/from-template/${templateId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

// ============================================
// PROJECT DELIVERIES HOOKS
// ============================================

export function useProjectDeliveries(projectId: number) {
  return useQuery({
    queryKey: ["projects", projectId, "deliveries"],
    queryFn: () => apiQuery<ProjectDeliveryWithPhase[]>(`/api/projects/${projectId}/deliveries`),
    enabled: !!projectId,
  });
}

export function useCreateDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: Partial<InsertProjectDelivery> }) =>
      api.post<ProjectDelivery>(`/api/projects/${projectId}/deliveries`, data),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "deliveries"] });
      qc.invalidateQueries({ queryKey: ["projects", projectId] });
    },
  });
}

export function useUpdateDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId, data }: { id: number; projectId: number; data: Partial<InsertProjectDelivery> }) =>
      api.patch<ProjectDelivery>(`/api/deliveries/${id}`, data),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "deliveries"] });
      qc.invalidateQueries({ queryKey: ["projects", projectId] });
    },
  });
}

export function useDeleteDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: number; projectId: number }) =>
      api.delete(`/api/deliveries/${id}`),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "deliveries"] });
      qc.invalidateQueries({ queryKey: ["projects", projectId] });
    },
  });
}

// ============================================
// CHANGE ORDERS HOOKS
// ============================================

export function useChangeOrders(projectId: number) {
  return useQuery({
    queryKey: ["projects", projectId, "changeOrders"],
    queryFn: () => apiQuery<ChangeOrderWithPhase[]>(`/api/projects/${projectId}/change-orders`),
    enabled: !!projectId,
  });
}

export function useCreateChangeOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: Partial<InsertChangeOrder> }) =>
      api.post<ChangeOrder>(`/api/projects/${projectId}/change-orders`, data),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "changeOrders"] });
      qc.invalidateQueries({ queryKey: ["projects", projectId] });
    },
  });
}

export function useUpdateChangeOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId, data }: { id: number; projectId: number; data: Partial<InsertChangeOrder> }) =>
      api.patch<ChangeOrder>(`/api/change-orders/${id}`, data),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "changeOrders"] });
      qc.invalidateQueries({ queryKey: ["projects", projectId] });
    },
  });
}

export function useSubmitChangeOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: number; projectId: number }) =>
      api.post<ChangeOrder>(`/api/change-orders/${id}/submit`),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "changeOrders"] });
    },
  });
}

export function useApproveChangeOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId, approvedBy, signature }: { id: number; projectId: number; approvedBy: string; signature: string }) =>
      api.post<ChangeOrder>(`/api/change-orders/${id}/approve`, { approvedBy, signature }),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "changeOrders"] });
    },
  });
}

export function useRejectChangeOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId, rejectionReason }: { id: number; projectId: number; rejectionReason: string }) =>
      api.post<ChangeOrder>(`/api/change-orders/${id}/reject`, { rejectionReason }),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "changeOrders"] });
    },
  });
}

export function useDeleteChangeOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: number; projectId: number }) =>
      api.delete(`/api/change-orders/${id}`),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "changeOrders"] });
      qc.invalidateQueries({ queryKey: ["projects", projectId] });
    },
  });
}

// ============================================
// TIME ENTRIES HOOKS
// ============================================

export function useTimeEntries(projectId: number) {
  return useQuery({
    queryKey: ["projects", projectId, "timeEntries"],
    queryFn: () => apiQuery<TimeEntryWithPhase[]>(`/api/projects/${projectId}/time-entries`),
    enabled: !!projectId,
  });
}

export function useTimeTotals(projectId: number) {
  return useQuery({
    queryKey: ["projects", projectId, "timeTotals"],
    queryFn: () => apiQuery<{ total_hours: number; billable_hours: number }>(`/api/projects/${projectId}/time-totals`),
    enabled: !!projectId,
  });
}

export function useCreateTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: Partial<InsertTimeEntry> }) =>
      api.post<TimeEntry>(`/api/projects/${projectId}/time-entries`, data),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "timeEntries"] });
      qc.invalidateQueries({ queryKey: ["projects", projectId, "timeTotals"] });
    },
  });
}

export function useUpdateTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId, data }: { id: number; projectId: number; data: Partial<InsertTimeEntry> }) =>
      api.patch<TimeEntry>(`/api/time-entries/${id}`, data),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "timeEntries"] });
      qc.invalidateQueries({ queryKey: ["projects", projectId, "timeTotals"] });
    },
  });
}

export function useDeleteTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: number; projectId: number }) =>
      api.delete(`/api/time-entries/${id}`),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "timeEntries"] });
      qc.invalidateQueries({ queryKey: ["projects", projectId, "timeTotals"] });
    },
  });
}

// ============================================
// LINE ITEMS HOOKS
// ============================================

export function useLineItems(projectId: number) {
  return useQuery({
    queryKey: ["projects", projectId, "lineItems"],
    queryFn: () => apiQuery<ProjectLineItemWithRelations[]>(`/api/projects/${projectId}/line-items`),
    enabled: !!projectId,
  });
}

export function useProjectTotal(projectId: number) {
  return useQuery({
    queryKey: ["projects", projectId, "total"],
    queryFn: () => apiQuery<{ total: number }>(`/api/projects/${projectId}/total`),
    enabled: !!projectId,
  });
}

export function useCreateLineItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: Partial<InsertProjectLineItem> }) =>
      api.post<ProjectLineItem>(`/api/projects/${projectId}/line-items`, data),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "lineItems"] });
      qc.invalidateQueries({ queryKey: ["projects", projectId, "total"] });
    },
  });
}

export function useUpdateLineItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId, data }: { id: number; projectId: number; data: Partial<InsertProjectLineItem> }) =>
      api.patch<ProjectLineItem>(`/api/line-items/${id}`, data),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "lineItems"] });
      qc.invalidateQueries({ queryKey: ["projects", projectId, "total"] });
    },
  });
}

export function useDeleteLineItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: number; projectId: number }) =>
      api.delete(`/api/line-items/${id}`),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "lineItems"] });
      qc.invalidateQueries({ queryKey: ["projects", projectId, "total"] });
    },
  });
}

// ============================================
// PAYMENTS HOOKS
// ============================================

export function usePayments(projectId: number) {
  return useQuery({
    queryKey: ["projects", projectId, "payments"],
    queryFn: () => apiQuery<ProjectPayment[]>(`/api/projects/${projectId}/payments`),
    enabled: !!projectId,
  });
}

export function usePaymentSummary(projectId: number) {
  return useQuery({
    queryKey: ["projects", projectId, "paymentSummary"],
    queryFn: () => apiQuery<{ total_due: number; total_paid: number; balance: number }>(`/api/projects/${projectId}/payment-summary`),
    enabled: !!projectId,
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: Partial<InsertProjectPayment> }) =>
      api.post<ProjectPayment>(`/api/projects/${projectId}/payments`, data),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "payments"] });
      qc.invalidateQueries({ queryKey: ["projects", projectId, "paymentSummary"] });
    },
  });
}

export function useUpdatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId, data }: { id: number; projectId: number; data: Partial<InsertProjectPayment> }) =>
      api.patch<ProjectPayment>(`/api/payments/${id}`, data),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "payments"] });
      qc.invalidateQueries({ queryKey: ["projects", projectId, "paymentSummary"] });
    },
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: number; projectId: number }) =>
      api.delete(`/api/payments/${id}`),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "payments"] });
      qc.invalidateQueries({ queryKey: ["projects", projectId, "paymentSummary"] });
    },
  });
}

// ============================================
// PROJECT FILES HOOKS
// ============================================

export function useProjectFiles(projectId: number) {
  return useQuery({
    queryKey: ["projects", projectId, "files"],
    queryFn: () => apiQuery<ProjectFile[]>(`/api/projects/${projectId}/files`),
    enabled: !!projectId,
  });
}

export function useCreateProjectFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: Partial<InsertProjectFile> }) =>
      api.post<ProjectFile>(`/api/projects/${projectId}/files`, data),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "files"] });
    },
  });
}

export function useUploadProjectFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, file, metadata }: {
      projectId: number;
      file: File;
      metadata: {
        name?: string;
        category?: string;
        description?: string;
        entity_type?: string;
        entity_id?: number;
        is_photo?: string;
        photo_type?: string;
        client_visible?: string;
      };
    }) => {
      const formData = new FormData();
      formData.append("file", file);

      // Append metadata fields
      if (metadata.name) formData.append("name", metadata.name);
      if (metadata.category) formData.append("category", metadata.category);
      if (metadata.description) formData.append("description", metadata.description);
      if (metadata.entity_type) formData.append("entity_type", metadata.entity_type);
      if (metadata.entity_id) formData.append("entity_id", metadata.entity_id.toString());
      if (metadata.is_photo) formData.append("is_photo", metadata.is_photo);
      if (metadata.photo_type) formData.append("photo_type", metadata.photo_type);
      if (metadata.client_visible) formData.append("client_visible", metadata.client_visible);

      const res = await fetch(`/api/projects/${projectId}/files/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(error.error || "Upload failed");
      }

      return res.json() as Promise<ProjectFile>;
    },
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "files"] });
    },
  });
}

export function useUpdateProjectFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId, data }: { id: number; projectId: number; data: Partial<InsertProjectFile> }) =>
      api.patch<ProjectFile>(`/api/files/${id}`, data),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "files"] });
    },
  });
}

export function useDeleteProjectFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: number; projectId: number }) =>
      api.delete(`/api/files/${id}`),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "files"] });
    },
  });
}

// ============================================
// PROJECT UPDATES HOOKS
// ============================================

export function useProjectUpdates(projectId: number) {
  return useQuery({
    queryKey: ["projects", projectId, "updates"],
    queryFn: () => apiQuery<ProjectUpdate[]>(`/api/projects/${projectId}/updates`),
    enabled: !!projectId,
  });
}

export function useCreateProjectUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: Partial<InsertProjectUpdate> }) =>
      api.post<ProjectUpdate>(`/api/projects/${projectId}/updates`, data),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "updates"] });
    },
  });
}

export function useDeleteProjectUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: number; projectId: number }) =>
      api.delete(`/api/updates/${id}`),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "updates"] });
    },
  });
}

// ============================================
// PROJECT MESSAGES HOOKS
// ============================================

export function useProjectMessages(projectId: number) {
  return useQuery({
    queryKey: ["projects", projectId, "messages"],
    queryFn: () => apiQuery<ProjectMessage[]>(`/api/projects/${projectId}/messages`),
    enabled: !!projectId,
  });
}

export function useUnreadMessageCount(projectId: number) {
  return useQuery({
    queryKey: ["projects", projectId, "messages", "unreadCount"],
    queryFn: () => apiQuery<{ count: number }>(`/api/projects/${projectId}/messages/unread-count`),
    enabled: !!projectId,
  });
}

export function useSendProjectMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: Partial<InsertProjectMessage> }) =>
      api.post<ProjectMessage>(`/api/projects/${projectId}/messages`, data),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "messages"] });
      qc.invalidateQueries({ queryKey: ["projects", projectId, "messages", "unreadCount"] });
    },
  });
}

export function useMarkMessagesRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId }: { projectId: number }) =>
      api.post(`/api/projects/${projectId}/messages/mark-read`),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "messages"] });
      qc.invalidateQueries({ queryKey: ["projects", projectId, "messages", "unreadCount"] });
    },
  });
}

export function useDeleteProjectMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: number; projectId: number }) =>
      api.delete(`/api/messages/${id}`),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "messages"] });
    },
  });
}

// ============================================
// OUT OF SCOPE ITEMS HOOKS
// ============================================

export function useOutOfScopeItems(projectId: number) {
  return useQuery({
    queryKey: ["projects", projectId, "outOfScope"],
    queryFn: () => apiQuery<any[]>(`/api/projects/${projectId}/out-of-scope`),
    enabled: !!projectId,
  });
}

export function useCreateOutOfScopeItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: any }) =>
      api.post(`/api/projects/${projectId}/out-of-scope`, data),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "outOfScope"] });
    },
  });
}

export function useUpdateOutOfScopeItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId, data }: { id: number; projectId: number; data: any }) =>
      api.patch(`/api/out-of-scope/${id}`, data),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "outOfScope"] });
    },
  });
}

export function useDeleteOutOfScopeItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: number; projectId: number }) =>
      api.delete(`/api/out-of-scope/${id}`),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "outOfScope"] });
    },
  });
}

// ============================================
// CLIENT FEEDBACK HOOKS
// ============================================

export function useClientFeedback(projectId: number) {
  return useQuery({
    queryKey: ["projects", projectId, "feedback"],
    queryFn: () => apiQuery<any[]>(`/api/projects/${projectId}/feedback`),
    enabled: !!projectId,
  });
}

export function useUpdateClientFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId, data }: { id: number; projectId: number; data: any }) =>
      api.patch(`/api/feedback/${id}`, data),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "feedback"] });
    },
  });
}

export function useDeleteClientFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: number; projectId: number }) =>
      api.delete(`/api/feedback/${id}`),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId, "feedback"] });
    },
  });
}
