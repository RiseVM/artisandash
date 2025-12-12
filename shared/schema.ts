import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  stripe_customer_id: text("stripe_customer_id"),
  stripe_payment_method_id: text("stripe_payment_method_id"),
  card_last4: text("card_last4"),
  card_brand: text("card_brand"),
  card_exp_month: text("card_exp_month"),
  card_exp_year: text("card_exp_year"),
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
};
