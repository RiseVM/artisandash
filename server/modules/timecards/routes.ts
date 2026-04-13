import type { Express } from "express";
import { isAuthenticated, isAdmin } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/errorHandler";
import { timecardStorage } from "./storage";

export function registerTimecardRoutes(app: Express) {
  // ── IDENTITY VERIFICATION (shared computers) ─

  // POST verify email + password before accessing timecards (shared computers)
  app.post(
    "/api/timecards/verify-identity",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const { authenticateUser } = await import("../auth/service");
      const user = await authenticateUser(email, password);

      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Switch the session to the verified user (shared computer support)
      req.session.userId = user.id;
      req.session.userEmail = user.email;
      req.session.userRole = user.role;

      res.json({ verified: true, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role } });
    }),
  );

  // ── CLOCK IN/OUT ──────────────────────────

  // GET current clock status for the authenticated user
  app.get(
    "/api/timecards/clock/status",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const openPunch = await timecardStorage.getOpenPunch(userId);
      const todayPunches = await timecardStorage.getTodayPunches(userId);
      res.json({ clockedIn: !!openPunch, openPunch, todayPunches });
    }),
  );

  // POST clock in
  app.post(
    "/api/timecards/clock/in",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      try {
        const punch = await timecardStorage.clockIn(userId);
        const todayPunches = await timecardStorage.getTodayPunches(userId);
        res.json({ punch, todayPunches });
      } catch (err: any) {
        return res.status(400).json({ error: err.message });
      }
    }),
  );

  // POST clock out
  app.post(
    "/api/timecards/clock/out",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      try {
        const { notes } = req.body || {};
        const punch = await timecardStorage.clockOut(userId, notes);
        const todayPunches = await timecardStorage.getTodayPunches(userId);
        res.json({ punch, todayPunches });
      } catch (err: any) {
        return res.status(400).json({ error: err.message });
      }
    }),
  );

  // GET punches for a specific timecard (used by admin and employee views)
  app.get(
    "/api/timecards/:timecardId/punches",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const timecardId = parseInt(req.params.timecardId, 10);
      if (isNaN(timecardId)) return res.status(400).json({ error: "Invalid timecard ID" });

      const punches = await timecardStorage.getPunchesByTimecard(timecardId);
      res.json(punches);
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

  // PATCH own entry (notes only — employees cannot edit times, only admins can)
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

  // GET own mileage settings
  app.get(
    "/api/timecards/my/mileage-settings",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const settings = await timecardStorage.getEmployeeWithMileageSettings(userId);
      res.json(settings || { mileageEnabled: "no", mileageRate: null });
    }),
  );

  // (Submit and recipient selection routes removed — employees auto-save, no submit flow)

  // ── EMPLOYEE MILEAGE ──────────────────────

  // GET mileage entries for own timecard
  app.get(
    "/api/timecards/:id/mileage",
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

      const mileage = await timecardStorage.getMileageForTimecard(timecardId);
      res.json(mileage);
    }),
  );

  // POST upsert mileage entry for own timecard
  app.post(
    "/api/timecards/:id/mileage",
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

      const { entryDate, miles, purpose } = req.body;
      if (!entryDate || miles === undefined) {
        return res.status(400).json({ error: "entryDate and miles are required" });
      }

      // Replace all mileage with single weekly total (same as admin)
      const entry = await timecardStorage.replaceWeeklyMileage(
        timecardId,
        entryDate,
        String(miles),
        purpose || null,
      );
      // Recalc so card.totalMileage stays current
      await timecardStorage.recalcTimecardTotals(timecardId);
      res.json(entry);
    }),
  );

  // DELETE own mileage entry
  app.delete(
    "/api/timecards/mileage/:id",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const mileageId = parseInt(req.params.id, 10);
      if (isNaN(mileageId)) return res.status(400).json({ error: "Invalid mileage ID" });

      const entry = await timecardStorage.getMileageEntryById(mileageId);
      if (!entry) return res.status(404).json({ error: "Mileage entry not found" });

      // Verify ownership via timecard
      const card = await timecardStorage.getTimecardWithEntries(entry.timecardId);
      if (card.userId !== userId) {
        return res.status(403).json({ error: "Not your timecard" });
      }

      await timecardStorage.deleteMileageEntry(mileageId);
      res.json({ success: true });
    }),
  );

  // ── RECIPIENT CRUD ───────────────────────

  // GET all active recipients (any authenticated user)
  app.get(
    "/api/timecards/recipients",
    isAuthenticated,
    asyncHandler(async (_req: any, res) => {
      const recipients = await timecardStorage.getRecipients();
      res.json(recipients);
    }),
  );

  // GET all recipients including inactive (admin only, for management)
  app.get(
    "/api/timecards/admin/recipients",
    isAdmin,
    asyncHandler(async (_req: any, res) => {
      const recipients = await timecardStorage.getAllRecipients();
      res.json(recipients);
    }),
  );

  // POST create new recipient (admin only)
  app.post(
    "/api/timecards/recipients",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      const { name, email, title } = req.body;
      if (!name || !email) return res.status(400).json({ error: "Name and email are required" });
      const recipient = await timecardStorage.createRecipient(name, email, title);
      res.json(recipient);
    }),
  );

  // PATCH update recipient (admin only)
  app.patch(
    "/api/timecards/recipients/:id",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      const { name, email, title } = req.body;
      const updated = await timecardStorage.updateRecipient(id, { name, email, title });
      res.json(updated);
    }),
  );

  // DELETE deactivate recipient (admin only)
  app.delete(
    "/api/timecards/recipients/:id",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      await timecardStorage.deactivateRecipient(id);
      res.json({ success: true });
    }),
  );

  // ── ADMIN ROUTES ──────────────────────────

  // GET or create a timecard for any employee+week (admin)
  app.get(
    "/api/timecards/admin/user/:userId/:weekStartDate",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      const adminId = req.user?.id;
      if (!adminId) return res.status(401).json({ error: "Unauthorized" });

      const { userId, weekStartDate } = req.params;
      if (!userId || !weekStartDate || !/^\d{4}-\d{2}-\d{2}$/.test(weekStartDate)) {
        return res.status(400).json({ error: "Invalid userId or weekStartDate" });
      }

      const card = await timecardStorage.adminGetOrCreateTimecard(userId, weekStartDate, adminId);
      const auditLog = await timecardStorage.getTimecardAuditLog(card.id);
      res.json({ ...card, auditLog });
    }),
  );

  // GET all timecards with user info (filterable)
  app.get(
    "/api/timecards/admin/all",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      const { weekStartDate, userId, status } = req.query;
      const cards = await timecardStorage.getAllTimecardsWithEntries({
        weekStartDate: weekStartDate as string | undefined,
        userId: userId as string | undefined,
        status: status as string | undefined,
      });
      res.json(cards);
    }),
  );

  // GET count of employee notes for a week (for sidebar badge)
  app.get(
    "/api/timecards/admin/notes-count",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      const { weekStartDate } = req.query;
      if (!weekStartDate) return res.json({ count: 0 });
      const count = await timecardStorage.getEmployeeNotesCount(weekStartDate as string);
      res.json({ count });
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

  // PATCH admin edit any entry (regardless of status) — accepts clockIn/clockOut or hours
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

      const { clockIn, clockOut, hours, entryType, ptoHours, holidayHours, notes, mileage } = req.body;

      const finalEntryType = entryType !== undefined ? entryType : (found.entry.entryType || "work");
      let finalClockIn = clockIn !== undefined ? clockIn : (found.entry.clockIn || null);
      let finalClockOut = clockOut !== undefined ? clockOut : (found.entry.clockOut || null);

      // If admin passes raw hours but no clock times, keep existing clock times
      if (hours !== undefined && clockIn === undefined && clockOut === undefined) {
        finalClockIn = found.entry.clockIn || null;
        finalClockOut = found.entry.clockOut || null;
      }

      const updated = await timecardStorage.adminEditTimecardEntry(
        entryId,
        finalClockIn,
        finalClockOut,
        finalEntryType,
        ptoHours !== undefined ? ptoHours : parseFloat(found.entry.ptoHours || "0"),
        holidayHours !== undefined ? holidayHours : parseFloat(found.entry.holidayHours || "0"),
        notes !== undefined ? notes : found.entry.notes,
        adminId,
        mileage !== undefined ? String(mileage) : undefined,
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

  // POST unapprove / revert timecard to draft (admin)
  app.post(
    "/api/timecards/admin/:id/unapprove",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      const adminId = req.user?.id;
      if (!adminId) return res.status(401).json({ error: "Unauthorized" });

      const timecardId = parseInt(req.params.id, 10);
      if (isNaN(timecardId)) return res.status(400).json({ error: "Invalid timecard ID" });

      const updated = await timecardStorage.unapproveTimecard(timecardId, adminId);
      res.json(updated);
    }),
  );

  // ── ADMIN MILEAGE ──────────────────────────

  // GET mileage for any timecard
  app.get(
    "/api/timecards/admin/:id/mileage",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      const timecardId = parseInt(req.params.id, 10);
      if (isNaN(timecardId)) return res.status(400).json({ error: "Invalid timecard ID" });
      const mileage = await timecardStorage.getMileageForTimecard(timecardId);
      res.json(mileage);
    }),
  );

  // POST upsert mileage for any timecard
  app.post(
    "/api/timecards/admin/:id/mileage",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      const timecardId = parseInt(req.params.id, 10);
      if (isNaN(timecardId)) return res.status(400).json({ error: "Invalid timecard ID" });

      const { entryDate, miles, purpose } = req.body;
      if (!entryDate || miles === undefined) {
        return res.status(400).json({ error: "entryDate and miles are required" });
      }

      // Replace all mileage entries with single weekly total (prevents accumulation bug)
      const entry = await timecardStorage.replaceWeeklyMileage(timecardId, entryDate, String(miles), purpose || null);
      // Recalc so card.totalMileage is updated for the grid
      await timecardStorage.recalcTimecardTotals(timecardId);
      res.json(entry);
    }),
  );

  // DELETE any mileage entry
  app.delete(
    "/api/timecards/admin/mileage/:id",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      const mileageId = parseInt(req.params.id, 10);
      if (isNaN(mileageId)) return res.status(400).json({ error: "Invalid mileage ID" });
      await timecardStorage.deleteMileageEntry(mileageId);
      res.json({ success: true });
    }),
  );

  // ── EMPLOYEE MANAGEMENT ───────────────────

  // POST create a timecard-only employee
  app.post(
    "/api/timecards/admin/employees",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      const { firstName, lastName, email, password, mileageEnabled, mileageRate } = req.body;
      if (!email || !password || !firstName) {
        return res.status(400).json({ error: "First name, email, and password are required" });
      }

      const { hashPassword } = await import("../auth/service");
      const { storage } = await import("../auth/storage");

      // Check if email already exists
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: "An account with this email already exists" });
      }

      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({
        email,
        passwordHash,
        firstName,
        lastName: lastName || null,
        role: "timecard_only",
        isActive: "yes",
        mileageEnabled: mileageEnabled || "no",
        mileageRate: mileageRate || null,
      });

      res.json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, mileageEnabled: user.mileageEnabled, mileageRate: user.mileageRate });
    }),
  );

  // PATCH update employee mileage settings
  app.patch(
    "/api/timecards/admin/employees/:userId/mileage",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      const { userId } = req.params;
      const { mileageEnabled, mileageRate } = req.body;
      await timecardStorage.updateEmployeeMileageSettings(
        userId,
        mileageEnabled || "no",
        mileageRate !== undefined ? String(mileageRate) : null,
      );
      res.json({ success: true });
    }),
  );

  // GET all employees with mileage settings (for admin management)
  app.get(
    "/api/timecards/admin/employees",
    isAdmin,
    asyncHandler(async (_req: any, res) => {
      const { db: dbInstance } = await import("../../../db/index");
      const { users: usersTable } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const allUsers = await dbInstance
        .select({
          id: usersTable.id,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
          email: usersTable.email,
          role: usersTable.role,
          isActive: usersTable.isActive,
          mileageEnabled: usersTable.mileageEnabled,
          mileageRate: usersTable.mileageRate,
        })
        .from(usersTable)
        .where(eq(usersTable.isActive, "yes"))
        .orderBy(usersTable.lastName);
      res.json(allUsers);
    }),
  );

  // ── PAYROLL CONTACTS ──────────────────────

  // GET all payroll contacts
  app.get(
    "/api/timecards/admin/payroll-contacts",
    isAdmin,
    asyncHandler(async (_req: any, res) => {
      const contacts = await timecardStorage.getPayrollContacts();
      res.json(contacts);
    }),
  );

  // POST create payroll contact
  app.post(
    "/api/timecards/admin/payroll-contacts",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      const { name, email } = req.body;
      if (!name || !email) return res.status(400).json({ error: "Name and email required" });
      const contact = await timecardStorage.createPayrollContact({ name, email });
      res.json(contact);
    }),
  );

  // DELETE payroll contact
  app.delete(
    "/api/timecards/admin/payroll-contacts/:id",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      await timecardStorage.deletePayrollContact(id);
      res.json({ success: true });
    }),
  );

  // ── ADMIN: ALL EMPLOYEES CLOCK STATUS ─────

  // GET all employees' current clock status
  app.get(
    "/api/timecards/admin/clock-status",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      const statuses = await timecardStorage.getAllEmployeesClockStatus();
      res.json(statuses);
    }),
  );

  // ── ADMIN: PUNCH MANAGEMENT ──────────────

  // PATCH edit a punch (admin can change clock in/out times)
  app.patch(
    "/api/timecards/admin/punches/:punchId",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      const punchId = parseInt(req.params.punchId, 10);
      if (isNaN(punchId)) return res.status(400).json({ error: "Invalid punch ID" });

      const { clockIn, clockOut } = req.body;
      if (!clockIn) return res.status(400).json({ error: "clockIn is required" });

      const punch = await timecardStorage.adminEditPunch(
        punchId,
        new Date(clockIn),
        clockOut ? new Date(clockOut) : null,
        req.user.id,
      );
      res.json(punch);
    }),
  );

  // DELETE a punch (admin)
  app.delete(
    "/api/timecards/admin/punches/:punchId",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      const punchId = parseInt(req.params.punchId, 10);
      if (isNaN(punchId)) return res.status(400).json({ error: "Invalid punch ID" });

      await timecardStorage.adminDeletePunch(punchId, req.user.id);
      res.json({ success: true });
    }),
  );

  // POST add a manual punch (admin)
  app.post(
    "/api/timecards/admin/punches",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      const { userId, punchDate, clockIn, clockOut } = req.body;
      if (!userId || !punchDate || !clockIn) {
        return res.status(400).json({ error: "userId, punchDate, and clockIn are required" });
      }

      const punch = await timecardStorage.adminAddPunch(
        userId,
        punchDate,
        new Date(clockIn),
        clockOut ? new Date(clockOut) : null,
        req.user.id,
      );
      res.json(punch);
    }),
  );

  // ── PAYROLL EMAIL ─────────────────────────

  // POST send payroll email for approved timecards of a week
  app.post(
    "/api/timecards/admin/send-payroll",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      const { weekStartDate } = req.body;
      if (!weekStartDate) return res.status(400).json({ error: "weekStartDate required" });

      const recipients = await timecardStorage.getRecipients();
      if (recipients.length === 0) {
        return res.status(400).json({ error: "No active payroll recipients. Please add a recipient first." });
      }

      const cards = await timecardStorage.getApprovedTimecardsForWeek(weekStartDate);
      if (cards.length === 0) {
        return res.status(400).json({ error: "No approved timecards for this week" });
      }

      // Build email body
      const weekEnd = new Date(weekStartDate + "T12:00:00");
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekLabel = `${weekStartDate} to ${weekEnd.toISOString().split("T")[0]}`;

      let htmlBody = `<h2>Weekly Timecard Report</h2><p><strong>Week:</strong> ${weekLabel}</p>`;
      htmlBody += `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">`;
      htmlBody += `<tr style="background:#f0f0f0"><th>Employee</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th><th>Sun</th><th>Total Hrs</th><th>Total Miles</th><th>Mileage $</th></tr>`;

      for (const card of cards) {
        const name = [card.user.firstName, card.user.lastName].filter(Boolean).join(" ") || card.user.email;
        const rawRate = parseFloat((card.user as any).mileageRate || "0");
        const rate = rawRate > 0 ? rawRate : 0.67; // default IRS rate
        const totalMiles = parseFloat(card.totalMileage || "0");
        const mileageCost = (rate * totalMiles).toFixed(2);

        htmlBody += `<tr><td><strong>${name}</strong></td>`;
        for (const entry of card.entries) {
          htmlBody += `<td style="text-align:center">${parseFloat(entry.hours || "0").toFixed(1)}</td>`;
        }
        htmlBody += `<td style="text-align:center;font-weight:bold">${parseFloat(card.totalHours || "0").toFixed(1)}</td>`;
        htmlBody += `<td style="text-align:center">${totalMiles.toFixed(1)}</td>`;
        htmlBody += `<td style="text-align:center">$${mileageCost}</td>`;
        htmlBody += `</tr>`;
      }
      htmlBody += `</table>`;

      // Generate PDF
      const { generatePayrollPdf } = await import("./payroll-pdf");
      const pdfBuffer = await generatePayrollPdf(weekLabel, cards);

      // Send email via Resend (same service used by rest of app)
      try {
        const { getResendClient } = await import("../../services/emailService");
        const { client, fromEmail } = await getResendClient();

        const toList = recipients.map((r: any) => r.email);

        await client.emails.send({
          from: fromEmail,
          to: toList,
          subject: `Timecard Report — ${weekLabel}`,
          html: htmlBody,
          attachments: [{
            filename: `Timecards-${weekStartDate}.pdf`,
            content: pdfBuffer.toString("base64"),
          }],
        });

        res.json({ success: true, sentTo: toList });
      } catch (emailErr: any) {
        console.error("Failed to send payroll email:", emailErr);
        return res.status(500).json({ error: "Failed to send email. Check Resend API key.", details: emailErr.message });
      }
    }),
  );

  // POST one-time migration: recalc all entries to weekly OT model
  app.post(
    "/api/timecards/admin/recalc-weekly-ot",
    isAdmin,
    asyncHandler(async (_req: any, res) => {
      const result = await timecardStorage.recalcAllWeeklyOt();
      res.json(result);
    }),
  );
}
