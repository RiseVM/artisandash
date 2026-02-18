import type { Express } from "express";
import {
  asyncHandler,
  validate,
  isAuthenticated,
  requirePermission,
} from "../../middleware";
import { insertCustomerSchema } from "@shared/schema";
import { storage } from "./storage";

export function registerCustomerRoutes(app: Express) {
  // ── GET /api/customers ─────────────────────────────
  app.get(
    "/api/customers",
    isAuthenticated,
    asyncHandler(async (_req, res) => {
      const customers = await storage.getCustomers();
      res.json(customers);
    }),
  );

  // ── GET /api/customers/:id ─────────────────────────
  app.get(
    "/api/customers/:id",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid customer ID" });

      const customer = await storage.getCustomer(id);
      if (!customer) return res.status(404).json({ error: "Customer not found" });
      res.json(customer);
    }),
  );

  // ── POST /api/customers ────────────────────────────
  app.post(
    "/api/customers",
    requirePermission("manage_customers"),
    validate(insertCustomerSchema),
    asyncHandler(async (req, res) => {
      const customer = await storage.createCustomer(req.validated);
      res.status(201).json(customer);
    }),
  );

  // ── PATCH /api/customers/:id ───────────────────────
  app.patch(
    "/api/customers/:id",
    requirePermission("manage_customers"),
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid customer ID" });

      const data = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(id, data);
      if (!customer) return res.status(404).json({ error: "Customer not found" });
      res.json(customer);
    }),
  );

  // ── DELETE /api/customers/:id ──────────────────────
  app.delete(
    "/api/customers/:id",
    requirePermission("manage_customers"),
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid customer ID" });

      // Block deletion if customer has active checkouts
      const activeCheckouts = await storage.getActiveCheckoutsByCustomer(id);
      if (activeCheckouts.length > 0) {
        const overdueCount = activeCheckouts.filter(
          (c) => c.status === "overdue",
        ).length;
        const checkedOutCount = activeCheckouts.filter(
          (c) => c.status === "checked_out",
        ).length;
        let reason = `This customer has ${activeCheckouts.length} active sample${activeCheckouts.length > 1 ? "s" : ""}`;
        if (overdueCount > 0 && checkedOutCount > 0) {
          reason += ` (${checkedOutCount} checked out, ${overdueCount} overdue)`;
        } else if (overdueCount > 0) {
          reason += ` (${overdueCount} overdue)`;
        } else {
          reason += ` checked out`;
        }
        reason += `. All samples must be returned before deleting.`;
        return res.status(400).json({ error: reason });
      }

      const deleted = await storage.deleteCustomer(id);
      if (!deleted) return res.status(404).json({ error: "Customer not found" });
      res.json({ success: true });
    }),
  );
}
