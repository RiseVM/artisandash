/**
 * Migration to add missing columns to timecards and timecard_entries tables,
 * and ensure timecard_punches, timecard_recipients, timecard_mileage, etc. exist.
 * Safe to run multiple times - uses ADD COLUMN IF NOT EXISTS and CREATE TABLE IF NOT EXISTS.
 */
import { pool } from "../db/index";

export async function migrateTimecards() {
  const client = await pool.connect();
  try {
    console.log("[migration] Checking timecards tables for missing columns...");

    // ── timecards table additions ──
    await client.query(`ALTER TABLE timecards ADD COLUMN IF NOT EXISTS recipient_id INTEGER`);
    await client.query(`ALTER TABLE timecards ADD COLUMN IF NOT EXISTS total_ot_hours NUMERIC(5,2) DEFAULT '0'`);
    await client.query(`ALTER TABLE timecards ADD COLUMN IF NOT EXISTS total_pto_hours NUMERIC(5,2) DEFAULT '0'`);
    await client.query(`ALTER TABLE timecards ADD COLUMN IF NOT EXISTS total_holiday_hours NUMERIC(5,2) DEFAULT '0'`);
    await client.query(`ALTER TABLE timecards ADD COLUMN IF NOT EXISTS mileage_cost NUMERIC(8,2) DEFAULT '0'`);
    // Employee self-correction tracking on the parent card
    await client.query(`ALTER TABLE timecards ADD COLUMN IF NOT EXISTS has_corrections BOOLEAN DEFAULT false`);
    await client.query(`ALTER TABLE timecards ADD COLUMN IF NOT EXISTS last_correction_at TIMESTAMP`);

    // ── timecard_entries table additions ──
    await client.query(`ALTER TABLE timecard_entries ADD COLUMN IF NOT EXISTS clock_in TEXT`);
    await client.query(`ALTER TABLE timecard_entries ADD COLUMN IF NOT EXISTS clock_out TEXT`);
    await client.query(`ALTER TABLE timecard_entries ADD COLUMN IF NOT EXISTS entry_type TEXT DEFAULT 'work'`);
    await client.query(`ALTER TABLE timecard_entries ADD COLUMN IF NOT EXISTS ot_hours NUMERIC(5,2) DEFAULT '0'`);
    await client.query(`ALTER TABLE timecard_entries ADD COLUMN IF NOT EXISTS pto_hours NUMERIC(5,2) DEFAULT '0'`);
    await client.query(`ALTER TABLE timecard_entries ADD COLUMN IF NOT EXISTS holiday_hours NUMERIC(5,2) DEFAULT '0'`);
    await client.query(`ALTER TABLE timecard_entries ADD COLUMN IF NOT EXISTS mileage NUMERIC(8,2) DEFAULT '0'`);
    // Lock flag — set when an employee self-corrects so recalcDayFromPunches
    // doesn't overwrite the corrected hours on later clock-outs / admin punch edits.
    await client.query(`ALTER TABLE timecard_entries ADD COLUMN IF NOT EXISTS hours_locked BOOLEAN DEFAULT false`);

    // ── timecard_punches table ──
    // Schema expects: id, timecard_id, user_id, punch_date, clock_in, clock_out, hours, notes, created_at, updated_at
    await client.query(`
      CREATE TABLE IF NOT EXISTS timecard_punches (
        id SERIAL PRIMARY KEY,
        timecard_id INTEGER NOT NULL REFERENCES timecards(id) ON DELETE CASCADE,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        punch_date VARCHAR NOT NULL,
        clock_in TIMESTAMP NOT NULL,
        clock_out TIMESTAMP,
        hours NUMERIC(5,2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      )
    `);
    // If table already existed with different columns, add missing ones
    await client.query(`ALTER TABLE timecard_punches ADD COLUMN IF NOT EXISTS timecard_id INTEGER REFERENCES timecards(id) ON DELETE CASCADE`).catch(() => {});
    await client.query(`ALTER TABLE timecard_punches ADD COLUMN IF NOT EXISTS punch_date VARCHAR`).catch(() => {});
    await client.query(`ALTER TABLE timecard_punches ADD COLUMN IF NOT EXISTS hours NUMERIC(5,2)`).catch(() => {});
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_punches_timecard_id" ON timecard_punches(timecard_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_punches_user_date" ON timecard_punches(user_id, punch_date)`);

    // ── timecard_audit_log: add missing columns ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS timecard_audit_log (
        id SERIAL PRIMARY KEY,
        timecard_id INTEGER NOT NULL REFERENCES timecards(id) ON DELETE CASCADE,
        changed_by_id VARCHAR NOT NULL,
        action TEXT NOT NULL,
        description TEXT,
        entry_date TEXT,
        previous_value TEXT,
        new_value TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await client.query(`ALTER TABLE timecard_audit_log ADD COLUMN IF NOT EXISTS entry_date TEXT`).catch(() => {});
    await client.query(`ALTER TABLE timecard_audit_log ADD COLUMN IF NOT EXISTS previous_value TEXT`).catch(() => {});
    await client.query(`ALTER TABLE timecard_audit_log ADD COLUMN IF NOT EXISTS new_value TEXT`).catch(() => {});
    // Drizzle schema expects changed_at, not created_at
    await client.query(`ALTER TABLE timecard_audit_log ADD COLUMN IF NOT EXISTS changed_at TIMESTAMP DEFAULT now()`).catch(() => {});
    // Drizzle schema expects old_hours, new_hours, old_notes, new_notes
    await client.query(`ALTER TABLE timecard_audit_log ADD COLUMN IF NOT EXISTS old_hours NUMERIC(4,2)`).catch(() => {});
    await client.query(`ALTER TABLE timecard_audit_log ADD COLUMN IF NOT EXISTS new_hours NUMERIC(4,2)`).catch(() => {});
    await client.query(`ALTER TABLE timecard_audit_log ADD COLUMN IF NOT EXISTS old_notes TEXT`).catch(() => {});
    await client.query(`ALTER TABLE timecard_audit_log ADD COLUMN IF NOT EXISTS new_notes TEXT`).catch(() => {});
    // Employee-provided reason for a correction (required on employee_correction rows)
    await client.query(`ALTER TABLE timecard_audit_log ADD COLUMN IF NOT EXISTS reason TEXT`).catch(() => {});
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_timecard_audit_log_timecard_id" ON timecard_audit_log(timecard_id)`);

    // ── timecard_recipients table ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS timecard_recipients (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        is_active TEXT NOT NULL DEFAULT 'yes',
        created_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // ── timecard_mileage table ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS timecard_mileage (
        id SERIAL PRIMARY KEY,
        timecard_id INTEGER NOT NULL REFERENCES timecards(id) ON DELETE CASCADE,
        description TEXT,
        miles NUMERIC(8,2) NOT NULL DEFAULT '0',
        rate NUMERIC(5,3) NOT NULL DEFAULT '0.670',
        total NUMERIC(8,2) NOT NULL DEFAULT '0',
        entry_date TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_timecard_mileage_timecard_id" ON timecard_mileage(timecard_id)`);

    // ── payroll_contacts table ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS payroll_contacts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        is_active TEXT NOT NULL DEFAULT 'yes',
        created_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    console.log("[migration] Timecards: All columns and tables ready.");
  } catch (err) {
    console.error("[migration] Timecards error:", err);
  } finally {
    client.release();
  }
}
