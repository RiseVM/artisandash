import { db } from "../db/index";
import { 
  customers, 
  inventory, 
  checkouts,
  users,
  type Customer,
  type Inventory,
  type Checkout,
  type InsertCustomer,
  type InsertInventory,
  type InsertCheckout,
  type CheckoutView,
  type User,
  type UpsertUser
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Users (for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;

  // Inventory
  getInventory(): Promise<Inventory[]>;
  getInventoryItem(id: number): Promise<Inventory | undefined>;
  createInventoryItem(item: InsertInventory): Promise<Inventory>;
  updateInventoryItem(id: number, item: Partial<InsertInventory>): Promise<Inventory | undefined>;

  // Checkouts
  getCheckouts(): Promise<Checkout[]>;
  getCheckout(id: number): Promise<Checkout | undefined>;
  getCheckoutView(id: number): Promise<CheckoutView | undefined>;
  getCheckoutViews(): Promise<CheckoutView[]>;
  createCheckout(checkout: InsertCheckout): Promise<Checkout>;
  updateCheckout(id: number, checkout: Partial<InsertCheckout>): Promise<Checkout | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Users (for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
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
      })
      .from(checkouts)
      .innerJoin(customers, eq(checkouts.customer_id, customers.id))
      .innerJoin(inventory, eq(checkouts.inventory_item_id, inventory.id))
      .where(eq(checkouts.id, id));

    if (!result[0]) return undefined;

    return {
      ...result[0].checkout,
      customer: result[0].customer,
      item: result[0].item,
    };
  }

  async getCheckoutViews(): Promise<CheckoutView[]> {
    const result = await db
      .select({
        checkout: checkouts,
        customer: customers,
        item: inventory,
      })
      .from(checkouts)
      .innerJoin(customers, eq(checkouts.customer_id, customers.id))
      .innerJoin(inventory, eq(checkouts.inventory_item_id, inventory.id));

    return result.map((row: any) => ({
      ...row.checkout,
      customer: row.customer,
      item: row.item,
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
}

export const storage = new DatabaseStorage();
