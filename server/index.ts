import express from "express";
import { createServer } from "http";

// Extend IncomingMessage for webhook raw body
declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// ------------------------------------
// Boot the server inside an async IIFE so every
// initialisation error is caught in one place.
// ------------------------------------

(async () => {
  try {
    // --- Run pending schema migrations before anything else ---
    const { pool: dbPool } = await import("../db/index");
    const migrations = [
      `ALTER TABLE estimates ADD COLUMN IF NOT EXISTS valid_until text`,
      `ALTER TABLE estimates ADD COLUMN IF NOT EXISTS sent_at timestamp`,
      `ALTER TABLE estimates ADD COLUMN IF NOT EXISTS approved_at timestamp`,
      `ALTER TABLE estimates ADD COLUMN IF NOT EXISTS expired_at timestamp`,
      // QuickBooks integration fields
      `ALTER TABLE estimates ADD COLUMN IF NOT EXISTS qb_sync_status text NOT NULL DEFAULT 'not_synced'`,
      `ALTER TABLE estimates ADD COLUMN IF NOT EXISTS qb_invoice_id text`,
      `ALTER TABLE estimates ADD COLUMN IF NOT EXISTS qb_synced_at timestamp`,
      `ALTER TABLE estimates ADD COLUMN IF NOT EXISTS qb_error_message text`,
      `ALTER TABLE entity_notes ADD COLUMN IF NOT EXISTS is_internal text NOT NULL DEFAULT 'no'`,
      // Team Resources tables
      `CREATE TABLE IF NOT EXISTS team_members (
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
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS team_setup_items (
        id SERIAL PRIMARY KEY,
        team_member_id INTEGER NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
        section TEXT NOT NULL,
        item_text TEXT NOT NULL,
        is_checked BOOLEAN NOT NULL DEFAULT FALSE,
        checked_by_user_name VARCHAR,
        checked_at TIMESTAMP,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS "IDX_team_setup_items_member_id" ON team_setup_items(team_member_id)`,
      `CREATE TABLE IF NOT EXISTS team_resources (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        file_name TEXT,
        file_url TEXT,
        external_url TEXT,
        uploaded_by_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        uploaded_by_user_name VARCHAR,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      // Seed default ATK&B template resources (idempotent — only inserts if title doesn't exist)
      `INSERT INTO team_resources (title, category, description, file_name, file_url, uploaded_by_user_name)
       SELECT 'New Hire Preparation Checklist', 'setup', 'ATK&B preparation checklist — workspace, equipment, and access setup before start date.', 'Checklist-New-Hire-Preparation.docx', '/templates/Checklist-New-Hire-Preparation.docx', 'System'
       WHERE NOT EXISTS (SELECT 1 FROM team_resources WHERE title = 'New Hire Preparation Checklist')`,
      `INSERT INTO team_resources (title, category, description, file_name, file_url, uploaded_by_user_name)
       SELECT 'New Hire Orientation Checklist', 'setup', 'ATK&B orientation checklist — company overview, facility tour, and how-we-work training.', 'Checklist-New-Hire-Orientation.docx', '/templates/Checklist-New-Hire-Orientation.docx', 'System'
       WHERE NOT EXISTS (SELECT 1 FROM team_resources WHERE title = 'New Hire Orientation Checklist')`,
      `INSERT INTO team_resources (title, category, description, file_name, file_url, uploaded_by_user_name)
       SELECT 'New Hire Paperwork Checklist', 'setup', 'ATK&B paperwork checklist — HR forms, policies, and documentation for new employees.', 'Checklist-New-Hire-Paperwork.docx', '/templates/Checklist-New-Hire-Paperwork.docx', 'System'
       WHERE NOT EXISTS (SELECT 1 FROM team_resources WHERE title = 'New Hire Paperwork Checklist')`,
      `INSERT INTO team_resources (title, category, description, file_name, file_url, uploaded_by_user_name)
       SELECT 'Countertop & Backsplash Project Steps', 'sop', 'Procedures for countertop and backsplash projects — measurement, customer communication, and installation steps.', 'Countertop-Backsplash-Project-Steps.pdf', '/templates/Countertop-Backsplash-Project-Steps.pdf', 'System'
       WHERE NOT EXISTS (SELECT 1 FROM team_resources WHERE title = 'Countertop & Backsplash Project Steps')`,
      // Base timecards tables (ensure they exist before dependent tables)
      `CREATE TABLE IF NOT EXISTS timecards (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES users(id),
        week_start_date VARCHAR NOT NULL,
        status VARCHAR NOT NULL DEFAULT 'draft',
        submitted_at TIMESTAMP,
        approved_at TIMESTAMP,
        approved_by_id VARCHAR REFERENCES users(id),
        total_hours NUMERIC(5, 2) DEFAULT '0',
        total_mileage NUMERIC(8, 1) DEFAULT '0',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS "IDX_timecards_user_id" ON timecards(user_id)`,
      `CREATE INDEX IF NOT EXISTS "IDX_timecards_week" ON timecards(week_start_date)`,
      `CREATE TABLE IF NOT EXISTS timecard_entries (
        id SERIAL PRIMARY KEY,
        timecard_id INTEGER NOT NULL REFERENCES timecards(id) ON DELETE CASCADE,
        entry_date VARCHAR NOT NULL,
        hours NUMERIC(4, 2) NOT NULL DEFAULT '0',
        mileage NUMERIC(7, 1) DEFAULT '0',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS "IDX_timecard_entries_timecard_id" ON timecard_entries(timecard_id)`,
      `CREATE TABLE IF NOT EXISTS timecard_audit_log (
        id SERIAL PRIMARY KEY,
        timecard_id INTEGER NOT NULL REFERENCES timecards(id) ON DELETE CASCADE,
        changed_by_id VARCHAR NOT NULL REFERENCES users(id),
        changed_at TIMESTAMP DEFAULT NOW(),
        action VARCHAR NOT NULL,
        entry_date VARCHAR,
        old_hours NUMERIC(4, 2),
        new_hours NUMERIC(4, 2),
        old_notes TEXT,
        new_notes TEXT,
        description TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS "IDX_timecard_audit_timecard_id" ON timecard_audit_log(timecard_id)`,
      // Clock in/out punches table for timecards
      `CREATE TABLE IF NOT EXISTS timecard_punches (
        id SERIAL PRIMARY KEY,
        timecard_id INTEGER NOT NULL REFERENCES timecards(id) ON DELETE CASCADE,
        user_id VARCHAR NOT NULL REFERENCES users(id),
        punch_date VARCHAR NOT NULL,
        clock_in TIMESTAMP NOT NULL,
        clock_out TIMESTAMP,
        hours NUMERIC(5, 2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS "IDX_punches_timecard_id" ON timecard_punches(timecard_id)`,
      `CREATE INDEX IF NOT EXISTS "IDX_punches_user_date" ON timecard_punches(user_id, punch_date)`,
      // Mileage fields on users and timecard entries
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS mileage_enabled TEXT NOT NULL DEFAULT 'no'`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS mileage_rate NUMERIC(5, 3)`,
      `ALTER TABLE timecard_entries ADD COLUMN IF NOT EXISTS mileage NUMERIC(7, 1) DEFAULT '0'`,
      `ALTER TABLE timecards ADD COLUMN IF NOT EXISTS total_mileage NUMERIC(8, 1) DEFAULT '0'`,
      // Payroll contacts table
      `CREATE TABLE IF NOT EXISTS payroll_contacts (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        email VARCHAR NOT NULL,
        is_active TEXT NOT NULL DEFAULT 'yes',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`,
      // Timecard recipients table (HR / managers who timecards are submitted to)
      `CREATE TABLE IF NOT EXISTS timecard_recipients (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        email VARCHAR NOT NULL,
        title VARCHAR,
        is_active TEXT NOT NULL DEFAULT 'yes',
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      // Clock in/out columns on timecard entries
      `ALTER TABLE timecard_entries ADD COLUMN IF NOT EXISTS clock_in VARCHAR`,
      `ALTER TABLE timecard_entries ADD COLUMN IF NOT EXISTS clock_out VARCHAR`,
      // Mileage log table
      `CREATE TABLE IF NOT EXISTS timecard_mileage (
        id SERIAL PRIMARY KEY,
        timecard_id INTEGER NOT NULL REFERENCES timecards(id) ON DELETE CASCADE,
        entry_date VARCHAR NOT NULL,
        miles NUMERIC(6, 2) NOT NULL DEFAULT '0',
        purpose TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS "IDX_timecard_mileage_timecard_id" ON timecard_mileage(timecard_id)`,
      // Add recipient_id column to timecards
      `ALTER TABLE timecards ADD COLUMN IF NOT EXISTS recipient_id INTEGER REFERENCES timecard_recipients(id)`,
      // Seed default recipient (Claudia — HR Manager) if none exist
      `INSERT INTO timecard_recipients (name, email, title, is_active)
       SELECT 'Claudia', 'claudia@artisantilect.com', 'HR Manager', 'yes'
       WHERE NOT EXISTS (SELECT 1 FROM timecard_recipients LIMIT 1)`,
    ];
    for (const sql of migrations) {
      try { await dbPool.query(sql); } catch (e: any) {
        // Column already exists or other non-fatal error — safe to ignore
        if (!e.message?.includes("already exists")) console.warn("Migration warning:", e.message);
      }
    }
    console.log("Schema migrations checked.");

    // --- dynamic imports so failures are caught ---
    const helmet = (await import("helmet")).default;
    const compression = (await import("compression")).default;
    const {
      logger,
      requestLogger,
      errorHandler,
      createSessionMiddleware,
      apiLimiter,
    } = await import("./middleware");

    const app = express();
    const httpServer = createServer(app);

    // ------------------------------------
    // Global middleware
    // ------------------------------------

    // Security headers
    app.use(
      helmet({
        contentSecurityPolicy: false, // Managed by Vite in dev / static in prod
      }),
    );

    // Gzip compression
    app.use(compression());

    // Trust proxy (Railway/Render)
    app.set("trust proxy", 1);

    // Body parsing with raw body for webhooks
    app.use(
      express.json({
        verify: (req, _res, buf) => {
          req.rawBody = buf;
        },
      }),
    );
    app.use(express.urlencoded({ extended: false }));

    // Request logging
    app.use(requestLogger);

    // Session middleware (PostgreSQL-backed)
    console.log("[boot] creating session middleware...");
    app.use(createSessionMiddleware());
    console.log("[boot] session middleware OK");

    // General API rate limiting
    app.use("/api", apiLimiter);

    // ------------------------------------
    // Database migrations (safe to run multiple times)
    // ------------------------------------
    const { migrateContracts } = await import("./migrate-contracts");
    await migrateContracts();

    const { migratePhase9And10 } = await import("./migrate-phase9-10");
    await migratePhase9And10();

    // ------------------------------------
    // Route registration
    // ------------------------------------

    console.log("[boot] registering routes...");

    // Phase 1: auth, admin
    const { registerAuthRoutes } = await import("./modules/auth/routes");
    registerAuthRoutes(app);

    const { registerAdminRoutes } = await import("./modules/admin/routes");
    registerAdminRoutes(app);

    // Initialize default permissions on startup
    const { storage: adminStorage } = await import("./modules/admin/storage");
    await adminStorage.initializeDefaultPermissions();

    // Seed admin user on startup
    const { seedAdminUser } = await import("./modules/auth/service");
    await seedAdminUser();

    // Phase 2: customers, inventory
    const { registerCustomerRoutes } = await import("./modules/customers/routes");
    registerCustomerRoutes(app);

    const { registerInventoryRoutes } = await import("./modules/inventory/routes");
    registerInventoryRoutes(app);

    // Phase 3: checkouts
    const { registerCheckoutRoutes } = await import("./modules/checkouts/routes");
    registerCheckoutRoutes(app);

    // Start notification scheduler in production
    if (process.env.NODE_ENV === "production") {
      const { startScheduler } = await import("./services/notificationScheduler");
      startScheduler(60); // check every 60 minutes
    }

    // Seed default project template
    const { seedDefaultProjectTemplate } = await import("./modules/projects/storage");
    await seedDefaultProjectTemplate();

    // Phase 4: projects
    const { registerProjectRoutes } = await import("./modules/projects/routes");
    registerProjectRoutes(app);

    // Phase 5: portal
    const { registerPortalRoutes } = await import("./modules/portal/routes");
    registerPortalRoutes(app);

    // Phase 6: agreements
    const { registerAgreementRoutes } = await import("./modules/agreements/routes");
    registerAgreementRoutes(app);

    // Phase 7: contracts
    const { registerContractRoutes } = await import("./modules/contracts/routes");
    registerContractRoutes(app);

    // Phase 9: timecards (standalone weekly employee timecards)
    const { registerTimecardRoutes } = await import("./modules/timecards/routes");
    registerTimecardRoutes(app);

    // Phase 10: estimates, notes, internal messages
    const { registerEstimateRoutes } = await import("./modules/estimates/routes");
    registerEstimateRoutes(app);

    const { registerNoteRoutes } = await import("./modules/notes/routes");
    registerNoteRoutes(app);

    const { registerInternalMessageRoutes } = await import("./modules/internal-messages/routes");
    registerInternalMessageRoutes(app);

    // Phase 11: service catalog
    const { registerCatalogRoutes } = await import("./modules/catalog/routes");
    registerCatalogRoutes(app);

    // Phase 12: team resources
    const { registerTeamRoutes } = await import("./modules/team/routes");
    registerTeamRoutes(app);

    // Serve template files (docx downloads) — works in both dev and production
    const templatePath = await import("path");
    const templateDir = templatePath.default.resolve(process.cwd(), "public", "templates");
    app.use("/templates", express.static(templateDir));

    // Health check
    app.get("/api/health", (_req, res) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    console.log("[boot] routes registered OK");

    // Error handler (must be last middleware)
    app.use(errorHandler);

    // Static file serving
    if (process.env.NODE_ENV === "production") {
      const { serveStatic } = await import("./static");
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    const port = parseInt(process.env.PORT || "5000", 10);
    httpServer.listen({ port, host: "0.0.0.0" }, () => {
      logger.info(`Server running on port ${port} (${process.env.NODE_ENV || "development"})`);
    });
  } catch (err) {
    console.error("=".repeat(60));
    console.error("FATAL: Server failed to start");
    console.error("=".repeat(60));
    console.error(err);
    process.exit(1);
  }
})();
