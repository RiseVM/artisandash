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

const FOLDER_NAME = 'Sample Checkout Agreements';
const CONTRACTS_FOLDER_NAME = 'Contracts';
let cachedFolderId: string | null = null;
let cachedContractsFolderId: string | null = null;

async function getOrCreateAgreementsFolder(drive: any): Promise<string | null> {
  if (cachedFolderId) {
    return cachedFolderId;
  }

  try {
    const searchResponse = await drive.files.list({
      q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
      cachedFolderId = searchResponse.data.files[0].id;
      console.log(`Found existing folder: ${FOLDER_NAME} (ID: ${cachedFolderId})`);
      return cachedFolderId;
    }

    const createResponse = await drive.files.create({
      requestBody: {
        name: FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    });

    cachedFolderId = createResponse.data.id;
    console.log(`Created new folder: ${FOLDER_NAME} (ID: ${cachedFolderId})`);
    return cachedFolderId;
  } catch (error) {
    console.error('Error getting/creating agreements folder:', error);
    return null;
  }
}

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
      timeZone: 'America/New_York',
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

    const fileId = response.data.id;
    
    // Move to agreements folder
    if (fileId) {
      const folderId = await getOrCreateAgreementsFolder(drive);
      if (folderId) {
        try {
          await drive.files.update({
            fileId: fileId,
            addParents: folderId,
            fields: 'id, parents'
          });
          console.log(`Moved agreement PDF to folder: ${fileName} (ID: ${fileId})`);
        } catch (moveError) {
          console.log(`Could not move to folder, file is in Drive root: ${fileName}`);
        }
      }
    }

    console.log(`Uploaded agreement PDF to Google Drive: ${fileName} (ID: ${fileId})`);
    
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

async function getOrCreateContractsFolder(drive: any): Promise<string | null> {
  if (cachedContractsFolderId) {
    return cachedContractsFolderId;
  }

  try {
    const searchResponse = await drive.files.list({
      q: `name='${CONTRACTS_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
      cachedContractsFolderId = searchResponse.data.files[0].id;
      console.log(`Found existing folder: ${CONTRACTS_FOLDER_NAME} (ID: ${cachedContractsFolderId})`);
      return cachedContractsFolderId;
    }

    const createResponse = await drive.files.create({
      requestBody: {
        name: CONTRACTS_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    });

    cachedContractsFolderId = createResponse.data.id;
    console.log(`Created new folder: ${CONTRACTS_FOLDER_NAME} (ID: ${cachedContractsFolderId})`);
    return cachedContractsFolderId;
  } catch (error) {
    console.error('Error getting/creating contracts folder:', error);
    return null;
  }
}

export async function uploadContractToGoogleDrive(options: {
  customerName: string;
  contractType: string;
  pdfBuffer: Buffer;
}): Promise<{ fileId: string; webViewLink: string } | null> {
  try {
    const drive = await getUncachableGoogleDriveClient();
    const signedAt = new Date();
    
    const dateStr = signedAt.toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-');
    
    const fileName = `${options.customerName} - ${dateStr}.pdf`;
    
    const fileMetadata = {
      name: fileName,
    };

    const media = {
      mimeType: 'application/pdf',
      body: Readable.from(options.pdfBuffer),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
    });

    const fileId = response.data.id;
    
    // Move to contracts folder
    if (fileId) {
      const folderId = await getOrCreateContractsFolder(drive);
      if (folderId) {
        try {
          await drive.files.update({
            fileId: fileId,
            addParents: folderId,
            fields: 'id, parents'
          });
          console.log(`Moved contract PDF to folder: ${fileName} (ID: ${fileId})`);
        } catch (moveError) {
          console.log(`Could not move to folder, file is in Drive root: ${fileName}`);
        }
      }
    }

    console.log(`Uploaded contract PDF to Google Drive: ${fileName} (ID: ${fileId})`);
    
    return {
      fileId: response.data.id || '',
      webViewLink: response.data.webViewLink || '',
    };
  } catch (error) {
    console.error('Error uploading contract to Google Drive:', error);
    return null;
  }
}
