import { eq, and, or, desc, asc, gte, lte, sql } from "drizzle-orm";
import { db } from "../../../db/index";
import {
  projects,
  projectPhases,
  projectTasks,
  projectTemplates,
  phaseTemplates,
  taskTemplates,
  projectDeliveries,
  changeOrders,
  projectFiles,
  timeEntries,
  projectLineItems,
  projectPayments,
  projectUpdates,
  projectMessages,
  customFieldDefinitions,
  customFieldValues,
  outOfScopeItems,
  clientFeedback,
  customers,
  users,
  type Project,
  type InsertProject,
  type ProjectPhase,
  type InsertProjectPhase,
  type ProjectTask,
  type InsertProjectTask,
  type ProjectTemplate,
  type InsertProjectTemplate,
  type PhaseTemplate,
  type InsertPhaseTemplate,
  type TaskTemplate,
  type InsertTaskTemplate,
  type ProjectDelivery,
  type InsertProjectDelivery,
  type ProjectFile,
  type InsertProjectFile,
  type TimeEntry,
  type InsertTimeEntry,
  type ProjectLineItem,
  type InsertProjectLineItem,
  type ProjectPayment,
  type InsertProjectPayment,
  type ProjectUpdate,
  type InsertProjectUpdate,
  type ProjectMessage,
  type InsertProjectMessage,
  type CustomFieldDefinition,
  type InsertCustomFieldDefinition,
  type CustomFieldValue,
  type InsertCustomFieldValue,
  type OutOfScopeItem,
  type InsertOutOfScopeItem,
  type ClientFeedback,
  type InsertClientFeedback,
  type ProjectWithCustomer,
  type ProjectWithDetails,
  type ProjectPhaseWithTasks,
  type ProjectDeliveryWithPhase,
  type ChangeOrder,
  type InsertChangeOrder,
  type ChangeOrderWithPhase,
  type TimeEntryWithPhase,
  type ProjectLineItemWithRelations,
  type ProjectTemplateWithDetails,
  type PhaseTemplateWithTasks,
} from "@shared/schema";

export const projectStorage = {
  // ── PROJECTS ───────────────────────────────────

  async getProjects(): Promise<ProjectWithCustomer[]> {
    const result = await db
      .select({
        project: projects,
        customer: customers,
        user: users,
      })
      .from(projects)
      .innerJoin(customers, eq(projects.customer_id, customers.id))
      .leftJoin(users, eq(projects.created_by_user_id, users.id))
      .orderBy(desc(projects.created_at));

    return result.map((row) => ({
      ...row.project,
      customer: row.customer,
      createdByUser: row.user || null,
    }));
  },

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  },

  async getProjectWithDetails(id: number): Promise<ProjectWithDetails | undefined> {
    const projectResult = await db
      .select({
        project: projects,
        customer: customers,
        user: users,
      })
      .from(projects)
      .innerJoin(customers, eq(projects.customer_id, customers.id))
      .leftJoin(users, eq(projects.created_by_user_id, users.id))
      .where(eq(projects.id, id));

    if (!projectResult[0]) return undefined;

    const phases = await db
      .select()
      .from(projectPhases)
      .where(eq(projectPhases.project_id, id))
      .orderBy(asc(projectPhases.display_order));

    const phasesWithTasks: ProjectPhaseWithTasks[] = await Promise.all(
      phases.map(async (phase) => {
        const tasks = await db
          .select()
          .from(projectTasks)
          .where(eq(projectTasks.phase_id, phase.id))
          .orderBy(asc(projectTasks.display_order));
        return { ...phase, tasks };
      })
    );

    return {
      ...projectResult[0].project,
      customer: projectResult[0].customer,
      phases: phasesWithTasks,
      createdByUser: projectResult[0].user || null,
    };
  },

  async getProjectsByCustomer(customerId: number): Promise<Project[]> {
    return db
      .select()
      .from(projects)
      .where(eq(projects.customer_id, customerId))
      .orderBy(desc(projects.created_at));
  },

  async createProject(project: InsertProject): Promise<Project> {
    const [result] = await db.insert(projects).values(project).returning();
    return result;
  },

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined> {
    const [result] = await db
      .update(projects)
      .set({ ...project, updated_at: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return result;
  },

  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id)).returning();
    return result.length > 0;
  },

  async updateProjectProgress(projectId: number): Promise<number> {
    const phases = await db
      .select()
      .from(projectPhases)
      .where(eq(projectPhases.project_id, projectId));

    const activePhases = phases.filter((p) => p.status !== "skipped");
    if (activePhases.length === 0) {
      await db.update(projects).set({ overall_progress: 0, updated_at: new Date() }).where(eq(projects.id, projectId));
      return 0;
    }

    const totalProgress = activePhases.reduce((sum, phase) => sum + phase.progress, 0);
    const overallProgress = Math.round(totalProgress / activePhases.length);

    const currentPhase = activePhases.find((p) => p.status !== "completed");
    const currentPhaseId = currentPhase?.id || null;

    await db
      .update(projects)
      .set({ overall_progress: overallProgress, current_phase_id: currentPhaseId, updated_at: new Date() })
      .where(eq(projects.id, projectId));

    return overallProgress;
  },

  // ── PROJECT PHASES ───────────────────────────

  async getProjectPhases(projectId: number): Promise<ProjectPhase[]> {
    return db
      .select()
      .from(projectPhases)
      .where(eq(projectPhases.project_id, projectId))
      .orderBy(asc(projectPhases.display_order));
  },

  async getProjectPhase(id: number): Promise<ProjectPhase | undefined> {
    const [phase] = await db.select().from(projectPhases).where(eq(projectPhases.id, id));
    return phase;
  },

  async createProjectPhase(phase: InsertProjectPhase): Promise<ProjectPhase> {
    const [result] = await db.insert(projectPhases).values(phase).returning();
    return result;
  },

  async updateProjectPhase(id: number, phase: Partial<InsertProjectPhase>): Promise<ProjectPhase | undefined> {
    const [result] = await db
      .update(projectPhases)
      .set({ ...phase, updated_at: new Date() })
      .where(eq(projectPhases.id, id))
      .returning();
    return result;
  },

  async deleteProjectPhase(id: number): Promise<boolean> {
    const result = await db.delete(projectPhases).where(eq(projectPhases.id, id)).returning();
    return result.length > 0;
  },

  async reorderProjectPhases(projectId: number, phaseIds: number[]): Promise<void> {
    for (let i = 0; i < phaseIds.length; i++) {
      await db
        .update(projectPhases)
        .set({ display_order: i + 1, updated_at: new Date() })
        .where(and(eq(projectPhases.id, phaseIds[i]), eq(projectPhases.project_id, projectId)));
    }
  },

  async updatePhaseProgress(phaseId: number): Promise<number> {
    const tasks = await db.select().from(projectTasks).where(eq(projectTasks.phase_id, phaseId));

    if (tasks.length === 0) {
      const [phase] = await db.select().from(projectPhases).where(eq(projectPhases.id, phaseId));
      let progress = 0;
      if (phase?.status === "completed") progress = 100;
      else if (phase?.status === "in_progress") progress = 50;

      await db.update(projectPhases).set({ progress, updated_at: new Date() }).where(eq(projectPhases.id, phaseId));
      return progress;
    }

    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const progress = Math.round((completedTasks / tasks.length) * 100);

    await db.update(projectPhases).set({ progress, updated_at: new Date() }).where(eq(projectPhases.id, phaseId));

    const [phase] = await db.select().from(projectPhases).where(eq(projectPhases.id, phaseId));
    if (phase) {
      await projectStorage.updateProjectProgress(phase.project_id);
    }

    return progress;
  },

  // ── PROJECT TASKS ───────────────────────────

  async getPhaseTasks(phaseId: number): Promise<ProjectTask[]> {
    return db
      .select()
      .from(projectTasks)
      .where(eq(projectTasks.phase_id, phaseId))
      .orderBy(asc(projectTasks.display_order));
  },

  async getProjectTask(id: number): Promise<ProjectTask | undefined> {
    const [task] = await db.select().from(projectTasks).where(eq(projectTasks.id, id));
    return task;
  },

  async createProjectTask(task: InsertProjectTask): Promise<ProjectTask> {
    const [result] = await db.insert(projectTasks).values(task).returning();
    await projectStorage.updatePhaseProgress(task.phase_id);
    return result;
  },

  async updateProjectTask(id: number, task: Partial<InsertProjectTask>): Promise<ProjectTask | undefined> {
    const [existing] = await db.select().from(projectTasks).where(eq(projectTasks.id, id));
    if (!existing) return undefined;

    const [result] = await db
      .update(projectTasks)
      .set({ ...task, updated_at: new Date() })
      .where(eq(projectTasks.id, id))
      .returning();

    await projectStorage.updatePhaseProgress(existing.phase_id);
    return result;
  },

  async deleteProjectTask(id: number): Promise<boolean> {
    const [existing] = await db.select().from(projectTasks).where(eq(projectTasks.id, id));
    if (!existing) return false;

    const result = await db.delete(projectTasks).where(eq(projectTasks.id, id)).returning();
    await projectStorage.updatePhaseProgress(existing.phase_id);
    return result.length > 0;
  },

  // ── PROJECT TEMPLATES ───────────────────────

  async getProjectTemplates(): Promise<ProjectTemplate[]> {
    return db
      .select()
      .from(projectTemplates)
      .orderBy(desc(projectTemplates.created_at));
  },

  async getProjectTemplate(id: number): Promise<ProjectTemplate | undefined> {
    const [template] = await db.select().from(projectTemplates).where(eq(projectTemplates.id, id));
    return template;
  },

  async getProjectTemplateWithDetails(id: number): Promise<ProjectTemplateWithDetails | undefined> {
    const templateResult = await db
      .select({
        template: projectTemplates,
        user: users,
      })
      .from(projectTemplates)
      .leftJoin(users, eq(projectTemplates.created_by_user_id, users.id))
      .where(eq(projectTemplates.id, id));

    if (!templateResult[0]) return undefined;

    const phases = await db
      .select()
      .from(phaseTemplates)
      .where(eq(phaseTemplates.project_template_id, id))
      .orderBy(asc(phaseTemplates.display_order));

    const phasesWithTasks: PhaseTemplateWithTasks[] = await Promise.all(
      phases.map(async (phase) => {
        const tasks = await db
          .select()
          .from(taskTemplates)
          .where(eq(taskTemplates.phase_template_id, phase.id))
          .orderBy(asc(taskTemplates.display_order));
        return { ...phase, tasks };
      })
    );

    return {
      ...templateResult[0].template,
      phases: phasesWithTasks,
      createdByUser: templateResult[0].user || null,
    };
  },

  async createProjectTemplate(template: InsertProjectTemplate): Promise<ProjectTemplate> {
    const [result] = await db.insert(projectTemplates).values(template).returning();
    return result;
  },

  async updateProjectTemplate(id: number, template: Partial<InsertProjectTemplate>): Promise<ProjectTemplate | undefined> {
    const [result] = await db
      .update(projectTemplates)
      .set({ ...template, updated_at: new Date() })
      .where(eq(projectTemplates.id, id))
      .returning();
    return result;
  },

  async deleteProjectTemplate(id: number): Promise<boolean> {
    const result = await db.delete(projectTemplates).where(eq(projectTemplates.id, id)).returning();
    return result.length > 0;
  },

  // ── PHASE TEMPLATES ─────────────────────────

  async getPhaseTemplates(templateId: number): Promise<PhaseTemplate[]> {
    return db
      .select()
      .from(phaseTemplates)
      .where(eq(phaseTemplates.project_template_id, templateId))
      .orderBy(asc(phaseTemplates.display_order));
  },

  async getPhaseTemplate(id: number): Promise<PhaseTemplate | undefined> {
    const [result] = await db
      .select()
      .from(phaseTemplates)
      .where(eq(phaseTemplates.id, id));
    return result;
  },

  async createPhaseTemplate(phase: InsertPhaseTemplate): Promise<PhaseTemplate> {
    const [result] = await db.insert(phaseTemplates).values(phase).returning();
    return result;
  },

  async updatePhaseTemplate(id: number, phase: Partial<InsertPhaseTemplate>): Promise<PhaseTemplate | undefined> {
    const [result] = await db
      .update(phaseTemplates)
      .set(phase)
      .where(eq(phaseTemplates.id, id))
      .returning();
    return result;
  },

  async deletePhaseTemplate(id: number): Promise<boolean> {
    const result = await db.delete(phaseTemplates).where(eq(phaseTemplates.id, id)).returning();
    return result.length > 0;
  },

  async reorderPhaseTemplates(templateId: number, phaseIds: number[]): Promise<void> {
    for (let i = 0; i < phaseIds.length; i++) {
      await db
        .update(phaseTemplates)
        .set({ display_order: i + 1 })
        .where(and(eq(phaseTemplates.id, phaseIds[i]), eq(phaseTemplates.project_template_id, templateId)));
    }
  },

  // ── TASK TEMPLATES ──────────────────────────

  async getTaskTemplates(phaseId: number): Promise<TaskTemplate[]> {
    return db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.phase_template_id, phaseId))
      .orderBy(asc(taskTemplates.display_order));
  },

  async createTaskTemplate(task: InsertTaskTemplate): Promise<TaskTemplate> {
    const [result] = await db.insert(taskTemplates).values(task).returning();
    return result;
  },

  async updateTaskTemplate(id: number, task: Partial<InsertTaskTemplate>): Promise<TaskTemplate | undefined> {
    const [result] = await db
      .update(taskTemplates)
      .set(task)
      .where(eq(taskTemplates.id, id))
      .returning();
    return result;
  },

  async deleteTaskTemplate(id: number): Promise<boolean> {
    const result = await db.delete(taskTemplates).where(eq(taskTemplates.id, id)).returning();
    return result.length > 0;
  },

  // ── CREATE PROJECT FROM TEMPLATE ────────────

  async createProjectFromTemplate(templateId: number, projectData: InsertProject): Promise<Project> {
    const template = await projectStorage.getProjectTemplateWithDetails(templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    const [project] = await db.insert(projects).values(projectData).returning();

    for (const phaseTemplate of template.phases) {
      const [phase] = await db
        .insert(projectPhases)
        .values({
          project_id: project.id,
          name: phaseTemplate.name,
          description: phaseTemplate.description,
          display_order: phaseTemplate.display_order,
          client_visible: phaseTemplate.client_visible,
          requires_approval: phaseTemplate.requires_approval,
          status: "not_started",
          progress: 0,
        })
        .returning();

      for (const taskTemplate of phaseTemplate.tasks) {
        await db.insert(projectTasks).values({
          phase_id: phase.id,
          name: taskTemplate.name,
          description: taskTemplate.description,
          display_order: taskTemplate.display_order,
          client_visible: taskTemplate.client_visible,
          requires_approval: taskTemplate.requires_approval,
          status: "pending",
        });
      }
    }

    return project;
  },

  // ── PROJECT DELIVERIES ──────────────────────

  async getProjectDeliveries(projectId: number): Promise<ProjectDeliveryWithPhase[]> {
    const result = await db
      .select({
        delivery: projectDeliveries,
        phase: projectPhases,
      })
      .from(projectDeliveries)
      .leftJoin(projectPhases, eq(projectDeliveries.linked_phase_id, projectPhases.id))
      .where(eq(projectDeliveries.project_id, projectId))
      .orderBy(desc(projectDeliveries.created_at));

    return result.map((row) => ({
      ...row.delivery,
      phase: row.phase || null,
    }));
  },

  async getProjectDelivery(id: number): Promise<ProjectDelivery | undefined> {
    const [delivery] = await db.select().from(projectDeliveries).where(eq(projectDeliveries.id, id));
    return delivery;
  },

  async createProjectDelivery(delivery: InsertProjectDelivery): Promise<ProjectDelivery> {
    const [result] = await db.insert(projectDeliveries).values(delivery).returning();
    return result;
  },

  async updateProjectDelivery(id: number, delivery: Partial<InsertProjectDelivery>): Promise<ProjectDelivery | undefined> {
    const [result] = await db
      .update(projectDeliveries)
      .set({ ...delivery, updated_at: new Date() })
      .where(eq(projectDeliveries.id, id))
      .returning();
    return result;
  },

  async deleteProjectDelivery(id: number): Promise<boolean> {
    const result = await db.delete(projectDeliveries).where(eq(projectDeliveries.id, id)).returning();
    return result.length > 0;
  },

  // ── CHANGE ORDERS ───────────────────────────

  async getChangeOrders(projectId: number): Promise<ChangeOrderWithPhase[]> {
    const result = await db
      .select({
        changeOrder: changeOrders,
        phase: projectPhases,
      })
      .from(changeOrders)
      .leftJoin(projectPhases, eq(changeOrders.linked_phase_id, projectPhases.id))
      .where(eq(changeOrders.project_id, projectId))
      .orderBy(asc(changeOrders.co_number));

    return result.map((row) => ({
      ...row.changeOrder,
      phase: row.phase || null,
    }));
  },

  async getChangeOrder(id: number): Promise<ChangeOrder | undefined> {
    const [changeOrder] = await db.select().from(changeOrders).where(eq(changeOrders.id, id));
    return changeOrder;
  },

  async getNextChangeOrderNumber(projectId: number): Promise<number> {
    const result = await db
      .select({ co_number: changeOrders.co_number })
      .from(changeOrders)
      .where(eq(changeOrders.project_id, projectId))
      .orderBy(desc(changeOrders.co_number))
      .limit(1);

    return (result[0]?.co_number || 0) + 1;
  },

  async createChangeOrder(changeOrder: InsertChangeOrder): Promise<ChangeOrder> {
    const [result] = await db.insert(changeOrders).values(changeOrder).returning();
    return result;
  },

  async updateChangeOrder(id: number, changeOrder: Partial<InsertChangeOrder>): Promise<ChangeOrder | undefined> {
    const [result] = await db
      .update(changeOrders)
      .set({ ...changeOrder, updated_at: new Date() })
      .where(eq(changeOrders.id, id))
      .returning();
    return result;
  },

  async deleteChangeOrder(id: number): Promise<boolean> {
    const result = await db.delete(changeOrders).where(eq(changeOrders.id, id)).returning();
    return result.length > 0;
  },

  async approveChangeOrder(id: number, approvedBy: string, signature: string): Promise<ChangeOrder | undefined> {
    const [result] = await db
      .update(changeOrders)
      .set({
        status: "approved",
        approved_by: approvedBy,
        approval_signature: signature,
        decided_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(changeOrders.id, id))
      .returning();
    return result;
  },

  async rejectChangeOrder(id: number, rejectionReason: string): Promise<ChangeOrder | undefined> {
    const [result] = await db
      .update(changeOrders)
      .set({
        status: "rejected",
        rejection_reason: rejectionReason,
        decided_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(changeOrders.id, id))
      .returning();
    return result;
  },

  // ── PROJECT FILES ───────────────────────────

  async getProjectFiles(projectId: number): Promise<ProjectFile[]> {
    return db
      .select()
      .from(projectFiles)
      .where(eq(projectFiles.project_id, projectId))
      .orderBy(desc(projectFiles.created_at));
  },

  async getEntityFiles(entityType: string, entityId: number): Promise<ProjectFile[]> {
    return db
      .select()
      .from(projectFiles)
      .where(and(eq(projectFiles.entity_type, entityType), eq(projectFiles.entity_id, entityId)))
      .orderBy(desc(projectFiles.created_at));
  },

  async getProjectFile(id: number): Promise<ProjectFile | undefined> {
    const [file] = await db.select().from(projectFiles).where(eq(projectFiles.id, id));
    return file;
  },

  async createProjectFile(file: InsertProjectFile): Promise<ProjectFile> {
    const [result] = await db.insert(projectFiles).values(file).returning();
    return result;
  },

  async updateProjectFile(id: number, file: Partial<InsertProjectFile>): Promise<ProjectFile | undefined> {
    const [result] = await db
      .update(projectFiles)
      .set(file)
      .where(eq(projectFiles.id, id))
      .returning();
    return result;
  },

  async deleteProjectFile(id: number): Promise<boolean> {
    const result = await db.delete(projectFiles).where(eq(projectFiles.id, id)).returning();
    return result.length > 0;
  },

  // ── TIME ENTRIES ────────────────────────────

  async getTimeEntries(projectId: number): Promise<TimeEntryWithPhase[]> {
    const result = await db
      .select({
        entry: timeEntries,
        phase: projectPhases,
      })
      .from(timeEntries)
      .leftJoin(projectPhases, eq(timeEntries.linked_phase_id, projectPhases.id))
      .where(eq(timeEntries.project_id, projectId))
      .orderBy(desc(timeEntries.entry_date));

    return result.map((row) => ({
      ...row.entry,
      phase: row.phase || null,
    }));
  },

  async getTimeEntry(id: number): Promise<TimeEntry | undefined> {
    const [entry] = await db.select().from(timeEntries).where(eq(timeEntries.id, id));
    return entry;
  },

  async createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry> {
    const [result] = await db.insert(timeEntries).values(entry).returning();
    return result;
  },

  async updateTimeEntry(id: number, entry: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined> {
    const [result] = await db
      .update(timeEntries)
      .set({ ...entry, updated_at: new Date() })
      .where(eq(timeEntries.id, id))
      .returning();
    return result;
  },

  async deleteTimeEntry(id: number): Promise<boolean> {
    const result = await db.delete(timeEntries).where(eq(timeEntries.id, id)).returning();
    return result.length > 0;
  },

  async getProjectTimeTotal(projectId: number): Promise<{ total_hours: number; billable_hours: number }> {
    const entries = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.project_id, projectId));

    let total_hours = 0;
    let billable_hours = 0;
    for (const entry of entries) {
      const hours = parseFloat(entry.hours);
      total_hours += hours;
      if (entry.is_billable === "yes") {
        billable_hours += hours;
      }
    }
    return { total_hours, billable_hours };
  },

  // ── PROJECT LINE ITEMS ──────────────────────

  async getProjectLineItems(projectId: number): Promise<ProjectLineItemWithRelations[]> {
    const result = await db
      .select({
        item: projectLineItems,
        phase: projectPhases,
        changeOrder: changeOrders,
      })
      .from(projectLineItems)
      .leftJoin(projectPhases, eq(projectLineItems.linked_phase_id, projectPhases.id))
      .leftJoin(changeOrders, eq(projectLineItems.linked_change_order_id, changeOrders.id))
      .where(eq(projectLineItems.project_id, projectId))
      .orderBy(asc(projectLineItems.id));

    return result.map((row) => ({
      ...row.item,
      phase: row.phase || null,
      changeOrder: row.changeOrder || null,
    }));
  },

  async getProjectLineItem(id: number): Promise<ProjectLineItem | undefined> {
    const [item] = await db.select().from(projectLineItems).where(eq(projectLineItems.id, id));
    return item;
  },

  async createProjectLineItem(item: InsertProjectLineItem): Promise<ProjectLineItem> {
    const [result] = await db.insert(projectLineItems).values(item).returning();
    return result;
  },

  async updateProjectLineItem(id: number, item: Partial<InsertProjectLineItem>): Promise<ProjectLineItem | undefined> {
    const [result] = await db
      .update(projectLineItems)
      .set({ ...item, updated_at: new Date() })
      .where(eq(projectLineItems.id, id))
      .returning();
    return result;
  },

  async deleteProjectLineItem(id: number): Promise<boolean> {
    const result = await db.delete(projectLineItems).where(eq(projectLineItems.id, id)).returning();
    return result.length > 0;
  },

  async getProjectTotal(projectId: number): Promise<{ total: number }> {
    const items = await db
      .select()
      .from(projectLineItems)
      .where(eq(projectLineItems.project_id, projectId));

    let total = 0;
    for (const item of items) {
      total += parseFloat(item.total) || 0;
    }
    return { total };
  },

  // ── PROJECT PAYMENTS ────────────────────────

  async getProjectPayments(projectId: number): Promise<ProjectPayment[]> {
    return db
      .select()
      .from(projectPayments)
      .where(eq(projectPayments.project_id, projectId))
      .orderBy(asc(projectPayments.due_date));
  },

  async getProjectPayment(id: number): Promise<ProjectPayment | undefined> {
    const [payment] = await db.select().from(projectPayments).where(eq(projectPayments.id, id));
    return payment;
  },

  async createProjectPayment(payment: InsertProjectPayment): Promise<ProjectPayment> {
    const [result] = await db.insert(projectPayments).values(payment).returning();
    return result;
  },

  async updateProjectPayment(id: number, payment: Partial<InsertProjectPayment>): Promise<ProjectPayment | undefined> {
    const [result] = await db
      .update(projectPayments)
      .set({ ...payment, updated_at: new Date() })
      .where(eq(projectPayments.id, id))
      .returning();
    return result;
  },

  async deleteProjectPayment(id: number): Promise<boolean> {
    const result = await db.delete(projectPayments).where(eq(projectPayments.id, id)).returning();
    return result.length > 0;
  },

  async getProjectPaymentSummary(projectId: number): Promise<{ total_due: number; total_paid: number; balance: number }> {
    const payments = await db
      .select()
      .from(projectPayments)
      .where(eq(projectPayments.project_id, projectId));

    let total_due = 0;
    let total_paid = 0;
    for (const payment of payments) {
      const amount = parseFloat(payment.amount);
      total_due += amount;
      if (payment.status === "paid") {
        total_paid += amount;
      }
    }
    return { total_due, total_paid, balance: total_due - total_paid };
  },

  // ── PROJECT UPDATES / ACTIVITY FEED ─────────

  async getProjectUpdates(projectId: number, includeInternal: boolean = true): Promise<ProjectUpdate[]> {
    if (includeInternal) {
      return db
        .select()
        .from(projectUpdates)
        .where(eq(projectUpdates.project_id, projectId))
        .orderBy(desc(projectUpdates.created_at));
    } else {
      return db
        .select()
        .from(projectUpdates)
        .where(
          and(
            eq(projectUpdates.project_id, projectId),
            eq(projectUpdates.is_internal, "no")
          )
        )
        .orderBy(desc(projectUpdates.created_at));
    }
  },

  async getProjectUpdate(id: number): Promise<ProjectUpdate | undefined> {
    const [update] = await db.select().from(projectUpdates).where(eq(projectUpdates.id, id));
    return update;
  },

  async createProjectUpdate(update: InsertProjectUpdate): Promise<ProjectUpdate> {
    const [created] = await db.insert(projectUpdates).values(update).returning();
    return created;
  },

  async deleteProjectUpdate(id: number): Promise<boolean> {
    const result = await db.delete(projectUpdates).where(eq(projectUpdates.id, id));
    return (result.rowCount ?? 0) > 0;
  },

  // ── PROJECT MESSAGES ────────────────────────

  async getProjectMessages(projectId: number): Promise<ProjectMessage[]> {
    return db
      .select()
      .from(projectMessages)
      .where(eq(projectMessages.project_id, projectId))
      .orderBy(asc(projectMessages.created_at));
  },

  async getProjectMessage(id: number): Promise<ProjectMessage | undefined> {
    const [message] = await db.select().from(projectMessages).where(eq(projectMessages.id, id));
    return message;
  },

  async createProjectMessage(message: InsertProjectMessage): Promise<ProjectMessage> {
    const [created] = await db.insert(projectMessages).values(message).returning();
    return created;
  },

  async markMessageReadByAdmin(id: number): Promise<ProjectMessage | undefined> {
    const [updated] = await db
      .update(projectMessages)
      .set({ read_by_admin: "yes", read_by_admin_at: new Date() })
      .where(eq(projectMessages.id, id))
      .returning();
    return updated;
  },

  async markMessageReadByClient(id: number): Promise<ProjectMessage | undefined> {
    const [updated] = await db
      .update(projectMessages)
      .set({ read_by_client: "yes", read_by_client_at: new Date() })
      .where(eq(projectMessages.id, id))
      .returning();
    return updated;
  },

  async markAllMessagesReadByAdmin(projectId: number): Promise<void> {
    await db
      .update(projectMessages)
      .set({ read_by_admin: "yes", read_by_admin_at: new Date() })
      .where(
        and(
          eq(projectMessages.project_id, projectId),
          eq(projectMessages.read_by_admin, "no")
        )
      );
  },

  async markAllMessagesReadByClient(projectId: number): Promise<void> {
    await db
      .update(projectMessages)
      .set({ read_by_client: "yes", read_by_client_at: new Date() })
      .where(
        and(
          eq(projectMessages.project_id, projectId),
          eq(projectMessages.read_by_client, "no")
        )
      );
  },

  async getUnreadMessageCountForAdmin(projectId: number): Promise<number> {
    const messages = await db
      .select()
      .from(projectMessages)
      .where(
        and(
          eq(projectMessages.project_id, projectId),
          eq(projectMessages.read_by_admin, "no"),
          eq(projectMessages.sender_type, "client")
        )
      );
    return messages.length;
  },

  async getUnreadMessageCountForClient(projectId: number): Promise<number> {
    const messages = await db
      .select()
      .from(projectMessages)
      .where(
        and(
          eq(projectMessages.project_id, projectId),
          eq(projectMessages.read_by_client, "no"),
          eq(projectMessages.sender_type, "admin")
        )
      );
    return messages.length;
  },

  async deleteProjectMessage(id: number): Promise<boolean> {
    const result = await db.delete(projectMessages).where(eq(projectMessages.id, id));
    return (result.rowCount ?? 0) > 0;
  },

  // ── CUSTOM FIELDS ───────────────────────────

  async getCustomFieldDefinitions(entityType?: string, templateId?: number): Promise<CustomFieldDefinition[]> {
    let conditions: any[] = [];
    if (entityType) {
      conditions.push(eq(customFieldDefinitions.entity_type, entityType));
    }
    if (templateId !== undefined) {
      conditions.push(eq(customFieldDefinitions.project_template_id, templateId));
    }

    if (conditions.length === 0) {
      return db.select().from(customFieldDefinitions).orderBy(asc(customFieldDefinitions.display_order));
    }

    return db
      .select()
      .from(customFieldDefinitions)
      .where(and(...conditions))
      .orderBy(asc(customFieldDefinitions.display_order));
  },

  async getCustomFieldDefinition(id: number): Promise<CustomFieldDefinition | undefined> {
    const [def] = await db.select().from(customFieldDefinitions).where(eq(customFieldDefinitions.id, id));
    return def;
  },

  async createCustomFieldDefinition(def: InsertCustomFieldDefinition): Promise<CustomFieldDefinition> {
    const [created] = await db.insert(customFieldDefinitions).values(def).returning();
    return created;
  },

  async updateCustomFieldDefinition(id: number, def: Partial<InsertCustomFieldDefinition>): Promise<CustomFieldDefinition | undefined> {
    const [updated] = await db
      .update(customFieldDefinitions)
      .set({ ...def, updated_at: new Date() })
      .where(eq(customFieldDefinitions.id, id))
      .returning();
    return updated;
  },

  async deleteCustomFieldDefinition(id: number): Promise<boolean> {
    const result = await db.delete(customFieldDefinitions).where(eq(customFieldDefinitions.id, id));
    return (result.rowCount ?? 0) > 0;
  },

  async getCustomFieldValues(entityType: string, entityId: number): Promise<CustomFieldValue[]> {
    return db
      .select()
      .from(customFieldValues)
      .where(and(eq(customFieldValues.entity_type, entityType), eq(customFieldValues.entity_id, entityId)));
  },

  async setCustomFieldValue(fieldDefId: number, entityType: string, entityId: number, value: string | null): Promise<CustomFieldValue> {
    const existing = await db
      .select()
      .from(customFieldValues)
      .where(
        and(
          eq(customFieldValues.field_definition_id, fieldDefId),
          eq(customFieldValues.entity_type, entityType),
          eq(customFieldValues.entity_id, entityId)
        )
      );

    if (existing.length > 0) {
      const [updated] = await db
        .update(customFieldValues)
        .set({ value, updated_at: new Date() })
        .where(eq(customFieldValues.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(customFieldValues)
        .values({ field_definition_id: fieldDefId, entity_type: entityType, entity_id: entityId, value })
        .returning();
      return created;
    }
  },

  async deleteCustomFieldValue(id: number): Promise<boolean> {
    const result = await db.delete(customFieldValues).where(eq(customFieldValues.id, id));
    return (result.rowCount ?? 0) > 0;
  },

  // ── OUT OF SCOPE ITEMS ──────────────────────

  async getOutOfScopeItems(projectId: number): Promise<OutOfScopeItem[]> {
    return db
      .select()
      .from(outOfScopeItems)
      .where(eq(outOfScopeItems.project_id, projectId))
      .orderBy(desc(outOfScopeItems.created_at));
  },

  async getOutOfScopeItem(id: number): Promise<OutOfScopeItem | undefined> {
    const [item] = await db.select().from(outOfScopeItems).where(eq(outOfScopeItems.id, id));
    return item;
  },

  async createOutOfScopeItem(item: InsertOutOfScopeItem): Promise<OutOfScopeItem> {
    const [created] = await db.insert(outOfScopeItems).values(item).returning();
    return created;
  },

  async updateOutOfScopeItem(id: number, item: Partial<InsertOutOfScopeItem>): Promise<OutOfScopeItem | undefined> {
    const [updated] = await db
      .update(outOfScopeItems)
      .set({ ...item, updated_at: new Date() })
      .where(eq(outOfScopeItems.id, id))
      .returning();
    return updated;
  },

  async deleteOutOfScopeItem(id: number): Promise<boolean> {
    const result = await db.delete(outOfScopeItems).where(eq(outOfScopeItems.id, id));
    return (result.rowCount ?? 0) > 0;
  },

  // ── CLIENT FEEDBACK ─────────────────────────

  async getClientFeedback(projectId: number): Promise<ClientFeedback[]> {
    return db
      .select()
      .from(clientFeedback)
      .where(eq(clientFeedback.project_id, projectId))
      .orderBy(desc(clientFeedback.created_at));
  },

  async getClientFeedbackItem(id: number): Promise<ClientFeedback | undefined> {
    const [item] = await db.select().from(clientFeedback).where(eq(clientFeedback.id, id));
    return item;
  },

  async createClientFeedback(feedback: InsertClientFeedback): Promise<ClientFeedback> {
    const [created] = await db.insert(clientFeedback).values(feedback).returning();
    return created;
  },

  async updateClientFeedback(id: number, feedback: Partial<InsertClientFeedback>): Promise<ClientFeedback | undefined> {
    const [updated] = await db
      .update(clientFeedback)
      .set({ ...feedback, updated_at: new Date() })
      .where(eq(clientFeedback.id, id))
      .returning();
    return updated;
  },

  async deleteClientFeedback(id: number): Promise<boolean> {
    const result = await db.delete(clientFeedback).where(eq(clientFeedback.id, id));
    return (result.rowCount ?? 0) > 0;
  },
};
