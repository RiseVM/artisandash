import type { Express } from "express";
import { isAuthenticated, requirePermission } from "../../middleware/auth";

// Use permission-based access so managers (not just admins) can manage timecards
const canManageTimecards = requirePermission("manage_users");
import { asyncHandler } from "../../middleware/errorHandler";
import { timecardStorage } from "./storage";

export function registerTimecardRoutes(app: Express) {
  // ── IDENTITY VERIFICATION (shared computers) ─

  // POST verify password before accessing timecards
  app.post(
    "/api/timecards/verify-identity",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      try {
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
      } catch (err: any) {
        console.error("[verify-identity] Error:", err?.message, err?.stack);
        return res.status(500).json({ error: "Identity verification failed", detail: err?.message });
      }
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

      // Employees can only update notes — time edits are admin-only
      const { notes } = req.body;
      const updated = await timecardStorage.updateTimecardEntry(
        entryId,
        found.entry.clockIn || null,
        found.entry.clockOut || null,
        found.entry.entryType || "work",
        parseFloat(found.entry.ptoHours || "0"),
        parseFloat(found.entry.holidayHours || "0"),
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
    canManageTimecards,
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
    canManageTimecards,
    asyncHandler(async (_req: any, res) => {
      const activeUsers = await timecardStorage.getAllActiveUsers();
      res.json(activeUsers);
    }),
  );

  // GET single timecard with entries + audit log (admin)
  app.get(
    "/api/timecards/admin/:id",
    canManageTimecards,
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
    canManageTimecards,
    asyncHandler(async (req: any, res) => {
      const adminId = req.user?.id;
      if (!adminId) return res.status(401).json({ error: "Unauthorized" });

      const entryId = parseInt(req.params.entryId, 10);
      if (isNaN(entryId)) return res.status(400).json({ error: "Invalid entry ID" });

      const found = await timecardStorage.getEntryWithTimecard(entryId);
      if (!found) return res.status(404).json({ error: "Entry not found" });

      const { clockIn, clockOut, entryType, ptoHours, holidayHours, notes, mileage } = req.body;
      const updated = await timecardStorage.adminEditTimecardEntry(
        entryId,
        clockIn !== undefined ? clockIn : (found.entry.clockIn || null),
        clockOut !== undefined ? clockOut : (found.entry.clockOut || null),
        entryType || found.entry.entryType || "work",
        parseFloat(ptoHours ?? found.entry.ptoHours ?? "0"),
        parseFloat(holidayHours ?? found.entry.holidayHours ?? "0"),
        notes !== undefined ? notes : found.entry.notes,
        adminId,
        mileage,
      );

      res.json(updated);
    }),
  );

  // POST approve timecard (admin)
  app.post(
    "/api/timecards/admin/:id/approve",
    canManageTimecards,
    asyncHandler(async (req: any, res) => {
      const adminId = req.user?.id;
      if (!adminId) return res.status(401).json({ error: "Unauthorized" });

      const timecardId = parseInt(req.params.id, 10);
      if (isNaN(timecardId)) return res.status(400).json({ error: "Invalid timecard ID" });

      const updated = await timecardStorage.approveTimecard(timecardId, adminId);
      res.json(updated);
    }),
  );

  // POST unapprove timecard (admin)
  app.post(
    "/api/timecards/admin/:id/unapprove",
    canManageTimecards,
    asyncHandler(async (req: any, res) => {
      const adminId = req.user?.id;
      if (!adminId) return res.status(401).json({ error: "Unauthorized" });

      const timecardId = parseInt(req.params.id, 10);
      if (isNaN(timecardId)) return res.status(400).json({ error: "Invalid timecard ID" });

      const updated = await timecardStorage.unapproveTimecard(timecardId, adminId);
      res.json(updated);
    }),
  );

  // GET employee notes count for sidebar badge (admin)
  app.get(
    "/api/timecards/admin/notes-count",
    canManageTimecards,
    asyncHandler(async (req: any, res) => {
      try {
        const { weekStartDate } = req.query;
        if (!weekStartDate) return res.json({ count: 0 });
        const count = await timecardStorage.getEmployeeNotesCount(weekStartDate as string);
        res.json({ count });
      } catch (err: any) {
        console.error("[notes-count] Error:", err?.message);
        res.json({ count: 0 });
      }
    }),
  );

  // GET all employees clock status (admin)
  app.get(
    "/api/timecards/admin/clock-status",
    canManageTimecards,
    asyncHandler(async (_req: any, res) => {
      const statuses = await timecardStorage.getAllEmployeesClockStatus();
      res.json(statuses);
    }),
  );

  // ── CLOCK IN/OUT ROUTES ─────────────────

  // GET clock status for current user
  app.get(
    "/api/timecards/clock/status",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const openPunch = await timecardStorage.getOpenPunch(userId);
      const todayPunches = await timecardStorage.getTodayPunches(userId);
      res.json({
        clockedIn: !!openPunch,
        openPunch: openPunch || null,
        todayPunches,
      });
    }),
  );

  // POST clock in
  app.post(
    "/api/timecards/clock/in",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const punch = await timecardStorage.clockIn(userId);
      res.json(punch);
    }),
  );

  // POST clock out
  app.post(
    "/api/timecards/clock/out",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { notes } = req.body || {};
      const punch = await timecardStorage.clockOut(userId, notes);
      res.json(punch);
    }),
  );

  // ── ADMIN PUNCH MANAGEMENT ──────────────

  // PATCH admin edit punch
  app.patch(
    "/api/timecards/admin/punches/:punchId",
    canManageTimecards,
    asyncHandler(async (req: any, res) => {
      const adminId = req.user?.id;
      if (!adminId) return res.status(401).json({ error: "Unauthorized" });

      const punchId = parseInt(req.params.punchId, 10);
      if (isNaN(punchId)) return res.status(400).json({ error: "Invalid punch ID" });

      const { clockIn, clockOut } = req.body;
      const updated = await timecardStorage.adminEditPunch(punchId, new Date(clockIn), clockOut ? new Date(clockOut) : null, adminId);
      res.json(updated);
    }),
  );

  // DELETE admin delete punch
  app.delete(
    "/api/timecards/admin/punches/:punchId",
    canManageTimecards,
    asyncHandler(async (req: any, res) => {
      const adminId = req.user?.id;
      if (!adminId) return res.status(401).json({ error: "Unauthorized" });

      const punchId = parseInt(req.params.punchId, 10);
      if (isNaN(punchId)) return res.status(400).json({ error: "Invalid punch ID" });

      await timecardStorage.adminDeletePunch(punchId, adminId);
      res.json({ success: true });
    }),
  );

  // POST admin add punch
  app.post(
    "/api/timecards/admin/punches",
    canManageTimecards,
    asyncHandler(async (req: any, res) => {
      const adminId = req.user?.id;
      if (!adminId) return res.status(401).json({ error: "Unauthorized" });

      const { userId, punchDate, clockIn, clockOut } = req.body;
      const punch = await timecardStorage.adminAddPunch(userId, punchDate, new Date(clockIn), clockOut ? new Date(clockOut) : null, adminId);
      res.json(punch);
    }),
  );

  // ── MILEAGE ROUTES ─────────────────────

  // GET mileage for a timecard
  app.get(
    "/api/timecards/:timecardId/mileage",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const timecardId = parseInt(req.params.timecardId, 10);
      if (isNaN(timecardId)) return res.status(400).json({ error: "Invalid timecard ID" });

      const entries = await timecardStorage.getMileageForTimecard(timecardId);
      const total = await timecardStorage.getTotalMileageForTimecard(timecardId);
      res.json({ entries, total });
    }),
  );

  // POST upsert mileage entry
  app.post(
    "/api/timecards/:timecardId/mileage",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const timecardId = parseInt(req.params.timecardId, 10);
      if (isNaN(timecardId)) return res.status(400).json({ error: "Invalid timecard ID" });

      const { entryDate, miles, purpose } = req.body;
      const entry = await timecardStorage.upsertMileageEntry(timecardId, entryDate, miles, purpose);
      res.json(entry);
    }),
  );

  // DELETE mileage entry
  app.delete(
    "/api/timecards/mileage/:id",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid mileage ID" });

      await timecardStorage.deleteMileageEntry(id);
      res.json({ success: true });
    }),
  );

  // GET user mileage settings
  app.get(
    "/api/timecards/admin/mileage-settings/:userId",
    canManageTimecards,
    asyncHandler(async (req: any, res) => {
      const settings = await timecardStorage.getEmployeeWithMileageSettings(req.params.userId);
      res.json(settings || { mileageEnabled: "no", mileageRate: null });
    }),
  );

  // PATCH update mileage settings
  app.patch(
    "/api/timecards/admin/mileage-settings/:userId",
    canManageTimecards,
    asyncHandler(async (req: any, res) => {
      const { mileageEnabled, mileageRate } = req.body;
      await timecardStorage.updateEmployeeMileageSettings(req.params.userId, mileageEnabled, mileageRate);
      res.json({ success: true });
    }),
  );

  // ── PAYROLL CONTACTS ────────────────────

  app.get(
    "/api/timecards/payroll-contacts",
    canManageTimecards,
    asyncHandler(async (_req: any, res) => {
      const contacts = await timecardStorage.getPayrollContacts();
      res.json(contacts);
    }),
  );

  app.post(
    "/api/timecards/payroll-contacts",
    canManageTimecards,
    asyncHandler(async (req: any, res) => {
      const { name, email } = req.body;
      if (!name?.trim() || !email?.trim()) {
        return res.status(400).json({ error: "Name and email are required" });
      }
      const contact = await timecardStorage.createPayrollContact({ name: name.trim(), email: email.trim() });
      res.json(contact);
    }),
  );

  app.patch(
    "/api/timecards/payroll-contacts/:id",
    canManageTimecards,
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      const updated = await timecardStorage.updatePayrollContact(id, req.body);
      res.json(updated);
    }),
  );

  app.delete(
    "/api/timecards/payroll-contacts/:id",
    canManageTimecards,
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      await timecardStorage.deletePayrollContact(id);
      res.json({ success: true });
    }),
  );

  // ── TIMECARD RECIPIENTS ─────────────────

  app.get(
    "/api/timecards/recipients",
    canManageTimecards,
    asyncHandler(async (_req: any, res) => {
      const recipients = await timecardStorage.getAllRecipients();
      res.json(recipients);
    }),
  );

  app.post(
    "/api/timecards/recipients",
    canManageTimecards,
    asyncHandler(async (req: any, res) => {
      const { name, email, title } = req.body;
      if (!name?.trim() || !email?.trim()) {
        return res.status(400).json({ error: "Name and email are required" });
      }
      const recipient = await timecardStorage.createRecipient(name.trim(), email.trim(), title?.trim());
      res.json(recipient);
    }),
  );

  app.patch(
    "/api/timecards/recipients/:id",
    canManageTimecards,
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      const updated = await timecardStorage.updateRecipient(id, req.body);
      res.json(updated);
    }),
  );

  app.delete(
    "/api/timecards/recipients/:id",
    canManageTimecards,
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      await timecardStorage.deactivateRecipient(id);
      res.json({ success: true });
    }),
  );

  // ── ONE-TIME BACKFILL: sync all punch data to timecard entries ──
  app.post(
    "/api/timecards/admin/backfill-punches",
    canManageTimecards,
    asyncHandler(async (_req: any, res) => {
      // Get all punches grouped by timecard + date
      const allPunches = await timecardStorage.getAllPunchesForBackfill();
      let updated = 0;
      for (const key of Object.keys(allPunches)) {
        const { timecardId, punchDate, userId } = allPunches[key];
        await timecardStorage.recalcDayFromPunches(timecardId, punchDate, userId);
        updated++;
      }
      res.json({ success: true, daysUpdated: updated });
    }),
  );

  // ── PAYROLL EMAIL ───────────────────────

  app.get(
    "/api/timecards/admin/approved-week",
    canManageTimecards,
    asyncHandler(async (req: any, res) => {
      const { weekStartDate } = req.query;
      if (!weekStartDate) return res.status(400).json({ error: "weekStartDate required" });
      const cards = await timecardStorage.getApprovedTimecardsForWeek(weekStartDate as string);
      res.json(cards);
    }),
  );
}
