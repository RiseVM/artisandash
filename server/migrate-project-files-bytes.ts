/**
 * Migration: add `file_bytes` BYTEA column to project_files so the server
 * can stream uploaded files back to the client without depending on
 * Google Drive being configured.
 *
 * Safe to run multiple times.
 */
import { pool } from "../db/index";

export async function migrateProjectFilesBytes() {
  const client = await pool.connect();
  try {
    console.log("[migration] project_files.file_bytes…");
    await client.query(
      `ALTER TABLE project_files ADD COLUMN IF NOT EXISTS file_bytes BYTEA`
    );
    console.log("[migration] project_files.file_bytes OK");
  } catch (err) {
    console.error("[migration] project_files.file_bytes error:", err);
  } finally {
    client.release();
  }
}
