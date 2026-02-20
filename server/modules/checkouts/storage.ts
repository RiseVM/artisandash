import { eq, and, or } from "drizzle-orm";
import { db } from "../../../db/index";
import {
  checkouts,
  customers,
  inventory,
  users,
  emailNotifications,
  type Checkout,
  type InsertCheckout,
  type CheckoutView,
  type EmailNotification,
  type InsertEmailNotification,
  type Customer,
  type Inventory,
} from "@shared/schema";

export const storage = {
  // ── Checkout queries ─────────────────────────

  async getCheckouts(): Promise<Checkout[]> {
    return db.select().from(checkouts);
  },

  async getCheckout(id: number): Promise<Checkout | undefined> {
    const [row] = await db.select().from(checkouts).where(eq(checkouts.id, id));
    return row;
  },

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
  },

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
  },

  // ── Active checkout helpers ──────────────────

  async getActiveCheckoutsByCustomer(customerId: number): Promise<Checkout[]> {
    return db
      .select()
      .from(checkouts)
      .where(
        and(
          eq(checkouts.customer_id, customerId),
          or(
            eq(checkouts.status, "checked_out"),
            eq(checkouts.status, "overdue"),
          ),
        ),
      );
  },

  async getActiveCheckoutsByInventoryItem(
    itemId: number,
  ): Promise<Checkout[]> {
    return db
      .select()
      .from(checkouts)
      .where(
        and(
          eq(checkouts.inventory_item_id, itemId),
          or(
            eq(checkouts.status, "checked_out"),
            eq(checkouts.status, "overdue"),
          ),
        ),
      );
  },

  // ── Mutations ────────────────────────────────

  async createCheckout(data: InsertCheckout): Promise<Checkout> {
    const [row] = await db.insert(checkouts).values(data).returning();
    return row;
  },

  async updateCheckout(
    id: number,
    data: Partial<InsertCheckout>,
  ): Promise<Checkout | undefined> {
    const [row] = await db
      .update(checkouts)
      .set({ ...data, updated_at: new Date() })
      .where(eq(checkouts.id, id))
      .returning();
    return row;
  },

  async deleteCheckout(id: number): Promise<boolean> {
    // Delete associated notifications first
    await db
      .delete(emailNotifications)
      .where(eq(emailNotifications.checkout_id, id));
    const result = await db
      .delete(checkouts)
      .where(eq(checkouts.id, id))
      .returning();
    return result.length > 0;
  },

  async returnAllActiveCheckouts(): Promise<number> {
    const result = await db
      .update(checkouts)
      .set({ status: "returned", updated_at: new Date() })
      .where(
        or(
          eq(checkouts.status, "checked_out"),
          eq(checkouts.status, "overdue"),
        ),
      )
      .returning();
    return result.length;
  },

  // ── Customer / inventory lookups (for emails) ─

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [row] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id));
    return row;
  },

  async getInventoryItem(id: number): Promise<Inventory | undefined> {
    const [row] = await db
      .select()
      .from(inventory)
      .where(eq(inventory.id, id));
    return row;
  },

  // ── Email notification tracking ──────────────

  async getNotificationsByCheckout(
    checkoutId: number,
  ): Promise<EmailNotification[]> {
    return db
      .select()
      .from(emailNotifications)
      .where(eq(emailNotifications.checkout_id, checkoutId));
  },

  async hasNotificationBeenSent(
    checkoutId: number,
    notificationType: string,
  ): Promise<boolean> {
    const result = await db
      .select()
      .from(emailNotifications)
      .where(
        and(
          eq(emailNotifications.checkout_id, checkoutId),
          eq(emailNotifications.notification_type, notificationType),
        ),
      );
    return result.length > 0;
  },

  async createNotification(
    notification: InsertEmailNotification,
  ): Promise<EmailNotification> {
    const [row] = await db
      .insert(emailNotifications)
      .values(notification)
      .returning();
    return row;
  },
};
