import { db } from "../db/index";
import {
  customers,
  inventory,
  checkouts,
  users,
  emailNotifications,
  signedAgreements,
  contracts,
  activityLogs,
  rolePermissions,
  projects,
  projectPhases,
  projectTasks,
  type Customer,
  type Inventory,
  type Checkout,
  type InsertCustomer,
  type InsertInventory,
  type InsertCheckout,
  type CheckoutView,
  type User,
  type UpsertUser,
  type InsertUser,
  type InsertEmailNotification,
  type EmailNotification,
  type InsertSignedAgreement,
  type SignedAgreement,
  type InsertContract,
  type Contract,
  type InsertActivityLog,
  type ActivityLog,
  type RolePermission,
  type InsertRolePermission,
  type Project,
  type InsertProject,
  type ProjectPhase,
  type InsertProjectPhase,
  type ProjectTask,
  type InsertProjectTask,
  type ProjectWithCustomer,
  type ProjectWithDetails,
  type ProjectPhaseWithTasks,
} from "@shared/schema";
import { eq, and, desc, gte, lte, or, asc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  preserveUserNameOnRecords(userId: string, userName: string): Promise<void>;

  // Activity Logs
  getActivityLogs(filters?: { userId?: string; startDate?: Date; endDate?: Date }): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;

  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: number): Promise<boolean>;

  // Inventory
  getInventory(): Promise<Inventory[]>;
  getInventoryItem(id: number): Promise<Inventory | undefined>;
  createInventoryItem(item: InsertInventory): Promise<Inventory>;
  updateInventoryItem(id: number, item: Partial<InsertInventory>): Promise<Inventory | undefined>;
  deleteInventoryItem(id: number): Promise<boolean>;

  // Checkouts
  getCheckouts(): Promise<Checkout[]>;
  getCheckout(id: number): Promise<Checkout | undefined>;
  getCheckoutView(id: number): Promise<CheckoutView | undefined>;
  getCheckoutViews(): Promise<CheckoutView[]>;
  createCheckout(checkout: InsertCheckout): Promise<Checkout>;
  updateCheckout(id: number, checkout: Partial<InsertCheckout>): Promise<Checkout | undefined>;
  deleteCheckout(id: number): Promise<boolean>;
  returnAllActiveCheckouts(): Promise<number>;

  // Email notifications
  getNotificationsByCheckout(checkoutId: number): Promise<EmailNotification[]>;
  hasNotificationBeenSent(checkoutId: number, notificationType: string): Promise<boolean>;
  createNotification(notification: InsertEmailNotification): Promise<EmailNotification>;

  // Signed agreements
  getSignedAgreements(): Promise<SignedAgreement[]>;
  getSignedAgreementsByCustomer(customerId: number): Promise<SignedAgreement[]>;
  getSignedAgreement(id: number): Promise<SignedAgreement | undefined>;
  createSignedAgreement(agreement: InsertSignedAgreement): Promise<SignedAgreement>;
  deleteSignedAgreement(id: number): Promise<boolean>;

  // Contracts
  getContracts(): Promise<Contract[]>;
  getContract(id: number): Promise<Contract | undefined>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: number, contract: Partial<InsertContract>): Promise<Contract | undefined>;
  deleteContract(id: number): Promise<boolean>;

  // Role Permissions
  getRolePermissions(): Promise<RolePermission[]>;
  getRolePermissionsByRole(role: string): Promise<RolePermission[]>;
  setRolePermission(role: string, permission: string, enabled: boolean): Promise<RolePermission>;
  hasPermission(role: string, permission: string): Promise<boolean>;
  initializeDefaultPermissions(): Promise<void>;

  // Projects
  getProjects(): Promise<ProjectWithCustomer[]>;
  getProject(id: number): Promise<Project | undefined>;
  getProjectWithDetails(id: number): Promise<ProjectWithDetails | undefined>;
  getProjectsByCustomer(customerId: number): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  updateProjectProgress(projectId: number): Promise<number>;

  // Project Phases
  getProjectPhases(projectId: number): Promise<ProjectPhase[]>;
  getProjectPhase(id: number): Promise<ProjectPhase | undefined>;
  createProjectPhase(phase: InsertProjectPhase): Promise<ProjectPhase>;
  updateProjectPhase(id: number, phase: Partial<InsertProjectPhase>): Promise<ProjectPhase | undefined>;
  deleteProjectPhase(id: number): Promise<boolean>;
  reorderProjectPhases(projectId: number, phaseIds: number[]): Promise<void>;
  updatePhaseProgress(phaseId: number): Promise<number>;

  // Project Tasks
  getPhaseTasks(phaseId: number): Promise<ProjectTask[]>;
  getProjectTask(id: number): Promise<ProjectTask | undefined>;
  createProjectTask(task: InsertProjectTask): Promise<ProjectTask>;
  updateProjectTask(id: number, task: Partial<InsertProjectTask>): Promise<ProjectTask | undefined>;
  deleteProjectTask(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async preserveUserNameOnRecords(userId: string, userName: string): Promise<void> {
    await db.update(checkouts)
      .set({ created_by_user_name: userName, created_by_user_id: null })
      .where(eq(checkouts.created_by_user_id, userId));
    
    await db.update(signedAgreements)
      .set({ created_by_user_name: userName, created_by_user_id: null })
      .where(eq(signedAgreements.created_by_user_id, userId));
    
    await db.update(contracts)
      .set({ created_by_user_name: userName, created_by_user_id: null })
      .where(eq(contracts.created_by_user_id, userId));
    
    await db.update(activityLogs)
      .set({ userId: null })
      .where(eq(activityLogs.userId, userId));
  }

  // Activity Logs
  async getActivityLogs(filters?: { userId?: string; startDate?: Date; endDate?: Date }): Promise<ActivityLog[]> {
    let conditions: any[] = [];
    
    if (filters?.userId) {
      conditions.push(eq(activityLogs.userId, filters.userId));
    }
    if (filters?.startDate) {
      conditions.push(gte(activityLogs.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(activityLogs.createdAt, filters.endDate));
    }

    if (conditions.length > 0) {
      return db.select().from(activityLogs)
        .where(and(...conditions))
        .orderBy(desc(activityLogs.createdAt));
    }
    
    return db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt));
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [result] = await db.insert(activityLogs).values(log).returning();
    return result;
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    return db.select().from(customers);
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const result = await db.select().from(customers).where(eq(customers.id, id));
    return result[0];
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const result = await db.insert(customers).values(customer).returning();
    return result[0];
  }

  async updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const result = await db.update(customers).set(customer).where(eq(customers.id, id)).returning();
    return result[0];
  }

  async getActiveCheckoutsByCustomer(customerId: number): Promise<Checkout[]> {
    // Optimized: single query with OR condition instead of two separate queries
    return db.select().from(checkouts).where(
      and(
        eq(checkouts.customer_id, customerId),
        or(
          eq(checkouts.status, 'checked_out'),
          eq(checkouts.status, 'overdue')
        )
      )
    );
  }

  async deleteCustomer(id: number): Promise<boolean> {
    // Get all checkout IDs for this customer
    const customerCheckouts = await db.select({ id: checkouts.id }).from(checkouts).where(eq(checkouts.customer_id, id));
    const checkoutIds = customerCheckouts.map(c => c.id);
    
    // Delete email notifications for these checkouts
    if (checkoutIds.length > 0) {
      for (const checkoutId of checkoutIds) {
        await db.delete(emailNotifications).where(eq(emailNotifications.checkout_id, checkoutId));
      }
    }
    
    // Delete signed agreements for this customer
    await db.delete(signedAgreements).where(eq(signedAgreements.customer_id, id));
    
    // Delete all checkouts for this customer
    await db.delete(checkouts).where(eq(checkouts.customer_id, id));
    
    // Finally delete the customer
    const result = await db.delete(customers).where(eq(customers.id, id)).returning();
    return result.length > 0;
  }

  // Inventory
  async getInventory(): Promise<Inventory[]> {
    return db.select().from(inventory);
  }

  async getInventoryItem(id: number): Promise<Inventory | undefined> {
    const result = await db.select().from(inventory).where(eq(inventory.id, id));
    return result[0];
  }

  async createInventoryItem(item: InsertInventory): Promise<Inventory> {
    const result = await db.insert(inventory).values(item).returning();
    return result[0];
  }

  async updateInventoryItem(id: number, item: Partial<InsertInventory>): Promise<Inventory | undefined> {
    const result = await db.update(inventory).set(item).where(eq(inventory.id, id)).returning();
    return result[0];
  }

  async getActiveCheckoutsByInventoryItem(itemId: number): Promise<Checkout[]> {
    // Optimized: single query with OR condition instead of two separate queries
    return db.select().from(checkouts).where(
      and(
        eq(checkouts.inventory_item_id, itemId),
        or(
          eq(checkouts.status, 'checked_out'),
          eq(checkouts.status, 'overdue')
        )
      )
    );
  }

  async deleteInventoryItem(id: number): Promise<boolean> {
    const result = await db.delete(inventory).where(eq(inventory.id, id)).returning();
    return result.length > 0;
  }

  // Checkouts
  async getCheckouts(): Promise<Checkout[]> {
    return db.select().from(checkouts);
  }

  async getCheckout(id: number): Promise<Checkout | undefined> {
    const result = await db.select().from(checkouts).where(eq(checkouts.id, id));
    return result[0];
  }

  async getCheckoutView(id: number): Promise<CheckoutView | undefined> {
    const result = await db
      .select({
        checkout: checkouts,
        customer: customers,
        item: inventory,
        user: users,
      })
      .from(checkouts)
      .innerJoin(customers, eq(checkouts.customer_id, customers.id))
      .innerJoin(inventory, eq(checkouts.inventory_item_id, inventory.id))
      .leftJoin(users, eq(checkouts.created_by_user_id, users.id))
      .where(eq(checkouts.id, id));

    if (!result[0]) return undefined;

    return {
      ...result[0].checkout,
      customer: result[0].customer,
      item: result[0].item,
      createdByUser: result[0].user || null,
    };
  }

  async getCheckoutViews(): Promise<CheckoutView[]> {
    const result = await db
      .select({
        checkout: checkouts,
        customer: customers,
        item: inventory,
        user: users,
      })
      .from(checkouts)
      .innerJoin(customers, eq(checkouts.customer_id, customers.id))
      .innerJoin(inventory, eq(checkouts.inventory_item_id, inventory.id))
      .leftJoin(users, eq(checkouts.created_by_user_id, users.id));

    return result.map((row: any) => ({
      ...row.checkout,
      customer: row.customer,
      item: row.item,
      createdByUser: row.user || null,
    }));
  }

  async createCheckout(checkout: InsertCheckout): Promise<Checkout> {
    const result = await db.insert(checkouts).values(checkout).returning();
    return result[0];
  }

  async updateCheckout(id: number, checkout: Partial<InsertCheckout>): Promise<Checkout | undefined> {
    const result = await db.update(checkouts).set({ ...checkout, updated_at: new Date() }).where(eq(checkouts.id, id)).returning();
    return result[0];
  }

  async deleteCheckout(id: number): Promise<boolean> {
    // Delete associated notifications first
    await db.delete(emailNotifications).where(eq(emailNotifications.checkout_id, id));
    // Delete the checkout - this automatically releases the inventory item
    const result = await db.delete(checkouts).where(eq(checkouts.id, id)).returning();
    return result.length > 0;
  }

  async returnAllActiveCheckouts(): Promise<number> {
    // Mark all active checkouts (checked_out or overdue) as returned
    const result = await db
      .update(checkouts)
      .set({ status: 'returned', updated_at: new Date() })
      .where(
        or(
          eq(checkouts.status, 'checked_out'),
          eq(checkouts.status, 'overdue')
        )
      )
      .returning();
    return result.length;
  }

  // Email notifications
  async getNotificationsByCheckout(checkoutId: number): Promise<EmailNotification[]> {
    return db.select().from(emailNotifications).where(eq(emailNotifications.checkout_id, checkoutId));
  }

  async hasNotificationBeenSent(checkoutId: number, notificationType: string): Promise<boolean> {
    const result = await db.select().from(emailNotifications).where(
      and(
        eq(emailNotifications.checkout_id, checkoutId),
        eq(emailNotifications.notification_type, notificationType)
      )
    );
    return result.length > 0;
  }

  async createNotification(notification: InsertEmailNotification): Promise<EmailNotification> {
    const result = await db.insert(emailNotifications).values(notification).returning();
    return result[0];
  }

  // Signed agreements
  async getSignedAgreements(): Promise<SignedAgreement[]> {
    return db.select().from(signedAgreements).orderBy(desc(signedAgreements.signed_at));
  }

  async getSignedAgreementsByCustomer(customerId: number): Promise<SignedAgreement[]> {
    return db.select().from(signedAgreements)
      .where(eq(signedAgreements.customer_id, customerId))
      .orderBy(desc(signedAgreements.signed_at));
  }

  async getSignedAgreement(id: number): Promise<SignedAgreement | undefined> {
    const result = await db.select().from(signedAgreements).where(eq(signedAgreements.id, id));
    return result[0];
  }

  async createSignedAgreement(agreement: InsertSignedAgreement): Promise<SignedAgreement> {
    const result = await db.insert(signedAgreements).values(agreement).returning();
    return result[0];
  }

  async deleteSignedAgreement(id: number): Promise<boolean> {
    const result = await db.delete(signedAgreements).where(eq(signedAgreements.id, id)).returning();
    return result.length > 0;
  }

  // Contracts
  async getContracts(): Promise<Contract[]> {
    return db.select().from(contracts).orderBy(desc(contracts.signed_at));
  }

  async getContract(id: number): Promise<Contract | undefined> {
    const result = await db.select().from(contracts).where(eq(contracts.id, id));
    return result[0];
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    const result = await db.insert(contracts).values(contract).returning();
    return result[0];
  }

  async updateContract(id: number, contract: Partial<InsertContract>): Promise<Contract | undefined> {
    const result = await db.update(contracts).set(contract).where(eq(contracts.id, id)).returning();
    return result[0];
  }

  async deleteContract(id: number): Promise<boolean> {
    const result = await db.delete(contracts).where(eq(contracts.id, id)).returning();
    return result.length > 0;
  }

  // Role Permissions
  async getRolePermissions(): Promise<RolePermission[]> {
    return db.select().from(rolePermissions);
  }

  async getRolePermissionsByRole(role: string): Promise<RolePermission[]> {
    return db.select().from(rolePermissions).where(eq(rolePermissions.role, role));
  }

  async setRolePermission(role: string, permission: string, enabled: boolean): Promise<RolePermission> {
    const enabledValue = enabled ? "yes" : "no";
    const existing = await db.select().from(rolePermissions)
      .where(and(eq(rolePermissions.role, role), eq(rolePermissions.permission, permission)));
    
    if (existing.length > 0) {
      const [updated] = await db.update(rolePermissions)
        .set({ enabled: enabledValue })
        .where(eq(rolePermissions.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(rolePermissions)
        .values({ role, permission, enabled: enabledValue })
        .returning();
      return created;
    }
  }

  async hasPermission(role: string, permission: string): Promise<boolean> {
    if (role === "admin") return true;
    
    const [result] = await db.select().from(rolePermissions)
      .where(and(eq(rolePermissions.role, role), eq(rolePermissions.permission, permission)));
    
    return result?.enabled === "yes";
  }

  async initializeDefaultPermissions(): Promise<void> {
    const defaultPermissions = [
      { role: "admin", permission: "manage_customers", enabled: "yes" },
      { role: "admin", permission: "manage_inventory", enabled: "yes" },
      { role: "admin", permission: "create_checkouts", enabled: "yes" },
      { role: "admin", permission: "manage_checkouts", enabled: "yes" },
      { role: "admin", permission: "view_contracts", enabled: "yes" },
      { role: "admin", permission: "create_contracts", enabled: "yes" },
      { role: "admin", permission: "manage_users", enabled: "yes" },
      { role: "admin", permission: "view_reports", enabled: "yes" },
      { role: "manager", permission: "manage_customers", enabled: "yes" },
      { role: "manager", permission: "manage_inventory", enabled: "yes" },
      { role: "manager", permission: "create_checkouts", enabled: "yes" },
      { role: "manager", permission: "manage_checkouts", enabled: "yes" },
      { role: "manager", permission: "view_contracts", enabled: "yes" },
      { role: "manager", permission: "create_contracts", enabled: "yes" },
      { role: "manager", permission: "manage_users", enabled: "no" },
      { role: "manager", permission: "view_reports", enabled: "yes" },
      { role: "staff", permission: "manage_customers", enabled: "yes" },
      { role: "staff", permission: "manage_inventory", enabled: "yes" },
      { role: "staff", permission: "create_checkouts", enabled: "yes" },
      { role: "staff", permission: "manage_checkouts", enabled: "no" },
      { role: "staff", permission: "view_contracts", enabled: "yes" },
      { role: "staff", permission: "create_contracts", enabled: "yes" },
      { role: "staff", permission: "manage_projects", enabled: "no" },
      { role: "staff", permission: "manage_users", enabled: "no" },
      { role: "staff", permission: "view_reports", enabled: "no" },
      // Manager and admin get manage_projects
      { role: "manager", permission: "manage_projects", enabled: "yes" },
      { role: "admin", permission: "manage_projects", enabled: "yes" },
    ];

    for (const perm of defaultPermissions) {
      const existing = await db.select().from(rolePermissions)
        .where(and(eq(rolePermissions.role, perm.role), eq(rolePermissions.permission, perm.permission)));

      if (existing.length === 0) {
        await db.insert(rolePermissions).values(perm);
      }
    }
  }

  // ============================================
  // PROJECTS
  // ============================================

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
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectWithDetails(id: number): Promise<ProjectWithDetails | undefined> {
    // Get project with customer
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

    // Get phases for this project
    const phases = await db
      .select()
      .from(projectPhases)
      .where(eq(projectPhases.project_id, id))
      .orderBy(asc(projectPhases.display_order));

    // Get tasks for each phase
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
  }

  async getProjectsByCustomer(customerId: number): Promise<Project[]> {
    return db
      .select()
      .from(projects)
      .where(eq(projects.customer_id, customerId))
      .orderBy(desc(projects.created_at));
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [result] = await db.insert(projects).values(project).returning();
    return result;
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined> {
    const [result] = await db
      .update(projects)
      .set({ ...project, updated_at: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return result;
  }

  async deleteProject(id: number): Promise<boolean> {
    // Phases and tasks will cascade delete due to foreign key constraints
    const result = await db.delete(projects).where(eq(projects.id, id)).returning();
    return result.length > 0;
  }

  async updateProjectProgress(projectId: number): Promise<number> {
    // Get all phases for this project (excluding skipped)
    const phases = await db
      .select()
      .from(projectPhases)
      .where(
        and(
          eq(projectPhases.project_id, projectId),
          // Don't count skipped phases
        )
      );

    const activePhases = phases.filter((p) => p.status !== "skipped");
    if (activePhases.length === 0) {
      await db.update(projects).set({ overall_progress: 0, updated_at: new Date() }).where(eq(projects.id, projectId));
      return 0;
    }

    const totalProgress = activePhases.reduce((sum, phase) => sum + phase.progress, 0);
    const overallProgress = Math.round(totalProgress / activePhases.length);

    // Find current phase (first non-completed, non-skipped phase)
    const currentPhase = activePhases.find((p) => p.status !== "completed");
    const currentPhaseId = currentPhase?.id || null;

    await db
      .update(projects)
      .set({ overall_progress: overallProgress, current_phase_id: currentPhaseId, updated_at: new Date() })
      .where(eq(projects.id, projectId));

    return overallProgress;
  }

  // ============================================
  // PROJECT PHASES
  // ============================================

  async getProjectPhases(projectId: number): Promise<ProjectPhase[]> {
    return db
      .select()
      .from(projectPhases)
      .where(eq(projectPhases.project_id, projectId))
      .orderBy(asc(projectPhases.display_order));
  }

  async getProjectPhase(id: number): Promise<ProjectPhase | undefined> {
    const [phase] = await db.select().from(projectPhases).where(eq(projectPhases.id, id));
    return phase;
  }

  async createProjectPhase(phase: InsertProjectPhase): Promise<ProjectPhase> {
    const [result] = await db.insert(projectPhases).values(phase).returning();
    return result;
  }

  async updateProjectPhase(id: number, phase: Partial<InsertProjectPhase>): Promise<ProjectPhase | undefined> {
    const [result] = await db
      .update(projectPhases)
      .set({ ...phase, updated_at: new Date() })
      .where(eq(projectPhases.id, id))
      .returning();
    return result;
  }

  async deleteProjectPhase(id: number): Promise<boolean> {
    // Tasks will cascade delete due to foreign key constraints
    const result = await db.delete(projectPhases).where(eq(projectPhases.id, id)).returning();
    return result.length > 0;
  }

  async reorderProjectPhases(projectId: number, phaseIds: number[]): Promise<void> {
    for (let i = 0; i < phaseIds.length; i++) {
      await db
        .update(projectPhases)
        .set({ display_order: i + 1, updated_at: new Date() })
        .where(and(eq(projectPhases.id, phaseIds[i]), eq(projectPhases.project_id, projectId)));
    }
  }

  async updatePhaseProgress(phaseId: number): Promise<number> {
    // Get all tasks for this phase
    const tasks = await db.select().from(projectTasks).where(eq(projectTasks.phase_id, phaseId));

    if (tasks.length === 0) {
      // No tasks - use phase status to determine progress
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

    // Also update the parent project's progress
    const [phase] = await db.select().from(projectPhases).where(eq(projectPhases.id, phaseId));
    if (phase) {
      await this.updateProjectProgress(phase.project_id);
    }

    return progress;
  }

  // ============================================
  // PROJECT TASKS
  // ============================================

  async getPhaseTasks(phaseId: number): Promise<ProjectTask[]> {
    return db
      .select()
      .from(projectTasks)
      .where(eq(projectTasks.phase_id, phaseId))
      .orderBy(asc(projectTasks.display_order));
  }

  async getProjectTask(id: number): Promise<ProjectTask | undefined> {
    const [task] = await db.select().from(projectTasks).where(eq(projectTasks.id, id));
    return task;
  }

  async createProjectTask(task: InsertProjectTask): Promise<ProjectTask> {
    const [result] = await db.insert(projectTasks).values(task).returning();
    // Update phase progress after adding task
    await this.updatePhaseProgress(task.phase_id);
    return result;
  }

  async updateProjectTask(id: number, task: Partial<InsertProjectTask>): Promise<ProjectTask | undefined> {
    // Get the task first to get phase_id for progress update
    const [existing] = await db.select().from(projectTasks).where(eq(projectTasks.id, id));
    if (!existing) return undefined;

    const [result] = await db
      .update(projectTasks)
      .set({ ...task, updated_at: new Date() })
      .where(eq(projectTasks.id, id))
      .returning();

    // Update phase progress after task update
    await this.updatePhaseProgress(existing.phase_id);

    return result;
  }

  async deleteProjectTask(id: number): Promise<boolean> {
    // Get the task first to get phase_id for progress update
    const [existing] = await db.select().from(projectTasks).where(eq(projectTasks.id, id));
    if (!existing) return false;

    const result = await db.delete(projectTasks).where(eq(projectTasks.id, id)).returning();

    // Update phase progress after task deletion
    await this.updatePhaseProgress(existing.phase_id);

    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
