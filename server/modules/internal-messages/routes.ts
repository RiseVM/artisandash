import type { Express } from "express";
import {
  asyncHandler,
  isAuthenticated,
} from "../../middleware";
import { insertInternalMessageSchema } from "@shared/schema";
import { storage } from "./storage";

export function registerInternalMessageRoutes(app: Express) {
  // ── GET /api/internal-messages ────────────────
  app.get(
    "/api/internal-messages",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const threads = await storage.getThreads(projectId);
      res.json(threads);
    }),
  );

  // ── GET /api/internal-messages/:id ────────────
  app.get(
    "/api/internal-messages/:id",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid message ID" });

      const thread = await storage.getThread(id);
      if (!thread) return res.status(404).json({ error: "Message not found" });
      res.json(thread);
    }),
  );

  // ── POST /api/internal-messages ───────────────
  app.post(
    "/api/internal-messages",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const userId = req.user?.id;
      const userName = req.user?.email;

      const data = insertInternalMessageSchema.parse({
        ...req.body,
        sender_user_id: userId,
        sender_user_name: userName,
        read_by: [userId], // Sender has read their own message
      });

      const message = await storage.createMessage(data);
      res.status(201).json(message);
    }),
  );

  // ── PATCH /api/internal-messages/:id ──────────
  app.patch(
    "/api/internal-messages/:id",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid message ID" });

      const data = insertInternalMessageSchema.partial().parse(req.body);
      const message = await storage.updateMessage(id, data);
      if (!message) return res.status(404).json({ error: "Message not found" });
      res.json(message);
    }),
  );

  // ── DELETE /api/internal-messages/:id ─────────
  app.delete(
    "/api/internal-messages/:id",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid message ID" });

      const deleted = await storage.deleteMessage(id);
      if (!deleted) return res.status(404).json({ error: "Message not found" });
      res.json({ success: true });
    }),
  );

  // ── POST /api/internal-messages/:id/read ──────
  app.post(
    "/api/internal-messages/:id/read",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid message ID" });

      const userId = req.user?.id;
      await storage.markThreadAsRead(id, userId);
      res.json({ success: true });
    }),
  );

  // ── POST /api/internal-messages/:id/unread ──
  app.post(
    "/api/internal-messages/:id/unread",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid message ID" });

      const userId = req.user?.id;
      await storage.markThreadAsUnread(id, userId);
      res.json({ success: true });
    }),
  );

  // ── GET /api/messages/unified-unread ──────
  // Combined unread count from internal messages + project client messages
  app.get(
    "/api/messages/unified-unread",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const userId = req.user?.id;
      // Internal message unread count
      const threads = await storage.getThreads();
      const internalUnread = threads.filter((t) => {
        const readBy = Array.isArray(t.read_by) ? t.read_by as string[] : [];
        return !readBy.includes(userId);
      }).length;

      // Project message unread count (client messages not read by admin)
      let projectUnread = 0;
      try {
        const { projectStorage } = await import("../projects/storage");
        projectUnread = await projectStorage.getTotalUnreadMessageCountForAdmin();
      } catch { /* projects module may not be available */ }

      res.json({ count: internalUnread + projectUnread, internalUnread, projectUnread });
    }),
  );

  // ── GET /api/messages/client-messages ──────
  // All project client messages grouped by project for the unified Messages page
  app.get(
    "/api/messages/client-messages",
    isAuthenticated,
    asyncHandler(async (_req: any, res) => {
      try {
        const { projectStorage } = await import("../projects/storage");
        const allProjects = await projectStorage.getProjects();

        const result = [];
        for (const project of allProjects) {
          const messages = await projectStorage.getProjectMessages(project.id);
          const clientMsgs = messages.filter((m: any) => m.sender_type === "client");
          if (clientMsgs.length > 0) {
            const unreadCount = clientMsgs.filter((m: any) => m.read_by_admin === "no").length;
            result.push({
              projectId: project.id,
              projectName: project.name,
              customerName: (project as any).customer?.name || "Customer",
              messages: clientMsgs.sort((a: any, b: any) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              ),
              unreadCount,
            });
          }
        }

        // Sort by unread count descending
        result.sort((a, b) => b.unreadCount - a.unreadCount);
        res.json(result);
      } catch (err) {
        console.error("[messages] client-messages error:", err);
        res.json([]);
      }
    }),
  );
}
