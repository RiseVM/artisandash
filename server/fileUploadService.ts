import { google } from 'googleapis';
import { Readable } from 'stream';
import sharp from 'sharp';

let connectionSettings: any;

const PROJECT_FILES_FOLDER = 'Project Files';
let cachedProjectFilesFolderId: string | null = null;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
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

async function getDriveClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

async function getOrCreateProjectFilesFolder(drive: any): Promise<string | null> {
  if (cachedProjectFilesFolderId) {
    return cachedProjectFilesFolderId;
  }

  try {
    const searchResponse = await drive.files.list({
      q: `name='${PROJECT_FILES_FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
      cachedProjectFilesFolderId = searchResponse.data.files[0].id;
      return cachedProjectFilesFolderId;
    }

    const createResponse = await drive.files.create({
      requestBody: {
        name: PROJECT_FILES_FOLDER,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    });

    cachedProjectFilesFolderId = createResponse.data.id;
    return cachedProjectFilesFolderId;
  } catch (error) {
    console.error('Error getting/creating project files folder:', error);
    return null;
  }
}

async function getOrCreateProjectFolder(drive: any, projectId: number, projectName: string): Promise<string | null> {
  const parentFolderId = await getOrCreateProjectFilesFolder(drive);
  if (!parentFolderId) return null;

  const folderName = `Project ${projectId} - ${projectName}`;

  try {
    // Search for existing project folder
    const searchResponse = await drive.files.list({
      q: `name='${folderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
      return searchResponse.data.files[0].id;
    }

    // Create new project folder
    const createResponse = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
      },
      fields: 'id',
    });

    return createResponse.data.id;
  } catch (error) {
    console.error('Error getting/creating project folder:', error);
    return null;
  }
}

export interface UploadResult {
  fileId: string;
  webViewLink: string;
  thumbnailLink?: string;
}

export async function uploadProjectFile(options: {
  projectId: number;
  projectName: string;
  fileName: string;
  fileBuffer: Buffer;
  mimeType: string;
}): Promise<UploadResult | null> {
  try {
    const drive = await getDriveClient();
    const projectFolderId = await getOrCreateProjectFolder(drive, options.projectId, options.projectName);

    const fileMetadata: any = {
      name: options.fileName,
    };

    if (projectFolderId) {
      fileMetadata.parents = [projectFolderId];
    }

    const media = {
      mimeType: options.mimeType,
      body: Readable.from(options.fileBuffer),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink, thumbnailLink',
    });

    // Make the file viewable by anyone with the link
    if (response.data.id) {
      try {
        await drive.permissions.create({
          fileId: response.data.id,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        });
      } catch (permError) {
        console.log('Could not set file permissions:', permError);
      }
    }

    console.log(`Uploaded project file to Google Drive: ${options.fileName} (ID: ${response.data.id})`);

    return {
      fileId: response.data.id || '',
      webViewLink: response.data.webViewLink || '',
      thumbnailLink: response.data.thumbnailLink || undefined,
    };
  } catch (error) {
    console.error('Error uploading project file to Google Drive:', error);
    return null;
  }
}

export async function generateThumbnail(fileBuffer: Buffer, mimeType: string): Promise<Buffer | null> {
  // Only generate thumbnails for images
  if (!mimeType.startsWith('image/')) {
    return null;
  }

  try {
    const thumbnail = await sharp(fileBuffer)
      .resize(300, 300, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    return thumbnail;
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return null;
  }
}

export async function uploadThumbnail(options: {
  projectId: number;
  projectName: string;
  originalFileName: string;
  thumbnailBuffer: Buffer;
}): Promise<string | null> {
  try {
    const drive = await getDriveClient();
    const projectFolderId = await getOrCreateProjectFolder(drive, options.projectId, options.projectName);

    const thumbnailName = `thumb_${options.originalFileName.replace(/\.[^.]+$/, '')}.jpg`;

    const fileMetadata: any = {
      name: thumbnailName,
    };

    if (projectFolderId) {
      fileMetadata.parents = [projectFolderId];
    }

    const media = {
      mimeType: 'image/jpeg',
      body: Readable.from(options.thumbnailBuffer),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
    });

    // Make thumbnail viewable
    if (response.data.id) {
      try {
        await drive.permissions.create({
          fileId: response.data.id,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        });
      } catch (permError) {
        console.log('Could not set thumbnail permissions:', permError);
      }
    }

    return response.data.webViewLink || null;
  } catch (error) {
    console.error('Error uploading thumbnail:', error);
    return null;
  }
}

export async function deleteProjectFile(fileId: string): Promise<boolean> {
  try {
    const drive = await getDriveClient();
    await drive.files.delete({ fileId });
    console.log(`Deleted file from Google Drive: ${fileId}`);
    return true;
  } catch (error) {
    console.error('Error deleting file from Google Drive:', error);
    return false;
  }
}

export function getDirectDownloadUrl(webViewLink: string): string {
  // Convert Google Drive view link to direct download link
  const match = webViewLink.match(/\/d\/([^/]+)/);
  if (match) {
    return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  }
  return webViewLink;
}
