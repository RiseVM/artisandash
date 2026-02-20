import type { Express } from "express";
import { z } from "zod";
import bcryptjs from "bcryptjs";
import { asyncHandler, isPortalAuthenticated } from "../../middleware";
import { portalStorage } from "./storage";

export function registerPortalRoutes(app: Express) {
  // ── POST /api/portal/login ──────────────────────
  app.post(
    "/api/portal/login",
    asyncHandler(async (req: any, res) => {
      const { email, password } = z
        .object({
          email: z.string().email(),
          password: z.string().min(1),
        })
        .parse(req.body);

      // Find portal access by email
      const portalAccess = await portalStorage.getClientPortalAccessByEmail(email);
      if (!portalAccess) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Verify inactive status
      if (portalAccess.is_active !== "yes") {
        return res.status(401).json({ error: "Portal access is inactive" });
      }

      // Verify password against bcryptjs hash
      const passwordMatch = await bcryptjs.compare(password, portalAccess.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Update last login
      await portalStorage.updateClientPortalLastLogin(portalAccess.id);

      // Set session
      req.session.portalUserId = portalAccess.id;
      req.session.portalCustomerId = portalAccess.customer_id;
      req.session.portalEmail = portalAccess.email;

      // Get user with customer info
      const user = await portalStorage.getClientPortalUser(portalAccess.id);

      res.json({
        success: true,
        user,
      });
    }),
  );

  // ── POST /api/portal/logout ────────────────────
  app.post(
    "/api/portal/logout",
    asyncHandler(async (req: any, res) => {
      req.session.portalUserId = undefined;
      req.session.portalCustomerId = undefined;
      req.session.portalEmail = undefined;
      res.json({ success: true });
    }),
  );

  // ── GET /api/portal/me ─────────────────────────
  app.get(
    "/api/portal/me",
    isPortalAuthenticated,
    asyncHandler(async (req: any, res) => {
      res.json(req.portalUser);
    }),
  );

  // ── GET /api/portal/projects ───────────────────
  app.get(
    "/api/portal/projects",
    isPortalAuthenticated,
    asyncHandler(async (req: any, res) => {
      const projects = await portalStorage.getClientProjects(req.portalUser.customer.id);
      res.json(projects);
    }),
  );

  // ── GET /api/portal/projects/:id ───────────────
  app.get(
    "/api/portal/projects/:id",
    isPortalAuthenticated,
    asyncHandler(async (req: any, res) => {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const project = await portalStorage.getClientProjectWithDetails(
        projectId,
        req.portalUser.customer.id,
      );
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      res.json(project);
    }),
  );

  // ── GET /api/portal/projects/:id/change-orders ─
  app.get(
    "/api/portal/projects/:id/change-orders",
    isPortalAuthenticated,
    asyncHandler(async (req: any, res) => {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      // Verify client has access to this project
      const project = await portalStorage.getClientProjectWithDetails(
        projectId,
        req.portalUser.customer.id,
      );
      if (!project) {
        return res.status(403).json({ error: "Access denied" });
      }

      const changeOrders = await portalStorage.getClientChangeOrders(projectId);
      res.json(changeOrders);
    }),
  );

  // ── POST /api/portal/change-orders/:id/approve ─
  app.post(
    "/api/portal/change-orders/:id/approve",
    isPortalAuthenticated,
    asyncHandler(async (req: any, res) => {
      const changeOrderId = parseInt(req.params.id);
      if (isNaN(changeOrderId)) {
        return res.status(400).json({ error: "Invalid change order ID" });
      }

      const { approvedBy, signature } = z
        .object({
          approvedBy: z.string().min(1),
          signature: z.string().min(1),
        })
        .parse(req.body);

      const changeOrder = await portalStorage.getChangeOrder(changeOrderId);
      if (!changeOrder) {
        return res.status(404).json({ error: "Change order not found" });
      }

      // Verify client has access to this project
      const project = await portalStorage.getClientProjectWithDetails(
        changeOrder.project_id,
        req.portalUser.customer.id,
      );
      if (!project) {
        return res.status(403).json({ error: "Access denied" });
      }

      const updated = await portalStorage.approveChangeOrder(
        changeOrderId,
        approvedBy,
        signature,
      );

      res.json(updated);
    }),
  );

  // ── GET /api/portal/projects/:id/deliveries ────
  app.get(
    "/api/portal/projects/:id/deliveries",
    isPortalAuthenticated,
    asyncHandler(async (req: any, res) => {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      // Verify client has access to this project
      const project = await portalStorage.getClientProjectWithDetails(
        projectId,
        req.portalUser.customer.id,
      );
      if (!project) {
        return res.status(403).json({ error: "Access denied" });
      }

      const deliveries = await portalStorage.getClientProjectDeliveries(projectId);
      res.json(deliveries);
    }),
  );

  // ── GET /api/portal/projects/:id/files ────────
  app.get(
    "/api/portal/projects/:id/files",
    isPortalAuthenticated,
    asyncHandler(async (req: any, res) => {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      // Verify client has access to this project
      const project = await portalStorage.getClientProjectWithDetails(
        projectId,
        req.portalUser.customer.id,
      );
      if (!project) {
        return res.status(403).json({ error: "Access denied" });
      }

      const files = await portalStorage.getClientProjectFiles(projectId);
      res.json(files);
    }),
  );

  // ── GET /api/portal/projects/:id/updates ──────
  app.get(
    "/api/portal/projects/:id/updates",
    isPortalAuthenticated,
    asyncHandler(async (req: any, res) => {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      // Verify client has access to this project
      const project = await portalStorage.getClientProjectWithDetails(
        projectId,
        req.portalUser.customer.id,
      );
      if (!project) {
        return res.status(403).json({ error: "Access denied" });
      }

      const updates = await portalStorage.getClientProjectUpdates(projectId);
      res.json(updates);
    }),
  );

  // ── POST /api/portal/projects/:id/updates ─────
  app.post(
    "/api/portal/projects/:id/updates",
    isPortalAuthenticated,
    asyncHandler(async (req: any, res) => {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const { content } = z
        .object({
          content: z.string().min(1),
        })
        .parse(req.body);

      // Verify client has access to this project
      const project = await portalStorage.getClientProjectWithDetails(
        projectId,
        req.portalUser.customer.id,
      );
      if (!project) {
        return res.status(403).json({ error: "Access denied" });
      }

      const update = await portalStorage.createProjectUpdate({
        project_id: projectId,
        content,
        created_by: req.portalUser.email,
        created_by_type: "client",
        is_internal: "no",
      });

      res.status(201).json(update);
    }),
  );

  // ── GET /api/portal/projects/:id/messages ──────
  app.get(
    "/api/portal/projects/:id/messages",
    isPortalAuthenticated,
    asyncHandler(async (req: any, res) => {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      // Verify client has access to this project
      const project = await portalStorage.getClientProjectWithDetails(
        projectId,
        req.portalUser.customer.id,
      );
      if (!project) {
        return res.status(403).json({ error: "Access denied" });
      }

      const messages = await portalStorage.getProjectMessages(projectId);
      res.json(messages);
    }),
  );

  // ── GET /api/portal/projects/:id/messages/unread-count ─
  app.get(
    "/api/portal/projects/:id/messages/unread-count",
    isPortalAuthenticated,
    asyncHandler(async (req: any, res) => {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      // Verify client has access to this project
      const project = await portalStorage.getClientProjectWithDetails(
        projectId,
        req.portalUser.customer.id,
      );
      if (!project) {
        return res.status(403).json({ error: "Access denied" });
      }

      const unreadCount = await portalStorage.getUnreadMessageCountForClient(projectId);
      res.json({ unreadCount });
    }),
  );

  // ── POST /api/portal/projects/:id/messages ─────
  app.post(
    "/api/portal/projects/:id/messages",
    isPortalAuthenticated,
    asyncHandler(async (req: any, res) => {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const { content } = z
        .object({
          content: z.string().min(1),
        })
        .parse(req.body);

      // Verify client has access to this project
      const project = await portalStorage.getClientProjectWithDetails(
        projectId,
        req.portalUser.customer.id,
      );
      if (!project) {
        return res.status(403).json({ error: "Access denied" });
      }

      const message = await portalStorage.createProjectMessage({
        project_id: projectId,
        content,
        sender_name: req.portalUser.email,
        sender_type: "client",
        read_by_client: "yes",
        read_by_client_at: new Date(),
      });

      res.status(201).json(message);
    }),
  );

  // ── POST /api/portal/projects/:id/messages/mark-read ─
  app.post(
    "/api/portal/projects/:id/messages/mark-read",
    isPortalAuthenticated,
    asyncHandler(async (req: any, res) => {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      // Verify client has access to this project
      const project = await portalStorage.getClientProjectWithDetails(
        projectId,
        req.portalUser.customer.id,
      );
      if (!project) {
        return res.status(403).json({ error: "Access denied" });
      }

      await portalStorage.markAllMessagesReadByClient(projectId);
      res.json({ success: true });
    }),
  );

  // ── POST /api/portal/projects/:id/feedback ─────
  app.post(
    "/api/portal/projects/:id/feedback",
    isPortalAuthenticated,
    asyncHandler(async (req: any, res) => {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const { rating, comment } = z
        .object({
          rating: z.number().min(1).max(5),
          comment: z.string().optional(),
        })
        .parse(req.body);

      // Verify client has access to this project
      const project = await portalStorage.getClientProjectWithDetails(
        projectId,
        req.portalUser.customer.id,
      );
      if (!project) {
        return res.status(403).json({ error: "Access denied" });
      }

      const feedback = await portalStorage.createClientFeedback({
        project_id: projectId,
        customer_id: req.portalUser.customer.id,
        rating: rating.toString(),
        comment: comment || null,
      });

      res.status(201).json(feedback);
    }),
  );
}
