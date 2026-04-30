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
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mileage_enabled TEXT NOT NULL DEFAULT 'no'`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mileage_rate VARCHAR`);

    // Per-user permission overrides — take precedence over role defaults.
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_permissions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        permission VARCHAR NOT NULL,
        enabled TEXT NOT NULL,
        CONSTRAINT unique_user_permission UNIQUE (user_id, permission)
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_user_permissions_user_id" ON user_permissions(user_id)`);

    console.log("[migration] Users: All columns ready.");
  } catch (err) {
    console.error("[migration] Users error:", err);
  } finally {
    client.release();
  }
}
