/**
 * Migration to ensure the users table has all columns the Drizzle schema expects.
 * Safe to run multiple times.
 */
import { pool } from "../db/index";

export async function migrateUsers() {
  const client = await pool.connect();
  try {
    console.log("[migration] Checking users table for missing columns...");

    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active TEXT NOT NULL DEFAULT 'yes'`);

    console.log("[migration] Users: All columns ready.");
  } catch (err) {
    console.error("[migration] Users error:", err);
  } finally {
    client.release();
  }
}
