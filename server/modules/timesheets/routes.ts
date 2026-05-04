import type { Express } from "express";
import { isAuthenticated, requirePermission } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/errorHandler";
import { timesheetStorage } from "./storage";
import { insertTimeClockSchema } from "@shared/schema";
import { z } from "zod";

export function registerTimesheetRoutes(app: Express) {
  // ── TIME CLOCK ────────────────────────────

  // GET current user's active clock entry
  app.get(
    "/api/timesheets/clock/active",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const entry = await timesheetStorage.getActiveClockEntry(userId);
      res.json(entry || null);
    })
  );

  // POST clock in
  app.post(
    "/api/timesheets/clock/in",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      // Check if already clocked in
      const existing = await timesheetStorage.getActiveClockEntry(userId);
      if (existing) {
        return res.status(400).json({ error: "Already clocked in" });
      }

      const entry = await timesheetStorage.clockIn({
        user_id: userId,
        clock_in: new Date(),
        project_id: req.body.project_id || null,
        notes: req.body.notes || null,
      });

      res.status(201).json(entry);
    })
  );

  // POST clock out
  app.post(
    "/api/timesheets/clock/out",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const active = await timesheetStorage.getActiveClockEntry(userId);
      if (!active) {
        return res.status(400).json({ error: "Not currently clocked in" });
      }

      const entry = await timesheetStorage.clockOut(
        active.id,
        new Date(),
        req.body.break_minutes,
        req.body.notes
      );

      res.json(entry);
    })
  );

  // GET current user's clock entries (with optional date range)
  app.get(
    "/api/timesheets/clock",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { start_date, end_date } = req.query as {
        start_date?: string;
        end_date?: string;
      };

      const entries = await timesheetStorage.getClockEntries(
        userId,
        start_date,
        end_date
      );
      res.json(entries);
    })
  );

  // PATCH update a clock entry
  app.patch(
    "/api/timesheets/clock/:id",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id))
        return res.status(400).json({ error: "Invalid clock entry ID" });

      const entry = await timesheetStorage.updateClockEntry(id, req.body);
      if (!entry)
        return res.status(404).json({ error: "Clock entry not found" });

      res.json(entry);
    })
  );

  // DELETE a clock entry
  app.delete(
    "/api/timesheets/clock/:id",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id))
        return res.status(400).json({ error: "Invalid clock entry ID" });

      const deleted = await timesheetStorage.deleteClockEntry(id);
      if (!deleted)
        return res.status(404).json({ error: "Clock entry not found" });

      res.json({ success: true });
    })
  );

  // ── PERSONAL TIMESHEET (time entries across projects) ────────────────

  // GET current user's time entries across all projects
  app.get(
    "/api/timesheets/entries",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { start_date, end_date } = req.query as {
        start_date?: string;
        end_date?: string;
      };

      const entries = await timesheetStorage.getUserTimeEntries(
        userId,
        start_date,
        end_date
      );
      res.json(entries);
    })
  );

  // ── ADMIN TIMESHEET VIEWS ────────────────

  // GET all users' clock entries (admin)
  app.get(
    "/api/admin/timesheets/clock",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const { start_date, end_date } = req.query as {
        start_date?: string;
        end_date?: string;
      };

      const entries = await timesheetStorage.getAllClockEntries(
        start_date,
        end_date
      );
      res.json(entries);
    })
  );

  // GET all time entries (admin)
  app.get(
    "/api/admin/timesheets/entries",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const { start_date, end_date } = req.query as {
        start_date?: string;
        end_date?: string;
      };

      const entries = await timesheetStorage.getAllTimeEntries(
        start_date,
        end_date
      );
      res.json(entries);
    })
  );

  // PATCH adjust a clock entry as an admin — including ACTIVE entries
  // (clock_out IS NULL). The original PATCH /api/timesheets/clock/:id is
  // self-serve and unhardened; this route is admin-gated, validates the
  // payload, and writes an audit-log row so payroll can see who changed
  // what and when.
  app.patch(
    "/api/admin/timesheets/clock/:id",
    isAuthenticated,
    requirePermission("manage_projects"),
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid clock entry ID" });

      const existing = await timesheetStorage.getClockEntryById(id);
      if (!existing) return res.status(404).json({ error: "Clock entry not found" });

      const { clock_in, clock_out, reason } = req.body || {};

      // Build the patch with only fields that were explicitly provided
      const patch: Partial<{ clock_in: Date; clock_out: Date | null }> = {};

      let newClockIn: Date | null = null;
      if (clock_in !== undefined) {
        const parsed = new Date(clock_in);
        if (isNaN(parsed.getTime())) {
          return res.status(400).json({ error: "clock_in is not a valid timestamp" });
        }
        if (parsed.getTime() > Date.now() + 60_000 /* 1 min slack for clock skew */) {
          return res.status(400).json({ error: "clock_in cannot be in the future" });
        }
        newClockIn = parsed;
        patch.clock_in = parsed;
      }

      // If we're not changing clock_out but the row already has one, validate
      // the new clock_in against it.
      if (clock_out !== undefined) {
        if (clock_out === null) {
          patch.clock_out = null;
        } else {
          const parsed = new Date(clock_out);
          if (isNaN(parsed.getTime())) {
            return res.status(400).json({ error: "clock_out is not a valid timestamp" });
          }
          patch.clock_out = parsed;
        }
      }

      const effectiveClockIn = newClockIn ?? existing.clock_in;
      const effectiveClockOut =
        patch.clock_out !== undefined ? patch.clock_out : existing.clock_out;
      if (
        effectiveClockOut &&
        effectiveClockIn &&
        new Date(effectiveClockIn).getTime() >= new Date(effectiveClockOut).getTime()
      ) {
        return res
          .status(400)
          .json({ error: "clock_in must be before clock_out" });
      }

      if (Object.keys(patch).length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      const updated = await timesheetStorage.updateClockEntry(id, patch);
      if (!updated) return res.status(404).json({ error: "Clock entry not found" });

      // Audit log — uses the general activityLogs table (timesheets has no
      // dedicated audit table). Action `clock_entry_adjusted` is new but the
      // schema accepts arbitrary text.
      try {
        const { storage: adminStorage } = await import("../admin/storage");
        const reasonText = typeof reason === "string" ? reason.trim() : "";
        const fields: string[] = [];
        if (newClockIn) {
          fields.push(
            `clock_in: ${existing.clock_in.toISOString()} -> ${newClockIn.toISOString()}`,
          );
        }
        if (patch.clock_out !== undefined) {
          const oldOut = existing.clock_out ? existing.clock_out.toISOString() : "null";
          const newOut = patch.clock_out ? patch.clock_out.toISOString() : "null";
          fields.push(`clock_out: ${oldOut} -> ${newOut}`);
        }
        const wasActive = existing.clock_out === null;
        const detailParts = [
          `entry=${id}`,
          `employee=${existing.user_id}`,
          wasActive ? "was_active=yes" : "was_active=no",
          fields.join("; "),
        ];
        if (reasonText) detailParts.push(`reason=${reasonText}`);

        await adminStorage.createActivityLog({
          userId: req.user!.id,
          userEmail: req.user!.email,
          action: "clock_entry_adjusted",
          entityType: "time_clock",
          entityId: String(id),
          details: detailParts.join(" | "),
          ipAddress: req.ip,
        });
      } catch (err: any) {
        console.error("[clock_entry_adjusted] audit log error:", err?.message);
        // Don't fail the request just because audit logging hiccupped
      }

      res.json(updated);
    })
  );
}
