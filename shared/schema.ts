import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp, integer, index, jsonb, unique, numeric, boolean } from "drizzle-orm/pg-core";
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
  address: text("address"),
  notes: text("notes"),
  // Safe to store: only last 4 digits and card type for display purposes
  card_last4: text("card_last4"),
  card_brand: text("card_brand"),
  card_exp_month: text("card_exp_month"),
  card_exp_year: text("card_exp_year"),
  // REMOVED: card_full_number and card_cvc - NEVER store full card data
  // If you need to charge cards, use a payment processor like Stripe or Square
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
  project_type: text("project_type"),
  needs_installer: text("needs_installer").default("no"), // yes | no
  wants_designer: text("wants_designer").default("no"), // yes | no
  start_date: text("start_date"),
  has_special_request: text("has_special_request").default("no"), // yes | no
  special_request: text("special_request"),
  status: text("status").notNull().default("checked_out"), // checked_out | overdue | returned
  notes: text("notes"),
  auth_notes: text("auth_notes"),
  stripe_payment_intent_id: text("stripe_payment_intent_id"),
  created_by_user_id: varchar("created_by_user_id").references(() => users.id, { onDelete: 'set null' }),
  created_by_user_name: varchar("created_by_user_name"),
  last_reminder_sent: timestamp("last_reminder_sent"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  // Indexes for frequently queried columns
  index("IDX_checkouts_customer_id").on(table.customer_id),
  index("IDX_checkouts_inventory_item_id").on(table.inventory_item_id),
  index("IDX_checkouts_status").on(table.status),
]);

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
}, (table) => [
  index("IDX_email_notifications_checkout_id").on(table.checkout_id),
]);

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
  created_by_user_id: varchar("created_by_user_id").references(() => users.id, { onDelete: 'set null' }),
  created_by_user_name: varchar("created_by_user_name"),
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
  created_by_user_id: varchar("created_by_user_id").references(() => users.id, { onDelete: 'set null' }),
  created_by_user_name: varchar("created_by_user_name"),
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  signed_at: true,
});

export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;

// ============================================
// PROJECT TRACKER TABLES
// ============================================

// Projects - Main project entity linked to customers
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  customer_id: integer("customer_id").references(() => customers.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").default("active").notNull(), // active | on_hold | completed | cancelled

  // Address
  address_street: text("address_street"),
  address_city: text("address_city"),
  address_state: text("address_state"),
  address_zip: text("address_zip"),

  // Dates
  estimated_start_date: text("estimated_start_date"),
  estimated_end_date: text("estimated_end_date"),
  actual_start_date: text("actual_start_date"),
  actual_end_date: text("actual_end_date"),

  // Pricing
  original_estimate: numeric("original_estimate", { precision: 12, scale: 2 }),

  // Progress
  overall_progress: integer("overall_progress").default(0).notNull(),
  current_phase_id: integer("current_phase_id"),

  // Internal
  internal_notes: text("internal_notes"),

  // Metadata
  created_by_user_id: varchar("created_by_user_id").references(() => users.id, { onDelete: 'set null' }),
  created_by_user_name: varchar("created_by_user_name"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_projects_customer_id").on(table.customer_id),
  index("IDX_projects_status").on(table.status),
]);

// Project Phases - Major stages of a project
export const projectPhases = pgTable("project_phases", {
  id: serial("id").primaryKey(),
  project_id: integer("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  display_order: integer("display_order").notNull(),
  status: text("status").default("not_started").notNull(), // not_started | in_progress | on_hold | completed | skipped

  // Client visibility and approval
  client_visible: text("client_visible").default("yes").notNull(), // yes | no
  requires_approval: text("requires_approval").default("no").notNull(), // yes | no
  approved_at: timestamp("approved_at"),
  approved_by: text("approved_by"),
  approval_signature: text("approval_signature"),

  // Dates
  started_at: timestamp("started_at"),
  completed_at: timestamp("completed_at"),
  estimated_start: text("estimated_start"),
  estimated_end: text("estimated_end"),

  // Progress (calculated from tasks)
  progress: integer("progress").default(0).notNull(),

  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_project_phases_project_id").on(table.project_id),
  index("IDX_project_phases_status").on(table.status),
]);

// Project Tasks - Checklist items within phases
export const projectTasks = pgTable("project_tasks", {
  id: serial("id").primaryKey(),
  phase_id: integer("phase_id").references(() => projectPhases.id, { onDelete: 'cascade' }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  display_order: integer("display_order").notNull(),
  status: text("status").default("pending").notNull(), // pending | in_progress | completed | skipped

  // Assignment
  assigned_to: varchar("assigned_to").references(() => users.id, { onDelete: 'set null' }),

  // Dates
  due_date: text("due_date"),
  completed_at: timestamp("completed_at"),
  completed_by: varchar("completed_by").references(() => users.id, { onDelete: 'set null' }),

  // Client visibility and approval
  client_visible: text("client_visible").default("yes").notNull(), // yes | no
  requires_approval: text("requires_approval").default("no").notNull(), // yes | no
  approved_at: timestamp("approved_at"),
  approved_by: text("approved_by"),

  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_project_tasks_phase_id").on(table.phase_id),
  index("IDX_project_tasks_status").on(table.status),
]);

// Insert schemas for projects
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertProjectPhaseSchema = createInsertSchema(projectPhases).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertProjectTaskSchema = createInsertSchema(projectTasks).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Types for projects
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export type InsertProjectPhase = z.infer<typeof insertProjectPhaseSchema>;
export type ProjectPhase = typeof projectPhases.$inferSelect;

export type InsertProjectTask = z.infer<typeof insertProjectTaskSchema>;
export type ProjectTask = typeof projectTasks.$inferSelect;

// View types for joined data
export type ProjectWithCustomer = Project & {
  customer: Customer;
  createdByUser?: User | null;
};

export type ProjectPhaseWithTasks = ProjectPhase & {
  tasks: ProjectTask[];
};

export type ProjectWithDetails = Project & {
  customer: Customer;
  phases: ProjectPhaseWithTasks[];
  createdByUser?: User | null;
};

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
  { key: "manage_projects", label: "Manage Projects", description: "Create, edit, and manage project tracking" },
  { key: "manage_users", label: "Manage Users", description: "Create, edit, and delete users" },
  { key: "view_reports", label: "View Reports", description: "Access activity reports and analytics" },
] as const;

export type PermissionKey = typeof AVAILABLE_PERMISSIONS[number]["key"];
