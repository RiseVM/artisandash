import type { Express } from "express";
import {
  asyncHandler,
  validate,
  isAuthenticated,
  requirePermission,
} from "../../middleware";
import { insertInventorySchema } from "@shared/schema";
import { storage } from "./storage";

export function registerInventoryRoutes(app: Express) {
  // ── GET /api/inventory ─────────────────────────────
  app.get(
    "/api/inventory",
    isAuthenticated,
    asyncHandler(async (_req, res) => {
      const items = await storage.getInventory();
      res.json(items);
    }),
  );

  // ── GET /api/inventory/:id ─────────────────────────
  app.get(
    "/api/inventory/:id",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id))
        return res.status(400).json({ error: "Invalid inventory item ID" });

      const item = await storage.getInventoryItem(id);
      if (!item) return res.status(404).json({ error: "Item not found" });
      res.json(item);
    }),
  );

  // ── POST /api/inventory ────────────────────────────
  app.post(
    "/api/inventory",
    requirePermission("manage_inventory"),
    validate(insertInventorySchema),
    asyncHandler(async (req, res) => {
      const item = await storage.createInventoryItem(req.validated);
      res.status(201).json(item);
    }),
  );

  // ── PATCH /api/inventory/:id ───────────────────────
  app.patch(
    "/api/inventory/:id",
    requirePermission("manage_inventory"),
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id))
        return res.status(400).json({ error: "Invalid inventory item ID" });

      const data = insertInventorySchema.partial().parse(req.body);
      const item = await storage.updateInventoryItem(id, data);
      if (!item) return res.status(404).json({ error: "Item not found" });
      res.json(item);
    }),
  );

  // ── DELETE /api/inventory/:id ──────────────────────
  app.delete(
    "/api/inventory/:id",
    requirePermission("manage_inventory"),
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id))
        return res.status(400).json({ error: "Invalid inventory item ID" });

      // Block deletion if item has active checkouts
      const activeCheckouts =
        await storage.getActiveCheckoutsByInventoryItem(id);
      if (activeCheckouts.length > 0) {
        const overdueCount = activeCheckouts.filter(
          (c) => c.status === "overdue",
        ).length;
        const checkedOutCount = activeCheckouts.filter(
          (c) => c.status === "checked_out",
        ).length;
        let reason = `This sample is currently checked out to ${activeCheckouts.length} customer${activeCheckouts.length > 1 ? "s" : ""}`;
        if (overdueCount > 0 && checkedOutCount > 0) {
          reason += ` (${checkedOutCount} active, ${overdueCount} overdue)`;
        } else if (overdueCount > 0) {
          reason += ` (overdue)`;
        }
        reason += `. It must be returned before deleting.`;
        return res.status(400).json({ error: reason });
      }

      const deleted = await storage.deleteInventoryItem(id);
      if (!deleted) return res.status(404).json({ error: "Item not found" });
      res.json({ success: true });
    }),
  );
}
