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
}
