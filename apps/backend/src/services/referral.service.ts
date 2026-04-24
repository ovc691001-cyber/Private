import { Prisma, PrismaClient } from "@prisma/client";
import { config } from "../config.js";
import { applyBalanceChange } from "./economy.service.js";

type Db = PrismaClient | Prisma.TransactionClient;

export function parseReferralCode(startParam?: string | null): string | null {
  if (!startParam) return null;
  const normalized = startParam.trim();
  if (!normalized.startsWith("ref_")) return null;
  return normalized.slice(4) || null;
}

export function buildReferralLink(code: string) {
  return `https://t.me/${config.TELEGRAM_BOT_USERNAME}?start=${code}`;
}

export async function attachReferrerOnSignup(
  db: Db,
  userId: string,
  telegramUserId: string,
  referralStartParam?: string | null
) {
  const inviterTelegramUserId = parseReferralCode(referralStartParam);
  if (!inviterTelegramUserId || inviterTelegramUserId === telegramUserId) return null;

  const inviter = await db.user.findUnique({ where: { telegramUserId: inviterTelegramUserId } });
  if (!inviter || inviter.id === userId) return null;

  const existingRelation = await db.user.findUnique({
    where: { id: userId },
    select: { referredByUserId: true }
  });
  if (existingRelation?.referredByUserId) return existingRelation.referredByUserId;

  await db.user.update({
    where: { id: userId },
    data: { referredByUserId: inviter.id }
  });

  const rewardKey = `referral_signup:${inviter.id}:${userId}`;
  const existing = await db.transaction.findUnique({ where: { idempotencyKey: rewardKey } });
  if (!existing) {
    await applyBalanceChange(db, {
      userId: inviter.id,
      delta: config.REFERRAL_SIGNUP_REWARD,
      type: "referral_reward",
      referenceType: "referral_signup",
      referenceId: userId,
      idempotencyKey: rewardKey
    });
  }

  return inviter.id;
}

export async function maybeAwardReferralMilestone(db: Db, referredUserId: string) {
  const referredUser = await db.user.findUnique({
    where: { id: referredUserId },
    select: { id: true, referredByUserId: true }
  });
  if (!referredUser?.referredByUserId) return false;

  const settledRounds = await db.bet.count({
    where: { userId: referredUser.id, settledAt: { not: null } }
  });
  if (settledRounds < 3) return false;

  const rewardKey = `referral_active:${referredUser.referredByUserId}:${referredUser.id}`;
  const existing = await db.transaction.findUnique({ where: { idempotencyKey: rewardKey } });
  if (existing) return false;

  await applyBalanceChange(db, {
    userId: referredUser.referredByUserId,
    delta: config.REFERRAL_ACTIVE_REWARD,
    type: "referral_reward",
    referenceType: "referral_active",
    referenceId: referredUser.id,
    idempotencyKey: rewardKey
  });

  return true;
}

export async function getReferralOverview(db: Db, userId: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { telegramUserId: true }
  });
  const invited = await db.user.findMany({
    where: { referredByUserId: userId },
    select: {
      id: true,
      nickname: true,
      username: true,
      firstName: true,
      bets: {
        where: { settledAt: { not: null } },
        select: { id: true }
      }
    }
  });

  const referralRewards = await db.transaction.findMany({
    where: {
      userId,
      type: "referral_reward"
    },
    select: { amount: true }
  });

  const code = `ref_${user.telegramUserId}`;
  return {
    code,
    link: buildReferralLink(code),
    invitedCount: invited.length,
    rewardsEarned: referralRewards.reduce((sum, item) => sum + item.amount, 0),
    items: invited.map((item) => ({
      id: item.id,
      name: item.nickname ?? item.username ?? item.firstName ?? "Игрок",
      roundsPlayed: item.bets.length,
      milestoneReached: item.bets.length >= 3
    }))
  };
}
