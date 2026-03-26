import type { Express } from "express";
import { z } from "zod";
import crypto from "crypto";
import bcryptjs from "bcryptjs";
import { asyncHandler, isAuthenticated, isPortalAuthenticated } from "../../middleware";
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

      const { signature } = z
        .object({
          signature: z.string().min(1),
        })
        .parse(req.body);

      // Use the portal user's email as the approver identity
      const approvedBy = req.portalUser.email;

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
      res.json({ count: unreadCount });
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

      const { content, subject } = z
        .object({
          content: z.string().min(1).max(5000),
          subject: z.string().max(200).optional(),
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
        subject: subject || null,
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

  // ── GET /api/portal/contracts ───────────────────
  app.get(
    "/api/portal/contracts",
    isPortalAuthenticated,
    asyncHandler(async (req: any, res) => {
      const contracts = await portalStorage.getContractsByCustomerEmail(req.portalUser.email);
      res.json(contracts);
    }),
  );

  // ── GET /api/portal/contracts/:id/pdf ──────────
  app.get(
    "/api/portal/contracts/:id/pdf",
    isPortalAuthenticated,
    asyncHandler(async (req: any, res) => {
      const contractId = parseInt(req.params.id);
      if (isNaN(contractId)) {
        return res.status(400).json({ error: "Invalid contract ID" });
      }

      const contracts = await portalStorage.getContractsByCustomerEmail(req.portalUser.email);
      const contract = contracts.find((c) => c.id === contractId);

      if (!contract) {
        return res.status(403).json({ error: "Access denied" });
      }

      try {
        const { generateContractPdf } = await import("../contracts/contractPdfService");
        const signatureData = contract.signature_data || "";
        const pdfBuffer = await generateContractPdf(
          contract.contract_type,
          contract.form_data || {},
          signatureData,
        );

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="contract_${contractId}.pdf"`);
        res.send(pdfBuffer);
      } catch (error) {
        console.error("PDF generation failed:", error);
        return res.status(500).json({ error: "Failed to generate PDF" });
      }
    }),
  );

  // ── POST /api/portal/forgot-password ────────────
  app.post(
    "/api/portal/forgot-password",
    asyncHandler(async (req: any, res) => {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);

      const portalAccess = await portalStorage.getClientPortalAccessByEmail(email);
      if (!portalAccess) {
        // Don't reveal whether email exists
        return res.json({ success: true, message: "If an account exists, a password reset email has been sent" });
      }

      // Generate temporary password
      const tempPassword = crypto.randomBytes(12).toString("hex").slice(0, 16);
      const passwordHash = await bcryptjs.hash(tempPassword, 10);

      // Update the password in the database
      await portalStorage.updateClientPortalAccess(portalAccess.id, {
        password_hash: passwordHash,
      });

      // Send email with temporary password
      try {
        const { sendPortalPasswordReset } = await import("../../services/emailService");

        const customer = await (async () => {
          // Get customer name from clientPortalAccess or default
          return portalAccess.customer_name || portalAccess.email.split("@")[0];
        })();

        await sendPortalPasswordReset(email, customer, tempPassword);
      } catch (emailError) {
        console.log("[portal] Password reset email skipped:", emailError instanceof Error ? emailError.message : "unknown error");
      }

      res.json({ success: true, message: "Password reset email sent" });
    }),
  );

  // ── POST /api/send-portal-setup-email ────────────
  app.post(
    "/api/send-portal-setup-email",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const { customer_email, customer_name, context, context_details } = z
        .object({
          customer_email: z.string().email(),
          customer_name: z.string(),
          context: z.string(), // 'project' | 'contract'
          context_details: z.string(), // project name or contract type
        })
        .parse(req.body);

      try {
        const { sendPortalSetupInvitation } = await import("../../services/emailService");
        await sendPortalSetupInvitation(customer_email, customer_name, context, context_details);
        res.json({ success: true });
      } catch (error) {
        console.error("Failed to send portal setup email:", error);
        return res.status(500).json({ error: "Failed to send email" });
      }
    }),
  );

  // ── GET /api/client-portal-access/customer/:customerId ──
  app.get(
    "/api/client-portal-access/customer/:customerId",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const customerId = parseInt(req.params.customerId);
      if (isNaN(customerId)) {
        return res.status(400).json({ error: "Invalid customer ID" });
      }

      const accesses = await portalStorage.getClientPortalAccessByCustomerId(customerId);
      if (accesses.length === 0) {
        return res.status(404).json({ error: "Portal access not found" });
      }

      // Return first result and exclude password_hash
      const { password_hash, ...accessWithoutPassword } = accesses[0];
      res.json(accessWithoutPassword);
    }),
  );

  // ── POST /api/client-portal-access ──────────────────
  app.post(
    "/api/client-portal-access",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const { customer_id, email, password, send_invite } = z
        .object({
          customer_id: z.number(),
          email: z.string().email(),
          password: z.string().min(1),
          send_invite: z.boolean().optional(),
        })
        .parse(req.body);

      // Hash password
      const password_hash = await bcryptjs.hash(password, 10);

      // Create portal access
      const created = await portalStorage.createClientPortalAccess({
        customer_id,
        email,
        password_hash,
        is_active: "yes",
      });

      // Exclude password_hash from response
      const { password_hash: _, ...accessWithoutPassword } = created;
      res.status(201).json(accessWithoutPassword);
    }),
  );

  // ── POST /api/client-portal-access/:id/send-invite ──
  app.post(
    "/api/client-portal-access/:id/send-invite",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid access ID" });
      }

      const { password } = z
        .object({
          password: z.string().min(1),
        })
        .parse(req.body);

      // Get the existing access record to get email
      const access = await portalStorage.getClientPortalAccessById(id);
      if (!access) {
        return res.status(404).json({ error: "Portal access not found" });
      }

      // Hash the new password
      const password_hash = await bcryptjs.hash(password, 10);

      // Update password
      await portalStorage.updateClientPortalAccess(id, {
        password_hash,
      });

      // Send invite email
      try {
        const { sendPortalSetupInvitation } = await import("../../services/emailService");
        const customerName = access.customer_name || access.email.split("@")[0];
        await sendPortalSetupInvitation(access.email, customerName, "portal", "Portal Access");
      } catch (emailError) {
        console.log("[portal] Setup invite email skipped:", emailError instanceof Error ? emailError.message : "unknown error");
      }

      res.json({ success: true });
    }),
  );

  // ── POST /api/client-portal-access/:id/reset-password ─
  app.post(
    "/api/client-portal-access/:id/reset-password",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid access ID" });
      }

      const { new_password, send_email } = z
        .object({
          new_password: z.string().min(1),
          send_email: z.boolean().optional(),
        })
        .parse(req.body);

      // Get the existing access record
      const access = await portalStorage.getClientPortalAccessById(id);
      if (!access) {
        return res.status(404).json({ error: "Portal access not found" });
      }

      // Hash the new password
      const password_hash = await bcryptjs.hash(new_password, 10);

      // Update password
      await portalStorage.updateClientPortalAccess(id, {
        password_hash,
      });

      // Send password reset email if requested
      if (send_email) {
        try {
          const { sendPortalPasswordReset } = await import("../../services/emailService");
          const customerName = access.customer_name || access.email.split("@")[0];
          await sendPortalPasswordReset(access.email, customerName, new_password);
        } catch (emailError) {
          console.log("[portal] Password reset email skipped:", emailError instanceof Error ? emailError.message : "unknown error");
        }
      }

      res.json({ success: true });
    }),
  );

  // ── PATCH /api/client-portal-access/:id ────────────────
  app.patch(
    "/api/client-portal-access/:id",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid access ID" });
      }

      const data = z
        .object({
          is_active: z.enum(["yes", "no"]).optional(),
        })
        .parse(req.body);

      // Update portal access
      const updated = await portalStorage.updateClientPortalAccess(id, data);
      if (!updated) {
        return res.status(404).json({ error: "Portal access not found" });
      }

      // Exclude password_hash from response
      const { password_hash, ...accessWithoutPassword } = updated;
      res.json(accessWithoutPassword);
    }),
  );

  // ── POST /api/portal/change-orders/:id/reject ────────────
  app.post(
    "/api/portal/change-orders/:id/reject",
    isPortalAuthenticated,
    asyncHandler(async (req: any, res) => {
      const changeOrderId = parseInt(req.params.id);
      if (isNaN(changeOrderId)) {
        return res.status(400).json({ error: "Invalid change order ID" });
      }

      const { rejection_reason } = z
        .object({
          rejection_reason: z.string().min(1),
        })
        .parse(req.body);

      // Get the change order
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

      // Reject the change order
      const updated = await portalStorage.rejectChangeOrder(changeOrderId, rejection_reason);
      res.json(updated);
    }),
  );
}
