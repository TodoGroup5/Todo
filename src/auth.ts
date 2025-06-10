import "dotenv/config";
import * as bcrypt from "bcrypt";
import type { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

//---------- Types ----------//
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

//---------- Constants ----------//
const saltRounds = Number(process.env.PASSWORD_SALT_ROUNDS ?? 10);
const pepper = process.env.PASSWORD_PEPPER ?? "";
const jwtSecret = process.env.JWT_SECRET ?? "";

//---------- Utils ----------//
// Hash password w/ bcrypt
export function hashPassword(plaintext: string): string {
  return bcrypt.hashSync(`${plaintext}${pepper}`, saltRounds);
}

// Compare password with its hash
// Return true if matching
export function comparePassHash(plaintext: string, hash: string) {
  return bcrypt.compareSync(`${plaintext}${pepper}`, hash);
}

export function genJWT(userId: number, email: string, expiresIn: `${number}${"s"|"m"|"h"}` = "1h") {
  return jwt.sign({ userId, email }, jwtSecret, { expiresIn });
}

export type JwtData = JwtPayload & { user_id: number; email: string };

function isJwtData(x: any): x is JwtData {
  return (typeof x === 'object') && ('user_id' in x) && ('email' in x);
}

export function verifyJWT(token: string): JwtData | null {
  try {
    const decoded = jwt.verify(token, jwtSecret);

    if (!isJwtData(decoded)) return null;
    return decoded;
  }
  catch (err) { return null; } // Invalid token
}

// API auth middleware
// Reject request if token is missing/invalid
export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];

  if (!token) { res.sendStatus(401); return; }

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user as JwtPayload;
    next();
  });
}