import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type {
  Customer,
  Inventory,
  Checkout,
  CheckoutView,
  InsertCustomer,
  InsertInventory,
  InsertCheckout,
  SignedAgreement,
  InsertSignedAgreement,
  Contract,
  InsertContract,
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
} from "@shared/schema";

export function useCustomers() {
  return useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });
}

export function useInventory() {
  return useQuery<Inventory[]>({
    queryKey: ["/api/inventory"],
  });
}

export function useCheckouts() {
  return useQuery<CheckoutView[]>({
    queryKey: ["/api/checkouts"],
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertCustomer) => {
      const res = await apiRequest("POST", "/api/customers", data);
      return res.json() as Promise<Customer>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertCustomer> }) => {
      const res = await apiRequest("PATCH", `/api/customers/${id}`, data);
      return res.json() as Promise<Customer>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/checkouts"] });
    },
  });
}

export function useCreateInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertInventory) => {
      const res = await apiRequest("POST", "/api/inventory", data);
      return res.json() as Promise<Inventory>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
    },
  });
}

export function useUpdateInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertInventory> }) => {
      const res = await apiRequest("PATCH", `/api/inventory/${id}`, data);
      return res.json() as Promise<Inventory>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
    },
  });
}

export function useDeleteInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/inventory/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/checkouts"] });
    },
  });
}

export function useCreateCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertCheckout) => {
      const res = await apiRequest("POST", "/api/checkouts", data);
      return res.json() as Promise<Checkout>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checkouts"] });
    },
  });
}

export function useUpdateCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertCheckout> }) => {
      const res = await apiRequest("PATCH", `/api/checkouts/${id}`, data);
      return res.json() as Promise<Checkout>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checkouts"] });
    },
  });
}

export function useDeleteCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/checkouts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checkouts"] });
    },
  });
}

export function useSignedAgreements() {
  return useQuery<SignedAgreement[]>({
    queryKey: ["/api/agreements"],
  });
}

export function useSignedAgreementsByCustomer(customerId: number) {
  return useQuery<SignedAgreement[]>({
    queryKey: ["/api/agreements/customer", customerId],
    queryFn: async () => {
      const res = await fetch(`/api/agreements/customer/${customerId}`);
      if (!res.ok) throw new Error("Failed to fetch agreements");
      return res.json();
    },
    enabled: !!customerId,
  });
}

export function useCreateSignedAgreement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertSignedAgreement) => {
      const res = await apiRequest("POST", "/api/agreements", data);
      return res.json() as Promise<SignedAgreement>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agreements"] });
    },
  });
}

export function useDeleteSignedAgreement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/agreements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agreements"] });
    },
  });
}

export function useContracts() {
  return useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertContract) => {
      const res = await apiRequest("POST", "/api/contracts", data);
      return res.json() as Promise<Contract>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
    },
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/contracts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
    },
  });
}

// ============================================
// PROJECT TRACKER HOOKS
// ============================================

export function useProjects() {
  return useQuery<ProjectWithCustomer[]>({
    queryKey: ["/api/projects"],
  });
}

export function useProject(id: number) {
  return useQuery<ProjectWithDetails>({
    queryKey: ["/api/projects", id],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch project");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertProject) => {
      const res = await apiRequest("POST", "/api/projects", data);
      return res.json() as Promise<Project>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertProject> }) => {
      const res = await apiRequest("PATCH", `/api/projects/${id}`, data);
      return res.json() as Promise<Project>;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });
}

// Project Phases
export function useCreatePhase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: number; data: Partial<InsertProjectPhase> }) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/phases`, data);
      return res.json() as Promise<ProjectPhase>;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });
}

export function useUpdatePhase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data, projectId }: { id: number; data: Partial<InsertProjectPhase>; projectId: number }) => {
      const res = await apiRequest("PATCH", `/api/phases/${id}`, data);
      return res.json() as Promise<ProjectPhase>;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });
}

export function useDeletePhase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: number; projectId: number }) => {
      await apiRequest("DELETE", `/api/phases/${id}`);
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });
}

export function useReorderPhases() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, phaseIds }: { projectId: number; phaseIds: number[] }) => {
      await apiRequest("POST", `/api/projects/${projectId}/phases/reorder`, { phaseIds });
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
    },
  });
}

// Project Tasks
export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ phaseId, data, projectId }: { phaseId: number; data: Partial<InsertProjectTask>; projectId: number }) => {
      const res = await apiRequest("POST", `/api/phases/${phaseId}/tasks`, data);
      return res.json() as Promise<ProjectTask>;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data, projectId }: { id: number; data: Partial<InsertProjectTask>; projectId: number }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, data);
      return res.json() as Promise<ProjectTask>;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: number; projectId: number }) => {
      await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });
}

// ============================================
// PROJECT TEMPLATE HOOKS
// ============================================

export function useProjectTemplates() {
  return useQuery<ProjectTemplate[]>({
    queryKey: ["/api/project-templates"],
  });
}

export function useProjectTemplate(id: number) {
  return useQuery<ProjectTemplateWithDetails>({
    queryKey: ["/api/project-templates", id],
    queryFn: async () => {
      const res = await fetch(`/api/project-templates/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch template");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateProjectTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<InsertProjectTemplate>) => {
      const res = await apiRequest("POST", "/api/project-templates", data);
      return res.json() as Promise<ProjectTemplate>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-templates"] });
    },
  });
}

export function useUpdateProjectTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertProjectTemplate> }) => {
      const res = await apiRequest("PATCH", `/api/project-templates/${id}`, data);
      return res.json() as Promise<ProjectTemplate>;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/project-templates", id] });
    },
  });
}

export function useDeleteProjectTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/project-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-templates"] });
    },
  });
}

// Phase Templates
export function useCreatePhaseTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ templateId, data }: { templateId: number; data: Partial<InsertPhaseTemplate> }) => {
      const res = await apiRequest("POST", `/api/project-templates/${templateId}/phases`, data);
      return res.json() as Promise<PhaseTemplate>;
    },
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-templates", templateId] });
      queryClient.invalidateQueries({ queryKey: ["/api/project-templates"] });
    },
  });
}

export function useUpdatePhaseTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data, templateId }: { id: number; data: Partial<InsertPhaseTemplate>; templateId: number }) => {
      const res = await apiRequest("PATCH", `/api/phase-templates/${id}`, data);
      return res.json() as Promise<PhaseTemplate>;
    },
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-templates", templateId] });
      queryClient.invalidateQueries({ queryKey: ["/api/project-templates"] });
    },
  });
}

export function useDeletePhaseTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, templateId }: { id: number; templateId: number }) => {
      await apiRequest("DELETE", `/api/phase-templates/${id}`);
    },
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-templates", templateId] });
      queryClient.invalidateQueries({ queryKey: ["/api/project-templates"] });
    },
  });
}

export function useReorderPhaseTemplates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ templateId, phaseIds }: { templateId: number; phaseIds: number[] }) => {
      await apiRequest("POST", `/api/project-templates/${templateId}/phases/reorder`, { phaseIds });
    },
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-templates", templateId] });
    },
  });
}

// Task Templates
export function useCreateTaskTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ phaseId, data, templateId }: { phaseId: number; data: Partial<InsertTaskTemplate>; templateId: number }) => {
      const res = await apiRequest("POST", `/api/phase-templates/${phaseId}/tasks`, data);
      return res.json() as Promise<TaskTemplate>;
    },
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-templates", templateId] });
      queryClient.invalidateQueries({ queryKey: ["/api/project-templates"] });
    },
  });
}

export function useUpdateTaskTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data, templateId }: { id: number; data: Partial<InsertTaskTemplate>; templateId: number }) => {
      const res = await apiRequest("PATCH", `/api/task-templates/${id}`, data);
      return res.json() as Promise<TaskTemplate>;
    },
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-templates", templateId] });
      queryClient.invalidateQueries({ queryKey: ["/api/project-templates"] });
    },
  });
}

export function useDeleteTaskTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, templateId }: { id: number; templateId: number }) => {
      await apiRequest("DELETE", `/api/task-templates/${id}`);
    },
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-templates", templateId] });
      queryClient.invalidateQueries({ queryKey: ["/api/project-templates"] });
    },
  });
}

// Create project from template
export function useCreateProjectFromTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ templateId, data }: { templateId: number; data: Partial<InsertProject> }) => {
      const res = await apiRequest("POST", `/api/projects/from-template/${templateId}`, data);
      return res.json() as Promise<Project>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });
}

// ============================================
// PROJECT DELIVERIES HOOKS
// ============================================

export function useProjectDeliveries(projectId: number) {
  return useQuery<ProjectDeliveryWithPhase[]>({
    queryKey: ["/api/projects", projectId, "deliveries"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/projects/${projectId}/deliveries`);
      return res.json();
    },
    enabled: !!projectId,
  });
}

export function useCreateDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: number; data: Partial<InsertProjectDelivery> }) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/deliveries`, data);
      return res.json() as Promise<ProjectDelivery>;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
    },
  });
}

export function useUpdateDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId, data }: { id: number; projectId: number; data: Partial<InsertProjectDelivery> }) => {
      const res = await apiRequest("PATCH", `/api/deliveries/${id}`, data);
      return res.json() as Promise<ProjectDelivery>;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
    },
  });
}

export function useDeleteDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: number; projectId: number }) => {
      await apiRequest("DELETE", `/api/deliveries/${id}`);
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
    },
  });
}

// ============================================
// CHANGE ORDERS HOOKS
// ============================================

export function useChangeOrders(projectId: number) {
  return useQuery<ChangeOrderWithPhase[]>({
    queryKey: ["/api/projects", projectId, "change-orders"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/projects/${projectId}/change-orders`);
      return res.json();
    },
    enabled: !!projectId,
  });
}

export function useCreateChangeOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: number; data: Partial<InsertChangeOrder> }) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/change-orders`, data);
      return res.json() as Promise<ChangeOrder>;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "change-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
    },
  });
}

export function useUpdateChangeOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId, data }: { id: number; projectId: number; data: Partial<InsertChangeOrder> }) => {
      const res = await apiRequest("PATCH", `/api/change-orders/${id}`, data);
      return res.json() as Promise<ChangeOrder>;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "change-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
    },
  });
}

export function useSubmitChangeOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: number; projectId: number }) => {
      const res = await apiRequest("POST", `/api/change-orders/${id}/submit`);
      return res.json() as Promise<ChangeOrder>;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "change-orders"] });
    },
  });
}

export function useApproveChangeOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId, approvedBy, signature }: { id: number; projectId: number; approvedBy: string; signature: string }) => {
      const res = await apiRequest("POST", `/api/change-orders/${id}/approve`, { approvedBy, signature });
      return res.json() as Promise<ChangeOrder>;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "change-orders"] });
    },
  });
}

export function useRejectChangeOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId, rejectionReason }: { id: number; projectId: number; rejectionReason: string }) => {
      const res = await apiRequest("POST", `/api/change-orders/${id}/reject`, { rejectionReason });
      return res.json() as Promise<ChangeOrder>;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "change-orders"] });
    },
  });
}

export function useDeleteChangeOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: number; projectId: number }) => {
      await apiRequest("DELETE", `/api/change-orders/${id}`);
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "change-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
    },
  });
}
