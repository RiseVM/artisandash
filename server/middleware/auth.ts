import type { RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import type { User } from "@shared/schema";

// Extend session with our custom fields
declare module "express-session" {
  interface SessionData {
    userId: string;
    userEmail: string;
    userRole: string;
    // Portal session data
    portalUserId: number;
    portalCustomerId: number;
    portalEmail: string;
  }
}

// Extend Express Request with user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      portalUser?: any;
    }
  }
}

/**
 * Create and configure session middleware.
 * Uses PostgreSQL-backed sessions via connect-pg-simple.
 */
export function createSessionMiddleware() {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be set. See .env.example for instructions.");
  }

  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const PgStore = connectPg(session);
  const sessionStore = new PgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  return session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

/**
 * Requires an authenticated admin/staff user session.
 * Sets req.user on success.
 */
export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    // Lazy import to avoid circular deps
    const { storage } = await import("../modules/auth/storage");
    const user = await storage.getUser(req.session.userId);

    if (!user || user.isActive !== "yes") {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "User account is inactive" });
    }

    req.user = user;
    next();
  } catch (err: any) {
    console.error("[isAuthenticated] Failed to load user:", req.session.userId, err?.message, err?.stack);
    return res.status(500).json({ error: "Authentication check failed", detail: err?.message });
  }
};

/**
 * Requires admin role.
 */
export const isAdmin: RequestHandler = async (req: any, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { storage } = await import("../modules/auth/storage");
    const user = await storage.getUser(req.session.userId);

    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    req.user = user;
    next();
  } catch (err: any) {
    console.error("[isAdmin] Failed to load user:", req.session.userId, err?.message);
    return res.status(500).json({ error: "Authentication check failed", detail: err?.message });
  }
};

/**
 * Requires a specific permission based on the user's role.
 *
 * Usage:
 *   app.get("/api/projects", requirePermission("manage_projects"), handler);
 */
export const requirePermission = (permission: string): RequestHandler => {
  return async (req: any, res, next) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { storage } = await import("../modules/auth/storage");
      const user = await storage.getUser(req.session.userId);

      if (!user || user.isActive !== "yes") {
        req.session.destroy(() => {});
        return res.status(401).json({ error: "User account is inactive" });
      }

      req.user = user;

      const hasPermission = await storage.hasPermission(user, permission);
      if (!hasPermission) {
        return res.status(403).json({ error: `Permission required: ${permission}` });
      }

      next();
    } catch (err: any) {
      console.error("[requirePermission] Failed:", permission, req.session.userId, err?.message);
      return res.status(500).json({ error: "Authentication check failed", detail: err?.message });
    }
  };
};
