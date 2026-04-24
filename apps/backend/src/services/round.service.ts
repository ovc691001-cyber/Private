import { ForecastHorizon, Prisma, PrismaClient, RoundStatus } from "@prisma/client";
import { roundConfig } from "../config.js";
import { badRequest } from "../lib/errors.js";
import { generateSeed, sha256Hex } from "../utils/crypto.js";
import { addSeconds } from "../utils/time.js";
import { applyBalanceChange } from "./economy.service.js";
import { generateWorldEvents, impactForOutcome } from "./event-engine.js";
import { calculatePoolPayouts } from "./pool.service.js";
import { maybeAwardReferralMilestone } from "./referral.service.js";
import { generateRoundFromSeed, verifyRound } from "./round-engine.js";

type Db = PrismaClient | Prisma.TransactionClient;

type RoundWithAssets = Awaited<ReturnType<typeof ensureCurrentRound>>;
type ChartPoint = { tick: number; value: number };

export async function ensureCurrentRound(db: Db, now = new Date()) {
  const active = await db.round.findFirst({
    where: {
      status: RoundStatus.active,
      startAt: { lte: now },
      endAt: { gt: now }
    },
    include: { assets: true },
    orderBy: { startAt: "desc" }
  });
  if (active) return active;

  const seed = generateSeed();
  const engine = generateRoundFromSeed(seed, roundConfig);
  const startAt = now;
  const endAt = addSeconds(startAt, roundConfig.durationSeconds);

  return db.round.create({
    data: {
      status: RoundStatus.active,
      startAt,
      endAt,
      seedHash: sha256Hex(seed),
      seedSecret: seed,
      configJson: roundConfig,
      revealedSeed: null,
      assets: {
        create: engine.assets.map((asset) => ({
          name: asset.name,
          metaJson: asset.meta,
          volatilityType: asset.volatilityType,
          chartDataJson: asset.chartData,
          finalReturn: asset.longReturn
        }))
      }
    },
    include: { assets: true }
  });
}

export function serializeRound(round: RoundWithAssets) {
  const revealFullResult = round.status === "finished" || Boolean(round.revealedSeed);
  const durationMs = Math.max(1, round.endAt.getTime() - round.startAt.getTime());
  const elapsedRatio = Math.min(1, Math.max(0, (Date.now() - round.startAt.getTime()) / durationMs));
  const winners = buildRoundWinners(round);

  return {
    id: round.id,
    status: round.status,
    roundType: round.roundType,
    startAt: round.startAt.toISOString(),
    endAt: round.endAt.toISOString(),
    seedHash: round.seedHash,
    revealedSeed: round.revealedSeed,
    winningAssetId: round.winningAssetId,
    config: round.configJson,
    settledAt: round.settledAt?.toISOString() ?? null,
    horizons: [
      { id: "short", label: "Ближайшие тики", subtitle: "5 минут" },
      { id: "long", label: "Перспектива", subtitle: "1 час" }
    ],
    winners,
    assets: round.assets.map((asset) => {
      const meta = assetMeta(asset.metaJson);
      const chartData = chartPoints(asset.chartDataJson);
      return {
        id: asset.id,
        name: asset.name,
        sector: meta.sector,
        iconToken: meta.iconToken,
        description: meta.description,
        volatilityType: asset.volatilityType,
        volatilityLabel: volatilityLabel(asset.volatilityType),
        volatilityScore: meta.volatilityScore,
        chartData: visibleChartData(chartData, elapsedRatio, revealFullResult),
        finalReturn: revealFullResult ? Number(asset.finalReturn) : null,
        returnsByHorizon: revealFullResult ? computeReturns(chartData) : null
      };
    })
  };
}

export function serializeWorldRound(round: RoundWithAssets & { bets?: Array<{ amount: number }> }, now = new Date()) {
  const betPool = round.bets?.reduce((sum, bet) => sum + bet.amount, 0) ?? 0;
  return {
    id: round.id,
    number: 4821,
    status: round.status,
    statusLabel: round.status === "active" ? "Идёт" : "Завершён",
    startAt: round.startAt.toISOString(),
    endAt: round.endAt.toISOString(),
    seedHash: round.seedHash,
    revealedSeed: round.revealedSeed,
    remainingSeconds: Math.max(0, Math.ceil((round.endAt.getTime() - now.getTime()) / 1000)),
    prizePool: 125_470 + betPool,
    platformFeePercent: 10,
    participantCount: 1_248 + (round.bets?.length ?? 0),
    participantAvatars: ["S", "Q", "A", "N", "E"]
  };
}

export function serializeWorldEvents(round: RoundWithAssets, now = new Date()) {
  return generateWorldEvents(
    {
      id: round.id,
      seed: round.revealedSeed ?? round.seedSecret,
      startAt: round.startAt,
      assets: round.assets.map((asset) => ({ id: asset.id, name: asset.name }))
    },
    now
  );
}

export function serializeWorldAssets(round: RoundWithAssets, now = new Date()) {
  const events = serializeWorldEvents(round, now);
  return round.assets.map((asset) => {
    const meta = assetMeta(asset.metaJson);
    const chartData = chartPoints(asset.chartDataJson);
    let currentPrice = meta.currentPrice;
    let change5m = meta.change5m;
    let adjustedChart = chartData;

    for (const event of events) {
      if (event.related_asset_id !== asset.id || event.status !== "resolved" || !event.outcome) continue;
      const impact = impactForOutcome(event, event.outcome);
      const lastPoint = adjustedChart[adjustedChart.length - 1] ?? { tick: 0, value: 100 };
      currentPrice = Math.max(1, Math.round(currentPrice * (1 + impact / 100)));
      change5m = round1(change5m + impact);
      adjustedChart = [...adjustedChart, { tick: lastPoint.tick + 1, value: round6(lastPoint.value * (1 + impact / 100)) }];
    }

    return {
      id: asset.id,
      name: asset.name,
      sector: meta.sector,
      description: meta.description,
      iconToken: meta.iconToken,
      volatilityType: asset.volatilityType,
      volatilityLabel: volatilityLabel(asset.volatilityType),
      volatilityScore: meta.volatilityScore,
      currentPrice,
      change5m,
      players: meta.players,
      pool: meta.pool,
      accent: meta.accent,
      chartData: adjustedChart,
      finalReturn: Number(asset.finalReturn)
    };
  });
}

export function serializeEventFeed(round: RoundWithAssets, now = new Date()) {
  const events = serializeWorldEvents(round, now);
  const resolved = events.filter((event) => event.status === "resolved" && event.outcome);
  const feed = resolved.map((event) => {
    const impact = event.outcome ? impactForOutcome(event, event.outcome) : 0;
    return {
      id: `resolved:${event.id}`,
      title: resolvedTitle(event),
      description: event.description,
      assetName: event.related_asset_name,
      impactPercent: impact,
      timeAgo: "2 мин назад",
      tone: impact >= 0 ? "green" : "red"
    };
  });

  return [
    ...feed,
    {
      id: "ship-arrived-rotterdam",
      title: "Танкер прибыл в Роттердам",
      description: "Поставка нефти завершена",
      assetName: "SkyForge",
      impactPercent: 4.2,
      timeAgo: "2 мин назад",
      tone: "green"
    },
    {
      id: "air-berlin-feed",
      title: "Авиапоставка в Берлин",
      description: "Новый электромобиль запущен",
      assetName: "AeroTexa",
      impactPercent: 3.1,
      timeAgo: "5 мин назад",
      tone: "green"
    },
    {
      id: "air-failed-feed",
      title: "Авиапоставка сорвана",
      description: "Токио → Сидней. Груз повреждён при шторме",
      assetName: "AeroTexa",
      impactPercent: -6.7,
      timeAgo: "12 мин назад",
      tone: "red"
    },
    {
      id: "truck-dubai-feed",
      title: "Грузовик доставлен в Дубай",
      description: "Сырьё для производства",
      assetName: "QuantCircuit",
      impactPercent: 2.4,
      timeAgo: "18 мин назад",
      tone: "green"
    },
    {
      id: "storm-atlantic-feed",
      title: "Шторм в Атлантике",
      description: "Задержки поставок по морским маршрутам",
      assetName: null,
      impactPercent: -1.3,
      timeAgo: "22 мин назад",
      tone: "red"
    }
  ].slice(0, 8);
}

function buildRoundWinners(round: RoundWithAssets) {
  const seed = round.revealedSeed ?? round.seedSecret;
  const engine = verifyRound(seed, parseRoundConfig(round.configJson));
  const sortedAssets = [...round.assets].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return {
    short: sortedAssets[engine.winningEngineIdByHorizon.short]?.id ?? null,
    long: sortedAssets[engine.winningEngineIdByHorizon.long]?.id ?? null
  };
}

function visibleChartData(chartData: ChartPoint[], elapsedRatio: number, revealFullResult: boolean) {
  if (revealFullResult) return chartData;
  const visibleCount = Math.max(1, Math.min(roundConfig.publicTicks, Math.ceil(chartData.length * elapsedRatio)));
  return chartData.slice(0, visibleCount);
}

function computeReturns(chartData: ChartPoint[]) {
  const baseline = chartData[0]?.value ?? 100;
  const shortValue = chartData[Math.min(roundConfig.shortTickIndex, chartData.length - 1)]?.value ?? baseline;
  const longValue = chartData[Math.min(roundConfig.longTickIndex, chartData.length - 1)]?.value ?? baseline;
  return {
    short: round6(((shortValue - baseline) / baseline) * 100),
    long: round6(((longValue - baseline) / baseline) * 100)
  };
}

export async function settleDueRounds(db: PrismaClient, now = new Date()): Promise<number> {
  const rounds = await db.round.findMany({
    where: { status: RoundStatus.active, endAt: { lte: now } },
    include: { assets: true, bets: true }
  });

  for (const round of rounds) {
    await db.$transaction(async (tx) => {
      const locked = await tx.round.findUniqueOrThrow({
        where: { id: round.id },
        include: { assets: true, bets: true }
      });
      if (locked.status !== RoundStatus.active) return;

      const engine = verifyRound(locked.seedSecret, parseRoundConfig(locked.configJson));
      const sortedAssets = [...locked.assets].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const defaultWinner = sortedAssets[engine.winningEngineIdByHorizon.long];
      if (!defaultWinner) throw badRequest("Winning asset cannot be resolved");

      const poolResults = new Map<string, { payout: number; won: boolean }>();
      const assetBets = locked.bets.filter((bet) => bet.status === "pending" && bet.betType !== "event_outcome");
      for (const horizon of ["short", "long"] as const) {
        const winningAsset = sortedAssets[horizon === "short" ? engine.winningEngineIdByHorizon.short : engine.winningEngineIdByHorizon.long];
        if (!winningAsset) throw badRequest("Winning asset cannot be resolved");
        const horizonBets = assetBets.filter((bet) => bet.horizon === horizon);
        const payouts = calculatePoolPayouts(
          horizonBets.map((bet) => ({ id: bet.id, amount: bet.amount, outcomeId: bet.assetId })),
          winningAsset.id,
          0.1
        );
        for (const payout of payouts) {
          poolResults.set(payout.betId, { payout: payout.payout, won: payout.won });
        }
      }

      const eventBets = locked.bets.filter((bet) => bet.status === "pending" && bet.betType === "event_outcome" && bet.eventId && bet.eventOutcome);
      if (eventBets.length) {
        const events = generateWorldEvents(
          {
            id: locked.id,
            seed: locked.seedSecret,
            startAt: locked.startAt,
            assets: locked.assets.map((asset) => ({ id: asset.id, name: asset.name }))
          },
          new Date(locked.startAt.getTime() + 10_000_000)
        );

        for (const event of events) {
          const betsForEvent = eventBets.filter((bet) => bet.eventId === event.id && bet.eventOutcome);
          const payouts = calculatePoolPayouts(
            betsForEvent.map((bet) => ({ id: bet.id, amount: bet.amount, outcomeId: bet.eventOutcome ?? "" })),
            event.committed_outcome,
            0.1
          );
          for (const payout of payouts) {
            poolResults.set(payout.betId, { payout: payout.payout, won: payout.won });
          }
        }
      }

      for (const bet of locked.bets) {
        if (bet.status !== "pending") continue;

        const poolResult = poolResults.get(bet.id) ?? { payout: 0, won: false };
        const won = poolResult.won;
        const payout = poolResult.payout;
        const user = await tx.user.findUniqueOrThrow({ where: { id: bet.userId } });

        if (won) {
          await applyBalanceChange(tx, {
            userId: user.id,
            delta: payout,
            type: "bet_win",
            referenceType: "bet",
            referenceId: bet.id,
            idempotencyKey: `bet_win:${bet.id}`
          });
        }

        await tx.bet.update({
          where: { id: bet.id },
          data: { status: won ? "won" : "lost", payout, settledAt: now }
        });

        await tx.user.update({
          where: { id: user.id },
          data: won
            ? {
                currentStreak: { increment: 1 },
                bestStreak: Math.max(user.bestStreak, user.currentStreak + 1)
              }
            : { currentStreak: 0 }
        });

        const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        await tx.leaderboardDaily.upsert({
          where: { userId_date: { userId: user.id, date } },
          create: {
            userId: user.id,
            date,
            betsCount: 1,
            winsCount: won ? 1 : 0,
            totalWagered: bet.amount,
            totalPayout: payout,
            netProfit: payout - bet.amount
          },
          update: {
            betsCount: { increment: 1 },
            winsCount: { increment: won ? 1 : 0 },
            totalWagered: { increment: bet.amount },
            totalPayout: { increment: payout },
            netProfit: { increment: payout - bet.amount }
          }
        });

        await maybeAwardReferralMilestone(tx, user.id);
      }

      await tx.round.update({
        where: { id: locked.id },
        data: {
          status: RoundStatus.finished,
          revealedSeed: locked.seedSecret,
          seedHash: sha256Hex(locked.seedSecret),
          winningAssetId: defaultWinner.id,
          settledAt: now
        }
      });
    });
  }

  return rounds.length;
}

export function getWinningAssetForBet(
  round: {
    revealedSeed: string | null;
    seedSecret?: string;
    configJson: Prisma.JsonValue;
    assets: Array<{
      id: string;
      name: string;
      createdAt?: Date;
      chartDataJson?: Prisma.JsonValue;
      finalReturn?: Prisma.Decimal;
    }>;
  },
  horizon: ForecastHorizon
) {
  const seed = round.revealedSeed ?? round.seedSecret;
  if (!seed) return null;
  const engine = verifyRound(seed, parseRoundConfig(round.configJson));
  const sortedAssets = [...round.assets].sort((a, b) => {
    if (!a.createdAt || !b.createdAt) return 0;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
  return sortedAssets[horizon === "short" ? engine.winningEngineIdByHorizon.short : engine.winningEngineIdByHorizon.long] ?? null;
}

function volatilityLabel(type: string) {
  switch (type) {
    case "pumpy":
      return "Импульсный";
    case "stable":
      return "Стабильный";
    case "false-breakout":
      return "Ложный пробой";
    case "late-move":
      return "Поздний импульс";
    case "choppy":
      return "Шумный";
    default:
      return "Трендовый";
  }
}

function assetMeta(value: Prisma.JsonValue) {
  const meta = (value ?? {}) as Partial<{
    sector: string;
    description: string;
    iconToken: string;
    volatilityScore: number;
    hintProfile: string;
    currentPrice: number;
    change5m: number;
    players: number;
    pool: number;
    accent: "green" | "blue" | "orange" | "red" | "purple";
  }>;

  return {
    sector: meta.sector ?? "Технологии",
    description: meta.description ?? "Новая вымышленная кампания с высокой чувствительностью к новостному фону.",
    iconToken: meta.iconToken ?? "tech",
    volatilityScore: meta.volatilityScore ?? 3,
    hintProfile: meta.hintProfile ?? "Первые тики не всегда показывают настоящее направление.",
    currentPrice: meta.currentPrice ?? 10_000,
    change5m: meta.change5m ?? 0,
    players: meta.players ?? 100,
    pool: meta.pool ?? 100_000,
    accent: meta.accent ?? "blue"
  };
}

function round6(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function resolvedTitle(event: { transport_type: string; outcome: string | null; title: string }) {
  if (event.transport_type === "ship") {
    if (event.outcome === "success") return "Танкер прибыл в Роттердам";
    if (event.outcome === "delay") return "Танкер с чипами задерживается";
    return "Шторм повредил груз";
  }
  if (event.transport_type === "truck") {
    if (event.outcome === "success") return "Грузовик доставлен в Дубай";
    if (event.outcome === "delay") return "Грузовик задержан";
    return "Грузовик не доставлен";
  }
  if (event.outcome === "success") return event.title;
  if (event.outcome === "delay") return "Авиапоставка задерживается";
  return "Авиапоставка сорвана";
}

function parseRoundConfig(value: Prisma.JsonValue): typeof roundConfig {
  return value as unknown as typeof roundConfig;
}

function chartPoints(value: Prisma.JsonValue): ChartPoint[] {
  if (!Array.isArray(value)) return [];
  return value as unknown as ChartPoint[];
}
