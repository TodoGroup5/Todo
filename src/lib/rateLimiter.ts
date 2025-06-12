// Based on fixed-window rate limiting algorithm
// https://medium.com/%40elijahechekwu/building-a-rate-limiter-from-scratch-in-node-js-8ff9081d3592

import { Request, Response, NextFunction } from "express";
import { HTTP_STATUS } from "./http";

interface RateLimitConfigurationOptions {
  windowInMilliseconds: number;
  maximumAllowedRequests: number;
}

class RateLimiter {
  private requestCounters = new Map<
    string,
    { requestCount: number; windowStartTimestamp: number }
  >();

  constructor(
    private configuration: Required<
      Pick<
        RateLimitConfigurationOptions,
        "windowInMilliseconds" | "maximumAllowedRequests"
      >
    >
  ) {}

  middleware() {
    return (
      request: Request,
      response: Response,
      nextFunction: NextFunction
    ) => {
      const clientIpAddress =
        request.ip === null || request.ip === undefined
          ? "anonymous"
          : request.ip;

      const currentTimestamp = Date.now();
      const existingCounterRecord = this.requestCounters.get(clientIpAddress);

      if (
        !existingCounterRecord ||
        currentTimestamp - existingCounterRecord.windowStartTimestamp >
          this.configuration.windowInMilliseconds
      ) {
        this.requestCounters.set(clientIpAddress, {
          requestCount: 1,
          windowStartTimestamp: currentTimestamp,
        });
        return nextFunction();
      }

      if (
        existingCounterRecord.requestCount <
        this.configuration.maximumAllowedRequests
      ) {
        existingCounterRecord.requestCount += 1;
        return nextFunction();
      }

      response
        .status(HTTP_STATUS.TOO_MANY_REQUESTS)
        .json({ message: "Too Many Requests" });
    };
  }
}

export function createRateLimiter(opts: RateLimitConfigurationOptions) {
  return new RateLimiter({
    windowInMilliseconds: opts.windowInMilliseconds,
    maximumAllowedRequests: opts.maximumAllowedRequests,
  });
}
