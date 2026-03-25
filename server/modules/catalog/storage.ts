import { eq, asc, and, isNull } from "drizzle-orm";
import { db } from "../../../db/index";
import {
  serviceCatalogCategories,
  serviceCatalogItems,
  type ServiceCatalogCategory,
  type InsertServiceCatalogCategory,
  type ServiceCatalogItem,
  type InsertServiceCatalogItem,
  type ServiceCatalogCategoryWithItems,
  type ServiceCatalogItemWithChildren,
} from "@shared/schema";

export const storage = {
  // ── Categories ──────────────────────────────
  async getCategories(): Promise<ServiceCatalogCategoryWithItems[]> {
    const cats = await db
      .select()
      .from(serviceCatalogCategories)
      .orderBy(asc(serviceCatalogCategories.display_order));

    const items = await db
      .select()
      .from(serviceCatalogItems)
      .orderBy(asc(serviceCatalogItems.display_order));

    return cats.map((cat) => {
      const catItems = items.filter((i) => i.category_id === cat.id);
      const topLevel = catItems.filter((i) => i.parent_id === null);
      return {
        ...cat,
        items: topLevel.map((item) => ({
          ...item,
          children: catItems.filter((child) => child.parent_id === item.id),
        })),
      };
    });
  },

  async getCategory(id: number): Promise<ServiceCatalogCategory | undefined> {
    const [cat] = await db.select().from(serviceCatalogCategories).where(eq(serviceCatalogCategories.id, id));
    return cat;
  },

  async createCategory(data: InsertServiceCatalogCategory): Promise<ServiceCatalogCategory> {
    const [cat] = await db.insert(serviceCatalogCategories).values(data).returning();
    return cat;
  },

  async updateCategory(id: number, data: Partial<InsertServiceCatalogCategory>): Promise<ServiceCatalogCategory> {
    const [cat] = await db
      .update(serviceCatalogCategories)
      .set({ ...data, updated_at: new Date() })
      .where(eq(serviceCatalogCategories.id, id))
      .returning();
    return cat;
  },

  async deleteCategory(id: number): Promise<void> {
    await db.delete(serviceCatalogCategories).where(eq(serviceCatalogCategories.id, id));
  },

  // ── Items ───────────────────────────────────
  async getItems(categoryId: number): Promise<ServiceCatalogItem[]> {
    return db
      .select()
      .from(serviceCatalogItems)
      .where(eq(serviceCatalogItems.category_id, categoryId))
      .orderBy(asc(serviceCatalogItems.display_order));
  },

  async getItem(id: number): Promise<ServiceCatalogItem | undefined> {
    const [item] = await db.select().from(serviceCatalogItems).where(eq(serviceCatalogItems.id, id));
    return item;
  },

  async createItem(data: InsertServiceCatalogItem): Promise<ServiceCatalogItem> {
    const [item] = await db.insert(serviceCatalogItems).values(data).returning();
    return item;
  },

  async updateItem(id: number, data: Partial<InsertServiceCatalogItem>): Promise<ServiceCatalogItem> {
    const [item] = await db
      .update(serviceCatalogItems)
      .set({ ...data, updated_at: new Date() })
      .where(eq(serviceCatalogItems.id, id))
      .returning();
    return item;
  },

  async deleteItem(id: number): Promise<void> {
    // Also deletes children since they have parent_id pointing here
    await db.delete(serviceCatalogItems).where(eq(serviceCatalogItems.parent_id, id));
    await db.delete(serviceCatalogItems).where(eq(serviceCatalogItems.id, id));
  },

  // ── Seed Default Catalog ────────────────────
  async seedDefaultCatalog(): Promise<void> {
    // Check if catalog already has data
    const existing = await db.select().from(serviceCatalogCategories);
    if (existing.length > 0) return;

    // Helper to insert a category and return its ID
    const insertCat = async (name: string, icon: string, iconBg: string, order: number) => {
      const [cat] = await db.insert(serviceCatalogCategories).values({
        name, icon, icon_bg: iconBg, display_order: order, is_active: "yes",
      }).returning();
      return cat.id;
    };

    // Helper to insert an item
    const insertItem = async (
      categoryId: number, parentId: number | null, name: string,
      price: string, order: number, isGroup = "no", isExclusive = "no"
    ) => {
      const [item] = await db.insert(serviceCatalogItems).values({
        category_id: categoryId, parent_id: parentId, name, price,
        display_order: order, is_active: "yes", is_group: isGroup, is_exclusive: isExclusive,
      }).returning();
      return item.id;
    };

    // ── SHOWER ──
    const showerId = await insertCat("Shower", "🚿", "#dbeafe", 1);
    await insertItem(showerId, null, "Demolition", "3200", 1);
    await insertItem(showerId, null, "Framing", "450", 2);
    await insertItem(showerId, null, "Waterproofing", "1200", 3);
    await insertItem(showerId, null, "Tile Installation", "6000", 4);
    const showerBuiltIns = await insertItem(showerId, null, "Built-Ins", "0", 5, "yes");
    await insertItem(showerId, showerBuiltIns, "Niche", "500", 1);
    await insertItem(showerId, showerBuiltIns, "Corner Shelf", "350", 2);
    await insertItem(showerId, showerBuiltIns, "Accessories (towel bar, hooks, etc.)", "350", 3);

    // ── FLOOR ──
    const floorId = await insertCat("Floor", "🏠", "#fef3c7", 2);
    await insertItem(floorId, null, "Subfloor Prep", "500", 1);
    const floorUnder = await insertItem(floorId, null, "Underlayment", "0", 2, "yes", "yes");
    await insertItem(floorId, floorUnder, "Ditra", "600", 1);
    await insertItem(floorId, floorUnder, "Heated", "600", 2);
    await insertItem(floorId, null, "Tile Installation", "4000", 3);

    // ── PAINT ──
    const paintId = await insertCat("Paint", "🎨", "#fce7f3", 3);
    await insertItem(paintId, null, "Full Paint Package", "3200", 1);

    // ── ELECTRICAL ──
    const elecId = await insertCat("Electrical", "⚡", "#fef9c3", 4);
    await insertItem(elecId, null, "Demo — Remove Tub Feed", "400", 1);
    const roughElec = await insertItem(elecId, null, "Rough Electrical", "0", 2, "yes");
    await insertItem(elecId, roughElec, "New 20A Circuit (per circuit)", "550", 1);
    await insertItem(elecId, roughElec, "GFCI Outlet Rough-In", "350", 2);
    await insertItem(elecId, roughElec, "Vanity Light Rough-In", "300", 3);
    await insertItem(elecId, roughElec, "Exhaust Fan Rough-In", "450", 4);
    await insertItem(elecId, roughElec, "Recessed Light Rough-In (per can)", "275", 5);
    await insertItem(elecId, roughElec, "Heated Floor Connection", "400", 6);
    await insertItem(elecId, roughElec, "Smart Switch / Dimmer Prep", "1100", 7);
    const trimElec = await insertItem(elecId, null, "Trim Out", "0", 3, "yes");
    await insertItem(elecId, trimElec, "Install GFCI Outlet", "100", 1);
    await insertItem(elecId, trimElec, "Install Vanity Light Fixture", "225", 2);
    await insertItem(elecId, trimElec, "Install Exhaust Fan", "275", 3);
    await insertItem(elecId, trimElec, "Install Recessed Light Trim (per can)", "100", 4);
    await insertItem(elecId, trimElec, "Install Switch / Dimmer", "100", 5);
    await insertItem(elecId, trimElec, "Final Panel Labeling & Test", "900", 6);

    // ── PLUMBING ──
    const plumbId = await insertCat("Plumbing", "🔧", "#e0e7ff", 5);
    await insertItem(plumbId, null, "Removal & Demo", "1250", 1);
    const roughPlumb = await insertItem(plumbId, null, "Rough Plumbing", "0", 2, "yes");
    await insertItem(plumbId, roughPlumb, "Shower Valve Rough-In", "800", 1);
    await insertItem(plumbId, roughPlumb, "Shower Drain Rough-In", "450", 2);
    await insertItem(plumbId, roughPlumb, "Vanity Drain & Supply Rough-In", "600", 3);
    const tubInstall = await insertItem(plumbId, null, "Tub Installation", "0", 3, "yes", "yes");
    await insertItem(plumbId, tubInstall, "Alcove Tub Install", "500", 1);
    await insertItem(plumbId, tubInstall, "Freestanding Tub Install", "800", 2);
    const fixtureInstall = await insertItem(plumbId, null, "Fixture Installation", "0", 4, "yes");
    await insertItem(plumbId, fixtureInstall, "Shower Trim & Head Install", "350", 1);
    await insertItem(plumbId, fixtureInstall, "Vanity Faucet Install", "250", 2);
    await insertItem(plumbId, fixtureInstall, "Toilet Reset / Install", "300", 3);
    await insertItem(plumbId, null, "Final Trim", "1000", 5);

    // ── PERMIT ──
    const permitId = await insertCat("Permit", "📋", "#d1fae5", 6);
    await insertItem(permitId, null, "Permit Fee", "550", 1);
  },
};
