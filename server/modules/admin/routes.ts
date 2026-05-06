import type { Express } from "express";
import { asyncHandler, isAdmin, isAuthenticated } from "../../middleware";
import { hashPassword } from "../auth/service";
import { storage } from "./storage";
import { AVAILABLE_PERMISSIONS } from "@shared/schema";

const validRoles = ["manager", "staff"];
// Derive from AVAILABLE_PERMISSIONS so the server and client stay in sync —
// a new permission added to shared/schema.ts is automatically valid here.
const validPermissions: string[] = AVAILABLE_PERMISSIONS.map((p) => p.key);

export function registerAdminRoutes(app: Express) {
  // ---- User CRUD ----

  app.get(
    "/api/users",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      let allUsers = await storage.getUsers();

      // Non-admin users cannot see archived users
      if (req.user!.role !== "admin") {
        allUsers = allUsers.filter((u) => u.isActive === "yes");
      }

      res.json(
        allUsers.map((u) => ({
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          isActive: u.isActive,
          tracksHours: u.tracksHours,
          createdAt: u.createdAt,
        })),
      );
    }),
  );

  app.post(
    "/api/users",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      const { email, password, firstName, lastName, role, tracksHours } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Managers cannot create admin users
      if (role === "admin" && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Only admins can create admin users" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already exists" });
      }

      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({
        email,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        role: role || "staff",
        isActive: "yes",
        // Default new users to tracking hours; caller can override with "no".
        tracksHours: tracksHours === "no" ? "no" : "yes",
      });

      await storage.createActivityLog({
        userId: req.user!.id,
        userEmail: req.user!.email,
        action: "create_user",
        entityType: "user",
        entityId: user.id,
        details: `Created user: ${email}`,
        ipAddress: req.ip,
      });

      res.status(201).json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        tracksHours: user.tracksHours,
      });
    }),
  );

  app.patch(
    "/api/users/:id",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      const { id } = req.params;
      const { email, password, firstName, lastName, role, isActive, tracksHours } = req.body;

      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Managers cannot modify admin users or promote to admin
      if (req.user!.role !== "admin") {
        if (existingUser.role === "admin") {
          return res.status(403).json({ error: "Only admins can modify admin users" });
        }
        if (role === "admin") {
          return res.status(403).json({ error: "Only admins can promote users to admin" });
        }
      }

      const updates: any = {};
      if (email !== undefined) updates.email = email;
      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;
      if (role !== undefined) updates.role = role;
      if (isActive !== undefined) updates.isActive = isActive;
      if (tracksHours !== undefined) updates.tracksHours = tracksHours;
      if (password) {
        updates.passwordHash = await hashPassword(password);
      }

      const user = await storage.updateUser(id, updates);

      await storage.createActivityLog({
        userId: req.user!.id,
        userEmail: req.user!.email,
        action: "update_user",
        entityType: "user",
        entityId: id,
        details: `Updated user: ${existingUser.email}`,
        ipAddress: req.ip,
      });

      res.json({
        id: user!.id,
        email: user!.email,
        firstName: user!.firstName,
        lastName: user!.lastName,
        role: user!.role,
        isActive: user!.isActive,
        tracksHours: user!.tracksHours,
      });
    }),
  );

  // Archive user
  app.post(
    "/api/users/:id/archive",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      const { id } = req.params;

      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }

      if (existingUser.email === "ed@risevm.com") {
        return res.status(400).json({ error: "Cannot archive the primary admin account" });
      }

      if (existingUser.role === "admin" && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Only admins can archive admin users" });
      }

      await storage.updateUser(id, { isActive: "no" });

      await storage.createActivityLog({
        userId: req.user!.id,
        userEmail: req.user!.email,
        action: "archive_user",
        entityType: "user",
        entityId: id,
        details: `Archived user: ${existingUser.email}`,
        ipAddress: req.ip,
      });

      res.json({ success: true });
    }),
  );

  // Restore archived user (admin only)
  app.post(
    "/api/users/:id/restore",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      const { id } = req.params;

      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }

      await storage.updateUser(id, { isActive: "yes" });

      await storage.createActivityLog({
        userId: req.user!.id,
        userEmail: req.user!.email,
        action: "restore_user",
        entityType: "user",
        entityId: id,
        details: `Restored user: ${existingUser.email}`,
        ipAddress: req.ip,
      });

      res.json({ success: true });
    }),
  );

  // Permanently delete user (admin only)
  app.delete(
    "/api/users/:id",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      const { id } = req.params;

      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }

      if (existingUser.email === "ed@risevm.com") {
        return res.status(400).json({ error: "Cannot delete the primary admin account" });
      }

      const userName =
        `${existingUser.firstName || ""} ${existingUser.lastName || ""}`.trim() ||
        existingUser.email;

      try {
        // Preserve name on business records (checkouts, contracts, agreements)
        await storage.preserveUserNameOnRecords(id, userName);
        // Clear out timecard FKs that would otherwise block the delete
        await storage.cleanupTimecardReferencesForUser(id);
        // Now the actual user row
        await storage.deleteUser(id);
      } catch (err: any) {
        // Surface FK errors in a useful shape — the frontend toast currently
        // just shows "error 500" otherwise.
        console.error("[delete user] Failed:", err?.code, err?.message, err?.detail);
        if (err?.code === "23503") {
          return res.status(409).json({
            error:
              "Cannot delete this user — they're still referenced by other records. Archive them instead, or contact support with this detail: " +
              (err?.detail || err?.message || ""),
          });
        }
        return res.status(500).json({
          error: "Failed to delete user",
          detail: err?.message,
        });
      }

      await storage.createActivityLog({
        userId: req.user!.id,
        userEmail: req.user!.email,
        action: "delete_user",
        entityType: "user",
        entityId: id,
        details: `Permanently deleted user: ${existingUser.email}`,
        ipAddress: req.ip,
      });

      res.json({ success: true });
    }),
  );

  // ---- Activity Logs ----

  app.get(
    "/api/activity-logs",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      const { userId, startDate, endDate } = req.query;

      const filters: any = {};
      if (userId) filters.userId = userId as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const logs = await storage.getActivityLogs(
        Object.keys(filters).length > 0 ? filters : undefined,
      );
      res.json(logs);
    }),
  );

  // ---- Role Permissions ----

  app.get(
    "/api/role-permissions",
    isAdmin,
    asyncHandler(async (_req, res) => {
      const permissions = await storage.getRolePermissions();
      res.json(permissions);
    }),
  );

  // Get current user's EFFECTIVE permissions (role defaults + per-user overrides).
  // Shape is kept compatible with the existing client: a list of
  // { role, permission, enabled: "yes" | "no" } rows, one per permission.
  app.get(
    "/api/my-permissions",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { storage: authStorage } = await import("../auth/storage");
      const effective = await authStorage.getEffectivePermissions(user);

      res.json(
        Object.entries(effective).map(([permission, on]) => ({
          role: user.role,
          permission,
          enabled: on ? "yes" : "no",
        })),
      );
    }),
  );

  app.put(
    "/api/role-permissions",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      const { role, permission, enabled } = req.body;

      if (!role || !permission || typeof enabled !== "boolean") {
        return res
          .status(400)
          .json({ error: "Role, permission, and enabled (boolean) are required" });
      }

      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: "Invalid role. Must be 'manager' or 'staff'" });
      }

      if (!validPermissions.includes(permission)) {
        return res.status(400).json({ error: "Invalid permission" });
      }

      const result = await storage.setRolePermission(role, permission, enabled);

      await storage.createActivityLog({
        userId: req.user!.id,
        userEmail: req.user!.email,
        action: "update_permission",
        entityType: "role_permission",
        details: `Set ${role} permission '${permission}' to ${enabled ? "enabled" : "disabled"}`,
        ipAddress: req.ip,
      });

      res.json(result);
    }),
  );

  // ---- Per-user Permission Overrides ----

  // GET: effective permissions for a specific user, plus their overrides
  // Response: { effective: { [permission]: boolean }, overrides: { [permission]: "yes"|"no" } }
  app.get(
    "/api/users/:id/permissions",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      const { id } = req.params;
      const user = await storage.getUser(id);
      if (!user) return res.status(404).json({ error: "User not found" });

      const { storage: authStorage } = await import("../auth/storage");
      const effective = await authStorage.getEffectivePermissions(user);
      const overrides = await authStorage.getUserPermissionOverrides(id);

      res.json({
        userId: id,
        role: user.role,
        effective,
        overrides: Object.fromEntries(overrides.map((o) => [o.permission, o.enabled])),
      });
    }),
  );

  // PUT: set or clear a per-user permission override
  // Body: { permission: string, enabled: boolean | null }
  //   - enabled=true|false → add/update an override (takes precedence over role)
  //   - enabled=null      → clear the override (user inherits role default again)
  app.put(
    "/api/users/:id/permissions",
    isAdmin,
    asyncHandler(async (req: any, res) => {
      const { id } = req.params;
      const { permission, enabled } = req.body || {};

      const user = await storage.getUser(id);
      if (!user) return res.status(404).json({ error: "User not found" });

      if (user.role === "admin") {
        return res
          .status(400)
          .json({ error: "Admin users have all permissions by default. Change the role first to set overrides." });
      }

      if (!permission || !validPermissions.includes(permission)) {
        return res.status(400).json({ error: "Invalid permission" });
      }

      if (enabled !== null && typeof enabled !== "boolean") {
        return res
          .status(400)
          .json({ error: "enabled must be boolean (to set) or null (to clear)" });
      }

      const { storage: authStorage } = await import("../auth/storage");
      await authStorage.setUserPermission(id, permission, enabled);

      await storage.createActivityLog({
        userId: req.user!.id,
        userEmail: req.user!.email,
        action: "update_user_permission",
        entityType: "user_permission",
        entityId: id,
        details:
          enabled === null
            ? `Cleared override on '${permission}' for ${user.email} (inherits role default)`
            : `Set '${permission}'=${enabled ? "enabled" : "disabled"} override for ${user.email}`,
        ipAddress: req.ip,
      });

      res.json({ success: true });
    }),
  );
}
