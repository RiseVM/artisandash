import type { Express } from "express";
import {
  asyncHandler,
  isAuthenticated,
} from "../../middleware";
import { insertEntityNoteSchema } from "@shared/schema";
import { storage } from "./storage";

export function registerNoteRoutes(app: Express) {
  // ── GET /api/notes/:entityType/:entityId ──────
  app.get(
    "/api/notes/:entityType/:entityId",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const { entityType, entityId } = req.params;
      const id = parseInt(entityId);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid entity ID" });

      const validTypes = ["project", "customer", "estimate", "checkout"];
      if (!validTypes.includes(entityType)) {
        return res.status(400).json({ error: "Invalid entity type" });
      }

      const notes = await storage.getNotes(entityType, id);
      res.json(notes);
    }),
  );

  // ── POST /api/notes/:entityType/:entityId ─────
  app.post(
    "/api/notes/:entityType/:entityId",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const { entityType, entityId } = req.params;
      const id = parseInt(entityId);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid entity ID" });

      const userId = req.user?.id;
      const userName = req.user?.email;

      const data = insertEntityNoteSchema.parse({
        ...req.body,
        entity_type: entityType,
        entity_id: id,
        created_by_user_id: userId,
        created_by_user_name: userName,
      });

      const note = await storage.createNote(data);
      res.status(201).json(note);
    }),
  );

  // ── PATCH /api/notes/:id ──────────────────────
  app.patch(
    "/api/notes/:id",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid note ID" });

      const data = insertEntityNoteSchema.partial().parse(req.body);
      const note = await storage.updateNote(id, data);
      if (!note) return res.status(404).json({ error: "Note not found" });
      res.json(note);
    }),
  );

  // ── DELETE /api/notes/:id ─────────────────────
  app.delete(
    "/api/notes/:id",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid note ID" });

      const deleted = await storage.deleteNote(id);
      if (!deleted) return res.status(404).json({ error: "Note not found" });
      res.json({ success: true });
    }),
  );
}
