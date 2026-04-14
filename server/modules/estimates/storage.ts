import { eq, desc, and, like, sql } from "drizzle-orm";
import { db } from "../../../db/index";
import {
  estimates,
  estimateLineItems,
  customers,
  users,
  type Estimate,
  type InsertEstimate,
  type EstimateLineItem,
  type InsertEstimateLineItem,
  type EstimateWithCustomer,
  type EstimateWithDetails,
} from "@shared/schema";

export const storage = {
  // ── Generate estimate number ──────────────────
  async generateEstimateNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `EST-${year}-`;
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(estimates)
      .where(like(estimates.estimate_number, `${prefix}%`));
    const nextNum = (result?.count || 0) + 1;
    return `${prefix}${String(nextNum).padStart(3, "0")}`;
  },

  // ── Estimate queries ──────────────────────────
  async getEstimates(): Promise<EstimateWithCustomer[]> {
    const result = await db
      .select({
        estimate: estimates,
        customer: customers,
        user: users,
      })
      .from(estimates)
      .leftJoin(customers, eq(estimates.customer_id, customers.id))
      .leftJoin(users, eq(estimates.created_by_user_id, users.id))
      .orderBy(desc(estimates.created_at));

    return result.map((row: any) => ({
      ...row.estimate,
      customer: row.customer || null,
      createdByUser: row.user || null,
    }));
  },

  async getEstimate(id: number): Promise<EstimateWithDetails | undefined> {
    const result = await db
      .select({
        estimate: estimates,
        customer: customers,
        user: users,
      })
      .from(estimates)
      .leftJoin(customers, eq(estimates.customer_id, customers.id))
      .leftJoin(users, eq(estimates.created_by_user_id, users.id))
      .where(eq(estimates.id, id));

    if (!result[0]) return undefined;

    const lineItems = await db
      .select()
      .from(estimateLineItems)
      .where(eq(estimateLineItems.estimate_id, id))
      .orderBy(estimateLineItems.display_order);

    return {
      ...result[0].estimate,
      customer: result[0].customer || null,
      lineItems,
      createdByUser: result[0].user || null,
    };
  },

  async getEstimateBasic(id: number): Promise<Estimate | undefined> {
    const [row] = await db.select().from(estimates).where(eq(estimates.id, id));
    return row;
  },

  // ── Mutations ─────────────────────────────────
  async createEstimate(data: InsertEstimate): Promise<Estimate> {
    const [row] = await db.insert(estimates).values(data).returning();
    return row;
  },

  async updateEstimate(id: number, data: Partial<InsertEstimate>): Promise<Estimate | undefined> {
    const [row] = await db
      .update(estimates)
      .set({ ...data, updated_at: new Date() })
      .where(eq(estimates.id, id))
      .returning();
    return row;
  },

  async deleteEstimate(id: number): Promise<boolean> {
    // Line items cascade-delete via FK
    const result = await db.delete(estimates).where(eq(estimates.id, id)).returning();
    return result.length > 0;
  },

  // ── Line Items ────────────────────────────────
  async getLineItems(estimateId: number): Promise<EstimateLineItem[]> {
    return db
      .select()
      .from(estimateLineItems)
      .where(eq(estimateLineItems.estimate_id, estimateId))
      .orderBy(estimateLineItems.display_order);
  },

  async createLineItem(data: InsertEstimateLineItem): Promise<EstimateLineItem> {
    const [row] = await db.insert(estimateLineItems).values(data).returning();
    return row;
  },

  async updateLineItem(id: number, data: Partial<InsertEstimateLineItem>): Promise<EstimateLineItem | undefined> {
    const [row] = await db
      .update(estimateLineItems)
      .set({ ...data, updated_at: new Date() })
      .where(eq(estimateLineItems.id, id))
      .returning();
    return row;
  },

  async deleteLineItem(id: number): Promise<boolean> {
    const result = await db.delete(estimateLineItems).where(eq(estimateLineItems.id, id)).returning();
    return result.length > 0;
  },

  // ── Recalculate Totals ────────────────────────
  async recalculateEstimateTotals(estimateId: number): Promise<Estimate | undefined> {
    const items = await this.getLineItems(estimateId);
    const subtotal = items.reduce((sum, item) => sum + parseFloat(item.total), 0);

    const [est] = await db.select().from(estimates).where(eq(estimates.id, estimateId));
    if (!est) return undefined;

    const taxRate = parseFloat(est.tax_rate);
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    const [updated] = await db
      .update(estimates)
      .set({
        subtotal: subtotal.toFixed(2),
        tax_amount: taxAmount.toFixed(2),
        total: total.toFixed(2),
        updated_at: new Date(),
      })
      .where(eq(estimates.id, estimateId))
      .returning();

    return updated;
  },
};
