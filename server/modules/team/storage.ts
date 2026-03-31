import { eq, desc, and } from "drizzle-orm";
import { db } from "../../../db/index";
import {
  teamMembers,
  teamSetupItems,
  teamResources,
  type TeamMember,
  type InsertTeamMember,
  type TeamSetupItem,
  type InsertTeamSetupItem,
  type TeamMemberWithItems,
  type TeamResource,
  type InsertTeamResource,
} from "@shared/schema";

// ── Default checklist items seeded for every new team member ──
const DEFAULT_SETUP_ITEMS: { section: string; item_text: string }[] = [
  // Workspace & Equipment
  { section: "Workspace & Equipment", item_text: "Desk/workspace assigned and set up" },
  { section: "Workspace & Equipment", item_text: "Computer or laptop assigned" },
  { section: "Workspace & Equipment", item_text: "Monitor, keyboard, and mouse set up" },
  { section: "Workspace & Equipment", item_text: "Phone/extension assigned" },
  { section: "Workspace & Equipment", item_text: "Keys or building access provided" },
  { section: "Workspace & Equipment", item_text: "Name badge created" },
  { section: "Workspace & Equipment", item_text: "Business cards ordered (if applicable)" },
  { section: "Workspace & Equipment", item_text: "Basic office supplies stocked" },
  // Systems & Access
  { section: "Systems & Access", item_text: "Email account created" },
  { section: "Systems & Access", item_text: "Network/Wi-Fi access set up" },
  { section: "Systems & Access", item_text: "Necessary software installed" },
  { section: "Systems & Access", item_text: "Artisan Dash account created and access confirmed" },
  { section: "Systems & Access", item_text: "Printer/copier access set up" },
  { section: "Systems & Access", item_text: "Shared drives or folders access granted" },
  { section: "Systems & Access", item_text: "Any job-specific tools or apps set up" },
  // Company Orientation
  { section: "Company Orientation", item_text: "Company overview and history reviewed" },
  { section: "Company Orientation", item_text: "Meet the team — introductions to all staff" },
  { section: "Company Orientation", item_text: "Facility tour completed (office, supply areas, break room, parking, emergency exits)" },
  { section: "Company Orientation", item_text: "Daily workflow and communication norms explained" },
  { section: "Company Orientation", item_text: "Project management process walkthrough (how we use Artisan Dash)" },
  { section: "Company Orientation", item_text: "Customer interaction standards reviewed" },
  { section: "Company Orientation", item_text: "How to handle client calls and inquiries" },
  // Policies & Standards
  { section: "Policies & Standards", item_text: "Dress code and presentation standards reviewed" },
  { section: "Policies & Standards", item_text: "Confidentiality and client privacy policy reviewed" },
  { section: "Policies & Standards", item_text: "Safety procedures reviewed" },
  { section: "Policies & Standards", item_text: "How to report an issue or injury" },
  { section: "Policies & Standards", item_text: "Email and phone usage policy reviewed" },
  { section: "Policies & Standards", item_text: "Quality standards for work output reviewed" },
];

export const teamStorage = {
  // ── Team Members ─────────────────────────────
  async getTeamMembers(): Promise<TeamMember[]> {
    return db.select().from(teamMembers).orderBy(desc(teamMembers.created_at));
  },

  async getTeamMember(id: number): Promise<TeamMemberWithItems | undefined> {
    const [member] = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
    if (!member) return undefined;

    const items = await db
      .select()
      .from(teamSetupItems)
      .where(eq(teamSetupItems.team_member_id, id))
      .orderBy(teamSetupItems.display_order);

    return { ...member, items };
  },

  async createTeamMember(data: Partial<InsertTeamMember>): Promise<TeamMember> {
    const [member] = await db.insert(teamMembers).values(data as InsertTeamMember).returning();
    await teamStorage.seedSetupItems(member.id);
    return member;
  },

  async updateTeamMember(id: number, data: Partial<InsertTeamMember>): Promise<TeamMember | undefined> {
    const [updated] = await db
      .update(teamMembers)
      .set({ ...data, updated_at: new Date() })
      .where(eq(teamMembers.id, id))
      .returning();
    return updated;
  },

  async deleteTeamMember(id: number): Promise<boolean> {
    const result = await db.delete(teamMembers).where(eq(teamMembers.id, id)).returning();
    return result.length > 0;
  },

  async seedSetupItems(teamMemberId: number): Promise<void> {
    const items = DEFAULT_SETUP_ITEMS.map((item, idx) => ({
      team_member_id: teamMemberId,
      section: item.section,
      item_text: item.item_text,
      is_checked: false,
      display_order: idx,
    }));
    await db.insert(teamSetupItems).values(items);
  },

  // ── Setup Items ──────────────────────────────
  async updateSetupItem(
    id: number,
    isChecked: boolean,
    checkedByName: string | null,
  ): Promise<TeamSetupItem | undefined> {
    const [updated] = await db
      .update(teamSetupItems)
      .set({
        is_checked: isChecked,
        checked_by_user_name: isChecked ? checkedByName : null,
        checked_at: isChecked ? new Date() : null,
      })
      .where(eq(teamSetupItems.id, id))
      .returning();
    return updated;
  },

  // ── Team Resources ───────────────────────────
  async getTeamResources(category?: string): Promise<TeamResource[]> {
    if (category && category !== "all") {
      return db
        .select()
        .from(teamResources)
        .where(eq(teamResources.category, category))
        .orderBy(desc(teamResources.created_at));
    }
    return db.select().from(teamResources).orderBy(desc(teamResources.created_at));
  },

  async createTeamResource(data: Partial<InsertTeamResource>): Promise<TeamResource> {
    const [resource] = await db.insert(teamResources).values(data as InsertTeamResource).returning();
    return resource;
  },

  async deleteTeamResource(id: number): Promise<boolean> {
    const result = await db.delete(teamResources).where(eq(teamResources.id, id)).returning();
    return result.length > 0;
  },
};
