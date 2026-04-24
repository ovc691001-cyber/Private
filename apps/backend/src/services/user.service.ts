import { Prisma, PrismaClient } from "@prisma/client";
import { config } from "../config.js";
import { badRequest } from "../lib/errors.js";
import { dayStartUtc } from "../utils/time.js";
import { applyBalanceChange, dateKey } from "./economy.service.js";

type Db = PrismaClient | Prisma.TransactionClient;

export function publicUser(user: {
  id: string;
  telegramUserId: string;
  username: string | null;
  firstName: string | null;
  photoUrl: string | null;
  nickname: string | null;
  balance: number;
  status: string;
  rulesAcceptedAt: Date | null;
  currentStreak?: number;
  bestStreak?: number;
}) {
  return {
    id: user.id,
    telegramUserId: user.telegramUserId,
    username: user.username,
    firstName: user.firstName,
    photoUrl: user.photoUrl,
    nickname: user.nickname,
    balance: user.balance,
    status: user.status,
    rulesAcceptedAt: user.rulesAcceptedAt?.toISOString() ?? null,
    currentStreak: user.currentStreak ?? 0,
    bestStreak: user.bestStreak ?? 0
  };
}

export async function getProfile(db: Db, userId: string, now = new Date()) {
  const [user, totals, wins, referrals] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId } }),
    db.bet.aggregate({
      where: { userId, settledAt: { not: null } },
      _count: { _all: true }
    }),
    db.bet.count({
      where: { userId, status: "won", settledAt: { not: null } }
    }),
    db.user.findMany({
      where: { referredByUserId: userId },
      select: { id: true, nickname: true, username: true, firstName: true }
    })
  ]);

  const totalRounds = totals._count._all;
  const level = 1 + Math.floor(totalRounds / 5);

  return {
    user: publicUser(user),
    stats: {
      totalRounds,
      wins,
      winRate: totalRounds === 0 ? 0 : Math.round((wins / totalRounds) * 100),
      currentStreak: user.currentStreak,
      bestStreak: user.bestStreak,
      level
    },
    referral: {
      code: `ref_${user.telegramUserId}`,
      invitedCount: referrals.length,
      invited: referrals.map((referral) => ({
        id: referral.id,
        name: referral.nickname ?? referral.username ?? referral.firstName ?? "Игрок"
      }))
    },
    today: {
      date: dateKey(now)
    }
  };
}

export async function claimDailyLoginBonus(db: Db, userId: string, now = new Date()) {
  const key = `daily_login:${userId}:${dateKey(now)}`;
  const existing = await db.transaction.findUnique({ where: { idempotencyKey: key } });
  if (existing) throw badRequest("Бонус за вход уже получен сегодня");

  const updated = await applyBalanceChange(db, {
    userId,
    delta: config.DAILY_LOGIN_BONUS_AMOUNT,
    type: "daily_login_bonus",
    referenceType: "user",
    referenceId: userId,
    idempotencyKey: key
  });

  return {
    balance: updated.balance,
    amount: config.DAILY_LOGIN_BONUS_AMOUNT,
    claimedAt: now.toISOString()
  };
}

export async function claimRescueRefill(db: Db, userId: string, now = new Date()) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const lastClaim = await db.transaction.findFirst({
    where: { userId, type: "rescue_refill" },
    orderBy: { createdAt: "desc" }
  });

  if (!canClaimRescue(user.balance, lastClaim?.createdAt ?? null, now)) {
    throw badRequest("Восстановление доступно только при низком балансе");
  }

  const updated = await applyBalanceChange(db, {
    userId,
    delta: config.RESCUE_REFILL_AMOUNT,
    type: "rescue_refill",
    referenceType: "user",
    referenceId: userId,
    idempotencyKey: `rescue_refill:${userId}:${now.toISOString()}`
  });

  return {
    balance: updated.balance,
    amount: config.RESCUE_REFILL_AMOUNT,
    nextAvailableAt: new Date(now.getTime() + config.RESCUE_REFILL_COOLDOWN_HOURS * 3_600_000).toISOString()
  };
}

export function canClaimRescue(balance: number, lastClaimAt: Date | null, now = new Date()) {
  if (balance >= config.RESCUE_REFILL_THRESHOLD) return false;
  if (!lastClaimAt) return true;
  return now.getTime() - lastClaimAt.getTime() >= config.RESCUE_REFILL_COOLDOWN_HOURS * 3_600_000;
}

export async function getTodayBetSummary(db: Db, userId: string, now = new Date()) {
  const start = dayStartUtc(now);
  const end = new Date(start.getTime() + 24 * 3_600_000);
  const [bets, wins, boosts] = await Promise.all([
    db.bet.findMany({
      where: { userId, settledAt: { gte: start, lt: end } },
      select: { assetId: true, amount: true, horizon: true, placedAt: true }
    }),
    db.bet.count({ where: { userId, status: "won", settledAt: { gte: start, lt: end } } }),
    db.roundBoost.count({ where: { userId, createdAt: { gte: start, lt: end } } })
  ]);

  return {
    plays: bets.length,
    wins,
    boosts,
    uniqueAssets: new Set(bets.map((bet) => bet.assetId)).size,
    highStakeCount: bets.filter((bet) => bet.amount >= 250).length,
    shortCount: bets.filter((bet) => bet.horizon === "short").length,
    longCount: bets.filter((bet) => bet.horizon === "long").length,
    chainLength: longestChain(bets.map((bet) => bet.placedAt))
  };
}

function longestChain(placedAt: Date[]) {
  const sorted = [...placedAt].sort((a, b) => a.getTime() - b.getTime());
  let best = 0;
  let current = 0;
  let previous: Date | null = null;

  for (const time of sorted) {
    if (!previous || time.getTime() - previous.getTime() <= 25 * 60 * 1000) {
      current += 1;
    } else {
      current = 1;
    }
    previous = time;
    best = Math.max(best, current);
  }

  return best;
}
