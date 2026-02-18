import type { Request, Response } from "express";

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
  sort?: string;
  order?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Parse pagination parameters from query string.
 * Defaults: page=1, limit=50, order=desc
 *
 * Usage:
 *   const params = parsePagination(req);
 *   const items = await storage.getItems(params.limit, params.offset);
 */
export function parsePagination(req: Request, defaults?: Partial<PaginationParams>): PaginationParams {
  const page = Math.max(1, parseInt(req.query.page as string) || defaults?.page || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || defaults?.limit || 50));
  const offset = (page - 1) * limit;
  const sort = (req.query.sort as string) || defaults?.sort;
  const order = ((req.query.order as string) === "asc" ? "asc" : "desc") as "asc" | "desc";

  return { page, limit, offset, sort, order };
}

/**
 * Format a paginated response.
 *
 * Usage:
 *   const { data, total } = await storage.getCustomersPaginated(limit, offset);
 *   res.json(paginate(data, total, params));
 */
export function paginate<T>(
  data: T[],
  total: number,
  params: PaginationParams,
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    },
  };
}
