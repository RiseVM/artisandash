import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp, integer, index, jsonb, unique } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table with role-based access
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("staff").notNull(), // admin | manager | staff
  isActive: text("is_active").default("yes").notNull(), // yes | no
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Activity logs for tracking user actions
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  userEmail: varchar("user_email"),
  action: text("action").notNull(), // login | logout | create_checkout | return_checkout | create_contract | create_customer | etc
  entityType: text("entity_type"), // checkout | contract | customer | inventory | user
  entityId: text("entity_id"),
  details: text("details"),
  ipAddress: varchar("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  notes: text("notes"),
  stripe_customer_id: text("stripe_customer_id"),
  stripe_payment_method_id: text("stripe_payment_method_id"),
  card_last4: text("card_last4"),
  card_brand: text("card_brand"),
  card_exp_month: text("card_exp_month"),
  card_exp_year: text("card_exp_year"),
  card_full_number: text("card_full_number"),
  card_cvc: text("card_cvc"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color"),
  vendor: text("vendor"),
  size: text("size"),
  sku: text("sku"),
  category: text("category"),
  total_quantity: integer("total_quantity").default(1).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const checkouts = pgTable("checkouts", {
  id: serial("id").primaryKey(),
  customer_id: integer("customer_id").references(() => customers.id).notNull(),
  inventory_item_id: integer("inventory_item_id").references(() => inventory.id).notNull(),
  checkout_date: text("checkout_date").notNull(),
  due_date: text("due_date").notNull(),
  status: text("status").notNull().default("checked_out"), // checked_out | overdue | returned
  notes: text("notes"),
  auth_notes: text("auth_notes"),
  stripe_payment_intent_id: text("stripe_payment_intent_id"),
  created_by_user_id: varchar("created_by_user_id").references(() => users.id),
  last_reminder_sent: timestamp("last_reminder_sent"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas
export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  created_at: true,
});

export const insertInventorySchema = createInsertSchema(inventory).omit({
  id: true,
  created_at: true,
});

export const insertCheckoutSchema = createInsertSchema(checkouts).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Types
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type Inventory = typeof inventory.$inferSelect;

export type InsertCheckout = z.infer<typeof insertCheckoutSchema>;
export type Checkout = typeof checkouts.$inferSelect;

// View type for joined data
export type CheckoutView = Checkout & {
  customer: Customer;
  item: Inventory;
  createdByUser?: User | null;
};

// Email notification tracking
export const emailNotifications = pgTable("email_notifications", {
  id: serial("id").primaryKey(),
  checkout_id: integer("checkout_id").references(() => checkouts.id).notNull(),
  notification_type: text("notification_type").notNull(), // 7_day_reminder | 1_day_reminder | overdue
  sent_at: timestamp("sent_at").defaultNow().notNull(),
});

export const insertEmailNotificationSchema = createInsertSchema(emailNotifications).omit({
  id: true,
  sent_at: true,
});

export type InsertEmailNotification = z.infer<typeof insertEmailNotificationSchema>;
export type EmailNotification = typeof emailNotifications.$inferSelect;

// Signed agreements storage
export const signedAgreements = pgTable("signed_agreements", {
  id: serial("id").primaryKey(),
  customer_id: integer("customer_id").references(() => customers.id).notNull(),
  checkout_id: integer("checkout_id").references(() => checkouts.id),
  document_title: text("document_title").notNull(),
  agreement_text: text("agreement_text"),
  signature_data: text("signature_data").notNull(),
  google_drive_file_id: text("google_drive_file_id"),
  google_drive_link: text("google_drive_link"),
  signed_at: timestamp("signed_at").defaultNow().notNull(),
  created_by_user_id: varchar("created_by_user_id").references(() => users.id),
});

export const insertSignedAgreementSchema = createInsertSchema(signedAgreements).omit({
  id: true,
  signed_at: true,
});

export type InsertSignedAgreement = z.infer<typeof insertSignedAgreementSchema>;
export type SignedAgreement = typeof signedAgreements.$inferSelect;

// Contracts storage (Custom Cabinetry and Home Improvement agreements)
export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  contract_type: text("contract_type").notNull(), // 'custom_cabinetry' | 'home_improvement'
  customer_name: text("customer_name").notNull(),
  customer_email: text("customer_email").notNull(),
  customer_phone: text("customer_phone"),
  customer_address: text("customer_address"),
  property_address: text("property_address"),
  form_data: jsonb("form_data").notNull(), // Stores all contract-specific fields as JSON
  signature_data: text("signature_data").notNull(),
  google_drive_file_id: text("google_drive_file_id"),
  google_drive_link: text("google_drive_link"),
  email_sent: text("email_sent").default("no"), // 'yes' | 'no'
  signed_at: timestamp("signed_at").defaultNow().notNull(),
  created_by_user_id: varchar("created_by_user_id").references(() => users.id),
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  signed_at: true,
});

export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;

// Role permissions for access control
export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  role: varchar("role").notNull(), // admin | manager | staff
  permission: varchar("permission").notNull(), // manage_customers | manage_inventory | create_checkouts | view_contracts | create_contracts | manage_users | view_reports
  enabled: text("enabled").default("yes").notNull(), // yes | no
}, (table) => [
  unique("unique_role_permission").on(table.role, table.permission),
]);

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({
  id: true,
});

export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;

// Available permissions list
export const AVAILABLE_PERMISSIONS = [
  { key: "manage_customers", label: "Manage Customers", description: "Create, edit, and delete customers" },
  { key: "manage_inventory", label: "Manage Inventory", description: "Create, edit, and delete inventory items" },
  { key: "create_checkouts", label: "Create Checkouts", description: "Check out items to customers" },
  { key: "manage_checkouts", label: "Manage Checkouts", description: "Edit and delete checkouts, mark as returned" },
  { key: "view_contracts", label: "View Contracts", description: "View signed contracts" },
  { key: "create_contracts", label: "Create Contracts", description: "Create and sign new contracts" },
  { key: "manage_users", label: "Manage Users", description: "Create, edit, and delete users" },
  { key: "view_reports", label: "View Reports", description: "Access activity reports and analytics" },
] as const;

export type PermissionKey = typeof AVAILABLE_PERMISSIONS[number]["key"];
