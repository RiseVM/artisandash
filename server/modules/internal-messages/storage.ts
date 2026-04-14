import { eq, desc, sql, and } from "drizzle-orm";
import { db } from "../../../db/index";
import {
  internalMessages,
  users,
  type InternalMessage,
  type InsertInternalMessage,
  type InternalMessageWithUser,
  type InternalMessageThread,
} from "@shared/schema";

export const storage = {
  // ── Get all top-level threads ─────────────────
  async getThreads(projectId?: number): Promise<InternalMessageThread[]> {
    let query = db
      .select({
        message: internalMessages,
        user: users,
      })
      .from(internalMessages)
      .leftJoin(users, eq(internalMessages.sender_user_id, users.id))
      .where(sql`${internalMessages.parent_id} IS NULL`)
      .orderBy(desc(internalMessages.created_at));

    const result = await query;

    // Filter by project if specified
    let filtered = result;
    if (projectId !== undefined) {
      filtered = result.filter((r: any) => r.message.project_id === projectId);
    }

    // Get reply counts and last reply dates
    const threads: InternalMessageThread[] = [];
    for (const row of filtered) {
      const replies = await db
        .select({
          message: internalMessages,
          user: users,
        })
        .from(internalMessages)
        .leftJoin(users, eq(internalMessages.sender_user_id, users.id))
        .where(eq(internalMessages.parent_id, (row as any).message.id))
        .orderBy(internalMessages.created_at);

      const replyMessages = replies.map((r: any) => ({
        ...r.message,
        senderUser: r.user || null,
      }));

      threads.push({
        ...(row as any).message,
        senderUser: (row as any).user || null,
        replies: replyMessages,
        replyCount: replyMessages.length,
        lastReplyAt: replyMessages.length > 0
          ? replyMessages[replyMessages.length - 1].created_at
          : null,
      });
    }

    return threads;
  },

  // ── Get single thread with replies ────────────
  async getThread(id: number): Promise<InternalMessageThread | undefined> {
    const [result] = await db
      .select({
        message: internalMessages,
        user: users,
      })
      .from(internalMessages)
      .leftJoin(users, eq(internalMessages.sender_user_id, users.id))
      .where(eq(internalMessages.id, id));

    if (!result) return undefined;

    const replies = await db
      .select({
        message: internalMessages,
        user: users,
      })
      .from(internalMessages)
      .leftJoin(users, eq(internalMessages.sender_user_id, users.id))
      .where(eq(internalMessages.parent_id, id))
      .orderBy(internalMessages.created_at);

    const replyMessages = replies.map((r: any) => ({
      ...r.message,
      senderUser: r.user || null,
    }));

    return {
      ...(result as any).message,
      senderUser: (result as any).user || null,
      replies: replyMessages,
      replyCount: replyMessages.length,
      lastReplyAt: replyMessages.length > 0
        ? replyMessages[replyMessages.length - 1].created_at
        : null,
    };
  },

  // ── Create message ────────────────────────────
  async createMessage(data: InsertInternalMessage): Promise<InternalMessage> {
    const [row] = await db.insert(internalMessages).values(data).returning();
    return row;
  },

  // ── Update message ────────────────────────────
  async updateMessage(id: number, data: Partial<InsertInternalMessage>): Promise<InternalMessage | undefined> {
    const [row] = await db
      .update(internalMessages)
      .set({ ...data, updated_at: new Date() })
      .where(eq(internalMessages.id, id))
      .returning();
    return row;
  },

  // ── Delete message ────────────────────────────
  async deleteMessage(id: number): Promise<boolean> {
    // Delete replies first
    await db.delete(internalMessages).where(eq(internalMessages.parent_id, id));
    const result = await db.delete(internalMessages).where(eq(internalMessages.id, id)).returning();
    return result.length > 0;
  },

  // ── Mark as read ──────────────────────────────
  async markAsRead(id: number, userId: string): Promise<InternalMessage | undefined> {
    const [msg] = await db.select().from(internalMessages).where(eq(internalMessages.id, id));
    if (!msg) return undefined;

    const readBy = Array.isArray(msg.read_by) ? msg.read_by as string[] : [];
    if (!readBy.includes(userId)) {
      readBy.push(userId);
    }

    const [updated] = await db
      .update(internalMessages)
      .set({ read_by: readBy, updated_at: new Date() })
      .where(eq(internalMessages.id, id))
      .returning();

    return updated;
  },

  // ── Mark thread as read ───────────────────────
  async markThreadAsRead(threadId: number, userId: string): Promise<void> {
    await this.markAsRead(threadId, userId);

    const replies = await db
      .select()
      .from(internalMessages)
      .where(eq(internalMessages.parent_id, threadId));

    for (const reply of replies) {
      await this.markAsRead(reply.id, userId);
    }
  },
};
