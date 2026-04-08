import { db } from "../../../db/index";
import {
  timecards,
  timecardEntries,
  timecardAuditLog,
  users,
} from "@shared/schema";
import type {
  Timecard,
  TimecardEntry,
  TimecardWithEntries,
  TimecardWithUser,
  TimecardAuditLogWithUser,
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

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
  ): Promise<TimecardEntry> {
    // Fetch existing entry
    const [existing] = await db
      .select()
      .from(timecardEntries)
      .where(eq(timecardEntries.id, entryId));

    if (!existing) throw new Error("Entry not found");

    // Update the entry
    const [updated] = await db
      .update(timecardEntries)
      .set({ hours, notes, updatedAt: new Date() })
      .where(eq(timecardEntries.id, entryId))
      .returning();

    // Recalculate totalHours on parent timecard
    const allEntries = await db
      .select()
      .from(timecardEntries)
      .where(eq(timecardEntries.timecardId, existing.timecardId));

    const total = allEntries.reduce(
      (sum, e) => sum + parseFloat(e.hours || "0"),
      0,
    );

    await db
      .update(timecards)
      .set({ totalHours: total.toFixed(2), updatedAt: new Date() })
      .where(eq(timecards.id, existing.timecardId));

    // Write audit log
    await db.insert(timecardAuditLog).values({
      timecardId: existing.timecardId,
      changedById,
      action: "updated_hours",
      entryDate: existing.entryDate,
      oldHours: existing.hours,
      newHours: hours,
      oldNotes: existing.notes,
      newNotes: notes,
      description: `${existing.entryDate} hours: ${existing.hours} → ${hours}`,
    });

    return updated;
  },

  // ── ADMIN EDIT ENTRY ──────────────────────

  async adminEditTimecardEntry(
    entryId: number,
    hours: string,
    notes: string | null,
    adminId: string,
  ): Promise<TimecardEntry> {
    const [existing] = await db
      .select()
      .from(timecardEntries)
      .where(eq(timecardEntries.id, entryId));

    if (!existing) throw new Error("Entry not found");

    const [updated] = await db
      .update(timecardEntries)
      .set({ hours, notes, updatedAt: new Date() })
      .where(eq(timecardEntries.id, entryId))
      .returning();

    // Recalculate totalHours
    const allEntries = await db
      .select()
      .from(timecardEntries)
      .where(eq(timecardEntries.timecardId, existing.timecardId));

    const total = allEntries.reduce(
      (sum, e) => sum + parseFloat(e.hours || "0"),
      0,
    );

    await db
      .update(timecards)
      .set({ totalHours: total.toFixed(2), updatedAt: new Date() })
      .where(eq(timecards.id, existing.timecardId));

    // Audit log with admin_edit action
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
};
