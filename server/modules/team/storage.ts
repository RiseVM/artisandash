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
  // Source: Checklist-New-Hire-Preparation.docx — Admin Services section

  // Workspace & Equipment
  { section: "Workspace & Equipment", item_text: "Office/workspace assigned" },
  { section: "Workspace & Equipment", item_text: "Office/workspace furniture ordered" },
  { section: "Workspace & Equipment", item_text: "Basic office supplies ordered" },
  { section: "Workspace & Equipment", item_text: "Phone/extension assigned" },
  { section: "Workspace & Equipment", item_text: "Keys for office/building assigned" },
  { section: "Workspace & Equipment", item_text: "Name badge created" },
  { section: "Workspace & Equipment", item_text: "Cell phone assigned" },
  { section: "Workspace & Equipment", item_text: "Business cards ordered" },

  // Systems & Access — Source: Preparation doc — Information Technology section
  { section: "Systems & Access", item_text: "Computer/Laptop assigned" },
  { section: "Systems & Access", item_text: "Necessary software installed" },
  { section: "Systems & Access", item_text: "Monitor/Keyboard/Mouse assigned" },
  { section: "Systems & Access", item_text: "Printer/Fax/Copier access created" },
  { section: "Systems & Access", item_text: "Network access/passwords created" },
  { section: "Systems & Access", item_text: "Email account created" },
  { section: "Systems & Access", item_text: "Artisan Dash account created and access confirmed" },

  // Day One Preparation — Source: Preparation doc — Human Resources (operational items only)
  { section: "Day One Preparation", item_text: "Start date confirmed" },
  { section: "Day One Preparation", item_text: "New hire orientation scheduled" },
  { section: "Day One Preparation", item_text: "New hire paperwork packet prepared" },
  { section: "Day One Preparation", item_text: "Buddy assigned" },
  { section: "Day One Preparation", item_text: "New hire announcement written" },
  { section: "Day One Preparation", item_text: "Workspace ready for first day" },

  // ═══ PHASE 2: Company Orientation (first 3 days) ═══
  // Source: Checklist-New-Hire-Orientation.docx

  // Introduction to the Company
  { section: "Introduction to the Company", item_text: "Company overview" },
  { section: "Introduction to the Company", item_text: "Company culture" },
  { section: "Introduction to the Company", item_text: "Organization mission" },
  { section: "Introduction to the Company", item_text: "Corporate literature/video" },
  { section: "Introduction to the Company", item_text: "Organizational chart" },

  // Administrative Procedures — Source: Orientation doc
  { section: "Administrative Procedures", item_text: "Office/desk/workstation" },
  { section: "Administrative Procedures", item_text: "Computer username and password" },
  { section: "Administrative Procedures", item_text: "E-mail" },
  { section: "Administrative Procedures", item_text: "Keys/access card" },
  { section: "Administrative Procedures", item_text: "ID badge" },
  { section: "Administrative Procedures", item_text: "Mail (incoming and outgoing)" },
  { section: "Administrative Procedures", item_text: "Business cards" },
  { section: "Administrative Procedures", item_text: "Purchase requests" },
  { section: "Administrative Procedures", item_text: "Telephones" },
  { section: "Administrative Procedures", item_text: "Conference rooms" },
  { section: "Administrative Procedures", item_text: "Expense reports" },

  // Facility Tour — Source: Orientation doc — Introductions and Tours
  { section: "Facility Tour", item_text: "Department staff and key personnel" },
  { section: "Facility Tour", item_text: "Restrooms" },
  { section: "Facility Tour", item_text: "Mailroom" },
  { section: "Facility Tour", item_text: "Copy center: printers, fax machines, scanner" },
  { section: "Facility Tour", item_text: "Bulletin board" },
  { section: "Facility Tour", item_text: "Parking" },
  { section: "Facility Tour", item_text: "Office supplies" },
  { section: "Facility Tour", item_text: "Break room" },
  { section: "Facility Tour", item_text: "Coffee/vending machines" },
  { section: "Facility Tour", item_text: "Watercoolers" },
  { section: "Facility Tour", item_text: "Emergency exits" },

  // How We Work — ATK&B custom (not from documents)
  { section: "How We Work", item_text: "Daily workflow and communication norms" },
  { section: "How We Work", item_text: "How projects are managed (Artisan Dash walkthrough)" },
  { section: "How We Work", item_text: "How to handle client calls and inquiries" },
  { section: "How We Work", item_text: "Customer interaction and presentation standards" },
  { section: "How We Work", item_text: "Meeting schedules and check-in cadence" },
  { section: "How We Work", item_text: "Who to go to for what (internal contacts)" },

  // ═══ PHASE 3: Policies & Standards (first week) ═══
  // Source: Orientation doc — Key Policy Review

  // Workplace Policies
  { section: "Workplace Policies", item_text: "Anti-harassment/discrimination" },
  { section: "Workplace Policies", item_text: "Vacation and sick leave" },
  { section: "Workplace Policies", item_text: "FMLA/leaves of absence and paid leave" },
  { section: "Workplace Policies", item_text: "Overtime" },
  { section: "Workplace Policies", item_text: "Dress code" },
  { section: "Workplace Policies", item_text: "Personal conduct standards" },
  { section: "Workplace Policies", item_text: "Progressive discipline" },
  { section: "Workplace Policies", item_text: "Security" },
  { section: "Workplace Policies", item_text: "Confidentiality" },

  // Safety & Procedures — Source: Orientation doc — Key Policy Review (safety items)
  { section: "Safety & Procedures", item_text: "Safety" },
  { section: "Safety & Procedures", item_text: "Injury reporting" },
  { section: "Safety & Procedures", item_text: "Emergency procedures and fire safety" },
  { section: "Safety & Procedures", item_text: "E-mail and Internet usage" },
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

  async updateSetupItemText(
    id: number,
    itemText: string,
  ): Promise<TeamSetupItem | undefined> {
    const [updated] = await db
      .update(teamSetupItems)
      .set({ item_text: itemText })
      .where(eq(teamSetupItems.id, id))
      .returning();
    return updated;
  },

  async createSetupItem(data: {
    team_member_id: number;
    section: string;
    item_text: string;
    display_order?: number;
  }): Promise<TeamSetupItem> {
    const [item] = await db
      .insert(teamSetupItems)
      .values({
        team_member_id: data.team_member_id,
        section: data.section,
        item_text: data.item_text,
        is_checked: false,
        display_order: data.display_order ?? 999,
      })
      .returning();
    return item;
  },

  async deleteSetupItem(id: number): Promise<boolean> {
    const result = await db.delete(teamSetupItems).where(eq(teamSetupItems.id, id)).returning();
    return result.length > 0;
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
