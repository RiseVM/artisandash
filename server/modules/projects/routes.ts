import type { Express } from "express";
import { z } from "zod";
import {
  asyncHandler,
  isAuthenticated,
  requirePermission,
  validate,
} from "../../middleware";
import {
  insertProjectSchema,
  insertProjectPhaseSchema,
  insertProjectTaskSchema,
  insertProjectTemplateSchema,
  insertPhaseTemplateSchema,
  insertTaskTemplateSchema,
  insertProjectDeliverySchema,
  insertChangeOrderSchema,
  insertProjectFileSchema,
  insertTimeEntrySchema,
  insertProjectLineItemSchema,
  insertProjectPaymentSchema,
  insertProjectUpdateSchema,
  insertProjectMessageSchema,
  insertOutOfScopeItemSchema,
  insertClientFeedbackSchema,
} from "@shared/schema";
import { projectStorage } from "./storage";

export function registerProjectRoutes(app: Express) {
  // ============================================
  // PROJECT CRUD ROUTES
  // ============================================

  // GET /api/projects - List all projects
  app.get(
    "/api/projects",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (_req, res) => {
      const projects = await projectStorage.getProjects();
      res.json(projects);
    })
  );

  // GET /api/projects/:id - Get single project with full details
  app.get(
    "/api/projects/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const project = await projectStorage.getProjectWithDetails(id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      res.json(project);
    })
  );

  // POST /api/projects - Create new project
  app.post(
    "/api/projects",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const userId = req.user?.id;
      const userName = req.user
        ? `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() ||
          req.user.email
        : null;

      const data = insertProjectSchema.parse(req.body);

      const project = await projectStorage.createProject({
        ...data,
        created_by_user_id: userId,
        created_by_user_name: userName,
      });

      res.status(201).json(project);
    })
  );

  // PATCH /api/projects/:id - Update project
  app.patch(
    "/api/projects/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const data = insertProjectSchema.partial().parse(req.body);
      const project = await projectStorage.updateProject(id, data);

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      res.json(project);
    })
  );

  // DELETE /api/projects/:id - Delete project
  app.delete(
    "/api/projects/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const project = await projectStorage.getProject(id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const deleted = await projectStorage.deleteProject(id);
      if (!deleted) {
        return res.status(404).json({ error: "Project not found" });
      }

      res.json({ success: true });
    })
  );

  // ============================================
  // PROJECT PHASES ROUTES
  // ============================================

  // POST /api/projects/:projectId/phases - Add phase to project
  app.post(
    "/api/projects/:projectId/phases",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const project = await projectStorage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const existingPhases = await projectStorage.getProjectPhases(projectId);
      const maxOrder =
        existingPhases.length > 0
          ? Math.max(...existingPhases.map((p) => p.display_order))
          : 0;

      const data = insertProjectPhaseSchema.parse({
        ...req.body,
        project_id: projectId,
        display_order: req.body.display_order ?? maxOrder + 1,
      });

      const phase = await projectStorage.createProjectPhase(data);
      res.status(201).json(phase);
    })
  );

  // PATCH /api/phases/:id - Update phase
  app.patch(
    "/api/phases/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid phase ID" });
      }

      const data = insertProjectPhaseSchema.partial().parse(req.body);
      const phase = await projectStorage.updateProjectPhase(id, data);

      if (!phase) {
        return res.status(404).json({ error: "Phase not found" });
      }

      res.json(phase);
    })
  );

  // DELETE /api/phases/:id - Delete phase
  app.delete(
    "/api/phases/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid phase ID" });
      }

      const deleted = await projectStorage.deleteProjectPhase(id);
      if (!deleted) {
        return res.status(404).json({ error: "Phase not found" });
      }

      res.json({ success: true });
    })
  );

  // POST /api/projects/:projectId/phases/reorder - Reorder phases
  app.post(
    "/api/projects/:projectId/phases/reorder",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const { phaseIds } = req.body;
      if (!Array.isArray(phaseIds)) {
        return res.status(400).json({ error: "phaseIds must be an array" });
      }

      await projectStorage.reorderProjectPhases(projectId, phaseIds);
      res.json({ success: true });
    })
  );

  // ============================================
  // PROJECT TASKS ROUTES
  // ============================================

  // POST /api/phases/:phaseId/tasks - Add task to phase
  app.post(
    "/api/phases/:phaseId/tasks",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const phaseId = parseInt(req.params.phaseId);
      if (isNaN(phaseId)) {
        return res.status(400).json({ error: "Invalid phase ID" });
      }

      const phase = await projectStorage.getProjectPhase(phaseId);
      if (!phase) {
        return res.status(404).json({ error: "Phase not found" });
      }

      const existingTasks = await projectStorage.getPhaseTasks(phaseId);
      const maxOrder =
        existingTasks.length > 0
          ? Math.max(...existingTasks.map((t) => t.display_order))
          : 0;

      const data = insertProjectTaskSchema.parse({
        ...req.body,
        phase_id: phaseId,
        display_order: req.body.display_order ?? maxOrder + 1,
      });

      const task = await projectStorage.createProjectTask(data);
      res.status(201).json(task);
    })
  );

  // PATCH /api/tasks/:id - Update task
  app.patch(
    "/api/tasks/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid task ID" });
      }

      const data = insertProjectTaskSchema.partial().parse(req.body);

      // If marking as completed, set completed_at and completed_by
      if (data.status === "completed") {
        data.completed_at = new Date();
        data.completed_by = req.user?.id;
      }

      const task = await projectStorage.updateProjectTask(id, data);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.json(task);
    })
  );

  // DELETE /api/tasks/:id - Delete task
  app.delete(
    "/api/tasks/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid task ID" });
      }

      const deleted = await projectStorage.deleteProjectTask(id);
      if (!deleted) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.json({ success: true });
    })
  );

  // ============================================
  // PROJECT DELIVERIES ROUTES
  // ============================================

  // GET /api/projects/:projectId/deliveries - Get deliveries for a project
  app.get(
    "/api/projects/:projectId/deliveries",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const deliveries = await projectStorage.getProjectDeliveries(projectId);
      res.json(deliveries);
    })
  );

  // POST /api/projects/:projectId/deliveries - Create a delivery
  app.post(
    "/api/projects/:projectId/deliveries",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const project = await projectStorage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const data = insertProjectDeliverySchema.parse({
        ...req.body,
        project_id: projectId,
      });

      const delivery = await projectStorage.createProjectDelivery(data);
      res.status(201).json(delivery);
    })
  );

  // PATCH /api/deliveries/:id - Update a delivery
  app.patch(
    "/api/deliveries/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid delivery ID" });
      }

      const data = insertProjectDeliverySchema.partial().parse(req.body);
      const delivery = await projectStorage.updateProjectDelivery(id, data);

      if (!delivery) {
        return res.status(404).json({ error: "Delivery not found" });
      }

      res.json(delivery);
    })
  );

  // DELETE /api/deliveries/:id - Delete a delivery
  app.delete(
    "/api/deliveries/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid delivery ID" });
      }

      const deleted = await projectStorage.deleteProjectDelivery(id);
      if (!deleted) {
        return res.status(404).json({ error: "Delivery not found" });
      }

      res.json({ success: true });
    })
  );

  // ============================================
  // CHANGE ORDERS ROUTES
  // ============================================

  // GET /api/projects/:projectId/change-orders - Get change orders for project
  app.get(
    "/api/projects/:projectId/change-orders",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const changeOrders =
        await projectStorage.getChangeOrders(projectId);
      res.json(changeOrders);
    })
  );

  // POST /api/projects/:projectId/change-orders - Create a change order
  app.post(
    "/api/projects/:projectId/change-orders",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const project = await projectStorage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const data = insertChangeOrderSchema.parse({
        ...req.body,
        project_id: projectId,
        created_by_user_id: req.user?.id,
      });

      const changeOrder = await projectStorage.createChangeOrder(data);
      res.status(201).json(changeOrder);
    })
  );

  // PATCH /api/change-orders/:id - Update a change order
  app.patch(
    "/api/change-orders/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid change order ID" });
      }

      const data = insertChangeOrderSchema.partial().parse(req.body);
      const changeOrder = await projectStorage.updateChangeOrder(id, data);

      if (!changeOrder) {
        return res.status(404).json({ error: "Change order not found" });
      }

      res.json(changeOrder);
    })
  );

  // POST /api/change-orders/:id/submit - Submit change order for approval
  app.post(
    "/api/change-orders/:id/submit",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid change order ID" });
      }

      const changeOrder = await projectStorage.getChangeOrder(id);
      if (!changeOrder) {
        return res.status(404).json({ error: "Change order not found" });
      }

      if (changeOrder.status !== "draft") {
        return res
          .status(400)
          .json({ error: "Only draft change orders can be submitted" });
      }

      const updated = await projectStorage.updateChangeOrder(id, {
        status: "pending_approval",
        submitted_at: new Date(),
        submitted_by_user_id: req.user?.id,
      });

      res.json(updated);
    })
  );

  // POST /api/change-orders/:id/approve - Approve change order
  app.post(
    "/api/change-orders/:id/approve",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid change order ID" });
      }

      const changeOrder = await projectStorage.getChangeOrder(id);
      if (!changeOrder) {
        return res.status(404).json({ error: "Change order not found" });
      }

      if (changeOrder.status !== "pending_approval") {
        return res
          .status(400)
          .json({ error: "Only pending change orders can be approved" });
      }

      const updated = await projectStorage.updateChangeOrder(id, {
        status: "approved",
        approved_at: new Date(),
        approved_by_user_id: req.user?.id,
      });

      res.json(updated);
    })
  );

  // POST /api/change-orders/:id/reject - Reject change order
  app.post(
    "/api/change-orders/:id/reject",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid change order ID" });
      }

      const changeOrder = await projectStorage.getChangeOrder(id);
      if (!changeOrder) {
        return res.status(404).json({ error: "Change order not found" });
      }

      if (changeOrder.status !== "pending_approval") {
        return res
          .status(400)
          .json({ error: "Only pending change orders can be rejected" });
      }

      const { rejection_reason } = req.body;
      const updated = await projectStorage.updateChangeOrder(id, {
        status: "rejected",
        rejected_at: new Date(),
        rejected_by_user_id: req.user?.id,
        rejection_reason: rejection_reason || null,
      });

      res.json(updated);
    })
  );

  // DELETE /api/change-orders/:id - Delete change order (drafts only)
  app.delete(
    "/api/change-orders/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid change order ID" });
      }

      const changeOrder = await projectStorage.getChangeOrder(id);
      if (!changeOrder) {
        return res.status(404).json({ error: "Change order not found" });
      }

      if (changeOrder.status !== "draft") {
        return res
          .status(400)
          .json({ error: "Only draft change orders can be deleted" });
      }

      const deleted = await projectStorage.deleteChangeOrder(id);
      if (!deleted) {
        return res.status(404).json({ error: "Change order not found" });
      }

      res.json({ success: true });
    })
  );

  // ============================================
  // TIME ENTRIES ROUTES
  // ============================================

  // GET /api/projects/:projectId/time-entries - Get time entries for project
  app.get(
    "/api/projects/:projectId/time-entries",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const timeEntries = await projectStorage.getTimeEntries(projectId);
      res.json(timeEntries);
    })
  );

  // GET /api/projects/:projectId/time-totals - Get time totals for project
  app.get(
    "/api/projects/:projectId/time-totals",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const totals = await projectStorage.getProjectTimeTotal(projectId);
      res.json(totals);
    })
  );

  // POST /api/projects/:projectId/time-entries - Create time entry
  app.post(
    "/api/projects/:projectId/time-entries",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const project = await projectStorage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const data = insertTimeEntrySchema.parse({
        ...req.body,
        project_id: projectId,
        user_id: req.user?.id,
      });

      const timeEntry = await projectStorage.createTimeEntry(data);
      res.status(201).json(timeEntry);
    })
  );

  // PATCH /api/time-entries/:id - Update time entry
  app.patch(
    "/api/time-entries/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid time entry ID" });
      }

      const data = insertTimeEntrySchema.partial().parse(req.body);
      const timeEntry = await projectStorage.updateTimeEntry(id, data);

      if (!timeEntry) {
        return res.status(404).json({ error: "Time entry not found" });
      }

      res.json(timeEntry);
    })
  );

  // DELETE /api/time-entries/:id - Delete time entry
  app.delete(
    "/api/time-entries/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid time entry ID" });
      }

      const deleted = await projectStorage.deleteTimeEntry(id);
      if (!deleted) {
        return res.status(404).json({ error: "Time entry not found" });
      }

      res.json({ success: true });
    })
  );

  // ============================================
  // LINE ITEMS ROUTES
  // ============================================

  // GET /api/projects/:projectId/line-items - Get line items for project
  app.get(
    "/api/projects/:projectId/line-items",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const lineItems = await projectStorage.getProjectLineItems(projectId);
      res.json(lineItems);
    })
  );

  // GET /api/projects/:projectId/total - Get project total
  app.get(
    "/api/projects/:projectId/total",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const result = await projectStorage.getProjectTotal(projectId);
      res.json({ total: result.total || 0 });
    })
  );

  // POST /api/projects/:projectId/line-items - Create line item
  app.post(
    "/api/projects/:projectId/line-items",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const project = await projectStorage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const data = insertProjectLineItemSchema.parse({
        ...req.body,
        project_id: projectId,
      });

      const lineItem = await projectStorage.createProjectLineItem(data);
      res.status(201).json(lineItem);
    })
  );

  // PATCH /api/line-items/:id - Update line item
  app.patch(
    "/api/line-items/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid line item ID" });
      }

      const data = insertProjectLineItemSchema.partial().parse(req.body);
      const lineItem = await projectStorage.updateProjectLineItem(id, data);

      if (!lineItem) {
        return res.status(404).json({ error: "Line item not found" });
      }

      res.json(lineItem);
    })
  );

  // DELETE /api/line-items/:id - Delete line item
  app.delete(
    "/api/line-items/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid line item ID" });
      }

      const deleted = await projectStorage.deleteProjectLineItem(id);
      if (!deleted) {
        return res.status(404).json({ error: "Line item not found" });
      }

      res.json({ success: true });
    })
  );

  // ============================================
  // PAYMENTS ROUTES
  // ============================================

  // GET /api/projects/:projectId/payments - Get payments for project
  app.get(
    "/api/projects/:projectId/payments",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const payments = await projectStorage.getProjectPayments(projectId);
      res.json(payments);
    })
  );

  // GET /api/projects/:projectId/payment-summary - Get payment summary
  app.get(
    "/api/projects/:projectId/payment-summary",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const summary = await projectStorage.getProjectPaymentSummary(projectId);
      res.json(summary);
    })
  );

  // POST /api/projects/:projectId/payments - Create payment
  app.post(
    "/api/projects/:projectId/payments",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const project = await projectStorage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const data = insertProjectPaymentSchema.parse({
        ...req.body,
        project_id: projectId,
      });

      const payment = await projectStorage.createProjectPayment(data);
      res.status(201).json(payment);
    })
  );

  // PATCH /api/payments/:id - Update payment
  app.patch(
    "/api/payments/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid payment ID" });
      }

      const data = insertProjectPaymentSchema.partial().parse(req.body);
      const payment = await projectStorage.updateProjectPayment(id, data);

      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      res.json(payment);
    })
  );

  // DELETE /api/payments/:id - Delete payment
  app.delete(
    "/api/payments/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid payment ID" });
      }

      const deleted = await projectStorage.deleteProjectPayment(id);
      if (!deleted) {
        return res.status(404).json({ error: "Payment not found" });
      }

      res.json({ success: true });
    })
  );

  // ============================================
  // FILES ROUTES
  // ============================================

  // GET /api/projects/:projectId/files - Get files for project
  app.get(
    "/api/projects/:projectId/files",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const files = await projectStorage.getProjectFiles(projectId);
      res.json(files);
    })
  );

  // POST /api/projects/:projectId/files - Create file record
  app.post(
    "/api/projects/:projectId/files",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const project = await projectStorage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const data = insertProjectFileSchema.parse({
        ...req.body,
        project_id: projectId,
      });

      const file = await projectStorage.createProjectFile(data);
      res.status(201).json(file);
    })
  );

  // PATCH /api/files/:id - Update file record
  app.patch(
    "/api/files/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid file ID" });
      }

      const data = insertProjectFileSchema.partial().parse(req.body);
      const file = await projectStorage.updateProjectFile(id, data);

      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      res.json(file);
    })
  );

  // DELETE /api/files/:id - Delete file record
  app.delete(
    "/api/files/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid file ID" });
      }

      const deleted = await projectStorage.deleteProjectFile(id);
      if (!deleted) {
        return res.status(404).json({ error: "File not found" });
      }

      res.json({ success: true });
    })
  );

  // ============================================
  // UPDATES ROUTES
  // ============================================

  // GET /api/projects/:projectId/updates - Get updates for project
  app.get(
    "/api/projects/:projectId/updates",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const updates = await projectStorage.getProjectUpdates(projectId);
      res.json(updates);
    })
  );

  // POST /api/projects/:projectId/updates - Create project update
  app.post(
    "/api/projects/:projectId/updates",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const project = await projectStorage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const data = insertProjectUpdateSchema.parse({
        ...req.body,
        project_id: projectId,
        created_by_user_id: req.user?.id,
      });

      const update = await projectStorage.createProjectUpdate(data);
      res.status(201).json(update);
    })
  );

  // DELETE /api/updates/:id - Delete project update
  app.delete(
    "/api/updates/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid update ID" });
      }

      const deleted = await projectStorage.deleteProjectUpdate(id);
      if (!deleted) {
        return res.status(404).json({ error: "Update not found" });
      }

      res.json({ success: true });
    })
  );

  // ============================================
  // MESSAGES ROUTES
  // ============================================

  // GET /api/projects/:projectId/messages - Get messages for project
  app.get(
    "/api/projects/:projectId/messages",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const messages = await projectStorage.getProjectMessages(projectId);
      res.json(messages);
    })
  );

  // GET /api/projects/:projectId/messages/unread-count - Get unread count
  app.get(
    "/api/projects/:projectId/messages/unread-count",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const count = await projectStorage.getUnreadMessageCountForAdmin(projectId);
      res.json({ count });
    })
  );

  // POST /api/projects/:projectId/messages - Create message
  app.post(
    "/api/projects/:projectId/messages",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const project = await projectStorage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const data = insertProjectMessageSchema.parse({
        ...req.body,
        project_id: projectId,
        sender_type: "admin",
        sender_user_id: req.user?.id,
        sender_name: req.user?.name || req.user?.email || "Admin",
      });

      const message = await projectStorage.createProjectMessage(data);
      res.status(201).json(message);
    })
  );

  // POST /api/projects/:projectId/messages/mark-read - Mark all as read
  app.post(
    "/api/projects/:projectId/messages/mark-read",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      await projectStorage.markAllMessagesReadByAdmin(projectId);
      res.json({ success: true });
    })
  );

  // DELETE /api/messages/:id - Delete message
  app.delete(
    "/api/messages/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid message ID" });
      }

      const deleted = await projectStorage.deleteProjectMessage(id);
      if (!deleted) {
        return res.status(404).json({ error: "Message not found" });
      }

      res.json({ success: true });
    })
  );

  // ============================================
  // PROJECT TEMPLATES ROUTES
  // ============================================

  // GET /api/project-templates - Get all project templates
  app.get(
    "/api/project-templates",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (_req, res) => {
      const templates = await projectStorage.getProjectTemplates();
      res.json(templates);
    })
  );

  // GET /api/project-templates/:id - Get project template with details
  app.get(
    "/api/project-templates/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }

      const template = await projectStorage.getProjectTemplateWithDetails(id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      res.json(template);
    })
  );

  // POST /api/project-templates - Create project template
  app.post(
    "/api/project-templates",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const userId = req.user?.id;
      const userName = req.user?.email || "Unknown";

      const data = insertProjectTemplateSchema.parse(req.body);
      const template = await projectStorage.createProjectTemplate({
        ...data,
        created_by_user_id: userId,
        created_by_user_name: userName,
      });

      res.status(201).json(template);
    })
  );

  // PATCH /api/project-templates/:id - Update project template
  app.patch(
    "/api/project-templates/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }

      const data = insertProjectTemplateSchema.partial().parse(req.body);
      const template = await projectStorage.updateProjectTemplate(id, data);

      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      res.json(template);
    })
  );

  // DELETE /api/project-templates/:id - Delete project template
  app.delete(
    "/api/project-templates/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }

      const template = await projectStorage.getProjectTemplate(id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      const deleted = await projectStorage.deleteProjectTemplate(id);
      if (!deleted) {
        return res.status(404).json({ error: "Template not found" });
      }

      res.json({ success: true });
    })
  );

  // ============================================
  // PHASE TEMPLATES ROUTES
  // ============================================

  // POST /api/project-templates/:templateId/phases - Add phase to template
  app.post(
    "/api/project-templates/:templateId/phases",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const templateId = parseInt(req.params.templateId);
      if (isNaN(templateId)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }

      const template = await projectStorage.getProjectTemplate(templateId);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      const existingPhases =
        await projectStorage.getPhaseTemplates(templateId);
      const maxOrder =
        existingPhases.length > 0
          ? Math.max(...existingPhases.map((p) => p.display_order))
          : 0;

      const data = insertPhaseTemplateSchema.parse({
        ...req.body,
        project_template_id: templateId,
        display_order: req.body.display_order ?? maxOrder + 1,
      });

      const phase = await projectStorage.createPhaseTemplate(data);
      res.status(201).json(phase);
    })
  );

  // PATCH /api/phase-templates/:id - Update phase template
  app.patch(
    "/api/phase-templates/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid phase template ID" });
      }

      const data = insertPhaseTemplateSchema.partial().parse(req.body);
      const phase = await projectStorage.updatePhaseTemplate(id, data);

      if (!phase) {
        return res.status(404).json({ error: "Phase template not found" });
      }

      res.json(phase);
    })
  );

  // DELETE /api/phase-templates/:id - Delete phase template
  app.delete(
    "/api/phase-templates/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid phase template ID" });
      }

      const deleted = await projectStorage.deletePhaseTemplate(id);
      if (!deleted) {
        return res.status(404).json({ error: "Phase template not found" });
      }

      res.json({ success: true });
    })
  );

  // POST /api/project-templates/:templateId/phases/reorder - Reorder phases
  app.post(
    "/api/project-templates/:templateId/phases/reorder",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const templateId = parseInt(req.params.templateId);
      if (isNaN(templateId)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }

      const { phaseIds } = req.body;
      if (!Array.isArray(phaseIds)) {
        return res.status(400).json({ error: "phaseIds must be an array" });
      }

      await projectStorage.reorderPhaseTemplates(templateId, phaseIds);
      res.json({ success: true });
    })
  );

  // ============================================
  // TASK TEMPLATES ROUTES
  // ============================================

  // POST /api/phase-templates/:phaseId/tasks - Add task to phase template
  app.post(
    "/api/phase-templates/:phaseId/tasks",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const phaseId = parseInt(req.params.phaseId);
      if (isNaN(phaseId)) {
        return res.status(400).json({ error: "Invalid phase template ID" });
      }

      const phase = await projectStorage.getPhaseTemplate(phaseId);
      if (!phase) {
        return res.status(404).json({ error: "Phase template not found" });
      }

      const existingTasks = await projectStorage.getTaskTemplates(phaseId);
      const maxOrder =
        existingTasks.length > 0
          ? Math.max(...existingTasks.map((t) => t.display_order))
          : 0;

      const data = insertTaskTemplateSchema.parse({
        ...req.body,
        phase_template_id: phaseId,
        display_order: req.body.display_order ?? maxOrder + 1,
      });

      const task = await projectStorage.createTaskTemplate(data);
      res.status(201).json(task);
    })
  );

  // PATCH /api/task-templates/:id - Update task template
  app.patch(
    "/api/task-templates/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid task template ID" });
      }

      const data = insertTaskTemplateSchema.partial().parse(req.body);
      const task = await projectStorage.updateTaskTemplate(id, data);

      if (!task) {
        return res.status(404).json({ error: "Task template not found" });
      }

      res.json(task);
    })
  );

  // DELETE /api/task-templates/:id - Delete task template
  app.delete(
    "/api/task-templates/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid task template ID" });
      }

      const deleted = await projectStorage.deleteTaskTemplate(id);
      if (!deleted) {
        return res.status(404).json({ error: "Task template not found" });
      }

      res.json({ success: true });
    })
  );

  // ============================================
  // CREATE FROM TEMPLATE ROUTES
  // ============================================

  // POST /api/projects/from-template/:templateId - Create project from template
  app.post(
    "/api/projects/from-template/:templateId",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const templateId = parseInt(req.params.templateId);
      if (isNaN(templateId)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }

      const userId = req.user?.id;
      const userName = req.user?.email || "Unknown";
      const data = insertProjectSchema.parse(req.body);

      const project = await projectStorage.createProjectFromTemplate(
        templateId,
        {
          ...data,
          created_by_user_id: userId,
          created_by_user_name: userName,
        }
      );

      res.status(201).json(project);
    })
  );

  // ============================================
  // OUT OF SCOPE ITEMS ROUTES
  // ============================================

  // GET /api/projects/:projectId/out-of-scope - Get out of scope items
  app.get(
    "/api/projects/:projectId/out-of-scope",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const items = await projectStorage.getOutOfScopeItems(projectId);
      res.json(items);
    })
  );

  // POST /api/projects/:projectId/out-of-scope - Create out of scope item
  app.post(
    "/api/projects/:projectId/out-of-scope",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const project = await projectStorage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const data = insertOutOfScopeItemSchema.parse({
        ...req.body,
        project_id: projectId,
      });

      const item = await projectStorage.createOutOfScopeItem(data);
      res.status(201).json(item);
    })
  );

  // PATCH /api/out-of-scope/:id - Update out of scope item
  app.patch(
    "/api/out-of-scope/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid out of scope ID" });
      }

      const data = insertOutOfScopeItemSchema.partial().parse(req.body);
      const item = await projectStorage.updateOutOfScopeItem(id, data);

      if (!item) {
        return res.status(404).json({ error: "Out of scope item not found" });
      }

      res.json(item);
    })
  );

  // DELETE /api/out-of-scope/:id - Delete out of scope item
  app.delete(
    "/api/out-of-scope/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid out of scope ID" });
      }

      const deleted = await projectStorage.deleteOutOfScopeItem(id);
      if (!deleted) {
        return res.status(404).json({ error: "Out of scope item not found" });
      }

      res.json({ success: true });
    })
  );

  // ============================================
  // CLIENT FEEDBACK ROUTES
  // ============================================

  // GET /api/projects/:projectId/feedback - Get feedback for project
  app.get(
    "/api/projects/:projectId/feedback",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const feedback = await projectStorage.getClientFeedback(projectId);
      res.json(feedback);
    })
  );

  // POST /api/projects/:projectId/feedback - Create feedback
  app.post(
    "/api/projects/:projectId/feedback",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const project = await projectStorage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const data = insertClientFeedbackSchema.parse({
        ...req.body,
        project_id: projectId,
      });

      const feedback = await projectStorage.createClientFeedback(data);
      res.status(201).json(feedback);
    })
  );

  // PATCH /api/feedback/:id - Update feedback (respond to feedback)
  app.patch(
    "/api/feedback/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid feedback ID" });
      }

      const data = insertClientFeedbackSchema.partial().parse(req.body);
      const feedback = await projectStorage.updateClientFeedback(id, data);

      if (!feedback) {
        return res.status(404).json({ error: "Feedback not found" });
      }

      res.json(feedback);
    })
  );

  // DELETE /api/feedback/:id - Delete feedback
  app.delete(
    "/api/feedback/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid feedback ID" });
      }

      const deleted = await projectStorage.deleteClientFeedback(id);
      if (!deleted) {
        return res.status(404).json({ error: "Feedback not found" });
      }

      res.json({ success: true });
    })
  );
}
