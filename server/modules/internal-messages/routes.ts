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
}
