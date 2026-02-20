/**
 * Google Drive integration stub.
 *
 * This module is dynamically imported with try/catch so the app works without
 * Google Drive credentials. To enable, set GOOGLE_DRIVE_* env vars and
 * implement the functions below.
 */

export function getAgreementText(): string {
  throw new Error("Google Drive service is not configured");
}

export async function uploadAgreementToGoogleDrive(_opts: {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  sampleName: string;
  checkoutDate: string;
  dueDate: string;
  signatureDataUrl: string;
}): Promise<{ fileId: string; webViewLink: string; agreementText: string } | null> {
  throw new Error("Google Drive service is not configured");
}

export async function uploadContractToGoogleDrive(_opts: {
  contractType: string;
  formData: Record<string, unknown>;
  signatureDataUrl: string;
}): Promise<{ fileId: string; webViewLink: string } | null> {
  throw new Error("Google Drive service is not configured");
}
