import type { Express } from "express";
import { z } from "zod";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { insertContractSchema } from "@shared/schema";
import { contractStorage } from "./storage";
import { asyncHandler, isAuthenticated } from "../../middleware";

export function registerContractRoutes(app: Express) {
  // Get all contracts
  app.get(
    "/api/contracts",
    isAuthenticated,
    asyncHandler(async (_req, res) => {
      const contracts = await contractStorage.getContracts();
      res.json(contracts);
    }),
  );

  // Get a single contract
  app.get(
    "/api/contracts/:id",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid contract ID" });
      }
      const contract = await contractStorage.getContract(id);
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }
      res.json(contract);
    }),
  );

  // Create a new contract (supports draft creation)
  app.post(
    "/api/contracts",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const userId = req.user?.id;
      const data = insertContractSchema.parse(req.body);

      // For drafts, signature_data is not required
      const status = data.status || "draft";

      if (status !== "draft" && (!data.signature_data || data.signature_data.trim().length === 0)) {
        return res.status(400).json({ error: "Signature data is required for signed contracts" });
      }

      let pdfFileId: string | null = null;
      let googleDriveFileId: string | null = null;
      let googleDriveLink: string | null = null;

      const contract = await contractStorage.createContract({
        ...data,
        status,
        created_by_user_id: userId,
        pdf_file_id: pdfFileId,
        google_drive_file_id: googleDriveFileId,
        google_drive_link: googleDriveLink,
      });

      res.status(201).json(contract);
    }),
  );

  // Update contract (save draft progress)
  app.patch(
    "/api/contracts/:id",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid contract ID" });
      }

      const contract = await contractStorage.getContract(id);
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }

      // Cannot edit signed contracts
      if (contract.status === "signed" || contract.status === "completed") {
        return res.status(403).json({ error: "Cannot edit a signed or completed contract" });
      }

      const updateData = req.body;
      const updated = await contractStorage.updateContract(id, updateData);

      res.json(updated);
    }),
  );

  // Sign a draft contract
  app.post(
    "/api/contracts/:id/sign",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid contract ID" });
      }

      const { signature_data } = z.object({ signature_data: z.string() }).parse(req.body);

      const contract = await contractStorage.getContract(id);
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }

      if (contract.status === "signed" || contract.status === "completed") {
        return res.status(403).json({ error: "Contract is already signed" });
      }

      // Update contract with signature and status
      const updated = await contractStorage.updateContract(id, {
        signature_data,
        status: "signed",
        signed_at: new Date(),
      });

      // Try to generate PDF and send email (non-blocking)
      try {
        const { generateContractPdf } = await import("./contractPdfService");
        const pdfBuffer = await generateContractPdf(
          contract.contract_type,
          contract.form_data || {},
          signature_data,
        );

        // Try to upload to Google Drive
        try {
          const { uploadContractToGoogleDrive } = await import("../../services/googleDriveService");
          const driveResult = await uploadContractToGoogleDrive({
            contractType: contract.contract_type,
            formData: contract.form_data || {},
            signatureDataUrl: signature_data,
          });

          if (driveResult) {
            await contractStorage.updateContract(id, {
              google_drive_file_id: driveResult.fileId,
              google_drive_link: driveResult.webViewLink,
            });
          }
        } catch (driveError) {
          console.log("[contracts] Google Drive upload skipped:", driveError instanceof Error ? driveError.message : "unknown error");
        }

        // Send email with PDF
        try {
          const { sendContractEmail } = await import("../../services/emailService");
          await sendContractEmail(
            contract.customer_email,
            contract.customer_name,
            contract.contract_type,
            pdfBuffer,
          );
        } catch (emailError) {
          console.log("[contracts] Email sending skipped:", emailError instanceof Error ? emailError.message : "unknown error");
        }
      } catch (error) {
        console.log("[contracts] PDF/email processing skipped:", error instanceof Error ? error.message : "unknown error");
      }

      res.json(updated);
    }),
  );

  // Send for remote signature
  app.post(
    "/api/contracts/:id/send-for-signature",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid contract ID" });
      }

      const contract = await contractStorage.getContract(id);
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }

      if (contract.status !== "draft") {
        return res.status(403).json({ error: "Only drafts can be sent for signature" });
      }

      // Generate signing token with 7-day expiry
      const signingToken = crypto.randomBytes(32).toString("hex");
      const signingTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const updated = await contractStorage.updateContract(id, {
        signing_token: signingToken,
        signing_token_expires: signingTokenExpires,
        status: "sent_for_signature",
      });

      // Send email with signing link
      try {
        const { sendSigningRequestEmail } = await import("../../services/emailService");
        const signingUrl = `${process.env.PORTAL_BASE_URL || "https://dashboard.artisantilect.com"}/sign/${signingToken}`;

        await sendSigningRequestEmail(
          contract.customer_email,
          contract.customer_name,
          contract.contract_type,
          signingUrl,
        );
      } catch (emailError) {
        console.log("[contracts] Email sending skipped:", emailError instanceof Error ? emailError.message : "unknown error");
      }

      res.json(updated);
    }),
  );

  // Get PDF of contract
  app.get(
    "/api/contracts/:id/pdf",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid contract ID" });
      }

      const contract = await contractStorage.getContract(id);
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }

      try {
        const { generateContractPdf } = await import("./contractPdfService");
        const signatureData = contract.signature_data || "";
        const pdfBuffer = await generateContractPdf(
          contract.contract_type,
          contract.form_data || {},
          signatureData,
        );

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="contract_${id}.pdf"`);
        res.send(pdfBuffer);
      } catch (error) {
        console.error("PDF generation failed:", error);
        return res.status(500).json({ error: "Failed to generate PDF" });
      }
    }),
  );

  // Resend contract email
  app.post(
    "/api/contracts/:id/resend-email",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid contract ID" });
      }

      const contract = await contractStorage.getContract(id);
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }

      if (!contract.signature_data) {
        return res.status(400).json({ error: "Cannot resend unsigned contract" });
      }

      try {
        const { sendContractEmail } = await import("../../services/emailService");
        await sendContractEmail(
          contract.customer_email,
          contract.customer_name,
          contract.contract_type,
          Buffer.from(contract.signature_data, "base64"),
        );

        res.json({ success: true });
      } catch (error) {
        console.error("Email sending failed:", error);
        return res.status(500).json({ error: "Failed to send email" });
      }
    }),
  );

  // PUBLIC: Get contract for remote signing
  app.get(
    "/api/sign/:token",
    asyncHandler(async (req: any, res) => {
      const { token } = req.params;

      const contract = await contractStorage.getContractBySigningToken(token);
      if (!contract) {
        return res.status(404).json({ error: "Invalid or expired signing link" });
      }

      // Check if token has expired
      if (contract.signing_token_expires && contract.signing_token_expires < new Date()) {
        return res.status(403).json({ error: "Signing link has expired" });
      }

      // Check if already signed
      if (contract.status === "signed" || contract.status === "completed") {
        return res.status(403).json({ error: "This contract has already been signed" });
      }

      // Return contract data (without sensitive fields)
      res.json({
        id: contract.id,
        contract_type: contract.contract_type,
        customer_name: contract.customer_name,
        customer_email: contract.customer_email,
        form_data: contract.form_data,
      });
    }),
  );

  // PUBLIC: Submit remote signature
  app.post(
    "/api/sign/:token",
    asyncHandler(async (req: any, res) => {
      const { token } = req.params;
      const { signature_data } = z.object({ signature_data: z.string() }).parse(req.body);

      const contract = await contractStorage.getContractBySigningToken(token);
      if (!contract) {
        return res.status(404).json({ error: "Invalid or expired signing link" });
      }

      // Check if token has expired
      if (contract.signing_token_expires && contract.signing_token_expires < new Date()) {
        return res.status(403).json({ error: "Signing link has expired" });
      }

      // Check if already signed
      if (contract.status === "signed" || contract.status === "completed") {
        return res.status(403).json({ error: "This contract has already been signed" });
      }

      // Update contract with signature
      const updated = await contractStorage.updateContract(contract.id, {
        signature_data,
        status: "signed",
        signed_at: new Date(),
        signing_token: null,
        signing_token_expires: null,
      });

      // Try to generate PDF and send email (non-blocking)
      try {
        const { generateContractPdf } = await import("./contractPdfService");
        const pdfBuffer = await generateContractPdf(
          contract.contract_type,
          contract.form_data || {},
          signature_data,
        );

        // Try to upload to Google Drive
        try {
          const { uploadContractToGoogleDrive } = await import("../../services/googleDriveService");
          const driveResult = await uploadContractToGoogleDrive({
            contractType: contract.contract_type,
            formData: contract.form_data || {},
            signatureDataUrl: signature_data,
          });

          if (driveResult) {
            await contractStorage.updateContract(contract.id, {
              google_drive_file_id: driveResult.fileId,
              google_drive_link: driveResult.webViewLink,
            });
          }
        } catch (driveError) {
          console.log("[contracts] Google Drive upload skipped:", driveError instanceof Error ? driveError.message : "unknown error");
        }

        // Send email with PDF
        try {
          const { sendContractEmail } = await import("../../services/emailService");
          await sendContractEmail(
            contract.customer_email,
            contract.customer_name,
            contract.contract_type,
            pdfBuffer,
          );
        } catch (emailError) {
          console.log("[contracts] Email sending skipped:", emailError instanceof Error ? emailError.message : "unknown error");
        }
      } catch (error) {
        console.log("[contracts] PDF/email processing skipped:", error instanceof Error ? error.message : "unknown error");
      }

      res.json(updated);
    }),
  );

  // Delete a contract
  app.delete(
    "/api/contracts/:id",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid contract ID" });
      }
      const deleted = await contractStorage.deleteContract(id);
      if (!deleted) {
        return res.status(404).json({ error: "Contract not found" });
      }
      res.json({ success: true });
    }),
  );

  // Serve cabinetry contract template PDF
  app.get(
    "/api/contract-templates/cabinetry",
    asyncHandler(async (_req, res) => {
      const templatePath = path.join(
        process.cwd(),
        "attached_assets",
        "Cabinet_Contract_2025_1765835290052.pdf",
      );

      if (!fs.existsSync(templatePath)) {
        return res.status(404).json({ error: "Cabinetry contract template not found" });
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", 'attachment; filename="Cabinet_Contract_2025.pdf"');
      res.sendFile(templatePath);
    }),
  );

  // Serve home improvement contract template PDF
  app.get(
    "/api/contract-templates/home-improvement",
    asyncHandler(async (_req, res) => {
      const templatePath = path.join(
        process.cwd(),
        "attached_assets",
        "Home_Improvement_Contract-_Artisan_Tile_At_Whitfield_Design_LL_1765835252033.pdf",
      );

      if (!fs.existsSync(templatePath)) {
        return res.status(404).json({ error: "Home improvement contract template not found" });
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", 'attachment; filename="Home_Improvement_Contract.pdf"');
      res.sendFile(templatePath);
    }),
  );
}
