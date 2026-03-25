/**
 * Migration for Phase 9-10 tables: estimates, estimate_line_items,
 * entity_notes, internal_messages, service_catalog_categories, service_catalog_items.
 *
 * Uses raw SQL with CREATE TABLE IF NOT EXISTS because drizzle-kit push
 * incorrectly detects rename operations and skips creating new tables.
 *
 * Safe to run multiple times.
 */
import { pool } from "../db/index";

export async function migratePhase9And10() {
  const client = await pool.connect();
  try {
    console.log("[migration] Phase 9-10: Creating tables if they don't exist...");

    // ── ESTIMATES ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS estimates (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id),
        estimate_number TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        issue_date TEXT,
        expiry_date TEXT,
        subtotal NUMERIC(12,2) NOT NULL DEFAULT '0',
        tax_rate NUMERIC(5,4) NOT NULL DEFAULT '0',
        tax_amount NUMERIC(12,2) NOT NULL DEFAULT '0',
        total NUMERIC(12,2) NOT NULL DEFAULT '0',
        notes TEXT,
        internal_notes TEXT,
        project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        created_by_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        created_by_user_name VARCHAR,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_estimates_customer_id" ON estimates(customer_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_estimates_status" ON estimates(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_estimates_estimate_number" ON estimates(estimate_number)`);

    // ── ESTIMATE LINE ITEMS ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS estimate_line_items (
        id SERIAL PRIMARY KEY,
        estimate_id INTEGER NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
        section TEXT,
        category TEXT,
        description TEXT NOT NULL,
        quantity NUMERIC(10,2) NOT NULL DEFAULT '1',
        unit TEXT,
        unit_price NUMERIC(12,2) NOT NULL,
        total NUMERIC(12,2) NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_estimate_line_items_estimate_id" ON estimate_line_items(estimate_id)`);

    // ── ENTITY NOTES ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS entity_notes (
        id SERIAL PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        note_type TEXT NOT NULL DEFAULT 'general',
        is_pinned TEXT NOT NULL DEFAULT 'no',
        created_by_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        created_by_user_name VARCHAR,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_entity_notes_entity" ON entity_notes(entity_type, entity_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_entity_notes_pinned" ON entity_notes(is_pinned)`);

    // ── INTERNAL MESSAGES ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS internal_messages (
        id SERIAL PRIMARY KEY,
        parent_id INTEGER,
        subject TEXT,
        content TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'normal',
        project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        sender_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        sender_user_name VARCHAR NOT NULL,
        read_by JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_internal_messages_parent_id" ON internal_messages(parent_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_internal_messages_project_id" ON internal_messages(project_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_internal_messages_customer_id" ON internal_messages(customer_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_internal_messages_priority" ON internal_messages(priority)`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_internal_messages_created_at" ON internal_messages(created_at)`);

    // ── SERVICE CATALOG CATEGORIES ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS service_catalog_categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        icon_bg TEXT,
        display_order INTEGER NOT NULL DEFAULT 0,
        is_active TEXT NOT NULL DEFAULT 'yes',
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // ── SERVICE CATALOG ITEMS ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS service_catalog_items (
        id SERIAL PRIMARY KEY,
        category_id INTEGER NOT NULL REFERENCES service_catalog_categories(id) ON DELETE CASCADE,
        parent_id INTEGER,
        name TEXT NOT NULL,
        description TEXT,
        price NUMERIC(12,2) NOT NULL DEFAULT '0',
        display_order INTEGER NOT NULL DEFAULT 0,
        is_active TEXT NOT NULL DEFAULT 'yes',
        is_group TEXT NOT NULL DEFAULT 'no',
        is_exclusive TEXT NOT NULL DEFAULT 'no',
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_service_catalog_items_category_id" ON service_catalog_items(category_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_service_catalog_items_parent_id" ON service_catalog_items(parent_id)`);

    console.log("[migration] Phase 9-10: All tables ready.");
  } catch (err) {
    console.error("[migration] Phase 9-10 error:", err);
    // Don't throw - let the app start even if migration fails
  } finally {
    client.release();
  }
}
