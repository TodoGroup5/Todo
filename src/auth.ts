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
export async function hashPassword(plaintext: string): Promise<string> {
  return new Promise((resolve, reject) => {
    bcrypt.hash(`${plaintext}${pepper}`, saltRounds, (err, hash) => {
      if (err) reject(err);
      else resolve(hash);
    })
  });
}

// Compare password with it's hash
// Return true if matching
export async function comparePassHash(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(`${plaintext}${pepper}`, hash);
}

export function genJWT(userId: number, email: string, expiresIn: `${number}${"s"|"m"|"h"}` = "1h") {
  return jwt.sign({ userId, email }, jwtSecret, { expiresIn });
}

// Auth middleware
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