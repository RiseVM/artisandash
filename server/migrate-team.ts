/**
 * Migration for Team Resources tables: team_members, team_setup_items, team_resources.
 * Uses raw SQL with CREATE TABLE IF NOT EXISTS.
 * Safe to run multiple times.
 */
import { pool } from "../db/index";

export async function migrateTeam() {
  const client = await pool.connect();
  try {
    console.log("[migration] Team: Creating tables if they don't exist...");

    // ── TEAM MEMBERS ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS team_members (
        id SERIAL PRIMARY KEY,
        employee_name TEXT NOT NULL,
        job_title TEXT,
        manager_name TEXT,
        start_date TEXT,
        status TEXT NOT NULL DEFAULT 'in_progress',
        completion_signature TEXT,
        completed_by_name TEXT,
        completed_at TIMESTAMP,
        created_by_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        created_by_user_name VARCHAR,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // ── TEAM SETUP ITEMS ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS team_setup_items (
        id SERIAL PRIMARY KEY,
        team_member_id INTEGER NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
        section TEXT NOT NULL,
        item_text TEXT NOT NULL,
        is_checked BOOLEAN NOT NULL DEFAULT false,
        checked_by_user_name VARCHAR,
        checked_at TIMESTAMP,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_team_setup_items_member_id" ON team_setup_items(team_member_id)`);

    // ── TEAM RESOURCES ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS team_resources (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        file_name TEXT,
        file_url TEXT,
        external_url TEXT,
        uploaded_by_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        uploaded_by_user_name VARCHAR,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    console.log("[migration] Team: All tables ready.");
  } catch (err) {
    console.error("[migration] Team error:", err);
  } finally {
    client.release();
  }
}
