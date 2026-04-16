/**
 * Unified Google Drive folder structure.
 *
 * Target hierarchy:
 *   ATK&B Project Files/
 *     {Customer Name} (#{customerId})/
 *       {Project Name} (#{projectId})/
 *         Photos/
 *         Contracts/
 *         Quotes/
 *         Documents/
 *       Agreements/          <- sample checkout agreements (no project)
 */

const ROOT_FOLDER = "ATK&B Project Files";

// Map-based cache: key = "parentId::folderName"
const folderCache = new Map<string, string>();

async function getOrCreateFolder(
  drive: any,
  name: string,
  parentId: string | null,
): Promise<string> {
  const cacheKey = `${parentId ?? "root"}::${name}`;
  if (folderCache.has(cacheKey)) return folderCache.get(cacheKey)!;

  const q = parentId
    ? `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
    : `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const search = await drive.files.list({
    q,
    fields: "files(id)",
    spaces: "drive",
  });
  if (search.data.files?.length > 0) {
    const id = search.data.files[0].id!;
    folderCache.set(cacheKey, id);
    return id;
  }

  const body: any = { name, mimeType: "application/vnd.google-apps.folder" };
  if (parentId) body.parents = [parentId];
  const created = await drive.files.create({
    requestBody: body,
    fields: "id",
  });
  const id = created.data.id!;
  folderCache.set(cacheKey, id);
  return id;
}

export async function getRootFolder(drive: any): Promise<string> {
  return getOrCreateFolder(drive, ROOT_FOLDER, null);
}

export async function getClientFolder(
  drive: any,
  customerId: number,
  customerName: string,
): Promise<string> {
  const root = await getRootFolder(drive);
  const folderName = `${customerName} (#${customerId})`;
  return getOrCreateFolder(drive, folderName, root);
}

export async function getProjectFolder(
  drive: any,
  customerId: number,
  customerName: string,
  projectId: number,
  projectName: string,
): Promise<string> {
  const client = await getClientFolder(drive, customerId, customerName);
  const folderName = `${projectName} (#${projectId})`;
  return getOrCreateFolder(drive, folderName, client);
}

export async function getSubfolder(
  drive: any,
  parentId: string,
  name: string,
): Promise<string> {
  return getOrCreateFolder(drive, name, parentId);
}

// Convenience: get a typed subfolder within a project
export type ProjectSubfolder = "Photos" | "Contracts" | "Quotes" | "Documents";

export async function getProjectSubfolder(
  drive: any,
  customerId: number,
  customerName: string,
  projectId: number,
  projectName: string,
  subfolder: ProjectSubfolder,
): Promise<string> {
  const proj = await getProjectFolder(
    drive,
    customerId,
    customerName,
    projectId,
    projectName,
  );
  return getSubfolder(drive, proj, subfolder);
}

// For sample checkout agreements that don't belong to a project
export async function getClientAgreementsFolder(
  drive: any,
  customerId: number,
  customerName: string,
): Promise<string> {
  const client = await getClientFolder(drive, customerId, customerName);
  return getSubfolder(drive, client, "Agreements");
}
