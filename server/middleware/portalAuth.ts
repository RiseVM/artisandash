import type { RequestHandler } from "express";

/**
 * Requires an authenticated portal (client) session.
 * Sets req.portalUser on success, including linked projects.
 * Also allows admin users to preview portal as client (admin_preview mode).
 */
export const isPortalAuthenticated: RequestHandler = async (req: any, res, next) => {
  // Normal portal session
  if (req.session?.portalUserId) {
    const { portalStorage } = await import("../modules/portal/storage");
    const portalUser = await portalStorage.getClientPortalUser(req.session.portalUserId);
    if (!portalUser || portalUser.is_active !== "yes") {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "Portal access is inactive" });
    }
    const projects = await portalStorage.getClientProjects(portalUser.customer.id);
    req.portalUser = { ...portalUser, projects };
    return next();
  }

  // Admin preview mode — admin user viewing client portal
  if (req.session?.userId) {
    const { storage: authStorage } = await import("../modules/auth/storage");
    const adminUser = await authStorage.getUser(req.session.userId);
    if (adminUser && (adminUser.role === "admin" || adminUser.role === "owner")) {
      const { portalStorage } = await import("../modules/portal/storage");

      // For project-specific routes, look up the actual customer from the project
      const projectIdMatch = req.path.match(/\/projects\/(\d+)/);
      let customerId = 0;
      let customerName = "Admin Preview";

      if (projectIdMatch) {
        const pid = parseInt(projectIdMatch[1]);
        const projectInfo = await portalStorage.getProjectCustomerId(pid);
        if (projectInfo) {
          customerId = projectInfo.customer_id;
          customerName = projectInfo.customer_name || "Client";
        }
      }

      const projects = customerId
        ? await portalStorage.getClientProjects(customerId)
        : await portalStorage.getAllProjects();

      req.portalUser = {
        user: { id: "admin-preview", email: adminUser.email, is_active: "yes" },
        customer: { id: customerId, name: customerName },
        projects,
        isAdminPreview: true,
      };
      return next();
    }
  }

  return res.status(401).json({ error: "Not authenticated" });
};

/**
 * Helper to check if a portal user has access to a specific project.
 * Use inside portal route handlers after isPortalAuthenticated.
 */
export function hasProjectAccess(req: any, projectId: number): boolean {
  return req.portalUser?.projects?.some((p: any) => p.id === projectId) ?? false;
}
