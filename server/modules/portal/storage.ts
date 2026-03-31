import { db } from "../../../db/index";
import {
  clientPortalAccess,
  customers,
  contracts,
  projects,
  projectPhases,
  projectTasks,
  changeOrders,
  projectDeliveries,
  projectFiles,
  projectUpdates,
  projectMessages,
  clientFeedback,
  type ClientPortalUser,
  type ProjectWithCustomer,
  type ProjectWithDetails,
  type ProjectPhaseWithTasks,
  type ChangeOrder,
  type ChangeOrderWithPhase,
  type ProjectDelivery,
  type ProjectDeliveryWithPhase,
  type ProjectFile,
  type ProjectUpdate,
  type ProjectMessage,
  type ClientFeedback,
  type Contract,
  type InsertClientPortalAccess,
  type InsertClientFeedback,
} from "@shared/schema";
import { eq, and, or, desc, asc } from "drizzle-orm";

export const portalStorage = {
  // ── CLIENT PORTAL ACCESS QUERIES ────────────────

  async getClientPortalAccessByEmail(email: string): Promise<any | undefined> {
    const [access] = await db
      .select()
      .from(clientPortalAccess)
      .where(eq(clientPortalAccess.email, email));
    return access;
  },

  async getClientPortalAccessByCustomerId(customerId: number): Promise<any[]> {
    return db
      .select()
      .from(clientPortalAccess)
      .where(eq(clientPortalAccess.customer_id, customerId));
  },

  async getClientPortalAccessById(id: number): Promise<any | undefined> {
    const [access] = await db
      .select()
      .from(clientPortalAccess)
      .where(eq(clientPortalAccess.id, id));
    return access;
  },

  async getClientPortalUser(id: number): Promise<ClientPortalUser | undefined> {
    const [access] = await db
      .select()
      .from(clientPortalAccess)
      .where(eq(clientPortalAccess.id, id));

    if (!access) return undefined;

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, access.customer_id));

    if (!customer) return undefined;

    // Exclude password_hash from response
    const { password_hash, ...accessWithoutPassword } = access;
    return { ...accessWithoutPassword, customer } as ClientPortalUser;
  },

  async getAllClientPortalAccess(): Promise<any[]> {
    return db
      .select()
      .from(clientPortalAccess)
      .orderBy(desc(clientPortalAccess.created_at));
  },

  async createClientPortalAccess(data: InsertClientPortalAccess): Promise<any> {
    const [result] = await db.insert(clientPortalAccess).values(data).returning();
    return result;
  },

  async updateClientPortalAccess(id: number, data: Partial<InsertClientPortalAccess>): Promise<any | undefined> {
    const [result] = await db
      .update(clientPortalAccess)
      .set({ ...data, updated_at: new Date() })
      .where(eq(clientPortalAccess.id, id))
      .returning();
    return result;
  },

  async updateClientPortalLastLogin(id: number): Promise<any | undefined> {
    const [result] = await db
      .update(clientPortalAccess)
      .set({ last_login: new Date(), updated_at: new Date() })
      .where(eq(clientPortalAccess.id, id))
      .returning();
    return result;
  },

  async deleteClientPortalAccess(id: number): Promise<boolean> {
    const result = await db
      .delete(clientPortalAccess)
      .where(eq(clientPortalAccess.id, id))
      .returning();
    return result.length > 0;
  },

  // ── CLIENT PROJECTS ────────────────────────────

  async getAllProjects(): Promise<{ id: number }[]> {
    return db.select({ id: projects.id }).from(projects);
  },

  async getProjectCustomerId(projectId: number): Promise<{ customer_id: number; customer_name: string | null } | null> {
    const [result] = await db
      .select({ customer_id: projects.customer_id, customer_name: customers.name })
      .from(projects)
      .innerJoin(customers, eq(projects.customer_id, customers.id))
      .where(eq(projects.id, projectId));
    return result || null;
  },

  async getClientProjects(customerId: number): Promise<ProjectWithCustomer[]> {
    const projectList = await db
      .select()
      .from(projects)
      .where(eq(projects.customer_id, customerId))
      .orderBy(desc(projects.created_at));

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId));

    return projectList.map((p) => ({
      ...p,
      customer: customer || null,
    })) as ProjectWithCustomer[];
  },

  async getClientProjectWithDetails(
    projectId: number,
    customerId: number,
  ): Promise<ProjectWithDetails | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.customer_id, customerId)));

    if (!project) return undefined;

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId));

    // Get client-visible phases only
    const phases = await db
      .select()
      .from(projectPhases)
      .where(
        and(
          eq(projectPhases.project_id, projectId),
          eq(projectPhases.client_visible, "yes"),
        ),
      )
      .orderBy(asc(projectPhases.display_order));

    const phasesWithTasks: ProjectPhaseWithTasks[] = await Promise.all(
      phases.map(async (phase) => {
        const tasks = await db
          .select()
          .from(projectTasks)
          .where(
            and(
              eq(projectTasks.phase_id, phase.id),
              eq(projectTasks.client_visible, "yes"),
            ),
          )
          .orderBy(asc(projectTasks.display_order));
        return { ...phase, tasks };
      }),
    );

    return {
      ...project,
      customer: customer || null,
      phases: phasesWithTasks,
      createdByUser: null,
    };
  },

  // ── CHANGE ORDERS (CLIENT VIEW) ──────────────

  async getClientChangeOrders(projectId: number): Promise<ChangeOrderWithPhase[]> {
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
    const [changeOrder] = await db
      .select()
      .from(changeOrders)
      .where(eq(changeOrders.id, id));
    return changeOrder;
  },

  async approveChangeOrder(
    id: number,
    approvedBy: string,
    signature: string,
  ): Promise<ChangeOrder | undefined> {
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

  // ── PROJECT DELIVERIES (CLIENT VIEW) ────────

  async getClientProjectDeliveries(projectId: number): Promise<ProjectDeliveryWithPhase[]> {
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

  // ── PROJECT FILES (CLIENT VIEW) ────────────

  async getClientProjectFiles(projectId: number): Promise<ProjectFile[]> {
    return db
      .select()
      .from(projectFiles)
      .where(
        and(
          eq(projectFiles.project_id, projectId),
          eq(projectFiles.client_visible, "yes"),
        ),
      )
      .orderBy(desc(projectFiles.created_at));
  },

  // ── PROJECT UPDATES / ACTIVITY FEED ────────

  async getClientProjectUpdates(projectId: number): Promise<ProjectUpdate[]> {
    return db
      .select()
      .from(projectUpdates)
      .where(
        and(
          eq(projectUpdates.project_id, projectId),
          eq(projectUpdates.is_internal, "no"),
        ),
      )
      .orderBy(desc(projectUpdates.created_at));
  },

  async createProjectUpdate(update: any): Promise<ProjectUpdate> {
    const [created] = await db.insert(projectUpdates).values(update).returning();
    return created;
  },

  // ── PROJECT MESSAGES ────────────────────────

  async getProjectMessages(projectId: number): Promise<ProjectMessage[]> {
    return db
      .select()
      .from(projectMessages)
      .where(eq(projectMessages.project_id, projectId))
      .orderBy(asc(projectMessages.created_at));
  },

  async createProjectMessage(message: any): Promise<ProjectMessage> {
    const [created] = await db.insert(projectMessages).values(message).returning();
    return created;
  },

  async markAllMessagesReadByClient(projectId: number): Promise<void> {
    await db
      .update(projectMessages)
      .set({ read_by_client: "yes", read_by_client_at: new Date() })
      .where(
        and(
          eq(projectMessages.project_id, projectId),
          eq(projectMessages.read_by_client, "no"),
        ),
      );
  },

  async getUnreadMessageCountForClient(projectId: number): Promise<number> {
    const messages = await db
      .select()
      .from(projectMessages)
      .where(
        and(
          eq(projectMessages.project_id, projectId),
          eq(projectMessages.read_by_client, "no"),
          eq(projectMessages.sender_type, "admin"),
        ),
      );
    return messages.length;
  },

  // ── CLIENT FEEDBACK ─────────────────────────

  async createClientFeedback(feedback: InsertClientFeedback): Promise<ClientFeedback> {
    const [created] = await db.insert(clientFeedback).values(feedback).returning();
    return created;
  },

  async getProjectFeedback(projectId: number): Promise<ClientFeedback[]> {
    return db
      .select()
      .from(clientFeedback)
      .where(eq(clientFeedback.project_id, projectId))
      .orderBy(desc(clientFeedback.created_at));
  },

  // ── CLIENT CONTRACTS ────────────────────────────

  async getContractsByCustomerEmail(email: string): Promise<Contract[]> {
    return db
      .select()
      .from(contracts)
      .where(
        and(
          eq(contracts.customer_email, email),
          or(eq(contracts.status, "signed"), eq(contracts.status, "completed")),
        ),
      )
      .orderBy(desc(contracts.created_at));
  },
};
