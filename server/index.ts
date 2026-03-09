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
