import { db } from "../../../db/index";
import {
  users,
  rolePermissions,
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

  // ---- Activity logs ----

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [result] = await db.insert(activityLogs).values(log).returning();
    return result;
  },
};
