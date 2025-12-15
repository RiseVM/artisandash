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
  type ActivityLog
} from "@shared/schema";
import { eq, and, desc, gte, lte, or } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

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
    const result = await db.select().from(checkouts).where(
      and(
        eq(checkouts.customer_id, customerId),
        eq(checkouts.status, 'checked_out')
      )
    );
    const overdueResult = await db.select().from(checkouts).where(
      and(
        eq(checkouts.customer_id, customerId),
        eq(checkouts.status, 'overdue')
      )
    );
    return [...result, ...overdueResult];
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
    const result = await db.select().from(checkouts).where(
      and(
        eq(checkouts.inventory_item_id, itemId),
        eq(checkouts.status, 'checked_out')
      )
    );
    const overdueResult = await db.select().from(checkouts).where(
      and(
        eq(checkouts.inventory_item_id, itemId),
        eq(checkouts.status, 'overdue')
      )
    );
    return [...result, ...overdueResult];
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
    await db.delete(emailNotifications).where(eq(emailNotifications.checkout_id, id));
    const result = await db.delete(checkouts).where(eq(checkouts.id, id)).returning();
    return result.length > 0;
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
}

export const storage = new DatabaseStorage();
