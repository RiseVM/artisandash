import type { Express } from "express";
import { z } from "zod";
import {
  asyncHandler,
  isAuthenticated,
  requirePermission,
} from "../../middleware";
import { insertCheckoutSchema } from "@shared/schema";
import { storage } from "./storage";
import {
  sendCheckoutConfirmation,
  sendInstallerFollowUp,
  sendDesignerFollowUp,
  sendSpecialRequestFollowUp,
  sendSampleReminder,
} from "../../services/emailService";
import { checkAndSendNotifications } from "../../services/notificationScheduler";

export function registerCheckoutRoutes(app: Express) {
  // ── GET /api/checkouts ──────────────────────────
  app.get(
    "/api/checkouts",
    isAuthenticated,
    asyncHandler(async (_req, res) => {
      const checkoutViews = await storage.getCheckoutViews();
      res.json(checkoutViews);
    }),
  );

  // ── GET /api/checkouts/:id ──────────────────────
  app.get(
    "/api/checkouts/:id",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id))
        return res.status(400).json({ error: "Invalid checkout ID" });

      const checkoutView = await storage.getCheckoutView(id);
      if (!checkoutView)
        return res.status(404).json({ error: "Checkout not found" });
      res.json(checkoutView);
    }),
  );

  // ── POST /api/checkouts ─────────────────────────
  app.post(
    "/api/checkouts",
    requirePermission("create_checkouts"),
    asyncHandler(async (req: any, res) => {
      const userId = req.user?.id;
      const data = insertCheckoutSchema.parse(req.body);

      // Block if item already checked out
      const activeCheckouts = await storage.getActiveCheckoutsByInventoryItem(
        data.inventory_item_id,
      );
      if (activeCheckouts.length > 0) {
        return res.status(400).json({
          error:
            "This sample is already checked out. It must be returned first.",
        });
      }

      const checkout = await storage.createCheckout({
        ...data,
        created_by_user_id: userId,
      });

      // Fire-and-forget emails
      const customer = await storage.getCustomer(data.customer_id);
      const item = await storage.getInventoryItem(data.inventory_item_id);

      if (customer && item) {
        sendCheckoutConfirmation(
          customer.email,
          customer.name,
          item.name,
          item.color,
          item.vendor,
          data.checkout_date,
          data.due_date,
        ).catch((e) =>
          console.error("Failed to send checkout confirmation:", e),
        );
      }

      if (data.needs_installer === "yes" && customer && item) {
        sendInstallerFollowUp(
          customer.name,
          customer.email,
          customer.phone,
          data.project_type || null,
          data.start_date || null,
          item.name,
          data.checkout_date,
          data.notes || null,
        ).catch((e) => console.error("Failed to send installer email:", e));
      }

      if (data.wants_designer === "yes" && customer) {
        sendDesignerFollowUp(
          customer.name,
          customer.email,
          customer.phone,
          data.project_type || null,
          data.start_date || null,
          item?.name || null,
          data.checkout_date,
          data.notes || null,
        ).catch((e) => console.error("Failed to send designer email:", e));
      }

      if (data.has_special_request === "yes" && customer) {
        sendSpecialRequestFollowUp(
          customer.name,
          customer.email,
          customer.phone,
          data.special_request || "No details provided",
          item?.name || null,
          data.checkout_date,
          data.notes || null,
        ).catch((e) =>
          console.error("Failed to send special request email:", e),
        );
      }

      res.status(201).json(checkout);
    }),
  );

  // ── PATCH /api/checkouts/:id ────────────────────
  app.patch(
    "/api/checkouts/:id",
    requirePermission("manage_checkouts"),
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id))
        return res.status(400).json({ error: "Invalid checkout ID" });

      const data = insertCheckoutSchema.partial().parse(req.body);
      const checkout = await storage.updateCheckout(id, data);
      if (!checkout)
        return res.status(404).json({ error: "Checkout not found" });
      res.json(checkout);
    }),
  );

  // ── DELETE /api/checkouts/:id ───────────────────
  app.delete(
    "/api/checkouts/:id",
    requirePermission("manage_checkouts"),
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id))
        return res.status(400).json({ error: "Invalid checkout ID" });

      const deleted = await storage.deleteCheckout(id);
      if (!deleted)
        return res.status(404).json({ error: "Checkout not found" });
      res.json({ success: true });
    }),
  );

  // ── POST /api/checkouts/return-all ──────────────
  app.post(
    "/api/checkouts/return-all",
    requirePermission("manage_checkouts"),
    asyncHandler(async (_req, res) => {
      const count = await storage.returnAllActiveCheckouts();
      res.json({
        success: true,
        returned: count,
        message: `${count} checkout(s) marked as returned`,
      });
    }),
  );

  // ── POST /api/checkouts/:id/send-reminder ───────
  app.post(
    "/api/checkouts/:id/send-reminder",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      const checkoutView = await storage.getCheckoutView(id);
      if (!checkoutView)
        return res.status(404).json({ error: "Checkout not found" });

      const success = await sendSampleReminder(
        checkoutView.customer.email,
        checkoutView.customer.name,
        checkoutView.item.name,
        checkoutView.due_date,
        "7_day_reminder",
      );

      if (success) {
        await storage.updateCheckout(id, {
          last_reminder_sent: new Date(),
        } as any);
        res.json({
          success: true,
          message: `Reminder sent to ${checkoutView.customer.email}`,
        });
      } else {
        res.status(500).json({ success: false, message: "Failed to send reminder" });
      }
    }),
  );

  // ── POST /api/notifications/send ────────────────
  app.post(
    "/api/notifications/send",
    isAuthenticated,
    asyncHandler(async (_req, res) => {
      const results = await checkAndSendNotifications();
      res.json(results);
    }),
  );

  // ── POST /api/send-followup-emails ──────────────
  app.post(
    "/api/send-followup-emails",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const {
        customer_id,
        needs_installer,
        wants_designer,
        has_special_request,
        special_request,
        project_type,
        start_date,
        notes,
      } = req.body;

      const customer = await storage.getCustomer(customer_id);
      if (!customer) return res.status(404).json({ error: "Customer not found" });

      const emailsSent: string[] = [];
      const today = new Date().toLocaleDateString();

      if (needs_installer === "yes") {
        try {
          await sendInstallerFollowUp(customer.name, customer.email, customer.phone, project_type || null, start_date || null, null, today, notes || null);
          emailsSent.push("installer");
        } catch (e) { console.error("Installer follow-up failed:", e); }
      }

      if (wants_designer === "yes") {
        try {
          await sendDesignerFollowUp(customer.name, customer.email, customer.phone, project_type || null, start_date || null, null, today, notes || null);
          emailsSent.push("designer");
        } catch (e) { console.error("Designer follow-up failed:", e); }
      }

      if (has_special_request === "yes") {
        try {
          await sendSpecialRequestFollowUp(customer.name, customer.email, customer.phone, special_request || "No details provided", null, today, notes || null);
          emailsSent.push("special_request");
        } catch (e) { console.error("Special request follow-up failed:", e); }
      }

      res.json({ success: true, emailsSent });
    }),
  );
}
