import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { logger } from "./logger";

/**
 * Application error with HTTP status code.
 * Throw this from route handlers for clean error responses.
 *
 * Usage:
 *   throw new AppError("Customer not found", 404);
 *   throw new AppError("Insufficient permissions", 403);
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Async route handler wrapper.
 * Catches errors from async route handlers and passes them to the error middleware.
 *
 * Usage:
 *   app.get("/api/items", asyncHandler(async (req, res) => {
 *     const items = await storage.getItems();
 *     res.json(items);
 *   }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

/**
 * Global error handling middleware.
 * Must be registered LAST in the Express middleware chain.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  // Zod validation errors
  if (err instanceof ZodError) {
    const readable = fromZodError(err);
    res.status(400).json({
      error: "Validation failed",
      message: readable.message,
      details: err.errors,
    });
    return;
  }

  // Known application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // Unknown errors — log full stack, return generic message
  logger.error({ err, stack: err.stack }, "Unhandled error");
  res.status(500).json({
    error: "Internal server error",
  });
}
