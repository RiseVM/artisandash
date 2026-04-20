import { db, pool } from "../../../db/index";
import {
  users,
  activityLogs,
  rolePermissions,
  checkouts,
  signedAgreements,
  contracts,
  timecards,
  timecardAuditLog,
  timecardPunches,
} from "@shared/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import type {
  User,
  InsertUser,
  ActivityLog,
  InsertActivityLog,
  RolePermission,
} from "@shared/schema";

export const storage = {
  // ---- Users ----

  async getUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  },

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  },

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  },

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  },

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  },

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  },

  async preserveUserNameOnRecords(userId: string, userName: string): Promise<void> {
    await db
      .update(checkouts)
      .set({ created_by_user_name: userName, created_by_user_id: null })
      .where(eq(checkouts.created_by_user_id, userId));

    await db
      .update(signedAgreements)
      .set({ created_by_user_name: userName, created_by_user_id: null })
      .where(eq(signedAgreements.created_by_user_id, userId));

    await db
      .update(contracts)
      .set({ created_by_user_name: userName, created_by_user_id: null })
      .where(eq(contracts.created_by_user_id, userId));

    await db
      .update(activityLogs)
      .set({ userId: null })
      .where(eq(activityLogs.userId, userId));
  },

  /**
   * Clear out timecard-related foreign keys that would otherwise block a user
   * delete. Several timecard tables reference users without `ON DELETE` rules
   * (and several columns are NOT NULL so SET NULL isn't an option), so we:
   *
   *   1. Delete the user's own timecards — this cascades to their entries,
   *      punches, audit-log rows, and mileage rows via the timecardId FKs.
   *   2. Null out approved_by_id on OTHER users' timecards that this user
   *      approved (approvedById is nullable).
   *   3. Delete audit-log rows where this user was the actor on someone
   *      else's timecard (changedById is NOT NULL, so we can't SET NULL).
   *   4. Delete any leftover punches that reference this user directly.
   *
   * This keeps other employees' timecard history intact; we only lose the
   * audit breadcrumbs about who approved or edited.
   */
  async cleanupTimecardReferencesForUser(userId: string): Promise<void> {
    // 1. Delete the user's own timecards — cascades to entries/punches/audit/mileage
    await db.delete(timecards).where(eq(timecards.userId, userId));

    // 2. Null out approvedById on others' timecards
    await db
      .update(timecards)
      .set({ approvedById: null })
      .where(eq(timecards.approvedById, userId));

    // 3. Delete audit-log rows where the user was the actor on others' cards
    await db.delete(timecardAuditLog).where(eq(timecardAuditLog.changedById, userId));

    // 4. Belt-and-suspenders: any punches that still reference this user
    await db.delete(timecardPunches).where(eq(timecardPunches.userId, userId));

    // Drop any other user_id FK rows that don't CASCADE — using raw SQL because
    // the schema has a handful of tables without explicit onDelete rules and
    // we'd rather stay in sync via a broad NULL-update than import every one.
    // These all have nullable user_id columns:
    const nullableUserRefs: Array<{ table: string; col: string }> = [
      { table: "internal_messages", col: "sender_user_id" },
      { table: "project_notes", col: "user_id" },
      { table: "project_messages", col: "sender_user_id" },
      { table: "bug_reports", col: "reporter_user_id" },
      { table: "bug_reports", col: "resolved_by_user_id" },
      { table: "onboarding_tasks", col: "assigned_to" },
      { table: "onboarding_tasks", col: "completed_by" },
      { table: "project_requests", col: "responded_by_user_id" },
    ];
    for (const ref of nullableUserRefs) {
      try {
        await pool.query(
          `UPDATE "${ref.table}" SET "${ref.col}" = NULL WHERE "${ref.col}" = $1`,
          [userId],
        );
      } catch {
        // Table may not exist in some deployments; ignore — real FKs will still
        // fail loudly on the DELETE call and surface a usable error.
      }
    }
  },

  // ---- Activity Logs ----

  async getActivityLogs(filters?: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<ActivityLog[]> {
    const conditions: any[] = [];

    if (filters?.userId) {
      conditions.push(eq(activityLogs.userId, filters.userId));
    }
    if (filters?.startDate) {
      conditions.push(gte(activityLogs.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(activityLogs.createdAt, filters.endDate));
    }

    if (conditions.length > 0) {
      return db
        .select()
        .from(activityLogs)
        .where(and(...conditions))
        .orderBy(desc(activityLogs.createdAt));
    }

    return db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt));
  },

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [result] = await db.insert(activityLogs).values(log).returning();
    return result;
  },

  // ---- Role Permissions ----

  async getRolePermissions(): Promise<RolePermission[]> {
    return db.select().from(rolePermissions);
  },

  async getRolePermissionsByRole(role: string): Promise<RolePermission[]> {
    return db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.role, role));
  },

  async setRolePermission(
    role: string,
    permission: string,
    enabled: boolean,
  ): Promise<RolePermission> {
    const enabledStr = enabled ? "yes" : "no";

    // Upsert: try to find existing, then update or insert
    const existing = await db
      .select()
      .from(rolePermissions)
      .where(
        and(
          eq(rolePermissions.role, role),
          eq(rolePermissions.permission, permission),
        ),
      );

    if (existing.length > 0) {
      const [updated] = await db
        .update(rolePermissions)
        .set({ enabled: enabledStr })
        .where(
          and(
            eq(rolePermissions.role, role),
            eq(rolePermissions.permission, permission),
          ),
        )
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(rolePermissions)
      .values({ role, permission, enabled: enabledStr })
      .returning();
    return created;
  },

  async hasPermission(role: string, permission: string): Promise<boolean> {
    if (role === "admin") return true;

    const [perm] = await db
      .select()
      .from(rolePermissions)
      .where(
        and(
          eq(rolePermissions.role, role),
          eq(rolePermissions.permission, permission),
        ),
      );

    return perm?.enabled === "yes";
  },

  async initializeDefaultPermissions(): Promise<void> {
    const existing = await db.select().from(rolePermissions);

    // Build a set of existing role+permission combos for insert-if-not-exists logic
    const existingSet = new Set(existing.map((r) => `${r.role}:${r.permission}`));

    const allDefaults = [
      // Manager defaults
      { role: "manager", permission: "manage_customers", enabled: "yes" },
      { role: "manager", permission: "manage_inventory", enabled: "yes" },
      { role: "manager", permission: "create_checkouts", enabled: "yes" },
      { role: "manager", permission: "manage_checkouts", enabled: "yes" },
      { role: "manager", permission: "view_signed_docs", enabled: "yes" },
      { role: "manager", permission: "manage_contracts", enabled: "yes" },
      { role: "manager", permission: "manage_projects", enabled: "yes" },
      { role: "manager", permission: "manage_quotes", enabled: "yes" },
      { role: "manager", permission: "view_calendar", enabled: "yes" },
      { role: "manager", permission: "view_messages", enabled: "yes" },
      { role: "manager", permission: "view_team_resources", enabled: "yes" },
      { role: "manager", permission: "view_bug_reports", enabled: "yes" },
      { role: "manager", permission: "manage_users", enabled: "no" },
      // Staff defaults
      { role: "staff", permission: "manage_customers", enabled: "yes" },
      { role: "staff", permission: "manage_inventory", enabled: "yes" },
      { role: "staff", permission: "create_checkouts", enabled: "yes" },
      { role: "staff", permission: "manage_checkouts", enabled: "yes" },
      { role: "staff", permission: "view_signed_docs", enabled: "yes" },
      { role: "staff", permission: "manage_contracts", enabled: "yes" },
      { role: "staff", permission: "manage_projects", enabled: "yes" },
      { role: "staff", permission: "manage_quotes", enabled: "yes" },
      { role: "staff", permission: "view_calendar", enabled: "yes" },
      { role: "staff", permission: "view_messages", enabled: "yes" },
      { role: "staff", permission: "view_team_resources", enabled: "yes" },
      { role: "staff", permission: "view_bug_reports", enabled: "yes" },
      { role: "staff", permission: "manage_users", enabled: "no" },
    ];

    const toInsert = allDefaults.filter(
      (d) => !existingSet.has(`${d.role}:${d.permission}`),
    );

    if (toInsert.length > 0) {
      await db.insert(rolePermissions).values(toInsert);
    }
  },
};
