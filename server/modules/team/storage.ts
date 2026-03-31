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
// Based on ATK&B new hire documents, HR/legal/payroll items stripped.
const DEFAULT_SETUP_ITEMS: { section: string; item_text: string }[] = [
  // ═══ PHASE 1: New Hire Preparation (before start date) ═══

  // Workspace & Equipment
  { section: "Workspace & Equipment", item_text: "Office/workspace assigned" },
  { section: "Workspace & Equipment", item_text: "Office/workspace furniture ordered" },
  { section: "Workspace & Equipment", item_text: "Basic office supplies stocked" },
  { section: "Workspace & Equipment", item_text: "Phone/extension assigned" },
  { section: "Workspace & Equipment", item_text: "Keys/building access provided" },
  { section: "Workspace & Equipment", item_text: "Name badge created" },
  { section: "Workspace & Equipment", item_text: "Cell phone assigned (if applicable)" },
  { section: "Workspace & Equipment", item_text: "Business cards ordered (if applicable)" },

  // Systems & Access
  { section: "Systems & Access", item_text: "Computer/laptop assigned" },
  { section: "Systems & Access", item_text: "Necessary software installed" },
  { section: "Systems & Access", item_text: "Monitor/keyboard/mouse set up" },
  { section: "Systems & Access", item_text: "Printer/copier access set up" },
  { section: "Systems & Access", item_text: "Network access and passwords created" },
  { section: "Systems & Access", item_text: "Email account created" },
  { section: "Systems & Access", item_text: "Artisan Dash account created and access confirmed" },

  // Day One Preparation
  { section: "Day One Preparation", item_text: "Start date confirmed" },
  { section: "Day One Preparation", item_text: "New hire orientation scheduled" },
  { section: "Day One Preparation", item_text: "Buddy or point-of-contact assigned" },
  { section: "Day One Preparation", item_text: "New hire announcement shared with team" },
  { section: "Day One Preparation", item_text: "Workspace ready for first day" },

  // ═══ PHASE 2: Company Orientation (first 3 days) ═══

  // Introduction to the Company
  { section: "Introduction to the Company", item_text: "Company overview and history" },
  { section: "Introduction to the Company", item_text: "Company culture and values" },
  { section: "Introduction to the Company", item_text: "Organization mission" },
  { section: "Introduction to the Company", item_text: "Organizational chart reviewed" },
  { section: "Introduction to the Company", item_text: "Meet the team — introductions to all staff" },

  // Facility Tour
  { section: "Facility Tour", item_text: "Restrooms" },
  { section: "Facility Tour", item_text: "Break room and kitchen" },
  { section: "Facility Tour", item_text: "Office supplies and where to find them" },
  { section: "Facility Tour", item_text: "Copy center (printers, fax, scanner)" },
  { section: "Facility Tour", item_text: "Bulletin board and communications board" },
  { section: "Facility Tour", item_text: "Parking" },
  { section: "Facility Tour", item_text: "Emergency exits and evacuation plan" },

  // How We Work
  { section: "How We Work", item_text: "Daily workflow and communication norms" },
  { section: "How We Work", item_text: "How projects are managed (Artisan Dash walkthrough)" },
  { section: "How We Work", item_text: "How to handle client calls and inquiries" },
  { section: "How We Work", item_text: "Customer interaction and presentation standards" },
  { section: "How We Work", item_text: "Meeting schedules and check-in cadence" },
  { section: "How We Work", item_text: "Who to go to for what (internal contacts)" },

  // ═══ PHASE 3: Policies & Standards (first week) ═══

  // Workplace Policies
  { section: "Workplace Policies", item_text: "Dress code and presentation standards" },
  { section: "Workplace Policies", item_text: "Confidentiality and client privacy" },
  { section: "Workplace Policies", item_text: "Security procedures" },
  { section: "Workplace Policies", item_text: "Personal conduct standards" },
  { section: "Workplace Policies", item_text: "Email and phone usage policy" },

  // Safety & Procedures
  { section: "Safety & Procedures", item_text: "Safety procedures overview" },
  { section: "Safety & Procedures", item_text: "How to report an issue or injury" },
  { section: "Safety & Procedures", item_text: "Emergency procedures and fire safety" },
  { section: "Safety & Procedures", item_text: "Expense reporting process" },
  { section: "Safety & Procedures", item_text: "Purchase request process" },
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
