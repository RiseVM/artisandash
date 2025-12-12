import { google } from 'googleapis';
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
    
    const requests: any[] = [];
    let currentIndex = 1;
    
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: 'ARTISAN TILE\n'
      }
    });
    currentIndex += 13;
    
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: 'Sample Checkout Agreement\n\n'
      }
    });
    currentIndex += 28;
    
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: 'CUSTOMER INFORMATION:\n'
      }
    });
    currentIndex += 22;
    
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: `Name: ${options.customerName}\n`
      }
    });
    currentIndex += 7 + options.customerName.length;
    
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: `Email: ${options.customerEmail}\n`
      }
    });
    currentIndex += 8 + options.customerEmail.length;
    
    if (options.customerPhone) {
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: `Phone: ${options.customerPhone}\n`
        }
      });
      currentIndex += 8 + options.customerPhone.length;
    }
    
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: '\nSAMPLE DETAILS:\n'
      }
    });
    currentIndex += 17;
    
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: `Sample: ${options.sampleName}\n`
      }
    });
    currentIndex += 9 + options.sampleName.length;
    
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: `Checkout Date: ${options.checkoutDate}\n`
      }
    });
    currentIndex += 16 + options.checkoutDate.length;
    
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: `Due Date: ${options.dueDate}\n`
      }
    });
    currentIndex += 11 + options.dueDate.length;
    
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: '\n─────────────────────────────────────────\n\n'
      }
    });
    currentIndex += 46;
    
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: 'CUSTOMER ACKNOWLEDGMENT:\n'
      }
    });
    currentIndex += 25;
    
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: '[X] I agree to the sample policy and authorize storing my card on file\n\n'
      }
    });
    currentIndex += 73;
    
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: 'I authorize Artisan Tile to store my card on file and charge it for the full retail price of the sample if it is not returned by the due date or is returned damaged.\n\n'
      }
    });
    currentIndex += 170;
    
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: 'TERMS AND CONDITIONS:\n\n'
      }
    });
    currentIndex += 23;
    
    const terms = [
      '1. The sample(s) listed above are loaned to the customer for evaluation purposes only.\n\n',
      '2. The customer agrees to return the sample(s) in the same condition as received by the due date specified.\n\n',
      '3. If the sample(s) are not returned by the due date, or are returned damaged, the customer authorizes Artisan Tile to charge the full retail price to the card on file.\n\n',
      '4. The customer is responsible for the care and safekeeping of the sample(s) while in their possession.\n\n',
      '5. Artisan Tile reserves the right to pursue collection of any unpaid charges.\n\n',
    ];
    
    for (const term of terms) {
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: term
        }
      });
      currentIndex += term.length;
    }
    
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: '─────────────────────────────────────────\n\n'
      }
    });
    currentIndex += 45;
    
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: 'CUSTOMER SIGNATURE:\n'
      }
    });
    currentIndex += 20;
    
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: '[Signature on file - see image below]\n\n'
      }
    });
    currentIndex += 40;
    
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: `Signed on: ${signedAt.toLocaleString()}\n\n`
      }
    });
    currentIndex += 12 + signedAt.toLocaleString().length + 2;
    
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: `Document generated: ${new Date().toLocaleString()}\n`
      }
    });
    
    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests }
    });
    
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            updateParagraphStyle: {
              range: { startIndex: 1, endIndex: 13 },
              paragraphStyle: {
                namedStyleType: 'HEADING_1',
                alignment: 'CENTER'
              },
              fields: 'namedStyleType,alignment'
            }
          },
          {
            updateParagraphStyle: {
              range: { startIndex: 14, endIndex: 40 },
              paragraphStyle: {
                namedStyleType: 'HEADING_2',
                alignment: 'CENTER'
              },
              fields: 'namedStyleType,alignment'
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
