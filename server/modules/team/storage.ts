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
// Organized into 3 phases:
//   Phase 1: New Hire Preparation (SOP — done before start date)
//   Phase 2: HR Paperwork & Compliance (collecting forms, legal, payroll)
//   Phase 3: New Hire Orientation & Training (post-hire, getting up to speed)
const DEFAULT_SETUP_ITEMS: { section: string; item_text: string }[] = [

  // ═══ PHASE 1: New Hire Preparation (SOP) ═══
  // Pre-hire setup tasks — everything that needs to happen before day one

  // Human Resources
  { section: "Human Resources", item_text: "Resume received" },
  { section: "Human Resources", item_text: "Application form completed" },
  { section: "Human Resources", item_text: "References checked" },
  { section: "Human Resources", item_text: "Drug test completed, if applicable" },
  { section: "Human Resources", item_text: "Background check completed, if applicable" },
  { section: "Human Resources", item_text: "Written job offer accepted" },
  { section: "Human Resources", item_text: "Pre-placement physical passed, if applicable" },
  { section: "Human Resources", item_text: "Start date confirmed" },
  { section: "Human Resources", item_text: "New hire announcement written" },
  { section: "Human Resources", item_text: "New hire orientation scheduled" },
  { section: "Human Resources", item_text: "New hire paperwork packet prepared" },
  { section: "Human Resources", item_text: "Buddy assigned" },

  // Admin Services
  { section: "Admin Services", item_text: "Office/workspace assigned" },
  { section: "Admin Services", item_text: "Office/workspace furniture ordered" },
  { section: "Admin Services", item_text: "Basic office supplies ordered" },
  { section: "Admin Services", item_text: "Phone/extension assigned" },
  { section: "Admin Services", item_text: "Keys for office/building assigned" },
  { section: "Admin Services", item_text: "Name badge created" },
  { section: "Admin Services", item_text: "Cell phone assigned" },
  { section: "Admin Services", item_text: "Business cards ordered" },

  // Information Technology
  { section: "Information Technology", item_text: "Computer/Laptop assigned" },
  { section: "Information Technology", item_text: "Necessary software installed" },
  { section: "Information Technology", item_text: "Monitor/Keyboard/Mouse assigned" },
  { section: "Information Technology", item_text: "Printer/Fax/Copier access created" },
  { section: "Information Technology", item_text: "Network access/passwords created" },
  { section: "Information Technology", item_text: "Email account created" },

  // ═══ PHASE 2: HR Paperwork & Compliance ═══
  // Forms to collect from employee, tax/legal docs, handbook sign-off

  // Tax & Payroll Forms
  { section: "Tax & Payroll Forms", item_text: "W-4 Federal tax withholding form" },
  { section: "Tax & Payroll Forms", item_text: "CT State tax withholding form (CT-W4)" },
  { section: "Tax & Payroll Forms", item_text: "I-9 Employment Eligibility Verification" },
  { section: "Tax & Payroll Forms", item_text: "Direct deposit authorization form" },
  { section: "Tax & Payroll Forms", item_text: "Employee personal information sheet and emergency contact form" },

  // Employee Agreements & Sign-offs
  { section: "Employee Agreements", item_text: "Employee handbook received and signed" },
  { section: "Employee Agreements", item_text: "Employee policy manual acknowledgement signed" },
  { section: "Employee Agreements", item_text: "Key/security policies acknowledgement signed" },
  { section: "Employee Agreements", item_text: "Confidentiality/NDA agreement signed" },
  { section: "Employee Agreements", item_text: "Non-compete agreement signed, if applicable" },
  { section: "Employee Agreements", item_text: "At-will employment acknowledgement signed" },
  { section: "Employee Agreements", item_text: "Anti-harassment policy acknowledgement signed" },
  { section: "Employee Agreements", item_text: "Safety policy acknowledgement signed" },

  // Received from Employee
  { section: "Received from Employee", item_text: "Completed application form and resume" },
  { section: "Received from Employee", item_text: "Authorizations for background check, physical & drug screen, if applicable" },
  { section: "Received from Employee", item_text: "Signed offer letter" },
  { section: "Received from Employee", item_text: "Benefit enrollment forms" },
  { section: "Received from Employee", item_text: "Photo ID copies for I-9 verification" },

  // HR Processing
  { section: "HR Processing", item_text: "Personnel file created" },
  { section: "HR Processing", item_text: "Confidential medical file created" },
  { section: "HR Processing", item_text: "Reference checks completed and filed" },
  { section: "HR Processing", item_text: "Background check results received and reviewed, if applicable" },
  { section: "HR Processing", item_text: "Physical exam results received and reviewed, if applicable" },
  { section: "HR Processing", item_text: "Drug test received and reviewed, if applicable" },
  { section: "HR Processing", item_text: "I-9 documents reviewed and filed" },
  { section: "HR Processing", item_text: "Payroll notice completed" },
  { section: "HR Processing", item_text: "Employee information entered into payroll system" },
  { section: "HR Processing", item_text: "CT State new hire reporting completed" },
  { section: "HR Processing", item_text: "Orientation documents filed" },

  // ═══ PHASE 3: New Hire Orientation & Training ═══
  // Post-hire: making sure they're trained and up to speed

  // Introduction to the Company
  { section: "Introduction to the Company", item_text: "Company overview" },
  { section: "Introduction to the Company", item_text: "Company culture" },
  { section: "Introduction to the Company", item_text: "Organization mission" },
  { section: "Introduction to the Company", item_text: "Corporate literature/video" },
  { section: "Introduction to the Company", item_text: "Organizational chart" },

  // Benefits and Compensation
  { section: "Benefits and Compensation", item_text: "Health, life, disability insurance" },
  { section: "Benefits and Compensation", item_text: "Retirement benefits" },
  { section: "Benefits and Compensation", item_text: "Dependent care FSA" },
  { section: "Benefits and Compensation", item_text: "Educational assistance" },
  { section: "Benefits and Compensation", item_text: "Employee assistance program" },
  { section: "Benefits and Compensation", item_text: "Pay procedures" },
  { section: "Benefits and Compensation", item_text: "Salary increase/performance review process" },
  { section: "Benefits and Compensation", item_text: "Incentive/bonus programs" },

  // Administrative Procedures
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

  // Key Policy Review
  { section: "Key Policy Review", item_text: "Anti-harassment/discrimination" },
  { section: "Key Policy Review", item_text: "Vacation and sick leave" },
  { section: "Key Policy Review", item_text: "FMLA/leaves of absence and paid leave" },
  { section: "Key Policy Review", item_text: "Overtime" },
  { section: "Key Policy Review", item_text: "Dress code" },
  { section: "Key Policy Review", item_text: "Personal conduct standards" },
  { section: "Key Policy Review", item_text: "Progressive discipline" },
  { section: "Key Policy Review", item_text: "Security" },
  { section: "Key Policy Review", item_text: "Confidentiality" },
  { section: "Key Policy Review", item_text: "Safety" },
  { section: "Key Policy Review", item_text: "Injury reporting" },
  { section: "Key Policy Review", item_text: "Emergency procedures and fire safety" },
  { section: "Key Policy Review", item_text: "E-mail and Internet usage" },

  // Introductions and Tours
  { section: "Introductions and Tours", item_text: "Department staff and key personnel" },
  { section: "Introductions and Tours", item_text: "Restrooms" },
  { section: "Introductions and Tours", item_text: "Mailroom" },
  { section: "Introductions and Tours", item_text: "Copy center: printers, fax machines, scanner" },
  { section: "Introductions and Tours", item_text: "Bulletin board" },
  { section: "Introductions and Tours", item_text: "Parking" },
  { section: "Introductions and Tours", item_text: "Office supplies" },
  { section: "Introductions and Tours", item_text: "Break room" },
  { section: "Introductions and Tours", item_text: "Coffee/vending machines" },
  { section: "Introductions and Tours", item_text: "Watercoolers" },
  { section: "Introductions and Tours", item_text: "Emergency exits" },
];

export const teamStorage = {
  // ── Team Members ─────────────────────────────
  async getTeamMembers(): Promise<(TeamMember & { total_items: number; checked_items: number })[]> {
    const members = await db.select().from(teamMembers).orderBy(desc(teamMembers.created_at));
    // Fetch progress counts for all members in one query
    if (members.length === 0) return [];
    const { pool } = await import("../../../db/index");
    const { rows: counts } = await pool.query(
      `SELECT team_member_id,
              COUNT(*)::int AS total_items,
              COUNT(*) FILTER (WHERE is_checked = true)::int AS checked_items
       FROM team_setup_items
       WHERE team_member_id = ANY($1)
       GROUP BY team_member_id`,
      [members.map((m) => m.id)],
    );
    const countMap = new Map(counts.map((r: any) => [r.team_member_id, r]));
    return members.map((m) => ({
      ...m,
      total_items: (countMap.get(m.id) as any)?.total_items ?? 0,
      checked_items: (countMap.get(m.id) as any)?.checked_items ?? 0,
    }));
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
