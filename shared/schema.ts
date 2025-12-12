import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp, integer, index, jsonb } from "drizzle-orm/pg-core";
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

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

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
  signature_data: text("signature_data").notNull(),
  signed_at: timestamp("signed_at").defaultNow().notNull(),
  created_by_user_id: varchar("created_by_user_id").references(() => users.id),
});

export const insertSignedAgreementSchema = createInsertSchema(signedAgreements).omit({
  id: true,
  signed_at: true,
});

export type InsertSignedAgreement = z.infer<typeof insertSignedAgreementSchema>;
export type SignedAgreement = typeof signedAgreements.$inferSelect;
