/**
 * One-time migration to add new contract columns for draft/remote signing support.
 * Safe to run multiple times - uses IF NOT EXISTS.
 * Can be removed after successful deployment.
 */
import { pool } from "../db/index";

export async function migrateContracts() {
  const client = await pool.connect();
  try {
    console.log("[migration] Checking contracts table for missing columns...");

    // Add status column (draft | sent_for_signature | signed | completed)
    await client.query(`
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft'
    `);

    // Add signing_token for remote signing
    await client.query(`
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signing_token text
    `);

    // Add signing_token_expires for 7-day expiry
    await client.query(`
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signing_token_expires timestamp
    `);

    // Add last_step to track form progress for drafts
    await client.query(`
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS last_step text NOT NULL DEFAULT 'form'
    `);

    // Add signed_at timestamp
    await client.query(`
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signed_at timestamp
    `);

    // Add created_at and updated_at
    await client.query(`
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now()
    `);
    await client.query(`
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT now()
    `);

    // Add created_by_user_id and created_by_user_name
    await client.query(`
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS created_by_user_id varchar
    `);
    await client.query(`
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS created_by_user_name varchar
    `);

    // Make signature_data nullable (it may already be nullable, but ensure it)
    // ALTER COLUMN ... DROP NOT NULL is idempotent if already nullable
    await client.query(`
      ALTER TABLE contracts ALTER COLUMN signature_data DROP NOT NULL
    `).catch(() => {
      // Ignore if already nullable
    });

    // Update existing contracts that have signature_data to have status 'signed'
    await client.query(`
      UPDATE contracts SET status = 'signed' WHERE signature_data IS NOT NULL AND status = 'draft'
    `);

    console.log("[migration] Contracts table migration complete.");
  } catch (err) {
    console.error("[migration] Error migrating contracts table:", err);
    // Don't throw - let the app start even if migration fails
  } finally {
    client.release();
  }
}
