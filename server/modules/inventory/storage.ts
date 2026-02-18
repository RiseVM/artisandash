import { eq, and, or } from "drizzle-orm";
import { db } from "../../../db/index";
import {
  inventory,
  checkouts,
  type Inventory,
  type InsertInventory,
  type Checkout,
} from "@shared/schema";

export const storage = {
  // ── Inventory ──────────────────────────────────────

  async getInventory(): Promise<Inventory[]> {
    return db.select().from(inventory);
  },

  async getInventoryItem(id: number): Promise<Inventory | undefined> {
    const result = await db
      .select()
      .from(inventory)
      .where(eq(inventory.id, id));
    return result[0];
  },

  async createInventoryItem(item: InsertInventory): Promise<Inventory> {
    const result = await db.insert(inventory).values(item).returning();
    return result[0];
  },

  async updateInventoryItem(
    id: number,
    item: Partial<InsertInventory>,
  ): Promise<Inventory | undefined> {
    const result = await db
      .update(inventory)
      .set(item)
      .where(eq(inventory.id, id))
      .returning();
    return result[0];
  },

  async getActiveCheckoutsByInventoryItem(itemId: number): Promise<Checkout[]> {
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

  async deleteInventoryItem(id: number): Promise<boolean> {
    const result = await db
      .delete(inventory)
      .where(eq(inventory.id, id))
      .returning();
    return result.length > 0;
  },
};
