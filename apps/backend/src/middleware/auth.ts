import { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { compareSessionToken } from "../utils/crypto.js";
import { unauthorized, forbidden } from "../lib/errors.js";
import { config } from "../config.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        telegramUserId: string;
        status: string;
        sessionId: string;
      };
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const bearer = parseBearerSession(req.header("authorization"));
  const token = bearer?.token ?? (req.cookies?.vc_session as string | undefined);
  const sessionId = bearer?.sessionId ?? (req.cookies?.vc_session_id as string | undefined);
  if (!token || !sessionId) return next(unauthorized());

  const session = await prisma.session.findFirst({
    where: { id: sessionId, revokedAt: null },
    include: { user: true }
  });
  if (!session || !(await compareSessionToken(token, session.tokenHash))) {
    return next(unauthorized());
  }

  if (session.user.status === "hard_banned" || session.user.status === "soft_banned") {
    return next(forbidden("User is disabled"));
  }
  await prisma.session.update({
    where: { id: session.id },
    data: { lastSeenAt: new Date() }
  });
  req.user = {
    id: session.user.id,
    telegramUserId: session.user.telegramUserId,
    status: session.user.status,
    sessionId: session.id
  };
  return next();
}

function parseBearerSession(header: string | undefined): { sessionId: string; token: string } | null {
  if (!header?.startsWith("Bearer ")) return null;
  const value = header.slice("Bearer ".length).trim();
  const separator = value.indexOf(".");
  if (separator <= 0) return null;
  return {
    sessionId: value.slice(0, separator),
    token: value.slice(separator + 1)
  };
}

export function requireInternalSecret(req: Request, _res: Response, next: NextFunction): void {
  const received = req.header("x-internal-secret");
  if (!received || received !== config.INTERNAL_SECRET) return next(forbidden("Invalid internal secret"));
  next();
}
