import { Prisma, PrismaClient, TransactionType } from "@prisma/client";
import { badRequest } from "../lib/errors.js";

type Db = PrismaClient | Prisma.TransactionClient;

type BalanceChangeInput = {
  userId: string;
  delta: number;
  type: TransactionType;
  referenceType?: string | null;
  referenceId?: string | null;
  idempotencyKey?: string | null;
};

export async function applyBalanceChange(db: Db, input: BalanceChangeInput) {
  const user = await db.user.findUniqueOrThrow({ where: { id: input.userId } });
  const nextBalance = user.balance + input.delta;
  if (nextBalance < 0) throw badRequest("Недостаточно средств");

  if (input.delta < 0) {
    const guarded = await db.user.updateMany({
      where: { id: input.userId, balance: { gte: Math.abs(input.delta) } },
      data: { balance: { decrement: Math.abs(input.delta) } }
    });
    if (guarded.count !== 1) throw badRequest("Недостаточно средств");
  } else {
    await db.user.update({
      where: { id: input.userId },
      data: { balance: { increment: input.delta } }
    });
  }

  const updated = await db.user.findUniqueOrThrow({ where: { id: input.userId } });

  await db.transaction.create({
    data: {
      userId: input.userId,
      type: input.type,
      amount: input.delta,
      balanceBefore: user.balance,
      balanceAfter: updated.balance,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      idempotencyKey: input.idempotencyKey ?? null
    }
  });

  return updated;
}

export function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
