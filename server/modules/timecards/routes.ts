import type { Express } from "express";
import { isAuthenticated, isAdmin } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/errorHandler";
import { timecardStorage } from "./storage";

export function registerTimecardRoutes(app: Express) {
  // ── IDENTITY VERIFICATION (shared computers) ─

  // POST verify password before accessing timecards
  app.post(
    "/api/timecards/verify-identity",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { password } = req.body;
      if (!password) return res.status(400).json({ error: "Password required" });

      const { verifyPassword } = await import("../auth/service");
      const { storage } = await import("../auth/storage");
      const user = await storage.getUser(userId);

      if (!user || !user.passwordHash) {
        return res.status(400).json({ error: "Account has no password set" });
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Incorrect password" });
      }

      res.json({ verified: true, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
    }),
  );

  // ── EMPLOYEE ROUTES ───────────────────────

  // GET own timecard for a specific week (get or create)
  app.get(
    "/api/timecards/my/:weekStartDate",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { weekStartDate } = req.params;
      if (!weekStartDate || !/^\d{4}-\d{2}-\d{2}$/.test(weekStartDate)) {
        return res.status(400).json({ error: "Invalid weekStartDate format (YYYY-MM-DD)" });
      }

      const card = await timecardStorage.getOrCreateTimecard(userId, weekStartDate);
      const auditLog = await timecardStorage.getTimecardAuditLog(card.id);
      res.json({ ...card, auditLog });
    }),
  );

  // GET list of own timecards (all weeks)
  app.get(
    "/api/timecards/my",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const cards = await timecardStorage.getMyTimecards(userId);
      res.json(cards);
    }),
  );

  // PATCH own entry (blocked if approved)
  app.patch(
    "/api/timecards/entries/:entryId",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const entryId = parseInt(req.params.entryId, 10);
      if (isNaN(entryId)) return res.status(400).json({ error: "Invalid entry ID" });

      const found = await timecardStorage.getEntryWithTimecard(entryId);
      if (!found) return res.status(404).json({ error: "Entry not found" });

      // Must own the timecard
      if (found.timecard.userId !== userId) {
        return res.status(403).json({ error: "Not your timecard" });
      }

      // Cannot edit approved cards
      if (found.timecard.status === "approved") {
        return res.status(400).json({ error: "Cannot edit an approved timecard" });
      }

      const { hours, notes } = req.body;
      const updated = await timecardStorage.updateTimecardEntry(
        entryId,
        String(hours ?? found.entry.hours),
        notes !== undefined ? notes : found.entry.notes,
        userId,
      );

      res.json(updated);
    }),
  );

  // POST submit own timecard
  app.post(
    "/api/timecards/:id/submit",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const timecardId = parseInt(req.params.id, 10);
      if (isNaN(timecardId)) return res.status(400).json({ error: "Invalid timecard ID" });

      const card = await timecardStorage.getTimecardWithEntries(timecardId);

      if (card.userId !== userId) {
        return res.status(403).json({ error: "Not your timecard" });
      }

      if (card.status !== "draft") {
        return res.status(400).json({ error: `Cannot submit a timecard with status "${card.status}"` });
      }

      const updated = await timecardStorage.submitTimecard(timecardId, userId);
      res.json(updated);
    }),
  );

  // ── ADMIN ROUTES ──────────────────────────

  // GET all timecards with user info (filterable)
  app.get(
    "/api/timecards/admin/all",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      const { weekStartDate, userId, status } = req.query;
      const cards = await timecardStorage.getAllTimecardsWithUsers({
        weekStartDate: weekStartDate as string | undefined,
        userId: userId as string | undefined,
        status: status as string | undefined,
      });
      res.json(cards);
    }),
  );

  // GET all active users (for admin dropdowns)
  app.get(
    "/api/timecards/admin/users",
    isAdmin,
    asyncHandler(async (_req: any, res) => {
      const activeUsers = await timecardStorage.getAllActiveUsers();
      res.json(activeUsers);
    }),
  );

  // GET single timecard with entries + audit log (admin)
  app.get(
    "/api/timecards/admin/:id",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      const timecardId = parseInt(req.params.id, 10);
      if (isNaN(timecardId)) return res.status(400).json({ error: "Invalid timecard ID" });

      const card = await timecardStorage.getTimecardWithEntries(timecardId);
      const auditLog = await timecardStorage.getTimecardAuditLog(timecardId);
      res.json({ ...card, auditLog });
    }),
  );

  // PATCH admin edit any entry (regardless of status)
  app.patch(
    "/api/timecards/admin/entries/:entryId",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      const adminId = req.user?.id;
      if (!adminId) return res.status(401).json({ error: "Unauthorized" });

      const entryId = parseInt(req.params.entryId, 10);
      if (isNaN(entryId)) return res.status(400).json({ error: "Invalid entry ID" });

      const found = await timecardStorage.getEntryWithTimecard(entryId);
      if (!found) return res.status(404).json({ error: "Entry not found" });

      const { hours, notes } = req.body;
      const updated = await timecardStorage.adminEditTimecardEntry(
        entryId,
        String(hours ?? found.entry.hours),
        notes !== undefined ? notes : found.entry.notes,
        adminId,
      );

      res.json(updated);
    }),
  );

  // POST approve timecard (admin)
  app.post(
    "/api/timecards/admin/:id/approve",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      const adminId = req.user?.id;
      if (!adminId) return res.status(401).json({ error: "Unauthorized" });

      const timecardId = parseInt(req.params.id, 10);
      if (isNaN(timecardId)) return res.status(400).json({ error: "Invalid timecard ID" });

      const updated = await timecardStorage.approveTimecard(timecardId, adminId);
      res.json(updated);
    }),
  );
}
