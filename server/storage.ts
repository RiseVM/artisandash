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
  projectTemplates,
  phaseTemplates,
  taskTemplates,
  clientPortalAccess,
  projectDeliveries,
  changeOrders,
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
  type ProjectTemplate,
  type InsertProjectTemplate,
  type PhaseTemplate,
  type InsertPhaseTemplate,
  type TaskTemplate,
  type InsertTaskTemplate,
  type PhaseTemplateWithTasks,
  type ProjectTemplateWithDetails,
  type ClientPortalAccess,
  type InsertClientPortalAccess,
  type ClientPortalUser,
  type ProjectDelivery,
  type InsertProjectDelivery,
  type ProjectDeliveryWithPhase,
  type ChangeOrder,
  type InsertChangeOrder,
  type ChangeOrderWithPhase,
  projectFiles,
  timeEntries,
  projectLineItems,
  projectPayments,
  type ProjectFile,
  type InsertProjectFile,
  type TimeEntry,
  type InsertTimeEntry,
  type TimeEntryWithPhase,
  type ProjectLineItem,
  type InsertProjectLineItem,
  type ProjectLineItemWithRelations,
  type ProjectPayment,
  type InsertProjectPayment,
  projectUpdates,
  type ProjectUpdate,
  type InsertProjectUpdate,
  projectMessages,
  type ProjectMessage,
  type InsertProjectMessage,
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

  // Project Templates
  getProjectTemplates(): Promise<ProjectTemplate[]>;
  getProjectTemplate(id: number): Promise<ProjectTemplate | undefined>;
  getProjectTemplateWithDetails(id: number): Promise<ProjectTemplateWithDetails | undefined>;
  createProjectTemplate(template: InsertProjectTemplate): Promise<ProjectTemplate>;
  updateProjectTemplate(id: number, template: Partial<InsertProjectTemplate>): Promise<ProjectTemplate | undefined>;
  deleteProjectTemplate(id: number): Promise<boolean>;

  // Phase Templates
  getPhaseTemplates(templateId: number): Promise<PhaseTemplate[]>;
  createPhaseTemplate(phase: InsertPhaseTemplate): Promise<PhaseTemplate>;
  updatePhaseTemplate(id: number, phase: Partial<InsertPhaseTemplate>): Promise<PhaseTemplate | undefined>;
  deletePhaseTemplate(id: number): Promise<boolean>;
  reorderPhaseTemplates(templateId: number, phaseIds: number[]): Promise<void>;

  // Task Templates
  getTaskTemplates(phaseId: number): Promise<TaskTemplate[]>;
  createTaskTemplate(task: InsertTaskTemplate): Promise<TaskTemplate>;
  updateTaskTemplate(id: number, task: Partial<InsertTaskTemplate>): Promise<TaskTemplate | undefined>;
  deleteTaskTemplate(id: number): Promise<boolean>;

  // Create project from template
  createProjectFromTemplate(templateId: number, projectData: InsertProject): Promise<Project>;

  // Client Portal Access
  getClientPortalAccessByEmail(email: string): Promise<ClientPortalAccess | undefined>;
  getClientPortalAccessByCustomerId(customerId: number): Promise<ClientPortalAccess | undefined>;
  getClientPortalAccessById(id: number): Promise<ClientPortalAccess | undefined>;
  getClientPortalUser(id: number): Promise<ClientPortalUser | undefined>;
  getAllClientPortalAccess(): Promise<ClientPortalAccess[]>;
  createClientPortalAccess(data: InsertClientPortalAccess): Promise<ClientPortalAccess>;
  updateClientPortalAccess(id: number, data: Partial<InsertClientPortalAccess>): Promise<ClientPortalAccess | undefined>;
  updateClientPortalLastLogin(id: number): Promise<void>;
  deleteClientPortalAccess(id: number): Promise<boolean>;
  getClientProjects(customerId: number): Promise<ProjectWithCustomer[]>;
  getClientProjectWithDetails(projectId: number, customerId: number): Promise<ProjectWithDetails | undefined>;

  // Project Deliveries
  getProjectDeliveries(projectId: number): Promise<ProjectDeliveryWithPhase[]>;
  getProjectDelivery(id: number): Promise<ProjectDelivery | undefined>;
  createProjectDelivery(delivery: InsertProjectDelivery): Promise<ProjectDelivery>;
  updateProjectDelivery(id: number, delivery: Partial<InsertProjectDelivery>): Promise<ProjectDelivery | undefined>;
  deleteProjectDelivery(id: number): Promise<boolean>;

  // Change Orders
  getChangeOrders(projectId: number): Promise<ChangeOrderWithPhase[]>;
  getChangeOrder(id: number): Promise<ChangeOrder | undefined>;
  getNextChangeOrderNumber(projectId: number): Promise<number>;
  createChangeOrder(changeOrder: InsertChangeOrder): Promise<ChangeOrder>;
  updateChangeOrder(id: number, changeOrder: Partial<InsertChangeOrder>): Promise<ChangeOrder | undefined>;
  deleteChangeOrder(id: number): Promise<boolean>;
  approveChangeOrder(id: number, approvedBy: string, signature: string): Promise<ChangeOrder | undefined>;
  rejectChangeOrder(id: number, rejectionReason: string): Promise<ChangeOrder | undefined>;

  // Project Files
  getProjectFiles(projectId: number): Promise<ProjectFile[]>;
  getEntityFiles(entityType: string, entityId: number): Promise<ProjectFile[]>;
  getProjectFile(id: number): Promise<ProjectFile | undefined>;
  createProjectFile(file: InsertProjectFile): Promise<ProjectFile>;
  updateProjectFile(id: number, file: Partial<InsertProjectFile>): Promise<ProjectFile | undefined>;
  deleteProjectFile(id: number): Promise<boolean>;

  // Time Entries
  getTimeEntries(projectId: number): Promise<TimeEntryWithPhase[]>;
  getTimeEntry(id: number): Promise<TimeEntry | undefined>;
  createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry>;
  updateTimeEntry(id: number, entry: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined>;
  deleteTimeEntry(id: number): Promise<boolean>;
  getProjectTimeTotal(projectId: number): Promise<{ total_hours: number; billable_hours: number }>;

  // Project Line Items
  getProjectLineItems(projectId: number): Promise<ProjectLineItemWithRelations[]>;
  getProjectLineItem(id: number): Promise<ProjectLineItem | undefined>;
  createProjectLineItem(item: InsertProjectLineItem): Promise<ProjectLineItem>;
  updateProjectLineItem(id: number, item: Partial<InsertProjectLineItem>): Promise<ProjectLineItem | undefined>;
  deleteProjectLineItem(id: number): Promise<boolean>;
  getProjectTotal(projectId: number): Promise<{ total: number }>;

  // Project Payments
  getProjectPayments(projectId: number): Promise<ProjectPayment[]>;
  getProjectPayment(id: number): Promise<ProjectPayment | undefined>;
  createProjectPayment(payment: InsertProjectPayment): Promise<ProjectPayment>;
  updateProjectPayment(id: number, payment: Partial<InsertProjectPayment>): Promise<ProjectPayment | undefined>;
  deleteProjectPayment(id: number): Promise<boolean>;
  getProjectPaymentSummary(projectId: number): Promise<{ total_due: number; total_paid: number; balance: number }>;

  // Project Updates / Activity Feed
  getProjectUpdates(projectId: number, includeInternal?: boolean): Promise<ProjectUpdate[]>;
  getProjectUpdate(id: number): Promise<ProjectUpdate | undefined>;
  createProjectUpdate(update: InsertProjectUpdate): Promise<ProjectUpdate>;
  deleteProjectUpdate(id: number): Promise<boolean>;

  // Project Messages
  getProjectMessages(projectId: number): Promise<ProjectMessage[]>;
  getProjectMessage(id: number): Promise<ProjectMessage | undefined>;
  createProjectMessage(message: InsertProjectMessage): Promise<ProjectMessage>;
  markMessageReadByAdmin(id: number): Promise<ProjectMessage | undefined>;
  markMessageReadByClient(id: number): Promise<ProjectMessage | undefined>;
  markAllMessagesReadByAdmin(projectId: number): Promise<void>;
  markAllMessagesReadByClient(projectId: number): Promise<void>;
  getUnreadMessageCountForAdmin(projectId: number): Promise<number>;
  getUnreadMessageCountForClient(projectId: number): Promise<number>;
  deleteProjectMessage(id: number): Promise<boolean>;
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

  // ============================================
  // PROJECT TEMPLATES
  // ============================================

  async getProjectTemplates(): Promise<ProjectTemplate[]> {
    return db
      .select()
      .from(projectTemplates)
      .orderBy(desc(projectTemplates.created_at));
  }

  async getProjectTemplate(id: number): Promise<ProjectTemplate | undefined> {
    const [template] = await db.select().from(projectTemplates).where(eq(projectTemplates.id, id));
    return template;
  }

  async getProjectTemplateWithDetails(id: number): Promise<ProjectTemplateWithDetails | undefined> {
    // Get template with user
    const templateResult = await db
      .select({
        template: projectTemplates,
        user: users,
      })
      .from(projectTemplates)
      .leftJoin(users, eq(projectTemplates.created_by_user_id, users.id))
      .where(eq(projectTemplates.id, id));

    if (!templateResult[0]) return undefined;

    // Get phases for this template
    const phases = await db
      .select()
      .from(phaseTemplates)
      .where(eq(phaseTemplates.project_template_id, id))
      .orderBy(asc(phaseTemplates.display_order));

    // Get tasks for each phase
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
  }

  async createProjectTemplate(template: InsertProjectTemplate): Promise<ProjectTemplate> {
    const [result] = await db.insert(projectTemplates).values(template).returning();
    return result;
  }

  async updateProjectTemplate(id: number, template: Partial<InsertProjectTemplate>): Promise<ProjectTemplate | undefined> {
    const [result] = await db
      .update(projectTemplates)
      .set({ ...template, updated_at: new Date() })
      .where(eq(projectTemplates.id, id))
      .returning();
    return result;
  }

  async deleteProjectTemplate(id: number): Promise<boolean> {
    // Phases and tasks will cascade delete due to foreign key constraints
    const result = await db.delete(projectTemplates).where(eq(projectTemplates.id, id)).returning();
    return result.length > 0;
  }

  // ============================================
  // PHASE TEMPLATES
  // ============================================

  async getPhaseTemplates(templateId: number): Promise<PhaseTemplate[]> {
    return db
      .select()
      .from(phaseTemplates)
      .where(eq(phaseTemplates.project_template_id, templateId))
      .orderBy(asc(phaseTemplates.display_order));
  }

  async createPhaseTemplate(phase: InsertPhaseTemplate): Promise<PhaseTemplate> {
    const [result] = await db.insert(phaseTemplates).values(phase).returning();
    return result;
  }

  async updatePhaseTemplate(id: number, phase: Partial<InsertPhaseTemplate>): Promise<PhaseTemplate | undefined> {
    const [result] = await db
      .update(phaseTemplates)
      .set(phase)
      .where(eq(phaseTemplates.id, id))
      .returning();
    return result;
  }

  async deletePhaseTemplate(id: number): Promise<boolean> {
    // Tasks will cascade delete due to foreign key constraints
    const result = await db.delete(phaseTemplates).where(eq(phaseTemplates.id, id)).returning();
    return result.length > 0;
  }

  async reorderPhaseTemplates(templateId: number, phaseIds: number[]): Promise<void> {
    for (let i = 0; i < phaseIds.length; i++) {
      await db
        .update(phaseTemplates)
        .set({ display_order: i + 1 })
        .where(and(eq(phaseTemplates.id, phaseIds[i]), eq(phaseTemplates.project_template_id, templateId)));
    }
  }

  // ============================================
  // TASK TEMPLATES
  // ============================================

  async getTaskTemplates(phaseId: number): Promise<TaskTemplate[]> {
    return db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.phase_template_id, phaseId))
      .orderBy(asc(taskTemplates.display_order));
  }

  async createTaskTemplate(task: InsertTaskTemplate): Promise<TaskTemplate> {
    const [result] = await db.insert(taskTemplates).values(task).returning();
    return result;
  }

  async updateTaskTemplate(id: number, task: Partial<InsertTaskTemplate>): Promise<TaskTemplate | undefined> {
    const [result] = await db
      .update(taskTemplates)
      .set(task)
      .where(eq(taskTemplates.id, id))
      .returning();
    return result;
  }

  async deleteTaskTemplate(id: number): Promise<boolean> {
    const result = await db.delete(taskTemplates).where(eq(taskTemplates.id, id)).returning();
    return result.length > 0;
  }

  // ============================================
  // CREATE PROJECT FROM TEMPLATE
  // ============================================

  async createProjectFromTemplate(templateId: number, projectData: InsertProject): Promise<Project> {
    // Get the template with all details
    const template = await this.getProjectTemplateWithDetails(templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // Create the project
    const [project] = await db.insert(projects).values(projectData).returning();

    // Create phases from template
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

      // Create tasks for this phase from template
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
  }

  // ============================================
  // CLIENT PORTAL ACCESS
  // ============================================

  async getClientPortalAccessByEmail(email: string): Promise<ClientPortalAccess | undefined> {
    const [access] = await db
      .select()
      .from(clientPortalAccess)
      .where(eq(clientPortalAccess.email, email));
    return access;
  }

  async getClientPortalAccessByCustomerId(customerId: number): Promise<ClientPortalAccess | undefined> {
    const [access] = await db
      .select()
      .from(clientPortalAccess)
      .where(eq(clientPortalAccess.customer_id, customerId));
    return access;
  }

  async getClientPortalAccessById(id: number): Promise<ClientPortalAccess | undefined> {
    const [access] = await db
      .select()
      .from(clientPortalAccess)
      .where(eq(clientPortalAccess.id, id));
    return access;
  }

  async getClientPortalUser(id: number): Promise<ClientPortalUser | undefined> {
    const result = await db
      .select({
        access: clientPortalAccess,
        customer: customers,
      })
      .from(clientPortalAccess)
      .innerJoin(customers, eq(clientPortalAccess.customer_id, customers.id))
      .where(eq(clientPortalAccess.id, id));

    if (!result[0]) return undefined;

    const { password_hash, ...accessWithoutPassword } = result[0].access;
    return {
      ...accessWithoutPassword,
      customer: result[0].customer,
    };
  }

  async getAllClientPortalAccess(): Promise<ClientPortalAccess[]> {
    return db
      .select()
      .from(clientPortalAccess)
      .orderBy(desc(clientPortalAccess.created_at));
  }

  async createClientPortalAccess(data: InsertClientPortalAccess): Promise<ClientPortalAccess> {
    const [result] = await db.insert(clientPortalAccess).values(data).returning();
    return result;
  }

  async updateClientPortalAccess(id: number, data: Partial<InsertClientPortalAccess>): Promise<ClientPortalAccess | undefined> {
    const [result] = await db
      .update(clientPortalAccess)
      .set({ ...data, updated_at: new Date() })
      .where(eq(clientPortalAccess.id, id))
      .returning();
    return result;
  }

  async updateClientPortalLastLogin(id: number): Promise<void> {
    await db
      .update(clientPortalAccess)
      .set({ last_login: new Date(), updated_at: new Date() })
      .where(eq(clientPortalAccess.id, id));
  }

  async deleteClientPortalAccess(id: number): Promise<boolean> {
    const result = await db
      .delete(clientPortalAccess)
      .where(eq(clientPortalAccess.id, id))
      .returning();
    return result.length > 0;
  }

  async getClientProjects(customerId: number): Promise<ProjectWithCustomer[]> {
    const result = await db
      .select({
        project: projects,
        customer: customers,
      })
      .from(projects)
      .innerJoin(customers, eq(projects.customer_id, customers.id))
      .where(eq(projects.customer_id, customerId))
      .orderBy(desc(projects.created_at));

    return result.map((row) => ({
      ...row.project,
      customer: row.customer,
    }));
  }

  async getClientProjectWithDetails(projectId: number, customerId: number): Promise<ProjectWithDetails | undefined> {
    // Get project with customer, ensuring it belongs to the customer
    const projectResult = await db
      .select({
        project: projects,
        customer: customers,
      })
      .from(projects)
      .innerJoin(customers, eq(projects.customer_id, customers.id))
      .where(and(eq(projects.id, projectId), eq(projects.customer_id, customerId)));

    if (!projectResult[0]) return undefined;

    // Get phases for this project (only client-visible ones)
    const phases = await db
      .select()
      .from(projectPhases)
      .where(
        and(
          eq(projectPhases.project_id, projectId),
          eq(projectPhases.client_visible, "yes")
        )
      )
      .orderBy(asc(projectPhases.display_order));

    // Get tasks for each phase (only client-visible ones)
    const phasesWithTasks: ProjectPhaseWithTasks[] = await Promise.all(
      phases.map(async (phase) => {
        const tasks = await db
          .select()
          .from(projectTasks)
          .where(
            and(
              eq(projectTasks.phase_id, phase.id),
              eq(projectTasks.client_visible, "yes")
            )
          )
          .orderBy(asc(projectTasks.display_order));
        return { ...phase, tasks };
      })
    );

    return {
      ...projectResult[0].project,
      customer: projectResult[0].customer,
      phases: phasesWithTasks,
    };
  }

  // ============================================
  // PROJECT DELIVERIES
  // ============================================

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
  }

  async getProjectDelivery(id: number): Promise<ProjectDelivery | undefined> {
    const [delivery] = await db.select().from(projectDeliveries).where(eq(projectDeliveries.id, id));
    return delivery;
  }

  async createProjectDelivery(delivery: InsertProjectDelivery): Promise<ProjectDelivery> {
    const [result] = await db.insert(projectDeliveries).values(delivery).returning();
    return result;
  }

  async updateProjectDelivery(id: number, delivery: Partial<InsertProjectDelivery>): Promise<ProjectDelivery | undefined> {
    const [result] = await db
      .update(projectDeliveries)
      .set({ ...delivery, updated_at: new Date() })
      .where(eq(projectDeliveries.id, id))
      .returning();
    return result;
  }

  async deleteProjectDelivery(id: number): Promise<boolean> {
    const result = await db.delete(projectDeliveries).where(eq(projectDeliveries.id, id)).returning();
    return result.length > 0;
  }

  // ============================================
  // CHANGE ORDERS
  // ============================================

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
  }

  async getChangeOrder(id: number): Promise<ChangeOrder | undefined> {
    const [changeOrder] = await db.select().from(changeOrders).where(eq(changeOrders.id, id));
    return changeOrder;
  }

  async getNextChangeOrderNumber(projectId: number): Promise<number> {
    const result = await db
      .select({ co_number: changeOrders.co_number })
      .from(changeOrders)
      .where(eq(changeOrders.project_id, projectId))
      .orderBy(desc(changeOrders.co_number))
      .limit(1);

    return (result[0]?.co_number || 0) + 1;
  }

  async createChangeOrder(changeOrder: InsertChangeOrder): Promise<ChangeOrder> {
    const [result] = await db.insert(changeOrders).values(changeOrder).returning();
    return result;
  }

  async updateChangeOrder(id: number, changeOrder: Partial<InsertChangeOrder>): Promise<ChangeOrder | undefined> {
    const [result] = await db
      .update(changeOrders)
      .set({ ...changeOrder, updated_at: new Date() })
      .where(eq(changeOrders.id, id))
      .returning();
    return result;
  }

  async deleteChangeOrder(id: number): Promise<boolean> {
    const result = await db.delete(changeOrders).where(eq(changeOrders.id, id)).returning();
    return result.length > 0;
  }

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
  }

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
  }

  // ============================================
  // PROJECT FILES
  // ============================================

  async getProjectFiles(projectId: number): Promise<ProjectFile[]> {
    return db
      .select()
      .from(projectFiles)
      .where(eq(projectFiles.project_id, projectId))
      .orderBy(desc(projectFiles.created_at));
  }

  async getEntityFiles(entityType: string, entityId: number): Promise<ProjectFile[]> {
    return db
      .select()
      .from(projectFiles)
      .where(and(eq(projectFiles.entity_type, entityType), eq(projectFiles.entity_id, entityId)))
      .orderBy(desc(projectFiles.created_at));
  }

  async getProjectFile(id: number): Promise<ProjectFile | undefined> {
    const [file] = await db.select().from(projectFiles).where(eq(projectFiles.id, id));
    return file;
  }

  async createProjectFile(file: InsertProjectFile): Promise<ProjectFile> {
    const [result] = await db.insert(projectFiles).values(file).returning();
    return result;
  }

  async updateProjectFile(id: number, file: Partial<InsertProjectFile>): Promise<ProjectFile | undefined> {
    const [result] = await db
      .update(projectFiles)
      .set(file)
      .where(eq(projectFiles.id, id))
      .returning();
    return result;
  }

  async deleteProjectFile(id: number): Promise<boolean> {
    const result = await db.delete(projectFiles).where(eq(projectFiles.id, id)).returning();
    return result.length > 0;
  }

  // ============================================
  // TIME ENTRIES
  // ============================================

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
  }

  async getTimeEntry(id: number): Promise<TimeEntry | undefined> {
    const [entry] = await db.select().from(timeEntries).where(eq(timeEntries.id, id));
    return entry;
  }

  async createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry> {
    const [result] = await db.insert(timeEntries).values(entry).returning();
    return result;
  }

  async updateTimeEntry(id: number, entry: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined> {
    const [result] = await db
      .update(timeEntries)
      .set({ ...entry, updated_at: new Date() })
      .where(eq(timeEntries.id, id))
      .returning();
    return result;
  }

  async deleteTimeEntry(id: number): Promise<boolean> {
    const result = await db.delete(timeEntries).where(eq(timeEntries.id, id)).returning();
    return result.length > 0;
  }

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
  }

  // ============================================
  // PROJECT LINE ITEMS
  // ============================================

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
  }

  async getProjectLineItem(id: number): Promise<ProjectLineItem | undefined> {
    const [item] = await db.select().from(projectLineItems).where(eq(projectLineItems.id, id));
    return item;
  }

  async createProjectLineItem(item: InsertProjectLineItem): Promise<ProjectLineItem> {
    const [result] = await db.insert(projectLineItems).values(item).returning();
    return result;
  }

  async updateProjectLineItem(id: number, item: Partial<InsertProjectLineItem>): Promise<ProjectLineItem | undefined> {
    const [result] = await db
      .update(projectLineItems)
      .set({ ...item, updated_at: new Date() })
      .where(eq(projectLineItems.id, id))
      .returning();
    return result;
  }

  async deleteProjectLineItem(id: number): Promise<boolean> {
    const result = await db.delete(projectLineItems).where(eq(projectLineItems.id, id)).returning();
    return result.length > 0;
  }

  async getProjectTotal(projectId: number): Promise<{ total: number }> {
    const items = await db
      .select()
      .from(projectLineItems)
      .where(eq(projectLineItems.project_id, projectId));

    let total = 0;
    for (const item of items) {
      total += parseFloat(item.total);
    }
    return { total };
  }

  // ============================================
  // PROJECT PAYMENTS
  // ============================================

  async getProjectPayments(projectId: number): Promise<ProjectPayment[]> {
    return db
      .select()
      .from(projectPayments)
      .where(eq(projectPayments.project_id, projectId))
      .orderBy(asc(projectPayments.due_date));
  }

  async getProjectPayment(id: number): Promise<ProjectPayment | undefined> {
    const [payment] = await db.select().from(projectPayments).where(eq(projectPayments.id, id));
    return payment;
  }

  async createProjectPayment(payment: InsertProjectPayment): Promise<ProjectPayment> {
    const [result] = await db.insert(projectPayments).values(payment).returning();
    return result;
  }

  async updateProjectPayment(id: number, payment: Partial<InsertProjectPayment>): Promise<ProjectPayment | undefined> {
    const [result] = await db
      .update(projectPayments)
      .set({ ...payment, updated_at: new Date() })
      .where(eq(projectPayments.id, id))
      .returning();
    return result;
  }

  async deleteProjectPayment(id: number): Promise<boolean> {
    const result = await db.delete(projectPayments).where(eq(projectPayments.id, id)).returning();
    return result.length > 0;
  }

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
  }

  // ============================================
  // PROJECT UPDATES / ACTIVITY FEED
  // ============================================

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
  }

  async getProjectUpdate(id: number): Promise<ProjectUpdate | undefined> {
    const [update] = await db.select().from(projectUpdates).where(eq(projectUpdates.id, id));
    return update;
  }

  async createProjectUpdate(update: InsertProjectUpdate): Promise<ProjectUpdate> {
    const [created] = await db.insert(projectUpdates).values(update).returning();
    return created;
  }

  async deleteProjectUpdate(id: number): Promise<boolean> {
    const result = await db.delete(projectUpdates).where(eq(projectUpdates.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Project Messages
  async getProjectMessages(projectId: number): Promise<ProjectMessage[]> {
    return db
      .select()
      .from(projectMessages)
      .where(eq(projectMessages.project_id, projectId))
      .orderBy(asc(projectMessages.created_at));
  }

  async getProjectMessage(id: number): Promise<ProjectMessage | undefined> {
    const [message] = await db.select().from(projectMessages).where(eq(projectMessages.id, id));
    return message;
  }

  async createProjectMessage(message: InsertProjectMessage): Promise<ProjectMessage> {
    const [created] = await db.insert(projectMessages).values(message).returning();
    return created;
  }

  async markMessageReadByAdmin(id: number): Promise<ProjectMessage | undefined> {
    const [updated] = await db
      .update(projectMessages)
      .set({ read_by_admin: "yes", read_by_admin_at: new Date() })
      .where(eq(projectMessages.id, id))
      .returning();
    return updated;
  }

  async markMessageReadByClient(id: number): Promise<ProjectMessage | undefined> {
    const [updated] = await db
      .update(projectMessages)
      .set({ read_by_client: "yes", read_by_client_at: new Date() })
      .where(eq(projectMessages.id, id))
      .returning();
    return updated;
  }

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
  }

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
  }

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
  }

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
  }

  async deleteProjectMessage(id: number): Promise<boolean> {
    const result = await db.delete(projectMessages).where(eq(projectMessages.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}

export const storage = new DatabaseStorage();
