import type { Express } from "express";
import { z } from "zod";
import { insertSignedAgreementSchema } from "@shared/schema";
import { agreementStorage } from "./storage";
import { asyncHandler, isAuthenticated } from "../../middleware";

export function registerAgreementRoutes(app: Express) {
  // Get all signed agreements
  app.get(
    "/api/agreements",
    isAuthenticated,
    asyncHandler(async (_req, res) => {
      const agreements = await agreementStorage.getSignedAgreements();
      res.json(agreements);
    }),
  );

  // Get agreements for a specific customer
  app.get(
    "/api/agreements/customer/:customerId",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const customerId = parseInt(req.params.customerId);
      if (isNaN(customerId)) {
        return res.status(400).json({ error: "Invalid customer ID" });
      }
      const agreements = await agreementStorage.getSignedAgreementsByCustomer(customerId);
      res.json(agreements);
    }),
  );

  // Get a single agreement
  app.get(
    "/api/agreements/:id",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid agreement ID" });
      }
      const agreement = await agreementStorage.getSignedAgreement(id);
      if (!agreement) {
        return res.status(404).json({ error: "Agreement not found" });
      }
      res.json(agreement);
    }),
  );

  // Create a new signed agreement
  app.post(
    "/api/agreements",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const userId = req.user?.id;
      const data = insertSignedAgreementSchema.parse(req.body);

      if (!data.signature_data || data.signature_data.trim().length === 0) {
        return res.status(400).json({ error: "Signature data is required" });
      }

      // Google Drive upload is optional — will be added when the service is ported
      let googleDriveFileId: string | null = null;
      let googleDriveLink: string | null = null;
      let agreementText: string | null = data.agreement_text || null;

      try {
        // Attempt Google Drive upload if service is available
        const { uploadAgreementToGoogleDrive, getAgreementText } = await import(
          "../../services/googleDriveService"
        );
        const { storage: checkoutStorage } = await import("../checkouts/storage");
        const { storage: customerStorage } = await import("../customers/storage");

        const customer = await customerStorage.getCustomer(data.customer_id);
        const customerName = customer?.name || "Unknown Customer";
        const customerEmail = customer?.email || "";
        const customerPhone = customer?.phone || undefined;

        let sampleName = "Sample";
        let checkoutDate = new Date().toLocaleDateString();
        let dueDate = new Date().toLocaleDateString();

        if (data.checkout_id) {
          const checkout = await checkoutStorage.getCheckoutView(data.checkout_id);
          if (checkout) {
            sampleName = checkout.item.name;
            checkoutDate = checkout.checkout_date;
            dueDate = checkout.due_date;
          }
        }

        agreementText = getAgreementText();

        const driveResult = await uploadAgreementToGoogleDrive({
          customerName,
          customerEmail,
          customerPhone,
          sampleName,
          checkoutDate,
          dueDate,
          signatureDataUrl: data.signature_data,
        });

        if (driveResult) {
          googleDriveFileId = driveResult.fileId;
          googleDriveLink = driveResult.webViewLink;
          agreementText = driveResult.agreementText;
        }
      } catch {
        // Google Drive service not available or failed — continue without it
        console.log("[agreements] Google Drive upload skipped (service unavailable)");
      }

      const agreement = await agreementStorage.createSignedAgreement({
        ...data,
        created_by_user_id: userId,
        agreement_text: agreementText,
        google_drive_file_id: googleDriveFileId,
        google_drive_link: googleDriveLink,
      });

      res.status(201).json(agreement);
    }),
  );

  // Update an agreement
  app.patch(
    "/api/agreements/:id",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid agreement ID" });
      }
      const allowedFields = ["customer_id", "document_title", "agreement_text"];
      const updateData: any = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }
      const updated = await agreementStorage.updateSignedAgreement(id, updateData);
      if (!updated) {
        return res.status(404).json({ error: "Agreement not found" });
      }
      res.json(updated);
    }),
  );

  // Delete an agreement
  app.delete(
    "/api/agreements/:id",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid agreement ID" });
      }
      const deleted = await agreementStorage.deleteSignedAgreement(id);
      if (!deleted) {
        return res.status(404).json({ error: "Agreement not found" });
      }
      res.json({ success: true });
    }),
  );
}
