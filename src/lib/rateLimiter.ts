// Based on fixed-window rate limiting algorithm
// https://medium.com/%40elijahechekwu/building-a-rate-limiter-from-scratch-in-node-js-8ff9081d3592

import { Request, Response, NextFunction } from "express";
import { HTTP_STATUS } from "./http";

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

class RateLimiter {
  private counters = new Map<string, { count: number; windowStart: number }>();

  constructor(
    private opts: Required<Pick<RateLimitOptions, "windowMs" | "maxRequests">>
  ) {}

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = req.ip == null || req.ip == undefined ? "anonymous" : req.ip;

      const now = Date.now();
      const rec = this.counters.get(key);

      if (!rec || now - rec.windowStart > this.opts.windowMs) {
        this.counters.set(key, { count: 1, windowStart: now });
        return next();
      }

      if (rec.count < this.opts.maxRequests) {
        rec.count += 1;
        return next();
      }

      res
        .status(HTTP_STATUS.TOO_MANY_REQUESTS)
        .json({ message: "Too Many Requests" });
    };
  }
}

export function createRateLimiter(opts: RateLimitOptions) {
  return new RateLimiter({
    windowMs: opts.windowMs,
    maxRequests: opts.maxRequests,
  });
}
