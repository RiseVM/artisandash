import type { Express, RequestHandler } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, insertInventorySchema, insertCheckoutSchema, insertSignedAgreementSchema, insertContractSchema, insertUserSchema, insertProjectSchema, insertProjectPhaseSchema, insertProjectTaskSchema, insertProjectTemplateSchema, insertPhaseTemplateSchema, insertTaskTemplateSchema, insertClientPortalAccessSchema, insertProjectDeliverySchema, insertChangeOrderSchema, type User, type ClientPortalUser } from "@shared/schema";
import { z } from "zod";
import { startScheduler, checkAndSendNotifications } from "./notificationScheduler";
import { sendSampleReminder, sendContractEmail, sendInstallerFollowUp, sendDesignerFollowUp, sendSpecialRequestFollowUp } from "./emailService";
import { uploadAgreementToGoogleDrive, getAgreementText, uploadContractToGoogleDrive } from "./googleDriveService";
import { generateContractPdf } from "./contractPdfService";
import { authenticateUser, seedAdminUser, hashPassword, canManageUsers, canViewReports } from "./authService";
import { getSession } from "./replitAuth";
import passport from "passport";
import * as fs from "fs";
import * as path from "path";

declare module "express-session" {
  interface SessionData {
    userId: string;
    userEmail: string;
    userRole: string;
    // Portal session data
    portalUserId: number;
    portalCustomerId: number;
    portalEmail: string;
  }
}

const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  const user = await storage.getUser(req.session.userId);
  if (!user || user.isActive !== "yes") {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "User account is inactive" });
  }
  
  req.user = user;
  next();
};

const isAdmin: RequestHandler = async (req: any, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  const user = await storage.getUser(req.session.userId);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  
  req.user = user;
  next();
};

const requirePermission = (permission: string): RequestHandler => {
  return async (req: any, res, next) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user || user.isActive !== "yes") {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "User account is inactive" });
    }
    
    req.user = user;
    
    const hasPermission = await storage.hasPermission(user.role, permission);
    if (!hasPermission) {
      return res.status(403).json({ error: `Permission required: ${permission}` });
    }
    
    next();
  };
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Set up session middleware
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Passport serialization for session support
  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));
  
  // Seed admin user on startup
  await seedAdminUser();

  // Auth routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      
      const user = await authenticateUser(email, password);
      
      if (!user) {
        await storage.createActivityLog({
          userEmail: email,
          action: "login_failed",
          details: "Invalid credentials or inactive account",
          ipAddress: req.ip,
        });
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      req.session.userId = user.id;
      req.session.userEmail = user.email;
      req.session.userRole = user.role;
      
      await storage.createActivityLog({
        userId: user.id,
        userEmail: user.email,
        action: "login",
        details: "User logged in successfully",
        ipAddress: req.ip,
      });
      
      res.json({ 
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post('/api/auth/logout', async (req: any, res) => {
    const userId = req.session?.userId;
    const userEmail = req.session?.userEmail;
    
    if (userId) {
      await storage.createActivityLog({
        userId,
        userEmail: userEmail || undefined,
        action: "logout",
        details: "User logged out",
        ipAddress: req.ip,
      });
    }
    
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      res.json({
        id: req.user!.id,
        email: req.user!.email,
        firstName: req.user!.firstName,
        lastName: req.user!.lastName,
        role: req.user!.role,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User management routes (requires manage_users permission)
  app.get('/api/users', requirePermission("manage_users"), async (req: any, res) => {
    try {
      let users = await storage.getUsers();
      
      // Non-admin users cannot see archived users
      if (req.user!.role !== "admin") {
        users = users.filter(u => u.isActive === "yes");
      }
      
      res.json(users.map(u => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
      })));
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post('/api/users', requirePermission("manage_users"), async (req: any, res) => {
    try {
      const { email, password, firstName, lastName, role } = req.body;
      
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
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.patch('/api/users/:id', requirePermission("manage_users"), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { email, password, firstName, lastName, role, isActive } = req.body;
      
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
      });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Archive user (deactivate) - available to managers and admins
  app.post('/api/users/:id/archive', requirePermission("manage_users"), async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (existingUser.email === "ed@risevm.com") {
        return res.status(400).json({ error: "Cannot archive the primary admin account" });
      }
      
      // Managers cannot archive admin users
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
    } catch (error) {
      console.error("Error archiving user:", error);
      res.status(500).json({ error: "Failed to archive user" });
    }
  });

  // Restore archived user - admin only
  app.post('/api/users/:id/restore', isAdmin, async (req: any, res) => {
    try {
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
    } catch (error) {
      console.error("Error restoring user:", error);
      res.status(500).json({ error: "Failed to restore user" });
    }
  });

  // Permanently delete user - admin only
  app.delete('/api/users/:id', isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (existingUser.email === "ed@risevm.com") {
        return res.status(400).json({ error: "Cannot delete the primary admin account" });
      }
      
      // Store user name on related records before deleting
      const userName = `${existingUser.firstName || ''} ${existingUser.lastName || ''}`.trim() || existingUser.email;
      await storage.preserveUserNameOnRecords(id, userName);
      
      await storage.deleteUser(id);
      
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
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Activity logs routes (requires view_reports permission)
  app.get('/api/activity-logs', requirePermission("view_reports"), async (req: any, res) => {
    try {
      const { userId, startDate, endDate } = req.query;
      
      const filters: any = {};
      if (userId) filters.userId = userId as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      
      const logs = await storage.getActivityLogs(Object.keys(filters).length > 0 ? filters : undefined);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ error: "Failed to fetch activity logs" });
    }
  });

  // Initialize default permissions on startup
  await storage.initializeDefaultPermissions();

  // Role permissions routes (admin only for all permissions)
  app.get('/api/role-permissions', isAdmin, async (req: any, res) => {
    try {
      const permissions = await storage.getRolePermissions();
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching role permissions:", error);
      res.status(500).json({ error: "Failed to fetch role permissions" });
    }
  });

  // Get current user's permissions (any authenticated user)
  app.get('/api/my-permissions', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Admin has all permissions
      if (user.role === 'admin') {
        const allPermissions = ["manage_customers", "manage_inventory", "create_checkouts", "manage_checkouts", "view_contracts", "create_contracts", "manage_users", "view_reports"];
        return res.json(allPermissions.map(p => ({ role: 'admin', permission: p, enabled: 'yes' })));
      }
      
      // Get permissions for the user's role
      const allPermissions = await storage.getRolePermissions();
      const userPermissions = allPermissions.filter(p => p.role === user.role);
      res.json(userPermissions);
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      res.status(500).json({ error: "Failed to fetch user permissions" });
    }
  });

  const validRoles = ["manager", "staff"];
  const validPermissions = ["manage_customers", "manage_inventory", "create_checkouts", "manage_checkouts", "view_contracts", "create_contracts", "manage_users", "view_reports"];

  app.put('/api/role-permissions', isAdmin, async (req: any, res) => {
    try {
      const { role, permission, enabled } = req.body;
      
      if (!role || !permission || typeof enabled !== "boolean") {
        return res.status(400).json({ error: "Role, permission, and enabled (boolean) are required" });
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
        details: `Set ${role} permission '${permission}' to ${enabled ? 'enabled' : 'disabled'}`,
        ipAddress: req.ip,
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error updating role permission:", error);
      res.status(500).json({ error: "Failed to update role permission" });
    }
  });

  // Contract template downloads
  app.get('/api/contract-templates/cabinetry', (req, res) => {
    const templatePath = path.join(process.cwd(), 'attached_assets', 'Cabinet_Contract_2025_1765835290052.pdf');
    if (fs.existsSync(templatePath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="Cabinetry_Contract_Template.pdf"');
      fs.createReadStream(templatePath).pipe(res);
    } else {
      res.status(404).json({ error: "Template not found" });
    }
  });

  app.get('/api/contract-templates/home-improvement', (req, res) => {
    const templatePath = path.join(process.cwd(), 'attached_assets', 'Home_Improvement_Contract-_Artisan_Tile_At_Whitfield_Design_LL_1765835252033.pdf');
    if (fs.existsSync(templatePath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="Home_Improvement_Contract_Template.pdf"');
      fs.createReadStream(templatePath).pipe(res);
    } else {
      res.status(404).json({ error: "Template not found" });
    }
  });

  // Customers
  app.get("/api/customers", isAuthenticated, async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid customer ID" });
      }
      const customer = await storage.getCustomer(id);
      if (!customer) return res.status(404).json({ error: "Customer not found" });
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", requirePermission("manage_customers"), async (req, res) => {
    try {
      const data = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(data);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create customer" });
    }
  });

  app.patch("/api/customers/:id", requirePermission("manage_customers"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid customer ID" });
      }
      const data = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(id, data);
      if (!customer) return res.status(404).json({ error: "Customer not found" });
      res.json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", requirePermission("manage_customers"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid customer ID" });
      }
      const activeCheckouts = await storage.getActiveCheckoutsByCustomer(id);
      if (activeCheckouts.length > 0) {
        const overdueCount = activeCheckouts.filter(c => c.status === 'overdue').length;
        const checkedOutCount = activeCheckouts.filter(c => c.status === 'checked_out').length;
        let reason = `This customer has ${activeCheckouts.length} active sample${activeCheckouts.length > 1 ? 's' : ''}`;
        if (overdueCount > 0 && checkedOutCount > 0) {
          reason += ` (${checkedOutCount} checked out, ${overdueCount} overdue)`;
        } else if (overdueCount > 0) {
          reason += ` (${overdueCount} overdue)`;
        } else {
          reason += ` checked out`;
        }
        reason += `. All samples must be returned before deleting.`;
        return res.status(400).json({ error: reason });
      }
      const deleted = await storage.deleteCustomer(id);
      if (!deleted) return res.status(404).json({ error: "Customer not found" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete customer" });
    }
  });

  // Inventory
  app.get("/api/inventory", isAuthenticated, async (req, res) => {
    try {
      const items = await storage.getInventory();
      res.json(items);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ error: "Failed to fetch inventory" });
    }
  });

  app.get("/api/inventory/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid inventory item ID" });
      }
      const item = await storage.getInventoryItem(id);
      if (!item) return res.status(404).json({ error: "Item not found" });
      res.json(item);
    } catch (error) {
      console.error("Error fetching inventory item:", error);
      res.status(500).json({ error: "Failed to fetch inventory item" });
    }
  });

  app.post("/api/inventory", requirePermission("manage_inventory"), async (req, res) => {
    try {
      const data = insertInventorySchema.parse(req.body);
      const item = await storage.createInventoryItem(data);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create inventory item" });
    }
  });

  app.patch("/api/inventory/:id", requirePermission("manage_inventory"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid inventory item ID" });
      }
      const data = insertInventorySchema.partial().parse(req.body);
      const item = await storage.updateInventoryItem(id, data);
      if (!item) return res.status(404).json({ error: "Item not found" });
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update inventory item" });
    }
  });

  app.delete("/api/inventory/:id", requirePermission("manage_inventory"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid inventory item ID" });
      }
      const activeCheckouts = await storage.getActiveCheckoutsByInventoryItem(id);
      if (activeCheckouts.length > 0) {
        const overdueCount = activeCheckouts.filter(c => c.status === 'overdue').length;
        const checkedOutCount = activeCheckouts.filter(c => c.status === 'checked_out').length;
        let reason = `This sample is currently checked out to ${activeCheckouts.length} customer${activeCheckouts.length > 1 ? 's' : ''}`;
        if (overdueCount > 0 && checkedOutCount > 0) {
          reason += ` (${checkedOutCount} active, ${overdueCount} overdue)`;
        } else if (overdueCount > 0) {
          reason += ` (overdue)`;
        }
        reason += `. It must be returned before deleting.`;
        return res.status(400).json({ error: reason });
      }
      const deleted = await storage.deleteInventoryItem(id);
      if (!deleted) return res.status(404).json({ error: "Item not found" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete inventory item" });
    }
  });

  // Checkouts
  app.get("/api/checkouts", isAuthenticated, async (req, res) => {
    try {
      const checkoutViews = await storage.getCheckoutViews();
      res.json(checkoutViews);
    } catch (error) {
      console.error("Error fetching checkouts:", error);
      res.status(500).json({ error: "Failed to fetch checkouts" });
    }
  });

  app.get("/api/checkouts/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid checkout ID" });
      }
      const checkoutView = await storage.getCheckoutView(id);
      if (!checkoutView) return res.status(404).json({ error: "Checkout not found" });
      res.json(checkoutView);
    } catch (error) {
      console.error("Error fetching checkout:", error);
      res.status(500).json({ error: "Failed to fetch checkout" });
    }
  });

  app.post("/api/checkouts", requirePermission("create_checkouts"), async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const data = insertCheckoutSchema.parse(req.body);
      
      const activeCheckouts = await storage.getActiveCheckoutsByInventoryItem(data.inventory_item_id);
      if (activeCheckouts.length > 0) {
        return res.status(400).json({ 
          error: "This sample is already checked out. It must be returned first." 
        });
      }
      
      const checkout = await storage.createCheckout({
        ...data,
        created_by_user_id: userId,
      });
      
      // Send follow-up emails based on customer needs
      const customer = await storage.getCustomer(data.customer_id);
      const item = await storage.getInventoryItem(data.inventory_item_id);
      
      // Send installer follow-up email if customer needs an installer
      if (data.needs_installer === "yes" && customer && item) {
        try {
          await sendInstallerFollowUp(
            customer.name,
            customer.email,
            customer.phone,
            data.project_type || null,
            data.start_date || null,
            item.name,
            data.checkout_date,
            data.notes || null
          );
        } catch (emailError) {
          console.error("Failed to send installer follow-up email:", emailError);
        }
      }
      
      // Send designer follow-up email if customer wants a designer
      if (data.wants_designer === "yes" && customer) {
        try {
          await sendDesignerFollowUp(
            customer.name,
            customer.email,
            customer.phone,
            data.project_type || null,
            data.start_date || null,
            item?.name || null,
            data.checkout_date,
            data.notes || null
          );
        } catch (emailError) {
          console.error("Failed to send designer follow-up email:", emailError);
        }
      }
      
      // Send special request follow-up email if customer has a special request
      if (data.has_special_request === "yes" && customer) {
        try {
          await sendSpecialRequestFollowUp(
            customer.name,
            customer.email,
            customer.phone,
            data.special_request || "No details provided",
            item?.name || null,
            data.checkout_date,
            data.notes || null
          );
        } catch (emailError) {
          console.error("Failed to send special request follow-up email:", emailError);
        }
      }
      
      res.status(201).json(checkout);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create checkout" });
    }
  });

  app.patch("/api/checkouts/:id", requirePermission("manage_checkouts"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid checkout ID" });
      }
      const data = insertCheckoutSchema.partial().parse(req.body);
      const checkout = await storage.updateCheckout(id, data);
      if (!checkout) return res.status(404).json({ error: "Checkout not found" });
      res.json(checkout);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update checkout" });
    }
  });

  app.delete("/api/checkouts/:id", requirePermission("manage_checkouts"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid checkout ID" });
      }
      const deleted = await storage.deleteCheckout(id);
      if (!deleted) return res.status(404).json({ error: "Checkout not found" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete checkout" });
    }
  });

  // Return all active checkouts (admin only)
  app.post("/api/checkouts/return-all", requirePermission("manage_checkouts"), async (req, res) => {
    try {
      const count = await storage.returnAllActiveCheckouts();
      res.json({ success: true, returned: count, message: `${count} checkout(s) marked as returned` });
    } catch (error) {
      console.error("Error returning all checkouts:", error);
      res.status(500).json({ error: "Failed to return checkouts" });
    }
  });

  app.post("/api/notifications/send", isAuthenticated, async (req, res) => {
    try {
      const results = await checkAndSendNotifications();
      res.json(results);
    } catch (error) {
      console.error("Error sending notifications:", error);
      res.status(500).json({ error: "Failed to send notifications" });
    }
  });

  // Send follow-up emails without creating a checkout (for customer info collection only)
  app.post("/api/send-followup-emails", isAuthenticated, async (req, res) => {
    try {
      const { customer_id, needs_installer, wants_designer, has_special_request, special_request, project_type, start_date, notes } = req.body;
      
      const customer = await storage.getCustomer(customer_id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      const emailsSent: string[] = [];
      const today = new Date().toLocaleDateString();

      // Send installer follow-up email if customer needs an installer
      if (needs_installer === "yes") {
        try {
          await sendInstallerFollowUp(
            customer.name,
            customer.email,
            customer.phone,
            project_type || null,
            start_date || null,
            null,
            today,
            notes || null
          );
          emailsSent.push("installer");
        } catch (emailError) {
          console.error("Failed to send installer follow-up email:", emailError);
        }
      }
      
      // Send designer follow-up email if customer wants a designer
      if (wants_designer === "yes") {
        try {
          await sendDesignerFollowUp(
            customer.name,
            customer.email,
            customer.phone,
            project_type || null,
            start_date || null,
            null,
            today,
            notes || null
          );
          emailsSent.push("designer");
        } catch (emailError) {
          console.error("Failed to send designer follow-up email:", emailError);
        }
      }
      
      // Send special request follow-up email if customer has a special request
      if (has_special_request === "yes") {
        try {
          await sendSpecialRequestFollowUp(
            customer.name,
            customer.email,
            customer.phone,
            special_request || "No details provided",
            null,
            today,
            notes || null
          );
          emailsSent.push("special_request");
        } catch (emailError) {
          console.error("Failed to send special request follow-up email:", emailError);
        }
      }

      res.json({ success: true, emailsSent });
    } catch (error) {
      console.error("Error sending follow-up emails:", error);
      res.status(500).json({ error: "Failed to send follow-up emails" });
    }
  });

  app.post("/api/test-email", isAuthenticated, async (req: any, res) => {
    try {
      const { email } = req.body;
      const testEmail = email || req.user?.claims?.email || "test@artisantilect.com";
      
      const success = await sendSampleReminder(
        testEmail,
        "Test User",
        "Test Tile Sample",
        new Date().toLocaleDateString(),
        "7_day_reminder"
      );
      
      if (success) {
        res.json({ success: true, message: `Test email sent to ${testEmail}` });
      } else {
        res.status(500).json({ success: false, message: "Failed to send test email" });
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ error: "Failed to send test email", details: String(error) });
    }
  });

  app.post("/api/checkouts/:id/send-reminder", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const checkoutView = await storage.getCheckoutView(id);
      
      if (!checkoutView) {
        return res.status(404).json({ error: "Checkout not found" });
      }
      
      const success = await sendSampleReminder(
        checkoutView.customer.email,
        checkoutView.customer.name,
        checkoutView.item.name,
        checkoutView.due_date,
        "7_day_reminder"
      );
      
      if (success) {
        await storage.updateCheckout(id, { last_reminder_sent: new Date() } as any);
        res.json({ success: true, message: `Reminder sent to ${checkoutView.customer.email}` });
      } else {
        res.status(500).json({ success: false, message: "Failed to send reminder" });
      }
    } catch (error) {
      console.error("Error sending reminder:", error);
      res.status(500).json({ error: "Failed to send reminder", details: String(error) });
    }
  });

  // Signed Agreements
  app.get("/api/agreements", isAuthenticated, async (req, res) => {
    try {
      const agreements = await storage.getSignedAgreements();
      res.json(agreements);
    } catch (error) {
      console.error("Error fetching agreements:", error);
      res.status(500).json({ error: "Failed to fetch agreements" });
    }
  });

  app.get("/api/agreements/customer/:customerId", isAuthenticated, async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      const agreements = await storage.getSignedAgreementsByCustomer(customerId);
      res.json(agreements);
    } catch (error) {
      console.error("Error fetching customer agreements:", error);
      res.status(500).json({ error: "Failed to fetch customer agreements" });
    }
  });

  app.get("/api/agreements/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const agreement = await storage.getSignedAgreement(id);
      if (!agreement) return res.status(404).json({ error: "Agreement not found" });
      res.json(agreement);
    } catch (error) {
      console.error("Error fetching agreement:", error);
      res.status(500).json({ error: "Failed to fetch agreement" });
    }
  });

  app.post("/api/agreements", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const data = insertSignedAgreementSchema.parse(req.body);
      
      if (!data.signature_data || data.signature_data.trim().length === 0) {
        return res.status(400).json({ error: "Signature data is required" });
      }
      
      const customer = await storage.getCustomer(data.customer_id);
      const customerName = customer?.name || "Unknown Customer";
      const customerEmail = customer?.email || "";
      const customerPhone = customer?.phone || undefined;
      
      let checkout = null;
      let sampleName = "Sample";
      let checkoutDate = new Date().toLocaleDateString();
      let dueDate = new Date().toLocaleDateString();
      
      if (data.checkout_id) {
        checkout = await storage.getCheckoutView(data.checkout_id);
        if (checkout) {
          sampleName = checkout.item.name;
          checkoutDate = checkout.checkout_date;
          dueDate = checkout.due_date;
        }
      }
      
      let googleDriveFileId: string | null = null;
      let googleDriveLink: string | null = null;
      let agreementText: string | null = getAgreementText();
      
      try {
        const driveResult = await uploadAgreementToGoogleDrive({
          customerName,
          customerEmail,
          customerPhone,
          sampleName,
          checkoutDate,
          dueDate,
          signatureDataUrl: data.signature_data,
        });
        if (driveResult) {
          googleDriveFileId = driveResult.fileId;
          googleDriveLink = driveResult.webViewLink;
          agreementText = driveResult.agreementText;
        }
      } catch (driveError) {
        console.error("Failed to upload PDF to Google Drive (continuing without):", driveError);
      }
      
      const agreement = await storage.createSignedAgreement({
        ...data,
        created_by_user_id: userId,
        agreement_text: agreementText,
        google_drive_file_id: googleDriveFileId,
        google_drive_link: googleDriveLink,
      });
      res.status(201).json(agreement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating agreement:", error);
      res.status(500).json({ error: "Failed to create agreement" });
    }
  });

  app.delete("/api/agreements/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteSignedAgreement(id);
      if (!deleted) return res.status(404).json({ error: "Agreement not found" });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting agreement:", error);
      res.status(500).json({ error: "Failed to delete agreement" });
    }
  });

  // Contracts (Custom Cabinetry and Home Improvement)
  app.get("/api/contracts", requirePermission("view_contracts"), async (req, res) => {
    try {
      const contractList = await storage.getContracts();
      res.json(contractList);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ error: "Failed to fetch contracts" });
    }
  });

  app.get("/api/contracts/:id", requirePermission("view_contracts"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const contract = await storage.getContract(id);
      if (!contract) return res.status(404).json({ error: "Contract not found" });
      res.json(contract);
    } catch (error) {
      console.error("Error fetching contract:", error);
      res.status(500).json({ error: "Failed to fetch contract" });
    }
  });

  app.post("/api/contracts", requirePermission("create_contracts"), async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const data = insertContractSchema.parse(req.body);
      
      if (!data.signature_data || data.signature_data.trim().length === 0) {
        return res.status(400).json({ error: "Signature data is required" });
      }
      
      // Generate PDF
      const pdfBuffer = await generateContractPdf(data.contract_type, data.form_data as Record<string, any>, data.signature_data);
      
      // Upload to Google Drive
      let googleDriveFileId: string | null = null;
      let googleDriveLink: string | null = null;
      
      try {
        const driveResult = await uploadContractToGoogleDrive({
          customerName: data.customer_name,
          contractType: data.contract_type,
          pdfBuffer,
        });
        if (driveResult) {
          googleDriveFileId = driveResult.fileId;
          googleDriveLink = driveResult.webViewLink;
        }
      } catch (driveError) {
        console.error("Failed to upload contract PDF to Google Drive:", driveError);
      }
      
      // Send email to customer
      let emailSent = "no";
      try {
        const emailSuccess = await sendContractEmail(
          data.customer_email,
          data.customer_name,
          data.contract_type,
          pdfBuffer
        );
        emailSent = emailSuccess ? "yes" : "no";
      } catch (emailError) {
        console.error("Failed to send contract email:", emailError);
      }
      
      // Save to database
      const contract = await storage.createContract({
        ...data,
        created_by_user_id: userId,
        google_drive_file_id: googleDriveFileId,
        google_drive_link: googleDriveLink,
        email_sent: emailSent,
      });
      
      res.status(201).json(contract);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating contract:", error);
      res.status(500).json({ error: "Failed to create contract" });
    }
  });

  app.delete("/api/contracts/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteContract(id);
      if (!deleted) return res.status(404).json({ error: "Contract not found" });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting contract:", error);
      res.status(500).json({ error: "Failed to delete contract" });
    }
  });

  // ============================================
  // PROJECT TRACKER ROUTES
  // ============================================

  // List all projects
  app.get("/api/projects", requirePermission("manage_projects"), async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  // Get single project with full details (phases and tasks)
  app.get("/api/projects/:id", requirePermission("manage_projects"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }
      const project = await storage.getProjectWithDetails(id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  // Create new project
  app.post("/api/projects", requirePermission("manage_projects"), async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email : null;
      const data = insertProjectSchema.parse(req.body);

      const project = await storage.createProject({
        ...data,
        created_by_user_id: userId,
        created_by_user_name: userName,
      });

      await storage.createActivityLog({
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: "create_project",
        entityType: "project",
        entityId: project.id.toString(),
        details: `Created project: ${project.name}`,
        ipAddress: req.ip,
      });

      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating project:", error);
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  // Update project
  app.patch("/api/projects/:id", requirePermission("manage_projects"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }
      const data = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(id, data);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      await storage.createActivityLog({
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: "update_project",
        entityType: "project",
        entityId: id.toString(),
        details: `Updated project: ${project.name}`,
        ipAddress: req.ip,
      });

      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating project:", error);
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  // Delete project
  app.delete("/api/projects/:id", requirePermission("manage_projects"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const deleted = await storage.deleteProject(id);
      if (!deleted) {
        return res.status(404).json({ error: "Project not found" });
      }

      await storage.createActivityLog({
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: "delete_project",
        entityType: "project",
        entityId: id.toString(),
        details: `Deleted project: ${project.name}`,
        ipAddress: req.ip,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // ============================================
  // PROJECT PHASES ROUTES
  // ============================================

  // Add phase to project
  app.post("/api/projects/:projectId/phases", requirePermission("manage_projects"), async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      // Verify project exists
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Get existing phases to determine display order
      const existingPhases = await storage.getProjectPhases(projectId);
      const maxOrder = existingPhases.length > 0
        ? Math.max(...existingPhases.map(p => p.display_order))
        : 0;

      const data = insertProjectPhaseSchema.parse({
        ...req.body,
        project_id: projectId,
        display_order: req.body.display_order ?? maxOrder + 1,
      });

      const phase = await storage.createProjectPhase(data);
      res.status(201).json(phase);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating phase:", error);
      res.status(500).json({ error: "Failed to create phase" });
    }
  });

  // Update phase
  app.patch("/api/phases/:id", requirePermission("manage_projects"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid phase ID" });
      }
      const data = insertProjectPhaseSchema.partial().parse(req.body);
      const phase = await storage.updateProjectPhase(id, data);
      if (!phase) {
        return res.status(404).json({ error: "Phase not found" });
      }
      res.json(phase);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating phase:", error);
      res.status(500).json({ error: "Failed to update phase" });
    }
  });

  // Delete phase
  app.delete("/api/phases/:id", requirePermission("manage_projects"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid phase ID" });
      }
      const deleted = await storage.deleteProjectPhase(id);
      if (!deleted) {
        return res.status(404).json({ error: "Phase not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting phase:", error);
      res.status(500).json({ error: "Failed to delete phase" });
    }
  });

  // Reorder phases
  app.post("/api/projects/:projectId/phases/reorder", requirePermission("manage_projects"), async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }
      const { phaseIds } = req.body;
      if (!Array.isArray(phaseIds)) {
        return res.status(400).json({ error: "phaseIds must be an array" });
      }
      await storage.reorderProjectPhases(projectId, phaseIds);
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering phases:", error);
      res.status(500).json({ error: "Failed to reorder phases" });
    }
  });

  // ============================================
  // PROJECT TASKS ROUTES
  // ============================================

  // Add task to phase
  app.post("/api/phases/:phaseId/tasks", requirePermission("manage_projects"), async (req, res) => {
    try {
      const phaseId = parseInt(req.params.phaseId);
      if (isNaN(phaseId)) {
        return res.status(400).json({ error: "Invalid phase ID" });
      }

      // Verify phase exists
      const phase = await storage.getProjectPhase(phaseId);
      if (!phase) {
        return res.status(404).json({ error: "Phase not found" });
      }

      // Get existing tasks to determine display order
      const existingTasks = await storage.getPhaseTasks(phaseId);
      const maxOrder = existingTasks.length > 0
        ? Math.max(...existingTasks.map(t => t.display_order))
        : 0;

      const data = insertProjectTaskSchema.parse({
        ...req.body,
        phase_id: phaseId,
        display_order: req.body.display_order ?? maxOrder + 1,
      });

      const task = await storage.createProjectTask(data);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating task:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  // Update task
  app.patch("/api/tasks/:id", requirePermission("manage_projects"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid task ID" });
      }
      const data = insertProjectTaskSchema.partial().parse(req.body);

      // If marking as completed, set completed_at and completed_by
      if (data.status === "completed") {
        data.completed_at = new Date();
        data.completed_by = req.user?.id;
      }

      const task = await storage.updateProjectTask(id, data);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating task:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  // Delete task
  app.delete("/api/tasks/:id", requirePermission("manage_projects"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid task ID" });
      }
      const deleted = await storage.deleteProjectTask(id);
      if (!deleted) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // ============================================
  // PROJECT DELIVERIES
  // ============================================

  // Get all deliveries for a project
  app.get("/api/projects/:projectId/deliveries", requirePermission("manage_projects"), async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }
      const deliveries = await storage.getProjectDeliveries(projectId);
      res.json(deliveries);
    } catch (error) {
      console.error("Error fetching deliveries:", error);
      res.status(500).json({ error: "Failed to fetch deliveries" });
    }
  });

  // Create a delivery
  app.post("/api/projects/:projectId/deliveries", requirePermission("manage_projects"), async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      // Verify project exists
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const userId = req.user?.id;
      const userName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email : null;

      const data = insertProjectDeliverySchema.parse({
        ...req.body,
        project_id: projectId,
        created_by_user_id: userId,
        created_by_user_name: userName,
      });

      const delivery = await storage.createProjectDelivery(data);

      await storage.createActivityLog({
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: "create_delivery",
        entityType: "project_delivery",
        entityId: delivery.id.toString(),
        details: `Created delivery: ${delivery.description}`,
        ipAddress: req.ip,
      });

      res.status(201).json(delivery);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating delivery:", error);
      res.status(500).json({ error: "Failed to create delivery" });
    }
  });

  // Update a delivery
  app.patch("/api/deliveries/:id", requirePermission("manage_projects"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid delivery ID" });
      }
      const data = insertProjectDeliverySchema.partial().parse(req.body);
      const delivery = await storage.updateProjectDelivery(id, data);
      if (!delivery) {
        return res.status(404).json({ error: "Delivery not found" });
      }

      await storage.createActivityLog({
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: "update_delivery",
        entityType: "project_delivery",
        entityId: id.toString(),
        details: `Updated delivery: ${delivery.description}`,
        ipAddress: req.ip,
      });

      res.json(delivery);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating delivery:", error);
      res.status(500).json({ error: "Failed to update delivery" });
    }
  });

  // Delete a delivery
  app.delete("/api/deliveries/:id", requirePermission("manage_projects"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid delivery ID" });
      }
      const delivery = await storage.getProjectDelivery(id);
      if (!delivery) {
        return res.status(404).json({ error: "Delivery not found" });
      }

      const deleted = await storage.deleteProjectDelivery(id);
      if (!deleted) {
        return res.status(404).json({ error: "Delivery not found" });
      }

      await storage.createActivityLog({
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: "delete_delivery",
        entityType: "project_delivery",
        entityId: id.toString(),
        details: `Deleted delivery: ${delivery.description}`,
        ipAddress: req.ip,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting delivery:", error);
      res.status(500).json({ error: "Failed to delete delivery" });
    }
  });

  // ============================================
  // CHANGE ORDERS
  // ============================================

  // Get all change orders for a project
  app.get("/api/projects/:projectId/change-orders", requirePermission("manage_projects"), async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }
      const changeOrders = await storage.getChangeOrders(projectId);
      res.json(changeOrders);
    } catch (error) {
      console.error("Error fetching change orders:", error);
      res.status(500).json({ error: "Failed to fetch change orders" });
    }
  });

  // Create a change order
  app.post("/api/projects/:projectId/change-orders", requirePermission("manage_projects"), async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      // Verify project exists
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const userId = req.user?.id;
      const userName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email : null;

      // Get next CO number for this project
      const coNumber = await storage.getNextChangeOrderNumber(projectId);

      const data = insertChangeOrderSchema.parse({
        ...req.body,
        project_id: projectId,
        co_number: coNumber,
        created_by_user_id: userId,
        created_by_user_name: userName,
      });

      const changeOrder = await storage.createChangeOrder(data);

      await storage.createActivityLog({
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: "create_change_order",
        entityType: "change_order",
        entityId: changeOrder.id.toString(),
        details: `Created change order CO-${coNumber}: ${changeOrder.title}`,
        ipAddress: req.ip,
      });

      res.status(201).json(changeOrder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating change order:", error);
      res.status(500).json({ error: "Failed to create change order" });
    }
  });

  // Update a change order
  app.patch("/api/change-orders/:id", requirePermission("manage_projects"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid change order ID" });
      }

      const existing = await storage.getChangeOrder(id);
      if (!existing) {
        return res.status(404).json({ error: "Change order not found" });
      }

      // Don't allow editing approved/rejected change orders (except voiding)
      if (existing.status === "approved" || existing.status === "rejected") {
        if (req.body.status !== "void") {
          return res.status(400).json({ error: "Cannot edit approved or rejected change orders" });
        }
      }

      const data = insertChangeOrderSchema.partial().parse(req.body);
      const changeOrder = await storage.updateChangeOrder(id, data);
      if (!changeOrder) {
        return res.status(404).json({ error: "Change order not found" });
      }

      await storage.createActivityLog({
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: "update_change_order",
        entityType: "change_order",
        entityId: id.toString(),
        details: `Updated change order CO-${changeOrder.co_number}: ${changeOrder.title}`,
        ipAddress: req.ip,
      });

      res.json(changeOrder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating change order:", error);
      res.status(500).json({ error: "Failed to update change order" });
    }
  });

  // Submit change order for approval
  app.post("/api/change-orders/:id/submit", requirePermission("manage_projects"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid change order ID" });
      }

      const existing = await storage.getChangeOrder(id);
      if (!existing) {
        return res.status(404).json({ error: "Change order not found" });
      }

      if (existing.status !== "draft") {
        return res.status(400).json({ error: "Only draft change orders can be submitted" });
      }

      const changeOrder = await storage.updateChangeOrder(id, {
        status: "pending_approval",
        submitted_at: new Date(),
      });

      await storage.createActivityLog({
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: "submit_change_order",
        entityType: "change_order",
        entityId: id.toString(),
        details: `Submitted change order CO-${existing.co_number} for approval`,
        ipAddress: req.ip,
      });

      res.json(changeOrder);
    } catch (error) {
      console.error("Error submitting change order:", error);
      res.status(500).json({ error: "Failed to submit change order" });
    }
  });

  // Approve change order (admin action)
  app.post("/api/change-orders/:id/approve", requirePermission("manage_projects"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid change order ID" });
      }

      const { approvedBy, signature } = req.body;
      if (!approvedBy || !signature) {
        return res.status(400).json({ error: "Approved by name and signature are required" });
      }

      const existing = await storage.getChangeOrder(id);
      if (!existing) {
        return res.status(404).json({ error: "Change order not found" });
      }

      if (existing.status !== "pending_approval") {
        return res.status(400).json({ error: "Only pending change orders can be approved" });
      }

      const changeOrder = await storage.approveChangeOrder(id, approvedBy, signature);

      await storage.createActivityLog({
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: "approve_change_order",
        entityType: "change_order",
        entityId: id.toString(),
        details: `Approved change order CO-${existing.co_number}`,
        ipAddress: req.ip,
      });

      res.json(changeOrder);
    } catch (error) {
      console.error("Error approving change order:", error);
      res.status(500).json({ error: "Failed to approve change order" });
    }
  });

  // Reject change order (admin action)
  app.post("/api/change-orders/:id/reject", requirePermission("manage_projects"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid change order ID" });
      }

      const { rejectionReason } = req.body;
      if (!rejectionReason) {
        return res.status(400).json({ error: "Rejection reason is required" });
      }

      const existing = await storage.getChangeOrder(id);
      if (!existing) {
        return res.status(404).json({ error: "Change order not found" });
      }

      if (existing.status !== "pending_approval") {
        return res.status(400).json({ error: "Only pending change orders can be rejected" });
      }

      const changeOrder = await storage.rejectChangeOrder(id, rejectionReason);

      await storage.createActivityLog({
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: "reject_change_order",
        entityType: "change_order",
        entityId: id.toString(),
        details: `Rejected change order CO-${existing.co_number}: ${rejectionReason}`,
        ipAddress: req.ip,
      });

      res.json(changeOrder);
    } catch (error) {
      console.error("Error rejecting change order:", error);
      res.status(500).json({ error: "Failed to reject change order" });
    }
  });

  // Delete a change order (only drafts)
  app.delete("/api/change-orders/:id", requirePermission("manage_projects"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid change order ID" });
      }

      const changeOrder = await storage.getChangeOrder(id);
      if (!changeOrder) {
        return res.status(404).json({ error: "Change order not found" });
      }

      if (changeOrder.status !== "draft") {
        return res.status(400).json({ error: "Only draft change orders can be deleted" });
      }

      const deleted = await storage.deleteChangeOrder(id);
      if (!deleted) {
        return res.status(404).json({ error: "Change order not found" });
      }

      await storage.createActivityLog({
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: "delete_change_order",
        entityType: "change_order",
        entityId: id.toString(),
        details: `Deleted change order CO-${changeOrder.co_number}: ${changeOrder.title}`,
        ipAddress: req.ip,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting change order:", error);
      res.status(500).json({ error: "Failed to delete change order" });
    }
  });

  // ============================================
  // PROJECT TEMPLATES
  // ============================================

  // Get all project templates
  app.get("/api/project-templates", requirePermission("manage_projects"), async (req, res) => {
    try {
      const templates = await storage.getProjectTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching project templates:", error);
      res.status(500).json({ error: "Failed to fetch project templates" });
    }
  });

  // Get project template with details
  app.get("/api/project-templates/:id", requirePermission("manage_projects"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }
      const template = await storage.getProjectTemplateWithDetails(id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching project template:", error);
      res.status(500).json({ error: "Failed to fetch project template" });
    }
  });

  // Create project template
  app.post("/api/project-templates", requirePermission("manage_projects"), async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userName = req.user?.email || "Unknown";
      const data = insertProjectTemplateSchema.parse(req.body);
      const template = await storage.createProjectTemplate({
        ...data,
        created_by_user_id: userId,
        created_by_user_name: userName,
      });

      await storage.createActivityLog({
        userId,
        userEmail: userName,
        action: "create_project_template",
        entityType: "project_template",
        entityId: template.id.toString(),
        details: `Created project template: ${template.name}`,
      });

      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating project template:", error);
      res.status(500).json({ error: "Failed to create project template" });
    }
  });

  // Update project template
  app.patch("/api/project-templates/:id", requirePermission("manage_projects"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }
      const data = insertProjectTemplateSchema.partial().parse(req.body);
      const template = await storage.updateProjectTemplate(id, data);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      await storage.createActivityLog({
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: "update_project_template",
        entityType: "project_template",
        entityId: id.toString(),
        details: `Updated project template: ${template.name}`,
      });

      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating project template:", error);
      res.status(500).json({ error: "Failed to update project template" });
    }
  });

  // Delete project template
  app.delete("/api/project-templates/:id", requirePermission("manage_projects"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }

      const template = await storage.getProjectTemplate(id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      const deleted = await storage.deleteProjectTemplate(id);
      if (!deleted) {
        return res.status(404).json({ error: "Template not found" });
      }

      await storage.createActivityLog({
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: "delete_project_template",
        entityType: "project_template",
        entityId: id.toString(),
        details: `Deleted project template: ${template.name}`,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting project template:", error);
      res.status(500).json({ error: "Failed to delete project template" });
    }
  });

  // ============================================
  // PHASE TEMPLATES
  // ============================================

  // Add phase to template
  app.post("/api/project-templates/:templateId/phases", requirePermission("manage_projects"), async (req, res) => {
    try {
      const templateId = parseInt(req.params.templateId);
      if (isNaN(templateId)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }

      const template = await storage.getProjectTemplate(templateId);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      // Get current phases to determine display order
      const existingPhases = await storage.getPhaseTemplates(templateId);
      const displayOrder = existingPhases.length + 1;

      const data = insertPhaseTemplateSchema.partial().parse(req.body);
      const phase = await storage.createPhaseTemplate({
        project_template_id: templateId,
        name: data.name || "New Phase",
        description: data.description,
        display_order: displayOrder,
        client_visible: data.client_visible || "yes",
        requires_approval: data.requires_approval || "no",
      });

      res.status(201).json(phase);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating phase template:", error);
      res.status(500).json({ error: "Failed to create phase template" });
    }
  });

  // Update phase template
  app.patch("/api/phase-templates/:id", requirePermission("manage_projects"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid phase template ID" });
      }
      const data = insertPhaseTemplateSchema.partial().parse(req.body);
      const phase = await storage.updatePhaseTemplate(id, data);
      if (!phase) {
        return res.status(404).json({ error: "Phase template not found" });
      }
      res.json(phase);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating phase template:", error);
      res.status(500).json({ error: "Failed to update phase template" });
    }
  });

  // Delete phase template
  app.delete("/api/phase-templates/:id", requirePermission("manage_projects"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid phase template ID" });
      }
      const deleted = await storage.deletePhaseTemplate(id);
      if (!deleted) {
        return res.status(404).json({ error: "Phase template not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting phase template:", error);
      res.status(500).json({ error: "Failed to delete phase template" });
    }
  });

  // Reorder phase templates
  app.post("/api/project-templates/:templateId/phases/reorder", requirePermission("manage_projects"), async (req, res) => {
    try {
      const templateId = parseInt(req.params.templateId);
      if (isNaN(templateId)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }
      const { phaseIds } = req.body;
      if (!Array.isArray(phaseIds)) {
        return res.status(400).json({ error: "phaseIds must be an array" });
      }
      await storage.reorderPhaseTemplates(templateId, phaseIds);
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering phase templates:", error);
      res.status(500).json({ error: "Failed to reorder phase templates" });
    }
  });

  // ============================================
  // TASK TEMPLATES
  // ============================================

  // Add task to phase template
  app.post("/api/phase-templates/:phaseId/tasks", requirePermission("manage_projects"), async (req, res) => {
    try {
      const phaseId = parseInt(req.params.phaseId);
      if (isNaN(phaseId)) {
        return res.status(400).json({ error: "Invalid phase template ID" });
      }

      // Get current tasks to determine display order
      const existingTasks = await storage.getTaskTemplates(phaseId);
      const displayOrder = existingTasks.length + 1;

      const data = insertTaskTemplateSchema.partial().parse(req.body);
      const task = await storage.createTaskTemplate({
        phase_template_id: phaseId,
        name: data.name || "New Task",
        description: data.description,
        display_order: displayOrder,
        client_visible: data.client_visible || "yes",
        requires_approval: data.requires_approval || "no",
      });

      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating task template:", error);
      res.status(500).json({ error: "Failed to create task template" });
    }
  });

  // Update task template
  app.patch("/api/task-templates/:id", requirePermission("manage_projects"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid task template ID" });
      }
      const data = insertTaskTemplateSchema.partial().parse(req.body);
      const task = await storage.updateTaskTemplate(id, data);
      if (!task) {
        return res.status(404).json({ error: "Task template not found" });
      }
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating task template:", error);
      res.status(500).json({ error: "Failed to update task template" });
    }
  });

  // Delete task template
  app.delete("/api/task-templates/:id", requirePermission("manage_projects"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid task template ID" });
      }
      const deleted = await storage.deleteTaskTemplate(id);
      if (!deleted) {
        return res.status(404).json({ error: "Task template not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task template:", error);
      res.status(500).json({ error: "Failed to delete task template" });
    }
  });

  // ============================================
  // CREATE PROJECT FROM TEMPLATE
  // ============================================

  // Create project from template
  app.post("/api/projects/from-template/:templateId", requirePermission("manage_projects"), async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.templateId);
      if (isNaN(templateId)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }

      const userId = req.user?.id;
      const userName = req.user?.email || "Unknown";
      const data = insertProjectSchema.parse(req.body);

      const project = await storage.createProjectFromTemplate(templateId, {
        ...data,
        created_by_user_id: userId,
        created_by_user_name: userName,
      });

      await storage.createActivityLog({
        userId,
        userEmail: userName,
        action: "create_project_from_template",
        entityType: "project",
        entityId: project.id.toString(),
        details: `Created project from template: ${project.name}`,
      });

      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating project from template:", error);
      res.status(500).json({ error: "Failed to create project from template" });
    }
  });

  // ============================================
  // CLIENT PORTAL ROUTES
  // ============================================

  // Portal authentication middleware
  const isPortalAuthenticated: RequestHandler = async (req: any, res, next) => {
    if (!req.session?.portalUserId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const portalUser = await storage.getClientPortalUser(req.session.portalUserId);
    if (!portalUser || portalUser.is_active !== "yes") {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "Portal access is inactive" });
    }

    req.portalUser = portalUser;
    next();
  };

  // Portal login
  app.post("/api/portal/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const access = await storage.getClientPortalAccessByEmail(email);
      if (!access) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      if (access.is_active !== "yes") {
        return res.status(401).json({ error: "Portal access is inactive" });
      }

      // Verify password
      const bcrypt = await import("bcrypt");
      const isValidPassword = await bcrypt.compare(password, access.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Update last login
      await storage.updateClientPortalLastLogin(access.id);

      // Get full portal user with customer info
      const portalUser = await storage.getClientPortalUser(access.id);

      // Set session
      req.session.portalUserId = access.id;
      req.session.portalCustomerId = access.customer_id;
      req.session.portalEmail = access.email;

      res.json({ user: portalUser });
    } catch (error) {
      console.error("Portal login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Portal logout
  app.post("/api/portal/logout", (req, res) => {
    req.session.portalUserId = undefined;
    req.session.portalCustomerId = undefined;
    req.session.portalEmail = undefined;
    res.json({ success: true });
  });

  // Get current portal user
  app.get("/api/portal/me", isPortalAuthenticated, async (req: any, res) => {
    res.json({ user: req.portalUser });
  });

  // Get client's projects
  app.get("/api/portal/projects", isPortalAuthenticated, async (req: any, res) => {
    try {
      const projects = await storage.getClientProjects(req.portalUser.customer.id);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching portal projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  // Get single project with details (client-visible only)
  app.get("/api/portal/projects/:id", isPortalAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const project = await storage.getClientProjectWithDetails(id, req.portalUser.customer.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      res.json(project);
    } catch (error) {
      console.error("Error fetching portal project:", error);
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  // Get change orders for a project (client-visible only)
  app.get("/api/portal/projects/:id/change-orders", isPortalAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      // Verify project belongs to this customer
      const project = await storage.getClientProjectWithDetails(projectId, req.portalUser.customer.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Get change orders and filter to client-visible ones
      const allChangeOrders = await storage.getChangeOrders(projectId);
      const visibleChangeOrders = allChangeOrders.filter(co => co.client_visible === "yes");

      res.json(visibleChangeOrders);
    } catch (error) {
      console.error("Error fetching portal change orders:", error);
      res.status(500).json({ error: "Failed to fetch change orders" });
    }
  });

  // Approve a change order (portal client action)
  app.post("/api/portal/change-orders/:id/approve", isPortalAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid change order ID" });
      }

      const { signature } = req.body;
      if (!signature) {
        return res.status(400).json({ error: "Signature is required" });
      }

      const changeOrder = await storage.getChangeOrder(id);
      if (!changeOrder) {
        return res.status(404).json({ error: "Change order not found" });
      }

      // Verify change order belongs to customer's project
      const project = await storage.getClientProjectWithDetails(changeOrder.project_id, req.portalUser.customer.id);
      if (!project) {
        return res.status(404).json({ error: "Change order not found" });
      }

      // Only pending change orders can be approved
      if (changeOrder.status !== "pending_approval") {
        return res.status(400).json({ error: "Only pending change orders can be approved" });
      }

      // Only client-visible change orders can be approved by client
      if (changeOrder.client_visible !== "yes") {
        return res.status(404).json({ error: "Change order not found" });
      }

      const approvedBy = req.portalUser.customer.name;
      const approved = await storage.approveChangeOrder(id, approvedBy, signature);

      await storage.createActivityLog({
        userId: null,
        userEmail: req.portalUser.email,
        action: "portal_approve_change_order",
        entityType: "change_order",
        entityId: id.toString(),
        details: `Client approved change order CO-${changeOrder.co_number} via portal`,
      });

      res.json(approved);
    } catch (error) {
      console.error("Error approving change order via portal:", error);
      res.status(500).json({ error: "Failed to approve change order" });
    }
  });

  // ============================================
  // ADMIN ROUTES FOR MANAGING PORTAL ACCESS
  // ============================================

  // Get all portal access entries
  app.get("/api/client-portal-access", requirePermission("manage_customers"), async (req, res) => {
    try {
      const accessList = await storage.getAllClientPortalAccess();
      // Don't send password hashes
      const sanitized = accessList.map(({ password_hash, ...rest }) => rest);
      res.json(sanitized);
    } catch (error) {
      console.error("Error fetching portal access list:", error);
      res.status(500).json({ error: "Failed to fetch portal access" });
    }
  });

  // Get portal access for a specific customer
  app.get("/api/client-portal-access/customer/:customerId", requirePermission("manage_customers"), async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      if (isNaN(customerId)) {
        return res.status(400).json({ error: "Invalid customer ID" });
      }

      const access = await storage.getClientPortalAccessByCustomerId(customerId);
      if (!access) {
        return res.json(null);
      }

      const { password_hash, ...sanitized } = access;
      res.json(sanitized);
    } catch (error) {
      console.error("Error fetching customer portal access:", error);
      res.status(500).json({ error: "Failed to fetch portal access" });
    }
  });

  // Create portal access for a customer
  app.post("/api/client-portal-access", requirePermission("manage_customers"), async (req: any, res) => {
    try {
      const { customer_id, email, password, ...settings } = req.body;

      if (!customer_id || !email || !password) {
        return res.status(400).json({ error: "Customer ID, email, and password are required" });
      }

      // Check if customer exists
      const customer = await storage.getCustomer(customer_id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      // Check if email is already in use
      const existingAccess = await storage.getClientPortalAccessByEmail(email);
      if (existingAccess) {
        return res.status(400).json({ error: "Email is already in use for portal access" });
      }

      // Check if customer already has portal access
      const customerAccess = await storage.getClientPortalAccessByCustomerId(customer_id);
      if (customerAccess) {
        return res.status(400).json({ error: "Customer already has portal access" });
      }

      // Hash password
      const bcrypt = await import("bcrypt");
      const password_hash = await bcrypt.hash(password, 10);

      const access = await storage.createClientPortalAccess({
        customer_id,
        email,
        password_hash,
        ...settings,
      });

      await storage.createActivityLog({
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: "create_portal_access",
        entityType: "client_portal_access",
        entityId: access.id.toString(),
        details: `Created portal access for customer: ${customer.name}`,
      });

      const { password_hash: _, ...sanitized } = access;
      res.status(201).json(sanitized);
    } catch (error) {
      console.error("Error creating portal access:", error);
      res.status(500).json({ error: "Failed to create portal access" });
    }
  });

  // Update portal access
  app.patch("/api/client-portal-access/:id", requirePermission("manage_customers"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid portal access ID" });
      }

      const { password, ...data } = req.body;

      // If password is being updated, hash it
      if (password) {
        const bcrypt = await import("bcrypt");
        data.password_hash = await bcrypt.hash(password, 10);
      }

      const access = await storage.updateClientPortalAccess(id, data);
      if (!access) {
        return res.status(404).json({ error: "Portal access not found" });
      }

      await storage.createActivityLog({
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: "update_portal_access",
        entityType: "client_portal_access",
        entityId: id.toString(),
        details: `Updated portal access settings`,
      });

      const { password_hash, ...sanitized } = access;
      res.json(sanitized);
    } catch (error) {
      console.error("Error updating portal access:", error);
      res.status(500).json({ error: "Failed to update portal access" });
    }
  });

  // Delete portal access
  app.delete("/api/client-portal-access/:id", requirePermission("manage_customers"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid portal access ID" });
      }

      const deleted = await storage.deleteClientPortalAccess(id);
      if (!deleted) {
        return res.status(404).json({ error: "Portal access not found" });
      }

      await storage.createActivityLog({
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: "delete_portal_access",
        entityType: "client_portal_access",
        entityId: id.toString(),
        details: `Deleted portal access`,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting portal access:", error);
      res.status(500).json({ error: "Failed to delete portal access" });
    }
  });

  startScheduler(60);

  return httpServer;
}
