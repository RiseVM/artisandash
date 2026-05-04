import { db } from "../../../db/index";
import { timeClock, timeEntries, users, projects, projectPhases } from "@shared/schema";
import type {
  TimeClock,
  InsertTimeClock,
  TimeClockWithDetails,
  TimeEntry,
  TimeEntryWithPhase,
} from "@shared/schema";
import { eq, desc, and, gte, lte, isNull, sql } from "drizzle-orm";

/**
 * Format the calendar date the given instant *falls on* in America/New_York,
 * as `YYYY-MM-DD`. We bucket clock entries this way so the day a row appears
 * under matches what the admin sees on screen — a 9pm EST Monday clock-in is
 * recorded as Monday, not as Tuesday UTC.
 *
 * Uses `en-CA` because that locale natively prints `YYYY-MM-DD`, sidestepping
 * the need to parse Intl parts.
 */
function toEstDateString(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

export const timesheetStorage = {
  // ── TIME CLOCK ────────────────────────────

  async getActiveClockEntry(userId: string): Promise<TimeClock | undefined> {
    const [entry] = await db
      .select()
      .from(timeClock)
      .where(and(eq(timeClock.user_id, userId), isNull(timeClock.clock_out)));
    return entry;
  },

  async clockIn(data: InsertTimeClock): Promise<TimeClock> {
    const [result] = await db.insert(timeClock).values(data).returning();
    return result;
  },

  async clockOut(
    id: number,
    clockOut: Date,
    breakMinutes?: number,
    notes?: string
  ): Promise<TimeClock | undefined> {
    const updates: Record<string, any> = {
      clock_out: clockOut,
      updated_at: new Date(),
    };
    if (breakMinutes !== undefined) updates.break_minutes = breakMinutes;
    if (notes !== undefined) updates.notes = notes;

    const [result] = await db
      .update(timeClock)
      .set(updates)
      .where(eq(timeClock.id, id))
      .returning();
    return result;
  },

  async getClockEntries(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<TimeClockWithDetails[]> {
    let query = db
      .select({
        clock: timeClock,
        project: {
          id: projects.id,
          name: projects.name,
        },
      })
      .from(timeClock)
      .leftJoin(projects, eq(timeClock.project_id, projects.id))
      .where(eq(timeClock.user_id, userId))
      .orderBy(desc(timeClock.clock_in));

    const results = await query;

    return results
      .filter((row) => {
        if (!startDate && !endDate) return true;
        const clockDate = toEstDateString(row.clock.clock_in);
        if (startDate && clockDate < startDate) return false;
        if (endDate && clockDate > endDate) return false;
        return true;
      })
      .map((row) => ({
        ...row.clock,
        project: row.project || null,
      }));
  },

  async getAllClockEntries(
    startDate?: string,
    endDate?: string
  ): Promise<(TimeClockWithDetails & { user?: { id: string; firstName: string | null; lastName: string | null; email: string } | null })[]> {
    const results = await db
      .select({
        clock: timeClock,
        project: {
          id: projects.id,
          name: projects.name,
        },
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(timeClock)
      .leftJoin(projects, eq(timeClock.project_id, projects.id))
      .leftJoin(users, eq(timeClock.user_id, users.id))
      .orderBy(desc(timeClock.clock_in));

    return results
      .filter((row) => {
        if (!startDate && !endDate) return true;
        const clockDate = toEstDateString(row.clock.clock_in);
        if (startDate && clockDate < startDate) return false;
        if (endDate && clockDate > endDate) return false;
        return true;
      })
      .map((row) => ({
        ...row.clock,
        project: row.project || null,
        user: row.user || null,
      }));
  },

  async getClockEntryById(id: number): Promise<TimeClock | undefined> {
    const [entry] = await db.select().from(timeClock).where(eq(timeClock.id, id));
    return entry;
  },

  async updateClockEntry(
    id: number,
    data: Partial<InsertTimeClock>
  ): Promise<TimeClock | undefined> {
    const [result] = await db
      .update(timeClock)
      .set({ ...data, updated_at: new Date() })
      .where(eq(timeClock.id, id))
      .returning();
    return result;
  },

  async deleteClockEntry(id: number): Promise<boolean> {
    const result = await db
      .delete(timeClock)
      .where(eq(timeClock.id, id))
      .returning();
    return result.length > 0;
  },

  // ── CROSS-PROJECT TIME ENTRIES (for timesheet views) ────────────────

  async getUserTimeEntries(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<(TimeEntryWithPhase & { project_name?: string })[]> {
    const results = await db
      .select({
        entry: timeEntries,
        phase: projectPhases,
        projectName: projects.name,
      })
      .from(timeEntries)
      .leftJoin(
        projectPhases,
        eq(timeEntries.linked_phase_id, projectPhases.id)
      )
      .leftJoin(projects, eq(timeEntries.project_id, projects.id))
      .where(eq(timeEntries.user_id, userId))
      .orderBy(desc(timeEntries.entry_date));

    return results
      .filter((row) => {
        if (!startDate && !endDate) return true;
        if (startDate && row.entry.entry_date < startDate) return false;
        if (endDate && row.entry.entry_date > endDate) return false;
        return true;
      })
      .map((row) => ({
        ...row.entry,
        phase: row.phase || null,
        project_name: row.projectName || undefined,
      }));
  },

  async getAllTimeEntries(
    startDate?: string,
    endDate?: string
  ): Promise<(TimeEntryWithPhase & { project_name?: string })[]> {
    const results = await db
      .select({
        entry: timeEntries,
        phase: projectPhases,
        projectName: projects.name,
      })
      .from(timeEntries)
      .leftJoin(
        projectPhases,
        eq(timeEntries.linked_phase_id, projectPhases.id)
      )
      .leftJoin(projects, eq(timeEntries.project_id, projects.id))
      .orderBy(desc(timeEntries.entry_date));

    return results
      .filter((row) => {
        if (!startDate && !endDate) return true;
        if (startDate && row.entry.entry_date < startDate) return false;
        if (endDate && row.entry.entry_date > endDate) return false;
        return true;
      })
      .map((row) => ({
        ...row.entry,
        phase: row.phase || null,
        project_name: row.projectName || undefined,
      }));
  },
};
