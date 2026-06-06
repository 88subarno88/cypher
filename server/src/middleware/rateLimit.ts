// Redis sliding window rate limiter.
// Blocks brute-force attacks on the login endpoint.
// Max 5 attempts per IP per 60 seconds → returns 429.

import { Request, Response, NextFunction } from "express";
import redis from "../lib/redis";

export async function loginRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const ip = (req.headers["x-forwarded-for"] as string) || req.ip || "unknown";
  const key = `ratelimit:login:${ip}`;

  try {
    // Increment the counter for this IP
    const attempts = await redis.incr(key);

    // First attempt — set 60 second expiry window
    if (attempts === 1) {
      await redis.expire(key, 60);
    }

    // More than 5 attempts -> block with 429
    if (attempts > 5) {
      const ttl = await redis.ttl(key);
      res.status(429).json({
        error: `Too many login attempts. Try again in ${ttl} seconds.`,
      });
      return;
    }

    next();
  } catch (err) {
    // If Redis is down fail open ;better than locking everyone out
    console.error("Rate limit error:", err);
    next();
  }
}
