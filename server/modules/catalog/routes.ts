import type { Express } from "express";
import {
  asyncHandler,
  isAuthenticated,
  requirePermission,
} from "../../middleware";
import {
  insertServiceCatalogCategorySchema,
  insertServiceCatalogItemSchema,
} from "@shared/schema";
import { storage } from "./storage";

export function registerCatalogRoutes(app: Express) {
  // ── GET /api/catalog ─── full catalog with items ──
  app.get(
    "/api/catalog",
    isAuthenticated,
    asyncHandler(async (_req, res) => {
      const categories = await storage.getCategories();
      res.json(categories);
    }),
  );

  // ── POST /api/catalog/seed ─── seed default data ──
  app.post(
    "/api/catalog/seed",
    isAuthenticated,
    requirePermission("admin"),
    asyncHandler(async (_req, res) => {
      await storage.seedDefaultCatalog();
      const categories = await storage.getCategories();
      res.json(categories);
    }),
  );

  // ── Category CRUD ──────────────────────────────────
  app.post(
    "/api/catalog/categories",
    isAuthenticated,
    requirePermission("admin"),
    asyncHandler(async (req, res) => {
      const data = insertServiceCatalogCategorySchema.parse(req.body);
      const cat = await storage.createCategory(data);
      res.status(201).json(cat);
    }),
  );

  app.patch(
    "/api/catalog/categories/:id",
    isAuthenticated,
    requirePermission("admin"),
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid category ID" });
      const cat = await storage.updateCategory(id, req.body);
      res.json(cat);
    }),
  );

  app.delete(
    "/api/catalog/categories/:id",
    isAuthenticated,
    requirePermission("admin"),
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid category ID" });
      await storage.deleteCategory(id);
      res.status(204).end();
    }),
  );

  // ── Item CRUD ──────────────────────────────────────
  app.post(
    "/api/catalog/items",
    isAuthenticated,
    requirePermission("admin"),
    asyncHandler(async (req, res) => {
      const data = insertServiceCatalogItemSchema.parse(req.body);
      const item = await storage.createItem(data);
      res.status(201).json(item);
    }),
  );

  app.patch(
    "/api/catalog/items/:id",
    isAuthenticated,
    requirePermission("admin"),
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid item ID" });
      const item = await storage.updateItem(id, req.body);
      res.json(item);
    }),
  );

  app.delete(
    "/api/catalog/items/:id",
    isAuthenticated,
    requirePermission("admin"),
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid item ID" });
      await storage.deleteItem(id);
      res.status(204).end();
    }),
  );
}
