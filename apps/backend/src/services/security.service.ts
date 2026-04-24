import { Prisma, PrismaClient } from "@prisma/client";
import { logger } from "../lib/logger.js";

type SecurityContext = {
  userId?: string | null;
  type: string;
  ip?: string | null;
  userAgent?: string | null;
  payload?: Prisma.InputJsonValue;
};

export async function logSecurityEvent(db: PrismaClient | Prisma.TransactionClient, event: SecurityContext): Promise<void> {
  try {
    await db.securityEvent.create({
      data: {
        userId: event.userId ?? null,
        type: event.type,
        ip: event.ip ?? null,
        userAgent: event.userAgent ?? null,
        payloadJson: event.payload ?? {}
      }
    });
  } catch (error) {
    logger.warn({ error, type: event.type }, "failed to write security event");
  }
}
