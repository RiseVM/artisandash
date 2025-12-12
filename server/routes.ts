import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, insertInventorySchema, insertCheckoutSchema, insertSignedAgreementSchema } from "@shared/schema";
import { z } from "zod";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { startScheduler, checkAndSendNotifications } from "./notificationScheduler";
import { sendSampleReminder } from "./emailService";
import { uploadSignatureToGoogleDrive } from "./googleDriveService";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Setup Replit Auth
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Customers
  app.get("/api/customers", async (req, res) => {
    const customers = await storage.getCustomers();
    res.json(customers);
  });

  app.get("/api/customers/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const customer = await storage.getCustomer(id);
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    res.json(customer);
  });

  app.post("/api/customers", async (req, res) => {
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

  app.patch("/api/customers/:id", async (req, res) => {
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

  app.delete("/api/customers/:id", async (req, res) => {
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
  app.get("/api/inventory", async (req, res) => {
    const items = await storage.getInventory();
    res.json(items);
  });

  app.get("/api/inventory/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const item = await storage.getInventoryItem(id);
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json(item);
  });

  app.post("/api/inventory", async (req, res) => {
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

  app.patch("/api/inventory/:id", async (req, res) => {
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

  app.delete("/api/inventory/:id", async (req, res) => {
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
  app.get("/api/checkouts", async (req, res) => {
    const checkoutViews = await storage.getCheckoutViews();
    res.json(checkoutViews);
  });

  app.get("/api/checkouts/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const checkoutView = await storage.getCheckoutView(id);
    if (!checkoutView) return res.status(404).json({ error: "Checkout not found" });
    res.json(checkoutView);
  });

  app.post("/api/checkouts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.patch("/api/checkouts/:id", async (req, res) => {
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

  app.delete("/api/checkouts/:id", async (req, res) => {
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
      const userId = req.user.claims.sub;
      const data = insertSignedAgreementSchema.parse(req.body);
      
      if (!data.signature_data || data.signature_data.trim().length === 0) {
        return res.status(400).json({ error: "Signature data is required" });
      }
      
      const customer = await storage.getCustomer(data.customer_id);
      const customerName = customer?.name || "Unknown Customer";
      
      let googleDriveFileId: string | null = null;
      let googleDriveLink: string | null = null;
      
      try {
        const driveResult = await uploadSignatureToGoogleDrive(customerName, data.signature_data);
        if (driveResult) {
          googleDriveFileId = driveResult.fileId;
          googleDriveLink = driveResult.webViewLink;
        }
      } catch (driveError) {
        console.error("Failed to upload to Google Drive (continuing without):", driveError);
      }
      
      const agreement = await storage.createSignedAgreement({
        ...data,
        created_by_user_id: userId,
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

  startScheduler(60);

  return httpServer;
}
