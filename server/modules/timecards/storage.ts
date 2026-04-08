import { db } from "../../../db/index";
import {
  timecards,
  timecardEntries,
  timecardAuditLog,
  timecardPunches,
  payrollContacts,
  users,
} from "@shared/schema";
import type {
  Timecard,
  TimecardEntry,
  TimecardPunch,
  PayrollContact,
  TimecardWithEntries,
  TimecardWithUser,
  TimecardAuditLogWithUser,
} from "@shared/schema";
import { eq, and, desc, isNull, sql } from "drizzle-orm";

/** Return Monday-based ISO date strings for a 7-day week */
function weekDates(mondayIso: string): string[] {
  const d = new Date(mondayIso + "T00:00:00");
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    return day.toISOString().split("T")[0];
  });
}

export const timecardStorage = {
  // ── LOOKUP ────────────────────────────────

  async getTimecardByUserAndWeek(
    userId: string,
    weekStartDate: string,
  ): Promise<Timecard | undefined> {
    const [row] = await db
      .select()
      .from(timecards)
      .where(
        and(
          eq(timecards.userId, userId),
          eq(timecards.weekStartDate, weekStartDate),
        ),
      );
    return row;
  },

  // ── UPSERT ────────────────────────────────

  async getOrCreateTimecard(
    userId: string,
    weekStartDate: string,
  ): Promise<TimecardWithEntries> {
    const existing = await this.getTimecardByUserAndWeek(userId, weekStartDate);

    if (existing) {
      return this.getTimecardWithEntries(existing.id);
    }

    // Create new draft timecard
    const [card] = await db
      .insert(timecards)
      .values({ userId, weekStartDate, status: "draft" })
      .returning();

    // Create 7 blank entries (Mon–Sun)
    const dates = weekDates(weekStartDate);
    const entryRows = dates.map((d) => ({
      timecardId: card.id,
      entryDate: d,
      hours: "0" as const,
    }));

    await db.insert(timecardEntries).values(entryRows);

    // Write audit log: created
    await db.insert(timecardAuditLog).values({
      timecardId: card.id,
      changedById: userId,
      action: "created",
      description: `Timecard created for week of ${weekStartDate}`,
    });

    return this.getTimecardWithEntries(card.id);
  },

  // ── READ WITH ENTRIES ─────────────────────

  async getTimecardWithEntries(
    timecardId: number,
  ): Promise<TimecardWithEntries> {
    const [card] = await db
      .select()
      .from(timecards)
      .where(eq(timecards.id, timecardId));

    if (!card) throw new Error("Timecard not found");

    const entries = await db
      .select()
      .from(timecardEntries)
      .where(eq(timecardEntries.timecardId, timecardId))
      .orderBy(timecardEntries.entryDate);

    return { ...card, entries };
  },

  // ── ADMIN: ALL TIMECARDS ──────────────────

  async getAllTimecardsWithUsers(filters?: {
    weekStartDate?: string;
    userId?: string;
    status?: string;
  }): Promise<TimecardWithUser[]> {
    const rows = await db
      .select({
        card: timecards,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(timecards)
      .innerJoin(users, eq(timecards.userId, users.id))
      .orderBy(desc(timecards.weekStartDate), users.lastName);

    return rows
      .filter((r) => {
        if (filters?.weekStartDate && r.card.weekStartDate !== filters.weekStartDate) return false;
        if (filters?.userId && r.card.userId !== filters.userId) return false;
        if (filters?.status && r.card.status !== filters.status) return false;
        return true;
      })
      .map((r) => ({ ...r.card, user: r.user }));
  },

  // ── LIST OWN TIMECARDS ────────────────────

  async getMyTimecards(userId: string): Promise<Timecard[]> {
    return db
      .select()
      .from(timecards)
      .where(eq(timecards.userId, userId))
      .orderBy(desc(timecards.weekStartDate));
  },

  // ── UPDATE ENTRY ──────────────────────────

  async updateTimecardEntry(
    entryId: number,
    hours: string,
    notes: string | null,
    changedById: string,
    mileage?: string,
  ): Promise<TimecardEntry> {
    // Fetch existing entry
    const [existing] = await db
      .select()
      .from(timecardEntries)
      .where(eq(timecardEntries.id, entryId));

    if (!existing) throw new Error("Entry not found");

    // Update the entry
    const setData: any = { hours, notes, updatedAt: new Date() };
    if (mileage !== undefined) setData.mileage = mileage;

    const [updated] = await db
      .update(timecardEntries)
      .set(setData)
      .where(eq(timecardEntries.id, entryId))
      .returning();

    // Recalculate totals on parent timecard
    await this.recalcTimecardTotals(existing.timecardId);

    // Write audit log
    const parts: string[] = [];
    if (hours !== existing.hours) parts.push(`hours: ${existing.hours} → ${hours}`);
    if (mileage !== undefined && mileage !== (existing.mileage || "0")) parts.push(`mileage: ${existing.mileage || "0"} → ${mileage} mi`);

    await db.insert(timecardAuditLog).values({
      timecardId: existing.timecardId,
      changedById,
      action: "updated_hours",
      entryDate: existing.entryDate,
      oldHours: existing.hours,
      newHours: hours,
      oldNotes: existing.notes,
      newNotes: notes,
      description: `${existing.entryDate} ${parts.join(", ") || "updated"}`,
    });

    return updated;
  },

  // ── ADMIN EDIT ENTRY ──────────────────────

  async adminEditTimecardEntry(
    entryId: number,
    hours: string,
    notes: string | null,
    adminId: string,
    mileage?: string,
  ): Promise<TimecardEntry> {
    const [existing] = await db
      .select()
      .from(timecardEntries)
      .where(eq(timecardEntries.id, entryId));

    if (!existing) throw new Error("Entry not found");

    const setData: any = { hours, notes, updatedAt: new Date() };
    if (mileage !== undefined) setData.mileage = mileage;

    const [updated] = await db
      .update(timecardEntries)
      .set(setData)
      .where(eq(timecardEntries.id, entryId))
      .returning();

    await this.recalcTimecardTotals(existing.timecardId);

    await db.insert(timecardAuditLog).values({
      timecardId: existing.timecardId,
      changedById: adminId,
      action: "admin_edit",
      entryDate: existing.entryDate,
      oldHours: existing.hours,
      newHours: hours,
      oldNotes: existing.notes,
      newNotes: notes,
      description: `Admin edit: ${existing.entryDate} hours: ${existing.hours} → ${hours}`,
    });

    return updated;
  },

  /** Recalculate totalHours and totalMileage on a timecard from its entries */
  async recalcTimecardTotals(timecardId: number): Promise<void> {
    const allEntries = await db
      .select()
      .from(timecardEntries)
      .where(eq(timecardEntries.timecardId, timecardId));

    const totalHours = allEntries.reduce((sum, e) => sum + parseFloat(e.hours || "0"), 0);
    const totalMileage = allEntries.reduce((sum, e) => sum + parseFloat(e.mileage || "0"), 0);

    await db
      .update(timecards)
      .set({ totalHours: totalHours.toFixed(2), totalMileage: totalMileage.toFixed(1), updatedAt: new Date() })
      .where(eq(timecards.id, timecardId));
  },

  // ── SUBMIT ────────────────────────────────

  async submitTimecard(
    timecardId: number,
    userId: string,
  ): Promise<Timecard> {
    const [updated] = await db
      .update(timecards)
      .set({
        status: "submitted",
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(timecards.id, timecardId))
      .returning();

    await db.insert(timecardAuditLog).values({
      timecardId,
      changedById: userId,
      action: "submitted",
      description: "Timecard submitted for approval",
    });

    return updated;
  },

  // ── APPROVE ───────────────────────────────

  async approveTimecard(
    timecardId: number,
    approvedById: string,
  ): Promise<Timecard> {
    const [updated] = await db
      .update(timecards)
      .set({
        status: "approved",
        approvedAt: new Date(),
        approvedById,
        updatedAt: new Date(),
      })
      .where(eq(timecards.id, timecardId))
      .returning();

    await db.insert(timecardAuditLog).values({
      timecardId,
      changedById: approvedById,
      action: "approved",
      description: "Timecard approved",
    });

    return updated;
  },

  // ── AUDIT LOG ─────────────────────────────

  async getTimecardAuditLog(
    timecardId: number,
  ): Promise<TimecardAuditLogWithUser[]> {
    const rows = await db
      .select({
        log: timecardAuditLog,
        changedBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(timecardAuditLog)
      .innerJoin(users, eq(timecardAuditLog.changedById, users.id))
      .where(eq(timecardAuditLog.timecardId, timecardId))
      .orderBy(desc(timecardAuditLog.changedAt));

    return rows.map((r) => ({ ...r.log, changedBy: r.changedBy }));
  },

  // ── GET ALL ACTIVE USERS (for admin dropdowns) ──

  async getAllActiveUsers(): Promise<{ id: string; firstName: string | null; lastName: string | null; email: string }[]> {
    return db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users)
      .where(eq(users.isActive, "yes"))
      .orderBy(users.lastName);
  },

  // ── FIND ENTRY WITH OWNERSHIP ─────────────

  async getEntryWithTimecard(
    entryId: number,
  ): Promise<{ entry: TimecardEntry; timecard: Timecard } | undefined> {
    const [entry] = await db
      .select()
      .from(timecardEntries)
      .where(eq(timecardEntries.id, entryId));

    if (!entry) return undefined;

    const [card] = await db
      .select()
      .from(timecards)
      .where(eq(timecards.id, entry.timecardId));

    if (!card) return undefined;

    return { entry, timecard: card };
  },

  // ── CLOCK IN/OUT ─────────────────────────

  /** Get any open punch (clocked in, not yet clocked out) for this user today */
  async getOpenPunch(userId: string): Promise<TimecardPunch | undefined> {
    const [row] = await db
      .select()
      .from(timecardPunches)
      .where(
        and(
          eq(timecardPunches.userId, userId),
          isNull(timecardPunches.clockOut),
        ),
      )
      .orderBy(desc(timecardPunches.clockIn))
      .limit(1);
    return row;
  },

  /** Clock in — creates a new punch for today, auto-creates timecard if needed */
  async clockIn(userId: string): Promise<TimecardPunch> {
    // Check for existing open punch
    const open = await this.getOpenPunch(userId);
    if (open) throw new Error("Already clocked in. Please clock out first.");

    const now = new Date();
    const todayIso = now.toISOString().split("T")[0];

    // Figure out the Monday of this week
    const dayObj = new Date(todayIso + "T12:00:00");
    const dayOfWeek = dayObj.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(dayObj);
    monday.setDate(dayObj.getDate() + mondayOffset);
    const mondayIso = monday.toISOString().split("T")[0];

    // Make sure a timecard exists for this week
    const card = await this.getOrCreateTimecard(userId, mondayIso);

    const [punch] = await db
      .insert(timecardPunches)
      .values({
        timecardId: card.id,
        userId,
        punchDate: todayIso,
        clockIn: now,
      })
      .returning();

    // Audit log
    await db.insert(timecardAuditLog).values({
      timecardId: card.id,
      changedById: userId,
      action: "clock_in",
      entryDate: todayIso,
      description: `Clocked in at ${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`,
    });

    return punch;
  },

  /** Clock out — closes the open punch, calculates hours, updates timecard entry */
  async clockOut(userId: string, notes?: string): Promise<TimecardPunch> {
    const open = await this.getOpenPunch(userId);
    if (!open) throw new Error("Not currently clocked in.");

    const now = new Date();
    const diffMs = now.getTime() - new Date(open.clockIn).getTime();
    const hours = (diffMs / (1000 * 60 * 60)).toFixed(2);

    const [punch] = await db
      .update(timecardPunches)
      .set({
        clockOut: now,
        hours,
        notes: notes || null,
        updatedAt: now,
      })
      .where(eq(timecardPunches.id, open.id))
      .returning();

    // Recalculate the day's total from all punches and update the timecard entry
    await this.recalcDayFromPunches(open.timecardId, open.punchDate, userId);

    // Audit log
    await db.insert(timecardAuditLog).values({
      timecardId: open.timecardId,
      changedById: userId,
      action: "clock_out",
      entryDate: open.punchDate,
      description: `Clocked out at ${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} (${hours} hrs)`,
    });

    return punch;
  },

  /** Recalculate a day's total hours from all completed punches and update the timecard entry */
  async recalcDayFromPunches(timecardId: number, punchDate: string, userId: string): Promise<void> {
    // Sum all completed punches for this day
    const dayPunches = await db
      .select()
      .from(timecardPunches)
      .where(
        and(
          eq(timecardPunches.timecardId, timecardId),
          eq(timecardPunches.punchDate, punchDate),
        ),
      );

    const totalDayHours = dayPunches.reduce((sum, p) => {
      return sum + parseFloat(p.hours || "0");
    }, 0);

    // Find the matching timecard entry for this day and update
    const [entry] = await db
      .select()
      .from(timecardEntries)
      .where(
        and(
          eq(timecardEntries.timecardId, timecardId),
          eq(timecardEntries.entryDate, punchDate),
        ),
      );

    if (entry) {
      await db
        .update(timecardEntries)
        .set({ hours: totalDayHours.toFixed(2), updatedAt: new Date() })
        .where(eq(timecardEntries.id, entry.id));
    }

    // Recalculate totals on parent timecard
    await this.recalcTimecardTotals(timecardId);
  },

  /** Get all punches for a specific timecard */
  async getPunchesByTimecard(timecardId: number): Promise<TimecardPunch[]> {
    return db
      .select()
      .from(timecardPunches)
      .where(eq(timecardPunches.timecardId, timecardId))
      .orderBy(timecardPunches.punchDate, timecardPunches.clockIn);
  },

  /** Get today's punches for a user */
  async getTodayPunches(userId: string): Promise<TimecardPunch[]> {
    const todayIso = new Date().toISOString().split("T")[0];
    return db
      .select()
      .from(timecardPunches)
      .where(
        and(
          eq(timecardPunches.userId, userId),
          eq(timecardPunches.punchDate, todayIso),
        ),
      )
      .orderBy(timecardPunches.clockIn);
  },

  // ── PAYROLL CONTACTS ─────────────────────

  async getPayrollContacts(): Promise<PayrollContact[]> {
    return db.select().from(payrollContacts).orderBy(payrollContacts.name);
  },

  async createPayrollContact(data: { name: string; email: string }): Promise<PayrollContact> {
    const [contact] = await db.insert(payrollContacts).values(data).returning();
    return contact;
  },

  async updatePayrollContact(id: number, data: Partial<{ name: string; email: string; isActive: string }>): Promise<PayrollContact> {
    const [updated] = await db.update(payrollContacts).set({ ...data, updatedAt: new Date() }).where(eq(payrollContacts.id, id)).returning();
    return updated;
  },

  async deletePayrollContact(id: number): Promise<void> {
    await db.delete(payrollContacts).where(eq(payrollContacts.id, id));
  },

  // ── APPROVED TIMECARDS FOR PAYROLL EMAIL ──

  async getApprovedTimecardsForWeek(weekStartDate: string): Promise<(TimecardWithUser & { entries: TimecardEntry[] })[]> {
    const rows = await db
      .select({
        card: timecards,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          mileageRate: users.mileageRate,
          mileageEnabled: users.mileageEnabled,
        },
      })
      .from(timecards)
      .innerJoin(users, eq(timecards.userId, users.id))
      .where(and(eq(timecards.weekStartDate, weekStartDate), eq(timecards.status, "approved")))
      .orderBy(users.lastName);

    const results: any[] = [];
    for (const r of rows) {
      const entries = await db
        .select()
        .from(timecardEntries)
        .where(eq(timecardEntries.timecardId, r.card.id))
        .orderBy(timecardEntries.entryDate);
      results.push({ ...r.card, user: r.user, entries });
    }
    return results;
  },

  // ── EMPLOYEE MILEAGE SETTINGS ─────────────

  async updateEmployeeMileageSettings(userId: string, mileageEnabled: string, mileageRate: string | null): Promise<void> {
    await db.update(users).set({
      mileageEnabled,
      mileageRate: mileageRate,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));
  },

  async getEmployeeWithMileageSettings(userId: string): Promise<{ mileageEnabled: string; mileageRate: string | null } | undefined> {
    const [user] = await db.select({
      mileageEnabled: users.mileageEnabled,
      mileageRate: users.mileageRate,
    }).from(users).where(eq(users.id, userId));
    return user;
  },
};
