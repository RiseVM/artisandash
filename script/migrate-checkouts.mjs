/**
 * Migration Script: Copy checkouts (and related customers/inventory) from old Replit DB to new Railway DB
 *
 * HOW TO RUN:
 * 1. Open your old Replit project "Artisan Sample Checkout"
 * 2. Open the Shell tab
 * 3. Run: NEW_DB_URL="postgresql://postgres:LJpxm0eaUDqZZDLmXJgCukfoKZcvFKej@crossover.proxy.rlwy.net:43882/railway" node script/migrate-checkouts.mjs
 *
 * OR run locally if you have access to both databases:
 *   OLD_DB_URL="postgresql://neondb_owner:npg_ykj5hR7ZNWFB@ep-aged-paper-ahzt8zae.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require" \
 *   NEW_DB_URL="postgresql://postgres:LJpxm0eaUDqZZDLmXJgCukfoKZcvFKej@crossover.proxy.rlwy.net:43882/railway" \
 *   node script/migrate-checkouts.mjs
 *
 * This script:
 * - Reads all customers, inventory, and checkouts from the OLD database
 * - Inserts them into the NEW database (Railway)
 * - Maps old IDs to new IDs to preserve FK relationships
 * - Skips records that already exist (by matching customer email or inventory name+sku)
 */

import pg from 'pg';
const { Client } = pg;

const OLD_DB_URL = process.env.OLD_DB_URL || process.env.DATABASE_URL;
const NEW_DB_URL = process.env.NEW_DB_URL;

if (!OLD_DB_URL) {
  console.error('ERROR: No old database URL. Set OLD_DB_URL or DATABASE_URL env var.');
  process.exit(1);
}
if (!NEW_DB_URL) {
  console.error('ERROR: No new database URL. Set NEW_DB_URL env var.');
  process.exit(1);
}

console.log('Connecting to OLD database...');
const oldDb = new Client({ connectionString: OLD_DB_URL });
await oldDb.connect();
console.log('Connected to OLD database.');

console.log('Connecting to NEW database...');
const newDb = new Client({ connectionString: NEW_DB_URL });
await newDb.connect();
console.log('Connected to NEW database.');

try {
  // ============================================
  // Step 1: Read all data from OLD database
  // ============================================
  console.log('\n=== READING OLD DATABASE ===');

  const oldCustomers = (await oldDb.query('SELECT * FROM customers ORDER BY id')).rows;
  console.log(`Found ${oldCustomers.length} customers`);

  const oldInventory = (await oldDb.query('SELECT * FROM inventory ORDER BY id')).rows;
  console.log(`Found ${oldInventory.length} inventory items`);

  const oldCheckouts = (await oldDb.query('SELECT * FROM checkouts ORDER BY id')).rows;
  console.log(`Found ${oldCheckouts.length} checkouts`);

  const oldEmailNotifications = (await oldDb.query('SELECT * FROM email_notifications ORDER BY id')).rows;
  console.log(`Found ${oldEmailNotifications.length} email notifications`);

  let oldSignedAgreements = [];
  try {
    oldSignedAgreements = (await oldDb.query('SELECT * FROM signed_agreements ORDER BY id')).rows;
    console.log(`Found ${oldSignedAgreements.length} signed agreements`);
  } catch (e) {
    console.log('No signed_agreements table in old DB (skipping)');
  }

  // ============================================
  // Step 2: Migrate Customers
  // ============================================
  console.log('\n=== MIGRATING CUSTOMERS ===');
  const customerIdMap = {}; // old_id -> new_id

  for (const c of oldCustomers) {
    // Check if customer already exists by email
    const existing = await newDb.query('SELECT id FROM customers WHERE email = $1', [c.email]);
    if (existing.rows.length > 0) {
      customerIdMap[c.id] = existing.rows[0].id;
      console.log(`  Customer "${c.name}" (${c.email}) already exists as ID ${existing.rows[0].id}`);
      continue;
    }

    const result = await newDb.query(
      `INSERT INTO customers (name, email, phone, address, notes, card_last4, card_brand, card_exp_month, card_exp_year, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [c.name, c.email, c.phone, c.address, c.notes, c.card_last4, c.card_brand, c.card_exp_month, c.card_exp_year, c.created_at]
    );
    customerIdMap[c.id] = result.rows[0].id;
    console.log(`  Migrated customer "${c.name}" (old ID ${c.id} -> new ID ${result.rows[0].id})`);
  }

  // ============================================
  // Step 3: Migrate Inventory
  // ============================================
  console.log('\n=== MIGRATING INVENTORY ===');
  const inventoryIdMap = {}; // old_id -> new_id

  for (const inv of oldInventory) {
    // Check if inventory item already exists by name + sku
    let existing;
    if (inv.sku) {
      existing = await newDb.query('SELECT id FROM inventory WHERE sku = $1', [inv.sku]);
    } else {
      existing = await newDb.query('SELECT id FROM inventory WHERE name = $1 AND (sku IS NULL OR sku = $2)', [inv.name, inv.sku || '']);
    }

    if (existing.rows.length > 0) {
      inventoryIdMap[inv.id] = existing.rows[0].id;
      console.log(`  Inventory "${inv.name}" already exists as ID ${existing.rows[0].id}`);
      continue;
    }

    const result = await newDb.query(
      `INSERT INTO inventory (name, color, vendor, size, sku, category, total_quantity, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [inv.name, inv.color, inv.vendor, inv.size, inv.sku, inv.category, inv.total_quantity, inv.created_at]
    );
    inventoryIdMap[inv.id] = result.rows[0].id;
    console.log(`  Migrated inventory "${inv.name}" (old ID ${inv.id} -> new ID ${result.rows[0].id})`);
  }

  // ============================================
  // Step 4: Migrate Checkouts
  // ============================================
  console.log('\n=== MIGRATING CHECKOUTS ===');
  const checkoutIdMap = {}; // old_id -> new_id

  for (const co of oldCheckouts) {
    const newCustomerId = customerIdMap[co.customer_id];
    const newInventoryId = inventoryIdMap[co.inventory_item_id];

    if (!newCustomerId) {
      console.log(`  SKIPPING checkout ${co.id}: customer_id ${co.customer_id} not mapped`);
      continue;
    }
    if (!newInventoryId) {
      console.log(`  SKIPPING checkout ${co.id}: inventory_item_id ${co.inventory_item_id} not mapped`);
      continue;
    }

    // Check if checkout already exists (match by customer + inventory + checkout_date)
    const existing = await newDb.query(
      'SELECT id FROM checkouts WHERE customer_id = $1 AND inventory_item_id = $2 AND checkout_date = $3',
      [newCustomerId, newInventoryId, co.checkout_date]
    );
    if (existing.rows.length > 0) {
      checkoutIdMap[co.id] = existing.rows[0].id;
      console.log(`  Checkout ${co.id} already exists as ID ${existing.rows[0].id}`);
      continue;
    }

    const result = await newDb.query(
      `INSERT INTO checkouts (customer_id, inventory_item_id, checkout_date, due_date, project_type,
        needs_installer, wants_designer, start_date, has_special_request, special_request,
        status, notes, auth_notes, stripe_payment_intent_id,
        created_by_user_name, last_reminder_sent, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING id`,
      [
        newCustomerId, newInventoryId, co.checkout_date, co.due_date, co.project_type,
        co.needs_installer, co.wants_designer, co.start_date, co.has_special_request, co.special_request,
        co.status, co.notes, co.auth_notes, co.stripe_payment_intent_id,
        co.created_by_user_name, co.last_reminder_sent, co.created_at, co.updated_at
      ]
    );
    checkoutIdMap[co.id] = result.rows[0].id;
    console.log(`  Migrated checkout (old ID ${co.id} -> new ID ${result.rows[0].id})`);
  }

  // ============================================
  // Step 5: Migrate Email Notifications
  // ============================================
  console.log('\n=== MIGRATING EMAIL NOTIFICATIONS ===');
  for (const en of oldEmailNotifications) {
    const newCheckoutId = checkoutIdMap[en.checkout_id];
    if (!newCheckoutId) {
      console.log(`  SKIPPING email notification ${en.id}: checkout_id ${en.checkout_id} not mapped`);
      continue;
    }

    const existing = await newDb.query(
      'SELECT id FROM email_notifications WHERE checkout_id = $1 AND notification_type = $2',
      [newCheckoutId, en.notification_type]
    );
    if (existing.rows.length > 0) {
      console.log(`  Email notification already exists for checkout ${newCheckoutId}`);
      continue;
    }

    await newDb.query(
      'INSERT INTO email_notifications (checkout_id, notification_type, sent_at) VALUES ($1, $2, $3)',
      [newCheckoutId, en.notification_type, en.sent_at]
    );
    console.log(`  Migrated email notification for checkout ${newCheckoutId} (${en.notification_type})`);
  }

  // ============================================
  // Step 6: Migrate Signed Agreements
  // ============================================
  if (oldSignedAgreements.length > 0) {
    console.log('\n=== MIGRATING SIGNED AGREEMENTS ===');
    for (const sa of oldSignedAgreements) {
      const newCustomerId = customerIdMap[sa.customer_id];
      const newCheckoutId = sa.checkout_id ? checkoutIdMap[sa.checkout_id] : null;

      if (!newCustomerId) {
        console.log(`  SKIPPING agreement ${sa.id}: customer_id ${sa.customer_id} not mapped`);
        continue;
      }

      await newDb.query(
        `INSERT INTO signed_agreements (customer_id, checkout_id, document_title, agreement_text, signature_data,
          google_drive_file_id, google_drive_link, signed_at, created_by_user_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [newCustomerId, newCheckoutId, sa.document_title, sa.agreement_text, sa.signature_data,
         sa.google_drive_file_id, sa.google_drive_link, sa.signed_at, sa.created_by_user_name]
      );
      console.log(`  Migrated agreement "${sa.document_title}" for customer ${newCustomerId}`);
    }
  }

  // ============================================
  // Summary
  // ============================================
  console.log('\n=== MIGRATION COMPLETE ===');
  console.log(`Customers: ${Object.keys(customerIdMap).length} mapped`);
  console.log(`Inventory: ${Object.keys(inventoryIdMap).length} mapped`);
  console.log(`Checkouts: ${Object.keys(checkoutIdMap).length} mapped`);
  console.log('\nID Mappings:');
  console.log('  Customers:', JSON.stringify(customerIdMap));
  console.log('  Inventory:', JSON.stringify(inventoryIdMap));
  console.log('  Checkouts:', JSON.stringify(checkoutIdMap));

} catch (error) {
  console.error('\nMIGRATION ERROR:', error);
  process.exit(1);
} finally {
  await oldDb.end();
  await newDb.end();
  console.log('\nDatabase connections closed.');
}
