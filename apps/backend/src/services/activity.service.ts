import { PrismaClient } from "@prisma/client";
import { dayStartUtc } from "../utils/time.js";
import { generateWorldEvents } from "./event-engine.js";

export type ActivityFeedItem = {
  id: string;
  kind: "system" | "market" | "leaderboard";
  text: string;
};

export async function getActivityFeed(db: PrismaClient, now = new Date()): Promise<ActivityFeedItem[]> {
  const start = dayStartUtc(now);
  const currentRound = await db.round.findFirst({
    where: { status: "active" },
    include: { assets: true, bets: true },
    orderBy: { startAt: "desc" }
  });

  const topLeader = await db.leaderboardDaily.findFirst({
    where: { date: start },
    include: { user: true },
    orderBy: [{ netProfit: "desc" }, { winsCount: "desc" }]
  });

  const latestBet = await db.bet.findFirst({
    where: { settledAt: { not: null } },
    include: { round: true, asset: true },
    orderBy: { settledAt: "desc" }
  });

  const items: ActivityFeedItem[] = [];

  if (currentRound) {
    const events = generateWorldEvents(
      {
        id: currentRound.id,
        seed: currentRound.revealedSeed ?? currentRound.seedSecret,
        startAt: currentRound.startAt,
        assets: currentRound.assets.map((asset) => ({ id: asset.id, name: asset.name }))
      },
      now
    );
    const nextEvent = [...events].sort((a, b) => a.remaining_seconds - b.remaining_seconds)[0];
    if (nextEvent) {
      items.push({
        id: `event:${nextEvent.id}`,
        kind: "system",
        text: `${nextEvent.title} прибудет через ${formatDuration(nextEvent.remaining_seconds)}`
      });
    }

    items.push({
      id: `choices:${currentRound.id}`,
      kind: "system",
      text: `В этом раунде сделано выборов: ${currentRound.bets.length}`
    });

    const sectorCounts = new Map<string, number>();
    const assetCounts = new Map<string, number>();
    for (const bet of currentRound.bets) {
      const asset = currentRound.assets.find((item) => item.id === bet.assetId);
      const sector = ((asset?.metaJson ?? {}) as { sector?: string }).sector ?? "Технологии";
      sectorCounts.set(sector, (sectorCounts.get(sector) ?? 0) + 1);
      if (asset) assetCounts.set(asset.name, (assetCounts.get(asset.name) ?? 0) + 1);
    }

    const topAsset = [...assetCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const topSector = [...sectorCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topAsset) {
      items.push({
        id: `popular-asset:${currentRound.id}`,
        kind: "market",
        text: `Чаще выбирают: ${topAsset[0]}`
      });
    } else if (topSector) {
      items.push({
        id: `popular-sector:${currentRound.id}`,
        kind: "market",
        text: `Сектор в фокусе: ${topSector[0]}`
      });
    }

    const timeLeft = Math.max(0, Math.ceil((currentRound.endAt.getTime() - now.getTime()) / 1000));
    items.push({
      id: `timer:${currentRound.id}`,
      kind: "system",
      text: `Новый раунд стартует через ${formatDuration(timeLeft)}`
    });
  }

  if (latestBet) {
    const delta = latestBet.payout - latestBet.amount;
    items.push({
      id: `result:${latestBet.id}`,
      kind: "market",
      text: `Последний результат раунда: ${delta >= 0 ? "+" : ""}${delta}`
    });
  }

  if (topLeader) {
    items.push({
      id: `leader:${topLeader.userId}`,
      kind: "leaderboard",
      text: `Серия побед у лидера: ${topLeader.user.currentStreak}`
    });
  }

  const filler = [
    "Ставки на AeroTexa резко выросли",
    "Танкер с чипами задерживается",
    "SkyForge удерживает лидерство",
    "Новый маршрут появился на карте"
  ];
  while (items.length < 6) {
    const text = filler[items.length % filler.length]!;
    items.push({
      id: `system:${dateSeed(now)}:${items.length}`,
      kind: items.length % 2 === 0 ? "system" : "market",
      text
    });
  }

  return items.slice(0, 6);
}

export function isActivityFeedItem(item: ActivityFeedItem) {
  return Boolean(item.id && item.text && ["system", "market", "leaderboard"].includes(item.kind));
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function dateSeed(now: Date) {
  return now.toISOString().slice(0, 16);
}
