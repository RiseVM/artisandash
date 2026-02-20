import type { Express } from "express";
import { z } from "zod";
import path from "path";
import fs from "fs";
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

  // Create a new contract
  app.post(
    "/api/contracts",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const userId = req.user?.id;
      const data = insertContractSchema.parse(req.body);

      if (!data.signature_data || data.signature_data.trim().length === 0) {
        return res.status(400).json({ error: "Signature data is required" });
      }

      // PDF generation is optional — wrapped in try/catch
      let pdfFileId: string | null = null;
      let pdfPath: string | null = null;

      try {
        const { generateContractPdf } = await import("./contractPdfService");
        const pdfBuffer = await generateContractPdf(
          data.contract_type,
          data.form_data || {},
          data.signature_data,
        );

        // Store PDF buffer in a temporary location or storage service
        // For now, we'll just mark that PDF generation was successful
        pdfFileId = `pdf_${Date.now()}`;
      } catch (pdfError) {
        // PDF generation failed — continue without it
        console.log("[contracts] PDF generation skipped:", pdfError instanceof Error ? pdfError.message : "unknown error");
      }

      // Google Drive upload is optional — wrapped in try/catch
      let googleDriveFileId: string | null = null;
      let googleDriveLink: string | null = null;

      try {
        const { uploadContractToGoogleDrive } = await import("../../services/googleDriveService");

        const driveResult = await uploadContractToGoogleDrive({
          contractType: data.contract_type,
          formData: data.form_data || {},
          signatureDataUrl: data.signature_data,
        });

        if (driveResult) {
          googleDriveFileId = driveResult.fileId;
          googleDriveLink = driveResult.webViewLink;
        }
      } catch (driveError) {
        // Google Drive service not available or failed — continue without it
        console.log("[contracts] Google Drive upload skipped:", driveError instanceof Error ? driveError.message : "unknown error");
      }

      // Email sending is optional — wrapped in try/catch
      try {
        const { sendContractEmail } = await import("../../services/emailService");

        await sendContractEmail(
          data.customer_email || "",
          data.customer_name || "",
          data.contract_type,
          Buffer.from(data.signature_data, "base64"),
        );
      } catch (emailError) {
        // Email service not available or failed — continue without it
        console.log("[contracts] Email sending skipped:", emailError instanceof Error ? emailError.message : "unknown error");
      }

      const contract = await contractStorage.createContract({
        ...data,
        created_by_user_id: userId,
        pdf_file_id: pdfFileId,
        google_drive_file_id: googleDriveFileId,
        google_drive_link: googleDriveLink,
      });

      res.status(201).json(contract);
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
