import { db } from "../../../db/index";
import {
  users,
  rolePermissions,
  userPermissions,
  activityLogs,
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import type {
  User,
  InsertUser,
  UpsertUser,
  InsertActivityLog,
  ActivityLog,
} from "@shared/schema";

/**
 * Auth storage — user lookups, basic user mutations, permission checks,
 * and activity logging.
 */
export const storage = {
  // ---- User lookups ----

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  },

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  },

  // ---- User mutations (needed by auth service for seeding) ----

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

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  },

  // ---- Permission checks ----

  /**
   * Resolve whether a user has a given permission. Precedence:
   *   1. admin role → always true
   *   2. per-user override (user_permissions) → use that value
   *   3. role default (role_permissions) → fall back
   * Pass the full `User` to avoid re-loading it on the hot auth path.
   */
  async hasPermission(user: Pick<User, "id" | "role">, permission: string): Promise<boolean> {
    if (user.role === "admin") return true;

    // 1. Per-user override
    const [override] = await db
      .select()
      .from(userPermissions)
      .where(
        and(
          eq(userPermissions.userId, user.id),
          eq(userPermissions.permission, permission),
        ),
      );
    if (override) return override.enabled === "yes";

    // 2. Role default
    const [perm] = await db
      .select()
      .from(rolePermissions)
      .where(
        and(
          eq(rolePermissions.role, user.role),
          eq(rolePermissions.permission, permission),
        ),
      );

    return perm?.enabled === "yes";
  },

  /** List all per-user permission overrides for a single user (admin edit view) */
  async getUserPermissionOverrides(userId: string) {
    return db.select().from(userPermissions).where(eq(userPermissions.userId, userId));
  },

  /**
   * Set or clear a per-user permission override.
   * - `enabled: true|false` → upsert the override
   * - `enabled: null`       → delete the override (user falls back to role default)
   */
  async setUserPermission(userId: string, permission: string, enabled: boolean | null) {
    if (enabled === null) {
      await db
        .delete(userPermissions)
        .where(
          and(
            eq(userPermissions.userId, userId),
            eq(userPermissions.permission, permission),
          ),
        );
      return;
    }
    const enabledStr = enabled ? "yes" : "no";
    // Upsert
    await db
      .insert(userPermissions)
      .values({ userId, permission, enabled: enabledStr })
      .onConflictDoUpdate({
        target: [userPermissions.userId, userPermissions.permission],
        set: { enabled: enabledStr },
      });
  },

  /** Resolve a user's effective permissions as { [permission]: boolean } — admin gets all true */
  async getEffectivePermissions(user: Pick<User, "id" | "role">): Promise<Record<string, boolean>> {
    const { AVAILABLE_PERMISSIONS } = await import("@shared/schema");
    const result: Record<string, boolean> = {};
    for (const p of AVAILABLE_PERMISSIONS) {
      result[p.key] = await this.hasPermission(user, p.key);
    }
    return result;
  },

  // ---- Activity logs ----

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [result] = await db.insert(activityLogs).values(log).returning();
    return result;
  },
};
