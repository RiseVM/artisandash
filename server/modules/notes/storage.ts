import { eq, and, desc } from "drizzle-orm";
import { db } from "../../../db/index";
import {
  entityNotes,
  users,
  type EntityNote,
  type InsertEntityNote,
  type EntityNoteWithUser,
} from "@shared/schema";

export const storage = {
  async getNotes(entityType: string, entityId: number): Promise<EntityNoteWithUser[]> {
    const result = await db
      .select({
        note: entityNotes,
        user: users,
      })
      .from(entityNotes)
      .leftJoin(users, eq(entityNotes.created_by_user_id, users.id))
      .where(
        and(
          eq(entityNotes.entity_type, entityType),
          eq(entityNotes.entity_id, entityId),
        ),
      )
      .orderBy(desc(entityNotes.is_pinned), desc(entityNotes.created_at));

    return result.map((row: any) => ({
      ...row.note,
      createdByUser: row.user || null,
    }));
  },

  async createNote(data: InsertEntityNote): Promise<EntityNote> {
    const [row] = await db.insert(entityNotes).values(data).returning();
    return row;
  },

  async updateNote(id: number, data: Partial<InsertEntityNote>): Promise<EntityNote | undefined> {
    const [row] = await db
      .update(entityNotes)
      .set({ ...data, updated_at: new Date() })
      .where(eq(entityNotes.id, id))
      .returning();
    return row;
  },

  async deleteNote(id: number): Promise<boolean> {
    const result = await db.delete(entityNotes).where(eq(entityNotes.id, id)).returning();
    return result.length > 0;
  },
};
