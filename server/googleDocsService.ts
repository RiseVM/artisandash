import { google } from 'googleapis';
import { Readable } from 'stream';
import { getAgreementText } from './pdfService';

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
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-docs',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Docs not connected');
  }
  return accessToken;
}

async function getUncachableGoogleDocsClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.docs({ version: 'v1', auth: oauth2Client });
}

async function getUncachableGoogleDriveClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

const AGREEMENTS_FOLDER_ID = '1SW-afvEzW2cFhEte4ENeLjeEGnh32Rov';

export { getAgreementText };

async function uploadSignatureImage(drive: any, signatureDataUrl: string, customerName: string): Promise<string | null> {
  try {
    if (!signatureDataUrl || !signatureDataUrl.startsWith('data:image')) {
      return null;
    }
    
    const base64Data = signatureDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    const fileMetadata = {
      name: `signature_${customerName}_${Date.now()}.png`,
      mimeType: 'image/png',
    };
    
    const media = {
      mimeType: 'image/png',
      body: Readable.from(imageBuffer),
    };
    
    const uploadResponse = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webContentLink',
    });
    
    const fileId = uploadResponse.data.id;
    
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
    
    const imageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
    
    return imageUrl;
  } catch (error) {
    console.error('Error uploading signature image:', error);
    return null;
  }
}

export async function createAgreementGoogleDoc(options: {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  sampleName: string;
  checkoutDate: string;
  dueDate: string;
  signatureDataUrl: string;
}): Promise<{ fileId: string; webViewLink: string; agreementText: string } | null> {
  try {
    const docs = await getUncachableGoogleDocsClient();
    const drive = await getUncachableGoogleDriveClient();
    const signedAt = new Date();
    
    const dateStr = signedAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-');
    
    const documentTitle = `${options.customerName} - ${dateStr} - Sample Agreement`;
    
    const signatureImageUrl = await uploadSignatureImage(drive, options.signatureDataUrl, options.customerName);
    
    const createResponse = await docs.documents.create({
      requestBody: {
        title: documentTitle,
      },
    });
    
    const documentId = createResponse.data.documentId;
    if (!documentId) {
      throw new Error('Failed to create Google Doc');
    }
    
    const agreementText = getAgreementText();
    
    const fullText = `ARTISAN TILE
Sample Checkout Agreement

════════════════════════════════════════

CUSTOMER INFORMATION:
Name: ${options.customerName}
Email: ${options.customerEmail}${options.customerPhone ? `\nPhone: ${options.customerPhone}` : ''}

SAMPLE DETAILS:
Sample: ${options.sampleName}
Checkout Date: ${options.checkoutDate}
Due Date: ${options.dueDate}

════════════════════════════════════════

CUSTOMER ACKNOWLEDGMENT:

[X] I agree to the sample policy and authorize storing my card on file

I authorize Artisan Tile to store my card on file and charge it for the full retail price of the sample if it is not returned by the due date or is returned damaged.

════════════════════════════════════════

TERMS AND CONDITIONS:

1. The sample(s) listed above are loaned to the customer for evaluation purposes only.

2. The customer agrees to return the sample(s) in the same condition as received by the due date specified.

3. If the sample(s) are not returned by the due date, or are returned damaged, the customer authorizes Artisan Tile to charge the full retail price to the card on file.

4. The customer is responsible for the care and safekeeping of the sample(s) while in their possession.

5. Artisan Tile reserves the right to pursue collection of any unpaid charges.

════════════════════════════════════════

CUSTOMER SIGNATURE:



Signed on: ${signedAt.toLocaleString()}

────────────────────────────────────────
Document generated: ${new Date().toLocaleString()}
`;

    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: fullText
            }
          }
        ]
      }
    });
    
    if (signatureImageUrl) {
      const signatureMarker = 'CUSTOMER SIGNATURE:\n\n\n';
      const markerIndex = fullText.indexOf(signatureMarker);
      if (markerIndex !== -1) {
        const insertIndex = 1 + markerIndex + signatureMarker.length - 1;
        
        await docs.documents.batchUpdate({
          documentId,
          requestBody: {
            requests: [
              {
                insertInlineImage: {
                  location: { index: insertIndex },
                  uri: signatureImageUrl,
                  objectSize: {
                    height: { magnitude: 100, unit: 'PT' },
                    width: { magnitude: 250, unit: 'PT' }
                  }
                }
              }
            ]
          }
        });
      }
    }
    
    const titleEndIndex = 1 + 'ARTISAN TILE'.length;
    const subtitleStart = titleEndIndex + 1;
    const subtitleEnd = subtitleStart + 'Sample Checkout Agreement'.length;
    
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            updateTextStyle: {
              range: { startIndex: 1, endIndex: titleEndIndex },
              textStyle: {
                bold: true,
                fontSize: { magnitude: 24, unit: 'PT' }
              },
              fields: 'bold,fontSize'
            }
          },
          {
            updateParagraphStyle: {
              range: { startIndex: 1, endIndex: titleEndIndex },
              paragraphStyle: {
                alignment: 'CENTER'
              },
              fields: 'alignment'
            }
          },
          {
            updateTextStyle: {
              range: { startIndex: subtitleStart, endIndex: subtitleEnd },
              textStyle: {
                bold: true,
                fontSize: { magnitude: 16, unit: 'PT' }
              },
              fields: 'bold,fontSize'
            }
          },
          {
            updateParagraphStyle: {
              range: { startIndex: subtitleStart, endIndex: subtitleEnd },
              paragraphStyle: {
                alignment: 'CENTER'
              },
              fields: 'alignment'
            }
          }
        ]
      }
    });
    
    try {
      await drive.files.update({
        fileId: documentId,
        addParents: AGREEMENTS_FOLDER_ID,
        fields: 'id, parents'
      });
    } catch (moveError) {
      console.log('Could not move to folder (may not have permission):', moveError);
    }
    
    const fileResponse = await drive.files.get({
      fileId: documentId,
      fields: 'webViewLink'
    });
    
    const webViewLink = fileResponse.data.webViewLink || `https://docs.google.com/document/d/${documentId}/edit`;
    
    console.log(`Created agreement Google Doc: ${documentTitle} (ID: ${documentId})`);
    
    return {
      fileId: documentId,
      webViewLink,
      agreementText,
    };
  } catch (error) {
    console.error('Error creating Google Doc:', error);
    return null;
  }
}
