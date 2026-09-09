import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../lib/env.js";
import type { UserRole } from "../generated/prisma/enums.js";

const BCRYPT_ROUNDS = 12;

export interface SessionPayload {
  sub: string;
  role: UserRole;
}

export function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
}

export function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
}

export function verifySession(token: string): SessionPayload {
  return jwt.verify(token, env.JWT_SECRET) as SessionPayload;
}
