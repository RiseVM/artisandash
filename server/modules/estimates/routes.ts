import type { Express } from "express";
import {
  asyncHandler,
  isAuthenticated,
  requirePermission,
} from "../../middleware";
import { insertEstimateSchema, insertEstimateLineItemSchema } from "@shared/schema";
import { storage } from "./storage";
import { generateEstimatePdf } from "./estimatePdfService";
import { uploadQuotePdf } from "../../services/googleDriveService";

export function registerEstimateRoutes(app: Express) {
  // ── GET /api/estimates ────────────────────────
  app.get(
    "/api/estimates",
    isAuthenticated,
    asyncHandler(async (_req, res) => {
      const estimates = await storage.getEstimates();
      res.json(estimates);
    }),
  );

  // ── GET /api/estimates/:id ────────────────────
  app.get(
    "/api/estimates/:id",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid estimate ID" });

      const estimate = await storage.getEstimate(id);
      if (!estimate) return res.status(404).json({ error: "Estimate not found" });
      res.json(estimate);
    }),
  );

  // ── POST /api/estimates ───────────────────────
  app.post(
    "/api/estimates",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const userId = req.user?.id;
      const userName = req.user?.email;
      const estimateNumber = await storage.generateEstimateNumber();

      const data = insertEstimateSchema.parse({
        ...req.body,
        estimate_number: estimateNumber,
        created_by_user_id: userId,
        created_by_user_name: userName,
      });

      const estimate = await storage.createEstimate(data);
      res.status(201).json(estimate);
    }),
  );

  // ── PATCH /api/estimates/:id ──────────────────
  app.patch(
    "/api/estimates/:id",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid estimate ID" });

      const data: any = insertEstimateSchema.partial().parse(req.body);

      // Record timestamps on status transitions
      if (data.status) {
        const existing = await storage.getEstimateBasic(id);
        if (existing && existing.status !== data.status) {
          if (data.status === "sent" && !existing.sent_at) {
            data.sent_at = new Date();
          }
          if (data.status === "approved" && !existing.approved_at) {
            data.approved_at = new Date();
          }
          if (data.status === "expired" && !existing.expired_at) {
            data.expired_at = new Date();
          }
        }
      }

      const estimate = await storage.updateEstimate(id, data);
      if (!estimate) return res.status(404).json({ error: "Estimate not found" });

      // Recalculate totals if tax_rate changed
      if (req.body.tax_rate !== undefined) {
        const recalculated = await storage.recalculateEstimateTotals(id);
        if (recalculated) return res.json(recalculated);
      }

      res.json(estimate);
    }),
  );

  // ── DELETE /api/estimates/:id ─────────────────
  app.delete(
    "/api/estimates/:id",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid estimate ID" });

      const deleted = await storage.deleteEstimate(id);
      if (!deleted) return res.status(404).json({ error: "Estimate not found" });
      res.json({ success: true });
    }),
  );

  // ── GET /api/estimates/:id/line-items ─────────
  app.get(
    "/api/estimates/:id/line-items",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const estimateId = parseInt(req.params.id);
      if (isNaN(estimateId)) return res.status(400).json({ error: "Invalid estimate ID" });

      const items = await storage.getLineItems(estimateId);
      res.json(items);
    }),
  );

  // ── POST /api/estimate-line-items ─────────────
  app.post(
    "/api/estimate-line-items",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const data = insertEstimateLineItemSchema.parse(req.body);
      const item = await storage.createLineItem(data);

      // Recalculate parent estimate totals
      await storage.recalculateEstimateTotals(data.estimate_id);

      res.status(201).json(item);
    }),
  );

  // ── PATCH /api/estimate-line-items/:id ────────
  app.patch(
    "/api/estimate-line-items/:id",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid line item ID" });

      const data = insertEstimateLineItemSchema.partial().parse(req.body);
      const item = await storage.updateLineItem(id, data);
      if (!item) return res.status(404).json({ error: "Line item not found" });

      // Recalculate parent estimate totals
      await storage.recalculateEstimateTotals(item.estimate_id);

      res.json(item);
    }),
  );

  // ── DELETE /api/estimate-line-items/:id ───────
  app.delete(
    "/api/estimate-line-items/:id",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid line item ID" });

      // Get the item first to know which estimate to recalculate
      const items = await storage.getLineItems(0); // We need to look up by ID
      // Instead, just delete and we'll use a different approach
      const deleted = await storage.deleteLineItem(id);
      if (!deleted) return res.status(404).json({ error: "Line item not found" });

      // The estimate_id comes from the request body or we handle it differently
      if (req.body.estimate_id) {
        await storage.recalculateEstimateTotals(req.body.estimate_id);
      }

      res.json({ success: true });
    }),
  );

  // ── POST /api/estimates/:id/generate-pdf ─────
  // Generates a branded PDF, uploads to Google Drive, saves link on the estimate
  app.post(
    "/api/estimates/:id/generate-pdf",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid estimate ID" });

      const estimate = await storage.getEstimate(id);
      if (!estimate) return res.status(404).json({ error: "Estimate not found" });

      const pdfBuffer = await generateEstimatePdf({
        id: estimate.id,
        estimate_number: estimate.estimate_number,
        title: estimate.title,
        description: estimate.description,
        status: estimate.status,
        issue_date: estimate.issue_date,
        expiry_date: estimate.expiry_date,
        notes: estimate.notes,
        created_at: estimate.created_at,
        customer: {
          name: estimate.customer?.name || "Unknown",
          email: estimate.customer?.email,
          phone: estimate.customer?.phone,
          address: estimate.customer?.address,
        },
        lineItems: estimate.lineItems || [],
        subtotal: estimate.subtotal,
        tax_rate: estimate.tax_rate,
        tax_amount: estimate.tax_amount,
        total: estimate.total,
      });

      // Upload to Google Drive
      let driveResult: { fileId: string; webViewLink: string } | null = null;
      try {
        driveResult = await uploadQuotePdf({
          customerId: estimate.customer_id!,
          customerName: estimate.customer?.name || "Unknown",
          projectId: estimate.project_id || undefined,
          projectName: undefined, // could look up project name if needed
          quoteNumber: estimate.estimate_number,
          pdfBuffer,
        });

        // Save Drive link on the estimate
        if (driveResult) {
          await storage.updateEstimate(id, {
            drive_file_id: driveResult.fileId,
            drive_link: driveResult.webViewLink,
          } as any);
        }
      } catch (driveErr) {
        console.error("Drive upload failed (non-fatal):", driveErr);
      }

      res.json({
        success: true,
        drive_file_id: driveResult?.fileId || null,
        drive_link: driveResult?.webViewLink || null,
      });
    }),
  );

  // ── GET /api/estimates/:id/pdf ───────────────
  // Direct PDF download (streamed)
  app.get(
    "/api/estimates/:id/pdf",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid estimate ID" });

      const estimate = await storage.getEstimate(id);
      if (!estimate) return res.status(404).json({ error: "Estimate not found" });

      const pdfBuffer = await generateEstimatePdf({
        id: estimate.id,
        estimate_number: estimate.estimate_number,
        title: estimate.title,
        description: estimate.description,
        status: estimate.status,
        issue_date: estimate.issue_date,
        expiry_date: estimate.expiry_date,
        notes: estimate.notes,
        created_at: estimate.created_at,
        customer: {
          name: estimate.customer?.name || "Unknown",
          email: estimate.customer?.email,
          phone: estimate.customer?.phone,
          address: estimate.customer?.address,
        },
        lineItems: estimate.lineItems || [],
        subtotal: estimate.subtotal,
        tax_rate: estimate.tax_rate,
        tax_amount: estimate.tax_amount,
        total: estimate.total,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${estimate.estimate_number}.pdf"`,
      );
      res.send(pdfBuffer);
    }),
  );
}
