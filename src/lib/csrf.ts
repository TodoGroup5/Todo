import { Request, Response, NextFunction, RequestHandler } from "express";
import { randomBytes, timingSafeEqual } from "crypto";

import { HTTP_STATUS } from "./http";

const CSRF_COOKIE_NAME = "XSRF-TOKEN";
const CSRF_HEADER_NAME = "X-XSRF-TOKEN";
const TOKEN_BYTE_LENGTH = 32; // 256 bits

function generateCsrfToken(): string {
  return randomBytes(TOKEN_BYTE_LENGTH).toString("hex");
}

function parseCookies(
  cookieHeader: string | undefined
): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) {
    return result;
  }

  // Split on ';' then each chunk on '='
  const pairs = cookieHeader.split(";");
  for (let pair of pairs) {
    const idx = pair.indexOf("=");
    if (idx < 0) continue;
    const name = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (name) {
      result[name] = decodeURIComponent(val);
    }
  }
  return result;
}

function buildSetCookieHeader(token: string): string {
  const maxAgeSeconds = 2 * 60 * 60; // 2 hours
  const parts = [
    `${CSRF_COOKIE_NAME}=${encodeURIComponent(token)}`,
    `Max-Age=${maxAgeSeconds}`,
    "Path=/",
    "Secure",
    "SameSite=Strict",
    "HttpOnly=false",
  ];
  return parts.join("; ");
}

export function attachCsrfToken(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const method = req.method.toUpperCase();

    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
      const cookies = parseCookies(req.headers.cookie);
      const existingToken = cookies[CSRF_COOKIE_NAME];

      if (!existingToken) {
        const newToken = generateCsrfToken();
        const setCookieValue = buildSetCookieHeader(newToken);

        const prev = res.getHeader("Set-Cookie");
        if (prev) {
          if (Array.isArray(prev)) {
            res.setHeader("Set-Cookie", [...prev, setCookieValue]);
          } else if (typeof prev === "string") {
            res.setHeader("Set-Cookie", [prev, setCookieValue]);
          } else {
            res.setHeader("Set-Cookie", setCookieValue);
          }
        } else {
          res.setHeader("Set-Cookie", setCookieValue);
        }
      }
      return next();
    }

    return next();
  };
}

export function verifyCsrfToken(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const method = req.method.toUpperCase();

    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
      return next();
    }

    const cookies = parseCookies(req.headers.cookie);
    const cookieToken = cookies[CSRF_COOKIE_NAME];
    const headerToken = (req.header(CSRF_HEADER_NAME) || "").trim();

    if (!cookieToken || !headerToken) {
      res
        .status(HTTP_STATUS.FORBIDDEN)
        .json({ error: "CSRF token missing or malformed" });
      return;
    }

    try {
      const bufCookie = Buffer.from(cookieToken, "hex");
      const bufHeader = Buffer.from(headerToken, "hex");

      if (
        bufCookie.length !== bufHeader.length ||
        !timingSafeEqual(bufCookie, bufHeader)
      ) {
        res.status(HTTP_STATUS.FORBIDDEN).json({ error: "Invalid CSRF token" });
        return;
      }
    } catch (e) {
      res
        .status(HTTP_STATUS.FORBIDDEN)
        .json({ error: "Invalid CSRF token format" });
      return;
    }

    next();
  };
}
