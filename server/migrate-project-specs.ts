/**
 * Migration: Project Specs (Bathroom remodel structured data — v2)
 *
 * Creates `project_specs` and `project_tiles` tables used by the
 * new project detail page. Mirrors the on-site spec sheet
 * (contractor, paint, plumbing, electrical, vanity, hardware,
 * shower door) plus per-surface tile/grout selections.
 *
 * Safe to run multiple times.
 */
import { pool } from "../db/index";

export async function migrateProjectSpecs() {
  const client = await pool.connect();
  try {
    console.log("[migration] project_specs / project_tiles…");

    await client.query(`
      CREATE TABLE IF NOT EXISTS project_specs (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL UNIQUE
          REFERENCES projects(id) ON DELETE CASCADE,
        contractor_on_job TEXT,
        shower_bench_seat TEXT,
        shower_niche TEXT,
        shower_shelf TEXT,
        accent_wall TEXT,
        paint_wall_brand TEXT,
        paint_wall_color TEXT,
        paint_wall_finish TEXT,
        paint_trim_brand TEXT,
        paint_trim_color TEXT,
        paint_trim_finish TEXT,
        plumber_on_job TEXT,
        plumbing_selection TEXT,
        plumbing_description TEXT,
        vent_brand TEXT,
        vent_cfm TEXT,
        electrician_on_job TEXT,
        electrical_description TEXT,
        electrical_fixtures TEXT,
        vanity_brand TEXT,
        vanity_color TEXT,
        vanity_finish TEXT,
        hardware TEXT,
        shower_door_company TEXT,
        shower_door_description TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS "IDX_project_specs_project_id" ON project_specs(project_id)`
    );

    await client.query(`
      CREATE TABLE IF NOT EXISTS project_tiles (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL
          REFERENCES projects(id) ON DELETE CASCADE,
        location TEXT NOT NULL,
        pattern TEXT,
        grout_color TEXT,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS "IDX_project_tiles_project_id" ON project_tiles(project_id)`
    );
    await client.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_project_tiles_project_location" ON project_tiles(project_id, location)`
    );

    console.log("[migration] project_specs / project_tiles OK");
  } catch (err) {
    console.error("[migration] project_specs error:", err);
  } finally {
    client.release();
  }
}
