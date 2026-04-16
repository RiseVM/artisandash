/**
 * Google Drive integration service.
 *
 * Uses the unified folder hierarchy from driveStructure.ts.
 * Falls back gracefully when credentials are not configured.
 */
import { google } from "googleapis";
import { Readable } from "stream";
import {
  getRootFolder,
  getProjectSubfolder,
  getClientAgreementsFolder,
  getSubfolder,
  type ProjectSubfolder,
} from "./driveStructure";

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

let _driveClient: any = null;

export function getDriveClient(): any {
  if (_driveClient) return _driveClient;

  const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );

  if (!clientEmail || !privateKey) {
    throw new Error("Google Drive service is not configured");
  }

  const auth = new google.auth.JWT(clientEmail, undefined, privateKey, [
    "https://www.googleapis.com/auth/drive",
  ]);

  _driveClient = google.drive({ version: "v3", auth });
  return _driveClient;
}

// ---------------------------------------------------------------------------
// Upload helpers
// ---------------------------------------------------------------------------

function bufferToStream(buf: Buffer): Readable {
  const stream = new Readable();
  stream.push(buf);
  stream.push(null);
  return stream;
}

async function uploadFile(
  drive: any,
  parentFolderId: string,
  fileName: string,
  mimeType: string,
  body: Buffer,
): Promise<{ fileId: string; webViewLink: string }> {
  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [parentFolderId],
    },
    media: {
      mimeType,
      body: bufferToStream(body),
    },
    fields: "id, webViewLink",
  });

  // Make viewable by anyone with link
  await drive.permissions.create({
    fileId: res.data.id,
    requestBody: { role: "reader", type: "anyone" },
  });

  return {
    fileId: res.data.id!,
    webViewLink: res.data.webViewLink!,
  };
}

// ---------------------------------------------------------------------------
// Agreement text (sample checkout)
// ---------------------------------------------------------------------------

export function getAgreementText(): string {
  return `SAMPLE CHECKOUT AGREEMENT

By signing this agreement, you acknowledge that you have received the sample tile(s) listed above on loan from Artisan Tile Kitchen & Bath. You agree to return the sample(s) in the same condition by the due date specified. Failure to return samples may result in a replacement charge.

Artisan Tile Kitchen & Bath
1200 Boston Post Road, Guilford, CT 06437
(203) 458-8453`;
}

// ---------------------------------------------------------------------------
// Upload: sample checkout agreement
// ---------------------------------------------------------------------------

export async function uploadAgreementToGoogleDrive(opts: {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerId?: number;
  sampleName: string;
  checkoutDate: string;
  dueDate: string;
  signatureDataUrl: string;
}): Promise<{
  fileId: string;
  webViewLink: string;
  agreementText: string;
} | null> {
  const drive = getDriveClient();

  let folderId: string;
  if (opts.customerId) {
    folderId = await getClientAgreementsFolder(
      drive,
      opts.customerId,
      opts.customerName,
    );
  } else {
    // Fallback: flat Agreements folder under root
    const root = await getRootFolder(drive);
    folderId = await getSubfolder(drive, root, "Agreements");
  }

  const fileName = `Agreement - ${opts.customerName} - ${opts.sampleName} - ${opts.checkoutDate}.pdf`;
  const agreementText = getAgreementText();

  // Build a simple text PDF buffer
  const textContent = `${agreementText}

Customer: ${opts.customerName}
Email: ${opts.customerEmail}
${opts.customerPhone ? `Phone: ${opts.customerPhone}` : ""}
Sample: ${opts.sampleName}
Checkout Date: ${opts.checkoutDate}
Due Date: ${opts.dueDate}
Signed electronically`;

  const buf = Buffer.from(textContent, "utf-8");

  const result = await uploadFile(
    drive,
    folderId,
    fileName,
    "application/pdf",
    buf,
  );

  return { ...result, agreementText };
}

// ---------------------------------------------------------------------------
// Upload: contract PDF
// ---------------------------------------------------------------------------

export async function uploadContractToGoogleDrive(opts: {
  contractType: string;
  formData: Record<string, unknown>;
  signatureDataUrl: string;
  customerId?: number;
  customerName?: string;
  projectId?: number;
  projectName?: string;
  pdfBuffer?: Buffer;
}): Promise<{ fileId: string; webViewLink: string } | null> {
  const drive = getDriveClient();

  let folderId: string;
  if (opts.customerId && opts.customerName && opts.projectId && opts.projectName) {
    folderId = await getProjectSubfolder(
      drive,
      opts.customerId,
      opts.customerName,
      opts.projectId,
      opts.projectName,
      "Contracts",
    );
  } else if (opts.customerId && opts.customerName) {
    // No project — put in client-level Contracts folder
    const { getClientFolder } = await import("./driveStructure");
    const client = await getClientFolder(drive, opts.customerId, opts.customerName);
    folderId = await getSubfolder(drive, client, "Contracts");
  } else {
    // Fallback: flat Contracts folder at root
    const root = await getRootFolder(drive);
    folderId = await getSubfolder(drive, root, "Contracts");
  }

  const typeLabel =
    opts.contractType === "custom_cabinetry"
      ? "Cabinetry"
      : opts.contractType === "home_improvement"
        ? "Home Improvement"
        : opts.contractType === "kitchen_design_retainer"
          ? "Kitchen Design Retainer"
          : opts.contractType;

  const customerName =
    opts.customerName ||
    (opts.formData as any).purchaserName ||
    (opts.formData as any).ownerName1 ||
    (opts.formData as any).clientName ||
    "Unknown";

  const date = new Date()
    .toLocaleDateString("en-US", { timeZone: "America/New_York" })
    .replace(/\//g, "-");

  const fileName = `${typeLabel} Contract - ${customerName} - ${date}.pdf`;

  const buf =
    opts.pdfBuffer || Buffer.from(`Contract placeholder for ${customerName}`, "utf-8");

  return uploadFile(drive, folderId, fileName, "application/pdf", buf);
}

// ---------------------------------------------------------------------------
// Upload: project file (photos, documents, etc.)
// ---------------------------------------------------------------------------

export async function uploadProjectFile(opts: {
  customerId: number;
  customerName: string;
  projectId: number;
  projectName: string;
  fileName: string;
  fileBuffer: Buffer;
  mimeType: string;
  category?: string;
  isPhoto?: boolean;
}): Promise<{ fileId: string; webViewLink: string } | null> {
  const drive = getDriveClient();

  let subfolder: ProjectSubfolder = "Documents";
  if (opts.isPhoto || opts.mimeType?.startsWith("image/")) {
    subfolder = "Photos";
  } else if (opts.category === "contract") {
    subfolder = "Contracts";
  }

  const folderId = await getProjectSubfolder(
    drive,
    opts.customerId,
    opts.customerName,
    opts.projectId,
    opts.projectName,
    subfolder,
  );

  return uploadFile(drive, folderId, opts.fileName, opts.mimeType, opts.fileBuffer);
}

// ---------------------------------------------------------------------------
// Upload: thumbnail
// ---------------------------------------------------------------------------

export async function uploadThumbnail(opts: {
  customerId: number;
  customerName: string;
  projectId: number;
  projectName: string;
  originalFileName: string;
  thumbnailBuffer: Buffer;
}): Promise<string | null> {
  const drive = getDriveClient();

  const folderId = await getProjectSubfolder(
    drive,
    opts.customerId,
    opts.customerName,
    opts.projectId,
    opts.projectName,
    "Photos",
  );

  const fileName = `thumb_${opts.originalFileName}`;
  const result = await uploadFile(
    drive,
    folderId,
    fileName,
    "image/jpeg",
    opts.thumbnailBuffer,
  );

  return result.webViewLink;
}

// ---------------------------------------------------------------------------
// Upload: quote PDF
// ---------------------------------------------------------------------------

export async function uploadQuotePdf(opts: {
  customerId: number;
  customerName: string;
  projectId?: number;
  projectName?: string;
  quoteNumber: string;
  pdfBuffer: Buffer;
}): Promise<{ fileId: string; webViewLink: string }> {
  const drive = getDriveClient();

  let folderId: string;
  if (opts.projectId && opts.projectName) {
    folderId = await getProjectSubfolder(
      drive,
      opts.customerId,
      opts.customerName,
      opts.projectId,
      opts.projectName,
      "Quotes",
    );
  } else {
    const { getClientFolder } = await import("./driveStructure");
    const client = await getClientFolder(
      drive,
      opts.customerId,
      opts.customerName,
    );
    folderId = await getSubfolder(drive, client, "Quotes");
  }

  const date = new Date()
    .toLocaleDateString("en-US", { timeZone: "America/New_York" })
    .replace(/\//g, "-");

  const fileName = `Quote ${opts.quoteNumber} - ${opts.customerName} - ${date}.pdf`;

  return uploadFile(drive, folderId, fileName, "application/pdf", opts.pdfBuffer);
}
