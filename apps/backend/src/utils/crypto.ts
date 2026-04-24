import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { config } from "../config.js";

export function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function generateSeed(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export async function hashSessionToken(token: string): Promise<string> {
  return bcrypt.hash(`${config.SESSION_SECRET}:${token}`, 10);
}

export async function compareSessionToken(token: string, hash: string): Promise<boolean> {
  return bcrypt.compare(`${config.SESSION_SECRET}:${token}`, hash);
}

export function hmacSha256Hex(secret: Buffer | string, payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}
