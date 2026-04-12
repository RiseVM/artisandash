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
  role: varchar("role").default("staff").notNull(), // admin | manager | staff | timecard_only
  isActive: text("is_active").default("yes").notNull(), // yes | no
  // Mileage settings (admin-managed per employee)
  mileageEnabled: text("mileage_enabled").default("no").notNull(), // yes | no
  mileageRate: numeric("mileage_rate", { precision: 5, scale: 3 }), // $/mile, null = not set
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
  signature_data: text("signature_data"), // nullable for draft support
  status: text("status").default("draft").notNull(), // 'draft' | 'sent_for_signature' | 'signed' | 'completed'
  signing_token: text("signing_token"), // for remote signing
  signing_token_expires: timestamp("signing_token_expires"), // 7-day expiry
  last_step: text("last_step").default("form").notNull(), // track last form step for drafts
  google_drive_file_id: text("google_drive_file_id"),
  google_drive_link: text("google_drive_link"),
  email_sent: text("email_sent").default("no"), // 'yes' | 'no'
  signed_at: timestamp("signed_at"), // nullable
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  created_by_user_id: varchar("created_by_user_id").references(() => users.id, { onDelete: 'set null' }),
  created_by_user_name: varchar("created_by_user_name"),
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  signing_token: true,
  signing_token_expires: true,
  created_at: true,
  updated_at: true,
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
  project_type: text("project_type"), // bathroom | kitchen | floor | full_reno | custom
  status: text("status").default("active").notNull(), // active | on_hold | completed | cancelled

  // Address
  address_street: text("address_street"),
  address_city: text("address_city"),
  address_state: text("address_state"),
  address_zip: text("address_zip"),
  site_address: text("site_address"), // Full combined address string

  // Dates
  estimated_start_date: text("estimated_start_date"),
  estimated_end_date: text("estimated_end_date"),
  actual_start_date: text("actual_start_date"),
  actual_end_date: text("actual_end_date"),

  // Pricing
  original_estimate: numeric("original_estimate", { precision: 12, scale: 2 }),
  budget_min: numeric("budget_min", { precision: 12, scale: 2 }),
  budget_max: numeric("budget_max", { precision: 12, scale: 2 }),

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

  // Extended fields
  notes: text("notes"), // Per-task notes (e.g., delivery location, special instructions)
  category: text("category"), // Optional grouping (e.g., "procurement_plumbing")

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

// ============================================
// PROJECT TEMPLATES
// ============================================

// Project Templates - Reusable project structures
export const projectTemplates = pgTable("project_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  is_active: text("is_active").default("yes").notNull(), // yes | no

  // Metadata
  created_by_user_id: varchar("created_by_user_id").references(() => users.id, { onDelete: 'set null' }),
  created_by_user_name: varchar("created_by_user_name"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Phase Templates - Phases within a project template
export const phaseTemplates = pgTable("phase_templates", {
  id: serial("id").primaryKey(),
  project_template_id: integer("project_template_id").references(() => projectTemplates.id, { onDelete: 'cascade' }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  display_order: integer("display_order").notNull(),

  // Client visibility and approval defaults
  client_visible: text("client_visible").default("yes").notNull(), // yes | no
  requires_approval: text("requires_approval").default("no").notNull(), // yes | no

  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_phase_templates_project_template_id").on(table.project_template_id),
]);

// Task Templates - Tasks within a phase template
export const taskTemplates = pgTable("task_templates", {
  id: serial("id").primaryKey(),
  phase_template_id: integer("phase_template_id").references(() => phaseTemplates.id, { onDelete: 'cascade' }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  display_order: integer("display_order").notNull(),

  // Client visibility and approval defaults
  client_visible: text("client_visible").default("yes").notNull(), // yes | no
  requires_approval: text("requires_approval").default("no").notNull(), // yes | no

  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_task_templates_phase_template_id").on(table.phase_template_id),
]);

// Insert schemas for templates
export const insertProjectTemplateSchema = createInsertSchema(projectTemplates).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertPhaseTemplateSchema = createInsertSchema(phaseTemplates).omit({
  id: true,
  created_at: true,
});

export const insertTaskTemplateSchema = createInsertSchema(taskTemplates).omit({
  id: true,
  created_at: true,
});

// Types for templates
export type InsertProjectTemplate = z.infer<typeof insertProjectTemplateSchema>;
export type ProjectTemplate = typeof projectTemplates.$inferSelect;

export type InsertPhaseTemplate = z.infer<typeof insertPhaseTemplateSchema>;
export type PhaseTemplate = typeof phaseTemplates.$inferSelect;

export type InsertTaskTemplate = z.infer<typeof insertTaskTemplateSchema>;
export type TaskTemplate = typeof taskTemplates.$inferSelect;

// View types for templates
export type PhaseTemplateWithTasks = PhaseTemplate & {
  tasks: TaskTemplate[];
};

export type ProjectTemplateWithDetails = ProjectTemplate & {
  phases: PhaseTemplateWithTasks[];
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

// ============================================
// CLIENT PORTAL
// ============================================

// Client Portal Access - Customer login credentials and settings
export const clientPortalAccess = pgTable("client_portal_access", {
  id: serial("id").primaryKey(),
  customer_id: integer("customer_id").references(() => customers.id, { onDelete: 'cascade' }).notNull(),

  // Authentication
  email: text("email").notNull(),
  password_hash: text("password_hash").notNull(),

  // Status
  is_active: text("is_active").default("yes").notNull(), // yes | no
  last_login: timestamp("last_login"),

  // Visibility settings - what the client can see
  show_pricing: text("show_pricing").default("no").notNull(), // yes | no
  show_internal_notes: text("show_internal_notes").default("no").notNull(), // yes | no

  // Notification preferences
  email_on_phase_complete: text("email_on_phase_complete").default("yes").notNull(), // yes | no
  email_on_task_complete: text("email_on_task_complete").default("no").notNull(), // yes | no
  email_on_approval_needed: text("email_on_approval_needed").default("yes").notNull(), // yes | no
  email_on_new_message: text("email_on_new_message").default("yes").notNull(), // yes | no
  email_on_delivery_update: text("email_on_delivery_update").default("yes").notNull(), // yes | no

  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_client_portal_customer_id").on(table.customer_id),
  index("IDX_client_portal_email").on(table.email),
]);

export const insertClientPortalAccessSchema = createInsertSchema(clientPortalAccess).omit({
  id: true,
  created_at: true,
  updated_at: true,
  last_login: true,
});

export type InsertClientPortalAccess = z.infer<typeof insertClientPortalAccessSchema>;
export type ClientPortalAccess = typeof clientPortalAccess.$inferSelect;

// Client portal view type (without password hash)
export type ClientPortalUser = Omit<ClientPortalAccess, 'password_hash'> & {
  customer: Customer;
};

// ============================================
// DELIVERIES & CHANGE ORDERS
// ============================================

// Project Deliveries - Track material deliveries for projects
export const projectDeliveries = pgTable("project_deliveries", {
  id: serial("id").primaryKey(),
  project_id: integer("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  linked_phase_id: integer("linked_phase_id").references(() => projectPhases.id, { onDelete: 'set null' }),

  // Delivery details
  description: text("description").notNull(),
  vendor: text("vendor"),
  status: text("status").default("pending").notNull(), // pending | ordered | shipped | delivered | delayed | cancelled

  // Dates
  expected_date: text("expected_date"),
  actual_date: text("actual_date"),

  // Tracking
  tracking_number: text("tracking_number"),
  carrier: text("carrier"),

  // Cost
  cost: numeric("cost", { precision: 12, scale: 2 }),

  // Notes
  notes: text("notes"),
  delay_reason: text("delay_reason"),

  // Client visibility
  client_visible: text("client_visible").default("yes").notNull(), // yes | no

  // Metadata
  created_by_user_id: varchar("created_by_user_id").references(() => users.id, { onDelete: 'set null' }),
  created_by_user_name: varchar("created_by_user_name"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_project_deliveries_project_id").on(table.project_id),
  index("IDX_project_deliveries_status").on(table.status),
]);

// Change Orders - Track scope changes and their approval
export const changeOrders = pgTable("change_orders", {
  id: serial("id").primaryKey(),
  project_id: integer("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  linked_phase_id: integer("linked_phase_id").references(() => projectPhases.id, { onDelete: 'set null' }),

  // Change order number (auto-increment per project handled in code)
  co_number: integer("co_number").notNull(),

  // Details
  title: text("title").notNull(),
  description: text("description"),
  reason: text("reason"),

  // Impact
  cost_impact: numeric("cost_impact", { precision: 12, scale: 2 }),
  time_impact_days: integer("time_impact_days"),

  // Status workflow
  status: text("status").default("draft").notNull(), // draft | pending_approval | approved | rejected | void

  // Dates
  submitted_at: timestamp("submitted_at"),
  decided_at: timestamp("decided_at"),

  // Approval fields
  approved_by: text("approved_by"),
  approval_signature: text("approval_signature"),
  rejection_reason: text("rejection_reason"),

  // Client visibility
  client_visible: text("client_visible").default("yes").notNull(), // yes | no

  // Metadata
  created_by_user_id: varchar("created_by_user_id").references(() => users.id, { onDelete: 'set null' }),
  created_by_user_name: varchar("created_by_user_name"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_change_orders_project_id").on(table.project_id),
  index("IDX_change_orders_status").on(table.status),
]);

// Insert schemas for deliveries and change orders
export const insertProjectDeliverySchema = createInsertSchema(projectDeliveries).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertChangeOrderSchema = createInsertSchema(changeOrders).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Types for deliveries and change orders
export type InsertProjectDelivery = z.infer<typeof insertProjectDeliverySchema>;
export type ProjectDelivery = typeof projectDeliveries.$inferSelect;

export type InsertChangeOrder = z.infer<typeof insertChangeOrderSchema>;
export type ChangeOrder = typeof changeOrders.$inferSelect;

// View types with relations
export type ProjectDeliveryWithPhase = ProjectDelivery & {
  phase?: ProjectPhase | null;
};

export type ChangeOrderWithPhase = ChangeOrder & {
  phase?: ProjectPhase | null;
};

// ============================================
// PROJECT FILES
// ============================================

// Project Files - Attachments for projects, phases, tasks, etc.
export const projectFiles = pgTable("project_files", {
  id: serial("id").primaryKey(),
  project_id: integer("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),

  // Link to specific entity
  entity_type: text("entity_type").notNull(), // project | phase | task | delivery | change_order
  entity_id: integer("entity_id"),

  // File info
  name: text("name").notNull(),
  file_url: text("file_url").notNull(),
  file_size: integer("file_size"),
  mime_type: text("mime_type"),

  // Categorization
  category: text("category"), // document | photo | receipt | contract | other
  description: text("description"),

  // Photo-specific fields
  is_photo: text("is_photo").default("no").notNull(), // yes | no
  thumbnail_url: text("thumbnail_url"),
  photo_type: text("photo_type"), // before | during | after | issue | other

  // Client visibility
  client_visible: text("client_visible").default("yes").notNull(), // yes | no

  // Metadata
  uploaded_by_user_id: varchar("uploaded_by_user_id").references(() => users.id, { onDelete: 'set null' }),
  uploaded_by_user_name: varchar("uploaded_by_user_name"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_project_files_project_id").on(table.project_id),
  index("IDX_project_files_entity").on(table.entity_type, table.entity_id),
]);

export const insertProjectFileSchema = createInsertSchema(projectFiles).omit({
  id: true,
  created_at: true,
});

export type InsertProjectFile = z.infer<typeof insertProjectFileSchema>;
export type ProjectFile = typeof projectFiles.$inferSelect;

// ============================================
// TIME TRACKING
// ============================================

// Time Entries - Track hours worked on projects
export const timeEntries = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  project_id: integer("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  linked_phase_id: integer("linked_phase_id").references(() => projectPhases.id, { onDelete: 'set null' }),

  // Who and when
  user_id: varchar("user_id").references(() => users.id, { onDelete: 'set null' }),
  user_name: varchar("user_name"),
  entry_date: text("entry_date").notNull(),

  // Time
  hours: numeric("hours", { precision: 5, scale: 2 }).notNull(),

  // Categorization
  category: text("category"), // labor | design | consultation | travel | admin | other
  description: text("description"),

  // Billing
  is_billable: text("is_billable").default("yes").notNull(), // yes | no
  hourly_rate: numeric("hourly_rate", { precision: 10, scale: 2 }),

  // Client visibility
  client_visible: text("client_visible").default("no").notNull(), // yes | no

  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_time_entries_project_id").on(table.project_id),
  index("IDX_time_entries_user_id").on(table.user_id),
  index("IDX_time_entries_date").on(table.entry_date),
]);

export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type TimeEntry = typeof timeEntries.$inferSelect;

export type TimeEntryWithPhase = TimeEntry & {
  phase?: ProjectPhase | null;
};

// ============================================
// PROJECT PRICING
// ============================================

// Project Line Items - Cost breakdown
export const projectLineItems = pgTable("project_line_items", {
  id: serial("id").primaryKey(),
  project_id: integer("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  linked_phase_id: integer("linked_phase_id").references(() => projectPhases.id, { onDelete: 'set null' }),
  linked_change_order_id: integer("linked_change_order_id").references(() => changeOrders.id, { onDelete: 'set null' }),

  // Item details
  category: text("category"), // materials | labor | equipment | subcontractor | permit | other
  description: text("description").notNull(),

  // Pricing
  quantity: numeric("quantity", { precision: 10, scale: 2 }).default("1").notNull(),
  unit: text("unit"), // each | sqft | linear ft | hour | lot | etc
  unit_price: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),

  // Client visibility
  client_visible: text("client_visible").default("yes").notNull(), // yes | no

  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_project_line_items_project_id").on(table.project_id),
]);

export const insertProjectLineItemSchema = createInsertSchema(projectLineItems).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertProjectLineItem = z.infer<typeof insertProjectLineItemSchema>;
export type ProjectLineItem = typeof projectLineItems.$inferSelect;

export type ProjectLineItemWithRelations = ProjectLineItem & {
  phase?: ProjectPhase | null;
  changeOrder?: ChangeOrder | null;
};

// Project Payments - Payment tracking
export const projectPayments = pgTable("project_payments", {
  id: serial("id").primaryKey(),
  project_id: integer("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),

  // Payment details
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),

  // Dates
  due_date: text("due_date"),
  paid_date: text("paid_date"),

  // Status
  status: text("status").default("pending").notNull(), // pending | paid | overdue | cancelled

  // Payment info
  payment_method: text("payment_method"), // cash | check | card | transfer | other
  reference_number: text("reference_number"),
  notes: text("notes"),

  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_project_payments_project_id").on(table.project_id),
  index("IDX_project_payments_status").on(table.status),
]);

export const insertProjectPaymentSchema = createInsertSchema(projectPayments).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertProjectPayment = z.infer<typeof insertProjectPaymentSchema>;
export type ProjectPayment = typeof projectPayments.$inferSelect;

// ============================================
// PROJECT UPDATES / ACTIVITY FEED
// ============================================

export const projectUpdates = pgTable("project_updates", {
  id: serial("id").primaryKey(),
  project_id: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  linked_phase_id: integer("linked_phase_id").references(() => projectPhases.id),

  // Author - either admin user or client
  user_id: text("user_id").references(() => users.id),
  user_name: text("user_name"),
  client_portal_user_id: integer("client_portal_user_id"),
  client_name: text("client_name"),

  // Content
  update_type: text("update_type").notNull(), // note, status_change, photo, document, message, milestone, system, task_completed, phase_completed
  title: text("title"),
  content: text("content"),

  // Visibility
  is_internal: text("is_internal").default("no").notNull(), // yes | no - if yes, not visible to client

  // Metadata for system-generated updates
  metadata: text("metadata"), // JSON string for extra data

  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_project_updates_project_id").on(table.project_id),
  index("IDX_project_updates_created_at").on(table.created_at),
]);

export const insertProjectUpdateSchema = createInsertSchema(projectUpdates).omit({
  id: true,
  created_at: true,
});

export type InsertProjectUpdate = z.infer<typeof insertProjectUpdateSchema>;
export type ProjectUpdate = typeof projectUpdates.$inferSelect;

// Project Messages - Two-way messaging between admin and client
export const projectMessages = pgTable("project_messages", {
  id: serial("id").primaryKey(),
  project_id: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),

  // Sender - either admin user or client portal user
  sender_type: text("sender_type").notNull(), // "admin" | "client"
  sender_user_id: text("sender_user_id").references(() => users.id), // For admin
  sender_portal_user_id: integer("sender_portal_user_id"), // For client
  sender_name: text("sender_name").notNull(),

  // Message content
  subject: text("subject"),
  content: text("content").notNull(),

  // Read status
  read_by_admin: text("read_by_admin").default("no").notNull(), // "yes" | "no"
  read_by_admin_at: timestamp("read_by_admin_at"),
  read_by_client: text("read_by_client").default("no").notNull(), // "yes" | "no"
  read_by_client_at: timestamp("read_by_client_at"),

  // Threading (optional)
  reply_to_id: integer("reply_to_id"),

  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_project_messages_project_id").on(table.project_id),
  index("IDX_project_messages_created_at").on(table.created_at),
]);

export const insertProjectMessageSchema = createInsertSchema(projectMessages).omit({
  id: true,
  created_at: true,
  read_by_admin_at: true,
  read_by_client_at: true,
});

export type InsertProjectMessage = z.infer<typeof insertProjectMessageSchema>;
export type ProjectMessage = typeof projectMessages.$inferSelect;

// ============================================
// CUSTOM FIELDS - Flexible data capture
// ============================================

// Custom Field Definitions - Define what custom fields are available
export const customFieldDefinitions = pgTable("custom_field_definitions", {
  id: serial("id").primaryKey(),

  // Where this field applies
  entity_type: text("entity_type").notNull(), // project | phase | task

  // Field configuration
  field_name: text("field_name").notNull(),
  field_label: text("field_label").notNull(),
  field_type: text("field_type").notNull(), // text | number | date | select | checkbox | textarea

  // For select fields - JSON array of options
  options: text("options"), // JSON string: ["Option 1", "Option 2"]

  // Validation
  is_required: text("is_required").default("no").notNull(), // yes | no
  default_value: text("default_value"),

  // Display
  display_order: integer("display_order").default(0).notNull(),
  placeholder: text("placeholder"),
  help_text: text("help_text"),

  // Client visibility
  client_visible: text("client_visible").default("yes").notNull(), // yes | no

  // Status
  is_active: text("is_active").default("yes").notNull(), // yes | no

  // Template association (optional - for template-specific fields)
  project_template_id: integer("project_template_id").references(() => projectTemplates.id, { onDelete: 'cascade' }),

  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_custom_field_defs_entity_type").on(table.entity_type),
  index("IDX_custom_field_defs_template_id").on(table.project_template_id),
]);

// Custom Field Values - Store actual values for custom fields
export const customFieldValues = pgTable("custom_field_values", {
  id: serial("id").primaryKey(),
  field_definition_id: integer("field_definition_id").references(() => customFieldDefinitions.id, { onDelete: 'cascade' }).notNull(),

  // Which entity this value belongs to
  entity_type: text("entity_type").notNull(), // project | phase | task
  entity_id: integer("entity_id").notNull(),

  // The value (stored as text, parsed based on field_type)
  value: text("value"),

  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_custom_field_values_field_def").on(table.field_definition_id),
  index("IDX_custom_field_values_entity").on(table.entity_type, table.entity_id),
  unique("unique_field_value_per_entity").on(table.field_definition_id, table.entity_type, table.entity_id),
]);

export const insertCustomFieldDefinitionSchema = createInsertSchema(customFieldDefinitions).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertCustomFieldValueSchema = createInsertSchema(customFieldValues).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertCustomFieldDefinition = z.infer<typeof insertCustomFieldDefinitionSchema>;
export type CustomFieldDefinition = typeof customFieldDefinitions.$inferSelect;

export type InsertCustomFieldValue = z.infer<typeof insertCustomFieldValueSchema>;
export type CustomFieldValue = typeof customFieldValues.$inferSelect;

// View type with definition
export type CustomFieldValueWithDefinition = CustomFieldValue & {
  definition: CustomFieldDefinition;
};

// ============================================
// OUT OF SCOPE TRACKING
// ============================================

// Out of Scope Items - Track items explicitly excluded from project scope
export const outOfScopeItems = pgTable("out_of_scope_items", {
  id: serial("id").primaryKey(),
  project_id: integer("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),

  // Item details
  item: text("item").notNull(),
  reason: text("reason"),

  // Client acknowledgment
  client_acknowledged: text("client_acknowledged").default("no").notNull(), // yes | no
  acknowledged_at: timestamp("acknowledged_at"),
  acknowledged_by: text("acknowledged_by"),

  // Client visibility
  client_visible: text("client_visible").default("yes").notNull(), // yes | no

  // Metadata
  created_by_user_id: varchar("created_by_user_id").references(() => users.id, { onDelete: 'set null' }),
  created_by_user_name: varchar("created_by_user_name"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_out_of_scope_project_id").on(table.project_id),
]);

export const insertOutOfScopeItemSchema = createInsertSchema(outOfScopeItems).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertOutOfScopeItem = z.infer<typeof insertOutOfScopeItemSchema>;
export type OutOfScopeItem = typeof outOfScopeItems.$inferSelect;

// ============================================
// CLIENT FEEDBACK
// ============================================

// Client Feedback - Collect feedback from clients on projects/phases
export const clientFeedback = pgTable("client_feedback", {
  id: serial("id").primaryKey(),
  project_id: integer("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  linked_phase_id: integer("linked_phase_id").references(() => projectPhases.id, { onDelete: 'set null' }),

  // Who submitted
  client_portal_user_id: integer("client_portal_user_id").references(() => clientPortalAccess.id, { onDelete: 'set null' }),
  client_name: text("client_name"),

  // Feedback content
  feedback_type: text("feedback_type").notNull(), // rating | comment | issue | suggestion | compliment
  rating: integer("rating"), // 1-5 stars (optional)
  title: text("title"),
  content: text("content").notNull(),

  // Status
  status: text("status").default("new").notNull(), // new | reviewed | responded | resolved

  // Admin response
  admin_response: text("admin_response"),
  responded_by_user_id: varchar("responded_by_user_id").references(() => users.id, { onDelete: 'set null' }),
  responded_by_user_name: varchar("responded_by_user_name"),
  responded_at: timestamp("responded_at"),

  // Internal notes
  internal_notes: text("internal_notes"),

  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_client_feedback_project_id").on(table.project_id),
  index("IDX_client_feedback_status").on(table.status),
]);

export const insertClientFeedbackSchema = createInsertSchema(clientFeedback).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertClientFeedback = z.infer<typeof insertClientFeedbackSchema>;
export type ClientFeedback = typeof clientFeedback.$inferSelect;

// ============================================
// BUG REPORTS
// ============================================

// Bug Reports - Track user-submitted bug reports and system errors
export const bugReports = pgTable("bug_reports", {
  id: serial("id").primaryKey(),

  // Reporter info
  reporter_email: text("reporter_email"),
  reporter_name: text("reporter_name"),
  reporter_user_id: varchar("reporter_user_id").references(() => users.id, { onDelete: 'set null' }),

  // Bug details
  title: text("title").notNull(),
  description: text("description").notNull(),
  page_url: text("page_url"),

  // Error log info (for automatic error reports)
  error_message: text("error_message"),
  error_stack: text("error_stack"),
  browser_info: text("browser_info"),

  // Status tracking
  status: text("status").default("new").notNull(), // new | in_progress | resolved | closed
  priority: text("priority").default("normal"), // low | normal | high | critical

  // Admin resolution
  resolved_by_user_id: varchar("resolved_by_user_id").references(() => users.id, { onDelete: 'set null' }),
  resolved_by_user_name: varchar("resolved_by_user_name"),
  resolution_notes: text("resolution_notes"),
  resolved_at: timestamp("resolved_at"),

  // Metadata
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_bug_reports_status").on(table.status),
  index("IDX_bug_reports_created_at").on(table.created_at),
]);

export const insertBugReportSchema = createInsertSchema(bugReports).omit({
  id: true,
  created_at: true,
  updated_at: true,
  resolved_at: true,
});

export type InsertBugReport = z.infer<typeof insertBugReportSchema>;
export type BugReport = typeof bugReports.$inferSelect;

// ============================================
// EMPLOYEE TIMESHEETS
// ============================================

// Time Clock - Employee clock in/out records
export const timeClock = pgTable("time_clock", {
  id: serial("id").primaryKey(),
  user_id: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Clock times
  clock_in: timestamp("clock_in").notNull(),
  clock_out: timestamp("clock_out"), // NULL = still clocked in

  // Details
  break_minutes: integer("break_minutes").default(0).notNull(),
  notes: text("notes"),
  project_id: integer("project_id").references(() => projects.id, { onDelete: 'set null' }),

  // Metadata
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_time_clock_user_id").on(table.user_id),
  index("IDX_time_clock_clock_in").on(table.clock_in),
  index("IDX_time_clock_project_id").on(table.project_id),
]);

export const insertTimeClockSchema = createInsertSchema(timeClock).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertTimeClock = z.infer<typeof insertTimeClockSchema>;
export type TimeClock = typeof timeClock.$inferSelect;

// View type with relations
export type TimeClockWithDetails = TimeClock & {
  user?: User | null;
  project?: { id: number; name: string } | null;
};

// ============================================
// ESTIMATES
// ============================================

// Estimates - Standalone pre-project quotes linked to customers
export const estimates = pgTable("estimates", {
  id: serial("id").primaryKey(),
  customer_id: integer("customer_id").references(() => customers.id),

  // Estimate number (auto-generated: EST-YYYY-NNN)
  estimate_number: text("estimate_number").notNull(),

  // Details
  title: text("title").notNull(),
  description: text("description"),

  // Status workflow
  status: text("status").default("draft").notNull(), // draft | sent | approved | rejected | expired | converted

  // Dates
  issue_date: text("issue_date"),
  expiry_date: text("expiry_date"),
  valid_until: text("valid_until"),
  sent_at: timestamp("sent_at"),
  approved_at: timestamp("approved_at"),
  expired_at: timestamp("expired_at"),

  // Totals (recalculated from line items)
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).default("0").notNull(),
  tax_rate: numeric("tax_rate", { precision: 5, scale: 4 }).default("0").notNull(),
  tax_amount: numeric("tax_amount", { precision: 12, scale: 2 }).default("0").notNull(),
  total: numeric("total", { precision: 12, scale: 2 }).default("0").notNull(),

  // Notes
  notes: text("notes"),
  internal_notes: text("internal_notes"),

  // Linked project (if converted)
  project_id: integer("project_id").references(() => projects.id, { onDelete: 'set null' }),

  // QuickBooks integration
  qb_sync_status: text("qb_sync_status").default("not_synced").notNull(), // not_synced | queued | synced | error
  qb_invoice_id: text("qb_invoice_id"), // QuickBooks invoice ID once synced
  qb_synced_at: timestamp("qb_synced_at"),
  qb_error_message: text("qb_error_message"),

  // Metadata
  created_by_user_id: varchar("created_by_user_id").references(() => users.id, { onDelete: 'set null' }),
  created_by_user_name: varchar("created_by_user_name"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_estimates_customer_id").on(table.customer_id),
  index("IDX_estimates_status").on(table.status),
  index("IDX_estimates_estimate_number").on(table.estimate_number),
]);

// Estimate Line Items - Itemized rows per estimate
export const estimateLineItems = pgTable("estimate_line_items", {
  id: serial("id").primaryKey(),
  estimate_id: integer("estimate_id").references(() => estimates.id, { onDelete: 'cascade' }).notNull(),

  // Grouping
  section: text("section"), // e.g., "Materials", "Labor", "Design"
  category: text("category"), // materials | labor | equipment | subcontractor | permit | other

  // Item details
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).default("1").notNull(),
  unit: text("unit"), // each | sqft | linear ft | hour | lot | etc
  unit_price: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),

  // Display order
  display_order: integer("display_order").default(0).notNull(),

  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_estimate_line_items_estimate_id").on(table.estimate_id),
]);

// Insert schemas for estimates
export const insertEstimateSchema = createInsertSchema(estimates).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertEstimateLineItemSchema = createInsertSchema(estimateLineItems).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Types for estimates
export type InsertEstimate = z.infer<typeof insertEstimateSchema>;
export type Estimate = typeof estimates.$inferSelect;

export type InsertEstimateLineItem = z.infer<typeof insertEstimateLineItemSchema>;
export type EstimateLineItem = typeof estimateLineItems.$inferSelect;

// View types
export type EstimateWithCustomer = Estimate & {
  customer: Customer;
  createdByUser?: User | null;
};

export type EstimateWithDetails = Estimate & {
  customer: Customer;
  lineItems: EstimateLineItem[];
  createdByUser?: User | null;
};

// ============================================
// ENTITY NOTES
// ============================================

// Entity Notes - Polymorphic timestamped notes for projects, customers, estimates, and checkouts
export const entityNotes = pgTable("entity_notes", {
  id: serial("id").primaryKey(),

  // Polymorphic link
  entity_type: text("entity_type").notNull(), // project | customer | estimate | checkout
  entity_id: integer("entity_id").notNull(),

  // Content
  content: text("content").notNull(),
  note_type: text("note_type").default("general").notNull(), // general | follow_up | warning | important

  // Visibility
  is_internal: text("is_internal").default("no").notNull(), // yes | no — if yes, never shown to client

  // Pin support
  is_pinned: text("is_pinned").default("no").notNull(), // yes | no

  // Author
  created_by_user_id: varchar("created_by_user_id").references(() => users.id, { onDelete: 'set null' }),
  created_by_user_name: varchar("created_by_user_name"),

  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_entity_notes_entity").on(table.entity_type, table.entity_id),
  index("IDX_entity_notes_pinned").on(table.is_pinned),
]);

export const insertEntityNoteSchema = createInsertSchema(entityNotes).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertEntityNote = z.infer<typeof insertEntityNoteSchema>;
export type EntityNote = typeof entityNotes.$inferSelect;

export type EntityNoteWithUser = EntityNote & {
  createdByUser?: User | null;
};

// ============================================
// INTERNAL MESSAGES
// ============================================

// Internal Messages - Staff-only threaded messaging with priority levels
export const internalMessages = pgTable("internal_messages", {
  id: serial("id").primaryKey(),

  // Thread support
  parent_id: integer("parent_id"), // NULL = top-level message, otherwise reply
  subject: text("subject"), // Only on top-level messages

  // Content
  content: text("content").notNull(),

  // Priority
  priority: text("priority").default("normal").notNull(), // low | normal | high | urgent

  // Links (optional)
  project_id: integer("project_id").references(() => projects.id, { onDelete: 'set null' }),
  customer_id: integer("customer_id").references(() => customers.id, { onDelete: 'set null' }),

  // Author
  sender_user_id: varchar("sender_user_id").references(() => users.id, { onDelete: 'set null' }).notNull(),
  sender_user_name: varchar("sender_user_name").notNull(),

  // Read tracking (JSON array of user IDs who have read this message)
  read_by: jsonb("read_by").default(sql`'[]'::jsonb`).notNull(),

  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_internal_messages_parent_id").on(table.parent_id),
  index("IDX_internal_messages_project_id").on(table.project_id),
  index("IDX_internal_messages_customer_id").on(table.customer_id),
  index("IDX_internal_messages_priority").on(table.priority),
  index("IDX_internal_messages_created_at").on(table.created_at),
]);

export const insertInternalMessageSchema = createInsertSchema(internalMessages).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertInternalMessage = z.infer<typeof insertInternalMessageSchema>;
export type InternalMessage = typeof internalMessages.$inferSelect;

export type InternalMessageWithUser = InternalMessage & {
  senderUser?: User | null;
};

export type InternalMessageThread = InternalMessage & {
  senderUser?: User | null;
  replies: InternalMessageWithUser[];
  replyCount: number;
  lastReplyAt?: Date | null;
};

// ============================================
// SERVICE CATALOG (Quote Configurator)
// ============================================

// Service Catalog Categories - Top-level groupings (Shower, Floor, Paint, etc.)
export const serviceCatalogCategories = pgTable("service_catalog_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"), // emoji icon
  icon_bg: text("icon_bg"), // hex color for icon background
  display_order: integer("display_order").default(0).notNull(),
  is_active: text("is_active").default("yes").notNull(), // yes | no
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Service Catalog Items - Individual selectable services within categories
export const serviceCatalogItems = pgTable("service_catalog_items", {
  id: serial("id").primaryKey(),
  category_id: integer("category_id").references(() => serviceCatalogCategories.id, { onDelete: 'cascade' }).notNull(),

  // Optional parent item (for sub-items / grouped children)
  parent_id: integer("parent_id"), // NULL = top-level item, otherwise child of a group

  // Item details
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 12, scale: 2 }).default("0").notNull(),

  // Display
  display_order: integer("display_order").default(0).notNull(),
  is_active: text("is_active").default("yes").notNull(), // yes | no

  // If true, this item is a group header (price=0, has children)
  is_group: text("is_group").default("no").notNull(), // yes | no

  // If true, children of this group are mutually exclusive (radio behavior)
  is_exclusive: text("is_exclusive").default("no").notNull(), // yes | no

  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_service_catalog_items_category_id").on(table.category_id),
  index("IDX_service_catalog_items_parent_id").on(table.parent_id),
]);

// Insert schemas
export const insertServiceCatalogCategorySchema = createInsertSchema(serviceCatalogCategories).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertServiceCatalogItemSchema = createInsertSchema(serviceCatalogItems).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Types
export type InsertServiceCatalogCategory = z.infer<typeof insertServiceCatalogCategorySchema>;
export type ServiceCatalogCategory = typeof serviceCatalogCategories.$inferSelect;

export type InsertServiceCatalogItem = z.infer<typeof insertServiceCatalogItemSchema>;
export type ServiceCatalogItem = typeof serviceCatalogItems.$inferSelect;

// View types
export type ServiceCatalogCategoryWithItems = ServiceCatalogCategory & {
  items: ServiceCatalogItemWithChildren[];
};

export type ServiceCatalogItemWithChildren = ServiceCatalogItem & {
  children?: ServiceCatalogItem[];
};

// ============================================
// TEAM RESOURCES
// ============================================

// Team Members — new member setup tracker
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  employee_name: text("employee_name").notNull(),
  job_title: text("job_title"),
  manager_name: text("manager_name"),
  start_date: text("start_date"),
  status: text("status").default("in_progress").notNull(), // in_progress | complete
  completion_signature: text("completion_signature"),
  completed_by_name: text("completed_by_name"),
  completed_at: timestamp("completed_at"),
  created_by_user_id: varchar("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  created_by_user_name: varchar("created_by_user_name"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Team Setup Items — checklist items per team member
export const teamSetupItems = pgTable("team_setup_items", {
  id: serial("id").primaryKey(),
  team_member_id: integer("team_member_id").references(() => teamMembers.id, { onDelete: "cascade" }).notNull(),
  section: text("section").notNull(),
  item_text: text("item_text").notNull(),
  is_checked: boolean("is_checked").default(false).notNull(),
  checked_by_user_name: varchar("checked_by_user_name"),
  checked_at: timestamp("checked_at"),
  display_order: integer("display_order").default(0).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_team_setup_items_member_id").on(table.team_member_id),
]);

// Team Resources — document/resource library
export const teamResources = pgTable("team_resources", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(), // setup | sop | policy | standards | other
  description: text("description"),
  file_name: text("file_name"),
  file_url: text("file_url"),
  external_url: text("external_url"),
  uploaded_by_user_id: varchar("uploaded_by_user_id").references(() => users.id, { onDelete: "set null" }),
  uploaded_by_user_name: varchar("uploaded_by_user_name"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas
export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertTeamSetupItemSchema = createInsertSchema(teamSetupItems).omit({
  id: true,
  created_at: true,
});

export const insertTeamResourceSchema = createInsertSchema(teamResources).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Types
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;

export type InsertTeamSetupItem = z.infer<typeof insertTeamSetupItemSchema>;
export type TeamSetupItem = typeof teamSetupItems.$inferSelect;

export type InsertTeamResource = z.infer<typeof insertTeamResourceSchema>;
export type TeamResource = typeof teamResources.$inferSelect;

// View types
export type TeamMemberWithItems = TeamMember & {
  items: TeamSetupItem[];
};

// ============================================
// EMPLOYEE TIMECARDS (standalone weekly cards)
// ============================================

export const timecards = pgTable("timecards", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  weekStartDate: varchar("week_start_date").notNull(), // ISO date string, always Monday
  status: varchar("status").notNull().default("draft"), // draft | submitted | approved
  recipientId: integer("recipient_id").references(() => timecardRecipients.id),
  submittedAt: timestamp("submitted_at"),
  approvedAt: timestamp("approved_at"),
  approvedById: varchar("approved_by_id").references(() => users.id),
  totalHours: numeric("total_hours", { precision: 5, scale: 2 }).default("0"),
  totalOtHours: numeric("total_ot_hours", { precision: 5, scale: 2 }).default("0"),
  totalPtoHours: numeric("total_pto_hours", { precision: 5, scale: 2 }).default("0"),
  totalHolidayHours: numeric("total_holiday_hours", { precision: 5, scale: 2 }).default("0"),
  totalMileage: numeric("total_mileage", { precision: 8, scale: 1 }).default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_timecards_user_id").on(table.userId),
  index("IDX_timecards_week").on(table.weekStartDate),
]);

export const timecardEntries = pgTable("timecard_entries", {
  id: serial("id").primaryKey(),
  timecardId: integer("timecard_id").notNull().references(() => timecards.id, { onDelete: "cascade" }),
  entryDate: varchar("entry_date").notNull(), // ISO date string for the specific day
  clockIn: varchar("clock_in"),   // "HH:MM" 24hr format, nullable
  clockOut: varchar("clock_out"), // "HH:MM" 24hr format, nullable
  hours: numeric("hours", { precision: 4, scale: 2 }).notNull().default("0"), // regular hours (capped at 8)
  otHours: numeric("ot_hours", { precision: 4, scale: 2 }).notNull().default("0"), // overtime (>8h)
  ptoHours: numeric("pto_hours", { precision: 4, scale: 2 }).notNull().default("0"),
  holidayHours: numeric("holiday_hours", { precision: 4, scale: 2 }).notNull().default("0"),
  entryType: varchar("entry_type").notNull().default("work"), // "work" | "pto" | "holiday"
  mileage: numeric("mileage", { precision: 7, scale: 1 }).default("0"), // total miles for the day
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_timecard_entries_timecard_id").on(table.timecardId),
]);

export const timecardAuditLog = pgTable("timecard_audit_log", {
  id: serial("id").primaryKey(),
  timecardId: integer("timecard_id").notNull().references(() => timecards.id, { onDelete: "cascade" }),
  changedById: varchar("changed_by_id").notNull().references(() => users.id),
  changedAt: timestamp("changed_at").defaultNow(),
  action: varchar("action").notNull(), // created | updated_hours | submitted | approved | admin_edit
  entryDate: varchar("entry_date"), // which day was changed (null if whole card action)
  oldHours: numeric("old_hours", { precision: 4, scale: 2 }),
  newHours: numeric("new_hours", { precision: 4, scale: 2 }),
  oldNotes: text("old_notes"),
  newNotes: text("new_notes"),
  description: text("description"), // human readable summary
}, (table) => [
  index("IDX_timecard_audit_timecard_id").on(table.timecardId),
]);

// Clock in / clock out punches (multiple shifts per day)
export const timecardPunches = pgTable("timecard_punches", {
  id: serial("id").primaryKey(),
  timecardId: integer("timecard_id").notNull().references(() => timecards.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  punchDate: varchar("punch_date").notNull(), // ISO date string
  clockIn: timestamp("clock_in").notNull(),
  clockOut: timestamp("clock_out"),
  hours: numeric("hours", { precision: 5, scale: 2 }), // calculated on clock-out
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_punches_timecard_id").on(table.timecardId),
  index("IDX_punches_user_date").on(table.userId, table.punchDate),
]);

// Mileage log entries (separate from time entries, one per trip/date)
export const timecardMileage = pgTable("timecard_mileage", {
  id: serial("id").primaryKey(),
  timecardId: integer("timecard_id").notNull().references(() => timecards.id, { onDelete: "cascade" }),
  entryDate: varchar("entry_date").notNull(),
  miles: numeric("miles", { precision: 6, scale: 2 }).notNull().default("0"),
  purpose: text("purpose"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_timecard_mileage_timecard_id").on(table.timecardId),
]);

// Payroll contacts (who receives weekly timecard emails)
export const payrollContacts = pgTable("payroll_contacts", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  email: varchar("email").notNull(),
  isActive: text("is_active").default("yes").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Timecard recipients (HR / managers who timecards are submitted to)
export const timecardRecipients = pgTable("timecard_recipients", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  email: varchar("email").notNull(),
  title: varchar("title"),
  isActive: text("is_active").default("yes").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPayrollContactSchema = createInsertSchema(payrollContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPayrollContact = z.infer<typeof insertPayrollContactSchema>;
export type PayrollContact = typeof payrollContacts.$inferSelect;

export const insertTimecardRecipientSchema = createInsertSchema(timecardRecipients).omit({
  id: true,
  createdAt: true,
});

export type InsertTimecardRecipient = z.infer<typeof insertTimecardRecipientSchema>;
export type TimecardRecipient = typeof timecardRecipients.$inferSelect;

export const insertTimecardMileageSchema = createInsertSchema(timecardMileage).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTimecardMileage = z.infer<typeof insertTimecardMileageSchema>;
export type TimecardMileage = typeof timecardMileage.$inferSelect;

// Insert schemas
export const insertTimecardPunchSchema = createInsertSchema(timecardPunches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTimecardPunch = z.infer<typeof insertTimecardPunchSchema>;
export type TimecardPunch = typeof timecardPunches.$inferSelect;

export const insertTimecardSchema = createInsertSchema(timecards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTimecardEntrySchema = createInsertSchema(timecardEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTimecardAuditLogSchema = createInsertSchema(timecardAuditLog).omit({
  id: true,
  changedAt: true,
});

// Types
export type InsertTimecard = z.infer<typeof insertTimecardSchema>;
export type Timecard = typeof timecards.$inferSelect;

export type InsertTimecardEntry = z.infer<typeof insertTimecardEntrySchema>;
export type TimecardEntry = typeof timecardEntries.$inferSelect;

export type InsertTimecardAuditLog = z.infer<typeof insertTimecardAuditLogSchema>;
export type TimecardAuditLog = typeof timecardAuditLog.$inferSelect;

// View types
export type TimecardWithEntries = Timecard & {
  entries: TimecardEntry[];
  recipient?: TimecardRecipient | null;
};

export type TimecardWithUser = Timecard & {
  user: { id: string; firstName: string | null; lastName: string | null; email: string };
  recipient?: TimecardRecipient | null;
};

export type TimecardAuditLogWithUser = TimecardAuditLog & {
  changedBy: { id: string; firstName: string | null; lastName: string | null; email: string };
};
