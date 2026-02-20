import type { RequestHandler } from "express";

/**
 * Requires an authenticated portal (client) session.
 * Sets req.portalUser on success, including linked projects.
 */
export const isPortalAuthenticated: RequestHandler = async (req: any, res, next) => {
  if (!req.session?.portalUserId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  // Lazy import to avoid circular deps
  const { portalStorage } = await import("../modules/portal/storage");

  const portalUser = await portalStorage.getClientPortalUser(req.session.portalUserId);
  if (!portalUser || portalUser.is_active !== "yes") {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "Portal access is inactive" });
  }

  // Load the customer's projects for access checks
  const projects = await portalStorage.getClientProjects(portalUser.customer.id);
  req.portalUser = { ...portalUser, projects };
  next();
};

/**
 * Helper to check if a portal user has access to a specific project.
 * Use inside portal route handlers after isPortalAuthenticated.
 */
export function hasProjectAccess(req: any, projectId: number): boolean {
  return req.portalUser?.projects?.some((p: any) => p.id === projectId) ?? false;
}
