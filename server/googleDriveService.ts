import { google } from 'googleapis';
import { Readable } from 'stream';
import { generateAgreementPdf, getAgreementText } from './pdfService';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-drive',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Drive not connected');
  }
  return accessToken;
}

async function getUncachableGoogleDriveClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

export { getAgreementText };

export async function uploadAgreementToGoogleDrive(options: {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  sampleName: string;
  checkoutDate: string;
  dueDate: string;
  signatureDataUrl: string;
}): Promise<{ fileId: string; webViewLink: string; agreementText: string } | null> {
  try {
    const drive = await getUncachableGoogleDriveClient();
    const signedAt = new Date();
    
    const pdfBuffer = await generateAgreementPdf({
      ...options,
      signedAt,
    });
    
    const dateStr = signedAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-');
    
    const fileName = `Artisan Tile Agreement - ${options.customerName} - ${dateStr}.pdf`;
    
    const fileMetadata = {
      name: fileName,
    };

    const media = {
      mimeType: 'application/pdf',
      body: Readable.from(pdfBuffer),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
    });

    console.log(`Uploaded agreement PDF to Google Drive: ${fileName} (ID: ${response.data.id})`);
    
    return {
      fileId: response.data.id || '',
      webViewLink: response.data.webViewLink || '',
      agreementText: getAgreementText(),
    };
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    return null;
  }
}
