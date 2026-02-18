import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

/**
 * Express middleware that validates req.body against a Zod schema.
 * On success, parsed data is available as req.validated.
 * On failure, throws ZodError (caught by errorHandler middleware).
 *
 * Usage:
 *   app.post("/api/items", validate(insertItemSchema), asyncHandler(async (req, res) => {
 *     const data = req.validated; // Typed and validated
 *     const item = await storage.createItem(data);
 *     res.status(201).json(item);
 *   }));
 */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.parse(req.body);
    (req as any).validated = result;
    next();
  };
}

/**
 * Validates query parameters against a Zod schema.
 * Parsed data available as req.validatedQuery.
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.parse(req.query);
    (req as any).validatedQuery = result;
    next();
  };
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      validated?: any;
      validatedQuery?: any;
    }
  }
}
