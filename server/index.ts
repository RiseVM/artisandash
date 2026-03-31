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

    // Phase 8: timesheets
    const { registerTimesheetRoutes } = await import("./modules/timesheets/routes");
    registerTimesheetRoutes(app);

    // Phase 9: estimates, notes, internal messages
    const { registerEstimateRoutes } = await import("./modules/estimates/routes");
    registerEstimateRoutes(app);

    const { registerNoteRoutes } = await import("./modules/notes/routes");
    registerNoteRoutes(app);

    const { registerInternalMessageRoutes } = await import("./modules/internal-messages/routes");
    registerInternalMessageRoutes(app);

    // Phase 10: service catalog
    const { registerCatalogRoutes } = await import("./modules/catalog/routes");
    registerCatalogRoutes(app);

    // Phase 11: team resources
    const { registerTeamRoutes } = await import("./modules/team/routes");
    registerTeamRoutes(app);

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
