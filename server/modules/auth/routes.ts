import type { Express } from "express";
import { asyncHandler, isAuthenticated, authLimiter } from "../../middleware";
import { authenticateUser } from "./service";
import { storage } from "./storage";

export function registerAuthRoutes(app: Express) {
  // Login
  app.post(
    "/api/auth/login",
    authLimiter,
    asyncHandler(async (req: any, res) => {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const user = await authenticateUser(email, password);

      if (!user) {
        await storage.createActivityLog({
          userEmail: email,
          action: "login_failed",
          details: "Invalid credentials or inactive account",
          ipAddress: req.ip,
        });
        return res.status(401).json({ error: "Invalid email or password" });
      }

      req.session.userId = user.id;
      req.session.userEmail = user.email;
      req.session.userRole = user.role;

      await storage.createActivityLog({
        userId: user.id,
        userEmail: user.email,
        action: "login",
        details: "User logged in successfully",
        ipAddress: req.ip,
      });

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      });
    }),
  );

  // Logout
  app.post(
    "/api/auth/logout",
    asyncHandler(async (req: any, res) => {
      const userId = req.session?.userId;
      const userEmail = req.session?.userEmail;

      if (userId) {
        await storage.createActivityLog({
          userId,
          userEmail: userEmail || undefined,
          action: "logout",
          details: "User logged out",
          ipAddress: req.ip,
        });
      }

      req.session.destroy((err: any) => {
        if (err) {
          return res.status(500).json({ error: "Failed to logout" });
        }
        res.json({ success: true });
      });
    }),
  );

  // Get current user
  app.get(
    "/api/auth/user",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      res.json({
        id: req.user!.id,
        email: req.user!.email,
        firstName: req.user!.firstName,
        lastName: req.user!.lastName,
        role: req.user!.role,
      });
    }),
  );
}
