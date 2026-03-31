import type { Express } from "express";
import { asyncHandler, isAuthenticated } from "../../middleware";
import { teamStorage } from "./storage";

export function registerTeamRoutes(app: Express) {
  // ── GET /api/team/members ──────────────────────
  app.get(
    "/api/team/members",
    isAuthenticated,
    asyncHandler(async (_req, res) => {
      const members = await teamStorage.getTeamMembers();
      res.json(members);
    }),
  );

  // ── POST /api/team/members ─────────────────────
  app.post(
    "/api/team/members",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const userId = req.user?.id;
      const userName = req.user?.email;
      const member = await teamStorage.createTeamMember({
        ...req.body,
        created_by_user_id: userId,
        created_by_user_name: userName,
      });
      res.status(201).json(member);
    }),
  );

  // ── GET /api/team/members/:id ──────────────────
  app.get(
    "/api/team/members/:id",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      const member = await teamStorage.getTeamMember(id);
      if (!member) return res.status(404).json({ error: "Team member not found" });
      res.json(member);
    }),
  );

  // ── PATCH /api/team/members/:id ────────────────
  app.patch(
    "/api/team/members/:id",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      const updated = await teamStorage.updateTeamMember(id, req.body);
      if (!updated) return res.status(404).json({ error: "Team member not found" });
      res.json(updated);
    }),
  );

  // ── DELETE /api/team/members/:id ───────────────
  app.delete(
    "/api/team/members/:id",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      const deleted = await teamStorage.deleteTeamMember(id);
      if (!deleted) return res.status(404).json({ error: "Team member not found" });
      res.json({ success: true });
    }),
  );

  // ── POST /api/team/members/:memberId/setup-items ──
  app.post(
    "/api/team/members/:memberId/setup-items",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const memberId = parseInt(req.params.memberId);
      if (isNaN(memberId)) return res.status(400).json({ error: "Invalid member ID" });
      const { section, item_text, display_order } = req.body;
      if (!section || !item_text) return res.status(400).json({ error: "section and item_text required" });
      const item = await teamStorage.createSetupItem({
        team_member_id: memberId,
        section,
        item_text,
        display_order,
      });
      res.status(201).json(item);
    }),
  );

  // ── PATCH /api/team/setup-items/:id ────────────
  app.patch(
    "/api/team/setup-items/:id",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

      // If item_text is provided, update the text
      if (req.body.item_text !== undefined) {
        const updated = await teamStorage.updateSetupItemText(id, req.body.item_text);
        if (!updated) return res.status(404).json({ error: "Setup item not found" });
        return res.json(updated);
      }

      // Otherwise toggle checked status
      const { is_checked, checked_by_name } = req.body;
      const updated = await teamStorage.updateSetupItem(id, !!is_checked, checked_by_name || null);
      if (!updated) return res.status(404).json({ error: "Setup item not found" });
      res.json(updated);
    }),
  );

  // ── DELETE /api/team/setup-items/:id ───────────
  app.delete(
    "/api/team/setup-items/:id",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      const deleted = await teamStorage.deleteSetupItem(id);
      if (!deleted) return res.status(404).json({ error: "Setup item not found" });
      res.json({ success: true });
    }),
  );

  // ── GET /api/team/resources ────────────────────
  app.get(
    "/api/team/resources",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const category = req.query.category as string | undefined;
      const resources = await teamStorage.getTeamResources(category);
      res.json(resources);
    }),
  );

  // ── POST /api/team/resources ───────────────────
  app.post(
    "/api/team/resources",
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const userId = req.user?.id;
      const userName = req.user?.email;
      const resource = await teamStorage.createTeamResource({
        ...req.body,
        uploaded_by_user_id: userId,
        uploaded_by_user_name: userName,
      });
      res.status(201).json(resource);
    }),
  );

  // ── DELETE /api/team/resources/:id ─────────────
  app.delete(
    "/api/team/resources/:id",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      const deleted = await teamStorage.deleteTeamResource(id);
      if (!deleted) return res.status(404).json({ error: "Resource not found" });
      res.json({ success: true });
    }),
  );
}
