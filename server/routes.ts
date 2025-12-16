import type { Express, RequestHandler } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, insertInventorySchema, insertCheckoutSchema, insertSignedAgreementSchema, insertContractSchema, insertUserSchema, type User } from "@shared/schema";
import { z } from "zod";
import { startScheduler, checkAndSendNotifications } from "./notificationScheduler";
import { sendSampleReminder, sendContractEmail } from "./emailService";
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

  // User management routes (admin only)
  app.get('/api/users', isAdmin, async (req: any, res) => {
    try {
      const users = await storage.getUsers();
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

  app.post('/api/users', isAdmin, async (req: any, res) => {
    try {
      const { email, password, firstName, lastName, role } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
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

  app.patch('/api/users/:id', isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { email, password, firstName, lastName, role, isActive } = req.body;
      
      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
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
      
      await storage.deleteUser(id);
      
      await storage.createActivityLog({
        userId: req.user!.id,
        userEmail: req.user!.email,
        action: "delete_user",
        entityType: "user",
        entityId: id,
        details: `Deleted user: ${existingUser.email}`,
        ipAddress: req.ip,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Activity logs routes (admin only)
  app.get('/api/activity-logs', isAdmin, async (req: any, res) => {
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

  // Role permissions routes (admin only)
  app.get('/api/role-permissions', isAdmin, async (req: any, res) => {
    try {
      const permissions = await storage.getRolePermissions();
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching role permissions:", error);
      res.status(500).json({ error: "Failed to fetch role permissions" });
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
    const customers = await storage.getCustomers();
    res.json(customers);
  });

  app.get("/api/customers/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const customer = await storage.getCustomer(id);
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    res.json(customer);
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
    const items = await storage.getInventory();
    res.json(items);
  });

  app.get("/api/inventory/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const item = await storage.getInventoryItem(id);
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json(item);
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
    const checkoutViews = await storage.getCheckoutViews();
    res.json(checkoutViews);
  });

  app.get("/api/checkouts/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const checkoutView = await storage.getCheckoutView(id);
    if (!checkoutView) return res.status(404).json({ error: "Checkout not found" });
    res.json(checkoutView);
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
      const deleted = await storage.deleteCheckout(id);
      if (!deleted) return res.status(404).json({ error: "Checkout not found" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete checkout" });
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

  startScheduler(60);

  return httpServer;
}
