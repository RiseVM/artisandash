import rateLimit from "express-rate-limit";

/**
 * Rate limiter for authentication endpoints.
 * Prevents brute-force login attacks.
 * 10 attempts per 15-minute window per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many login attempts. Please try again in 15 minutes.",
  },
});

/**
 * General API rate limiter.
 * 200 requests per minute per IP.
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please slow down.",
  },
});
