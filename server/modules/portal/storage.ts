import { db } from "../../../db/index";
import { clientPortalAccess, customers, projects } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import type { ProjectWithCustomer, ClientPortalUser } from "@shared/schema";

/**
 * Portal storage — minimal for auth middleware.
 * Full portal queries built in Phase 7.
 */
export const storage = {
  async getClientPortalUser(id: number): Promise<ClientPortalUser | undefined> {
    const [access] = await db
      .select()
      .from(clientPortalAccess)
      .where(eq(clientPortalAccess.id, id));

    if (!access) return undefined;

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, access.customer_id));

    if (!customer) return undefined;

    return { ...access, customer } as ClientPortalUser;
  },

  async getClientProjects(customerId: number): Promise<ProjectWithCustomer[]> {
    const projectList = await db
      .select()
      .from(projects)
      .where(eq(projects.customer_id, customerId));

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId));

    return projectList.map((p) => ({
      ...p,
      customer: customer || null,
    })) as ProjectWithCustomer[];
  },
};
