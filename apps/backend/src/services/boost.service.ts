import { Prisma, PrismaClient } from "@prisma/client";
import { config, roundConfig } from "../config.js";
import { badRequest, forbidden } from "../lib/errors.js";
import { applyBalanceChange } from "./economy.service.js";

type Db = PrismaClient | Prisma.TransactionClient;

function ensureBoostableRound(round: {
  status: string;
  startAt: Date;
  endAt: Date;
  assets: Array<{ id: string; name: string; metaJson: Prisma.JsonValue; chartDataJson: Prisma.JsonValue }>;
}) {
  const now = new Date();
  if (round.status !== "active" || round.endAt <= now || round.startAt > now) {
    throw badRequest("Буст доступен только в активном раунде");
  }
}

export function canPurchaseBoost(balance: number, price: number) {
  return balance >= price;
}

export function softHintText(meta: Prisma.JsonValue) {
  const hint = ((meta ?? {}) as { hintProfile?: string }).hintProfile;
  return hint ?? "Первые тики не всегда показывают настоящее направление.";
}

export async function purchaseChartBoost(db: PrismaClient, userId: string, roundId: string) {
  return purchaseBoost(db, userId, roundId, "chart");
}

export async function purchaseHintBoost(db: PrismaClient, userId: string, roundId: string) {
  return purchaseBoost(db, userId, roundId, "hint");
}

async function purchaseBoost(db: PrismaClient, userId: string, roundId: string, type: "chart" | "hint") {
  return db.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.status === "hard_banned" || user.status === "soft_banned") throw forbidden("User is disabled");

    const round = await tx.round.findUnique({
      where: { id: roundId },
      include: { assets: { orderBy: { createdAt: "asc" } } }
    });
    if (!round) throw badRequest("Round not found");
    ensureBoostableRound(round);

    const existing = await tx.roundBoost.findUnique({
      where: { userId_roundId_type: { userId, roundId, type } }
    });
    if (existing) return serializeBoostPayload(type, round.assets);

    const price = type === "chart" ? config.BOOST_CHART_PRICE : config.BOOST_HINT_PRICE;
    if (!canPurchaseBoost(user.balance, price)) throw badRequest("Недостаточно средств для буста");

    await applyBalanceChange(tx, {
      userId,
      delta: -price,
      type: "boost_purchase",
      referenceType: "round_boost",
      referenceId: `${roundId}:${type}`,
      idempotencyKey: `boost_purchase:${userId}:${roundId}:${type}`
    });

    await tx.roundBoost.create({
      data: {
        userId,
        roundId,
        type,
        price
      }
    });

    return serializeBoostPayload(type, round.assets);
  });
}

export async function getBoostState(db: Db, userId: string, roundId: string) {
  const boosts = await db.roundBoost.findMany({
    where: { userId, roundId },
    select: { type: true }
  });
  const set = new Set(boosts.map((item) => item.type));
  return {
    chart: set.has("chart"),
    hint: set.has("hint")
  };
}

function serializeBoostPayload(
  type: "chart" | "hint",
  assets: Array<{ id: string; name: string; metaJson: Prisma.JsonValue; chartDataJson: Prisma.JsonValue }>
) {
  if (type === "chart") {
    return {
      type,
      assets: assets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        chartData: Array.isArray(asset.chartDataJson) ? asset.chartDataJson.slice(0, roundConfig.ticks) : []
      }))
    };
  }

  return {
    type,
    hints: assets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      hint: softHintText(asset.metaJson)
    }))
  };
}
