import { eq, and, or } from "drizzle-orm";
import { db } from "../../../db/index";
import {
  customers,
  checkouts,
  emailNotifications,
  signedAgreements,
  type Customer,
  type InsertCustomer,
  type Checkout,
} from "@shared/schema";

export const storage = {
  // ── Customers ──────────────────────────────────────

  async getCustomers(): Promise<Customer[]> {
    return db.select().from(customers);
  },

  async getCustomer(id: number): Promise<Customer | undefined> {
    const result = await db.select().from(customers).where(eq(customers.id, id));
    return result[0];
  },

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const result = await db.insert(customers).values(customer).returning();
    return result[0];
  },

  async updateCustomer(
    id: number,
    customer: Partial<InsertCustomer>,
  ): Promise<Customer | undefined> {
    const result = await db
      .update(customers)
      .set(customer)
      .where(eq(customers.id, id))
      .returning();
    return result[0];
  },

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

  async deleteCustomer(id: number): Promise<boolean> {
    // Cascade-delete related records first
    const customerCheckouts = await db
      .select({ id: checkouts.id })
      .from(checkouts)
      .where(eq(checkouts.customer_id, id));
    const checkoutIds = customerCheckouts.map((c: { id: number }) => c.id);

    if (checkoutIds.length > 0) {
      for (const checkoutId of checkoutIds) {
        await db
          .delete(emailNotifications)
          .where(eq(emailNotifications.checkout_id, checkoutId));
      }
    }

    await db
      .delete(signedAgreements)
      .where(eq(signedAgreements.customer_id, id));
    await db.delete(checkouts).where(eq(checkouts.customer_id, id));

    const result = await db
      .delete(customers)
      .where(eq(customers.id, id))
      .returning();
    return result.length > 0;
  },
};
