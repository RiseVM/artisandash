import type { Express } from "express";
import fs from "fs";
import path from "path";
import mammoth from "mammoth";
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

  // ── GET /api/team/resources/file/:filename ────
  // Serves resource files — PDFs streamed raw, DOCX converted to styled HTML
  app.get(
    "/api/team/resources/file/:filename",
    isAuthenticated,
    async (req, res) => {
      const { filename } = req.params;

      // Prevent path traversal
      const safeName = path.basename(filename);
      if (safeName !== filename || filename.includes("..")) {
        return res.status(400).json({ error: "Invalid filename" });
      }

      // Search directories for the file
      const searchDirs = [
        path.resolve(process.cwd(), "client", "public", "resources"),
        path.resolve(process.cwd(), "public", "templates"),
      ];

      let filePath: string | null = null;
      for (const dir of searchDirs) {
        const candidate = path.join(dir, safeName);
        if (fs.existsSync(candidate)) {
          filePath = candidate;
          break;
        }
      }

      if (!filePath) {
        return res.status(404).json({ error: "Resource file not found" });
      }

      const ext = path.extname(safeName).toLowerCase();

      // For .docx files, convert to styled HTML page
      if (ext === ".docx") {
        try {
          const result = await mammoth.convertToHtml({ path: filePath });
          const title = safeName.replace(/\.docx$/i, "").replace(/[-_]/g, " ");
          const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html {
    background: #f0f1f3;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.7;
    color: #1a1a2e;
    padding: 40px 20px;
  }

  .page {
    max-width: 780px;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 6px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04);
    padding: 56px 64px;
  }

  h1, h2, h3, h4, h5, h6 {
    color: #1a1a2e;
    margin-top: 1.6em;
    margin-bottom: 0.5em;
    line-height: 1.3;
  }

  h1 { font-size: 1.75em; font-weight: 700; border-bottom: 2px solid #e2e4e9; padding-bottom: 0.3em; }
  h2 { font-size: 1.35em; font-weight: 600; }
  h3 { font-size: 1.15em; font-weight: 600; }

  p { margin-bottom: 0.8em; }

  ul, ol {
    margin: 0.5em 0 1em 1.5em;
    padding: 0;
  }

  li {
    margin-bottom: 0.35em;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
    font-size: 13px;
  }

  th, td {
    border: 1px solid #dde0e5;
    padding: 8px 12px;
    text-align: left;
    vertical-align: top;
  }

  th {
    background: #f5f6f8;
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: #555;
  }

  tr:nth-child(even) td { background: #fafbfc; }

  strong, b { font-weight: 600; }

  a { color: #2563eb; text-decoration: none; }
  a:hover { text-decoration: underline; }

  img { max-width: 100%; height: auto; border-radius: 4px; margin: 1em 0; }

  blockquote {
    border-left: 3px solid #d1d5db;
    margin: 1em 0;
    padding: 0.5em 1em;
    color: #555;
    background: #f9fafb;
    border-radius: 0 4px 4px 0;
  }

  hr {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 1.5em 0;
  }

  @media (max-width: 640px) {
    body { padding: 16px 8px; }
    .page { padding: 32px 24px; }
  }
</style>
</head>
<body>
  <div class="page">
    ${result.value}
  </div>
</body>
</html>`;
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          return res.send(html);
        } catch (err) {
          console.error("[team/resources] Failed to convert docx:", err);
          return res.status(500).json({ error: "Failed to convert document" });
        }
      }

      // For PDFs and other files, stream raw
      const contentTypes: Record<string, string> = {
        ".pdf": "application/pdf",
        ".doc": "application/msword",
      };
      const contentType = contentTypes[ext] || "application/octet-stream";

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);
      fs.createReadStream(filePath).pipe(res);
    },
  );
}
