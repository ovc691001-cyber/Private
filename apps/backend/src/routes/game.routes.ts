import { historyQuerySchema, leaderboardQuerySchema, placeBetSchema } from "@volatility/shared";
import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { badRequest } from "../lib/errors.js";
import { requireAuth, requireInternalSecret } from "../middleware/auth.js";
import { actionLimiter, activityLimiter, betLimiter, leaderboardLimiter } from "../middleware/rate-limits.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { getActivityFeed } from "../services/activity.service.js";
import { purchaseChartBoost, purchaseHintBoost, getBoostState } from "../services/boost.service.js";
import { placeBet } from "../services/bet.service.js";
import { getEducationLessonById, getEducationLessons } from "../services/education.service.js";
import { getMissionBoard } from "../services/mission.service.js";
import { getModes } from "../services/modes.service.js";
import { getReferralOverview } from "../services/referral.service.js";
import {
  ensureCurrentRound,
  getWinningAssetForBet,
  serializeEventFeed,
  serializeRound,
  serializeWorldAssets,
  serializeWorldEvents,
  serializeWorldRound,
  settleDueRounds
} from "../services/round.service.js";
import { getProfile } from "../services/user.service.js";
import { dayStartUtc } from "../utils/time.js";
import { roundConfig, config } from "../config.js";
import { verifyRound } from "../services/round-engine.js";
import { eventCityLabels, eventOutcomes, verifyWorldEvents } from "../services/event-engine.js";
import { withJobLock } from "../services/job-lock.service.js";

export const gameRouter = Router();

gameRouter.get("/lobby", requireAuth, async (req, res) => {
  await settleDueRounds(prisma);
  const userId = req.user!.id;
  const round = await ensureCurrentRound(prisma);

  const [profile, history, leaderboard, activity, missions, referral, boostState] = await Promise.all([
    getProfile(prisma, userId),
    prisma.bet.findMany({
      where: { userId },
      include: {
        asset: true,
        round: {
          select: {
            winningAssetId: true,
            seedHash: true,
            seedSecret: true,
            revealedSeed: true,
            startAt: true,
            endAt: true,
            configJson: true,
            assets: { select: { id: true, name: true, createdAt: true, chartDataJson: true, finalReturn: true } }
          }
        }
      },
      orderBy: { placedAt: "desc" },
      take: 10
    }),
    prisma.leaderboardDaily.findMany({
      where: { date: dayStartUtc() },
      include: { user: true },
      orderBy: [{ netProfit: "desc" }, { winsCount: "desc" }],
      take: 10
    }),
    getActivityFeed(prisma),
    getMissionBoard(prisma, userId),
    getReferralOverview(prisma, userId),
    getBoostState(prisma, userId, round.id)
  ]);

  res.json({
    user: {
      balance: profile.user.balance,
      nickname: profile.user.nickname,
      firstName: profile.user.firstName,
      photoUrl: profile.user.photoUrl
    },
    round: serializeWorldRound(round),
    assets: serializeWorldAssets(round),
    events: serializeWorldEvents(round),
    eventFeed: serializeEventFeed(round),
    map: {
      cities: eventCityLabels,
      events: serializeWorldEvents(round)
    },
    profile: profile.stats,
    economy: {
      betAmount: roundConfig.betAmount,
      totalReturn: Math.floor(roundConfig.betAmount * roundConfig.payoutMultiplier),
      dailyLoginBonus: config.DAILY_LOGIN_BONUS_AMOUNT,
      rescueAmount: config.RESCUE_REFILL_AMOUNT,
      boostPrices: {
        chart: config.BOOST_CHART_PRICE,
        hint: config.BOOST_HINT_PRICE
      }
    },
    currentRound: {
      ...serializeRound(round),
      boosts: boostState
    },
    modes: getModes(),
    history: history.map(serializeBet),
    leaderboard: leaderboard.map(serializeLeaderboardRow),
    activity,
    missions,
    referral
  });
});

gameRouter.get("/activity/feed", requireAuth, activityLimiter, async (_req, res) => {
  res.json({ items: await getActivityFeed(prisma) });
});

gameRouter.get("/assets", requireAuth, async (_req, res) => {
  await settleDueRounds(prisma);
  const round = await ensureCurrentRound(prisma);
  res.json({ round: serializeWorldRound(round), assets: serializeWorldAssets(round) });
});

gameRouter.get("/assets/:id", requireAuth, async (req, res) => {
  await settleDueRounds(prisma);
  const round = await ensureCurrentRound(prisma);
  const asset = serializeWorldAssets(round).find((item) => item.id === req.params.id);
  if (!asset) throw badRequest("Asset not found");
  const events = serializeWorldEvents(round).filter((event) => event.related_asset_id === asset.id);
  res.json({ asset, events });
});

gameRouter.get("/events", requireAuth, async (_req, res) => {
  await settleDueRounds(prisma);
  const round = await ensureCurrentRound(prisma);
  const events = serializeWorldEvents(round);
  res.json({ round: serializeWorldRound(round), events, feed: serializeEventFeed(round) });
});

gameRouter.get("/events/:id", requireAuth, async (req, res) => {
  await settleDueRounds(prisma);
  const round = await ensureCurrentRound(prisma);
  const event = serializeWorldEvents(round).find((item) => item.id === req.params.id);
  if (!event) throw badRequest("Event not found");
  res.json({ event, outcomes: eventOutcomes(event) });
});

gameRouter.get("/map/events", requireAuth, async (_req, res) => {
  await settleDueRounds(prisma);
  const round = await ensureCurrentRound(prisma);
  res.json({ cities: eventCityLabels, events: serializeWorldEvents(round) });
});

gameRouter.get("/modes", requireAuth, async (_req, res) => {
  res.json({ modes: getModes() });
});

gameRouter.get("/education/lessons", requireAuth, async (_req, res) => {
  res.json({ lessons: getEducationLessons() });
});

gameRouter.get("/education/lessons/:id", requireAuth, async (req, res) => {
  const lessonId = req.params.id;
  if (!lessonId) throw badRequest("Lesson not found");
  const lesson = getEducationLessonById(lessonId);
  if (!lesson) throw badRequest("Lesson not found");
  res.json({ lesson });
});

gameRouter.get("/rounds/current", requireAuth, async (req, res) => {
  await settleDueRounds(prisma);
  const round = await ensureCurrentRound(prisma);
  const boosts = await getBoostState(prisma, req.user!.id, round.id);
  res.json({ round: { ...serializeRound(round), boosts } });
});

gameRouter.get("/rounds/:id", requireAuth, async (req, res) => {
  const roundId = req.params.id;
  if (!roundId) throw badRequest("Round not found");
  const round = await prisma.round.findUnique({ where: { id: roundId }, include: { assets: true } });
  if (!round) throw badRequest("Round not found");
  const boosts = await getBoostState(prisma, req.user!.id, round.id);
  res.json({ round: { ...serializeRound(round), boosts } });
});

gameRouter.get("/rounds/:id/verify", requireAuth, async (req, res) => {
  const roundId = req.params.id;
  if (!roundId) throw badRequest("Round not found");
  const round = await prisma.round.findUnique({ where: { id: roundId }, include: { assets: true } });
  if (!round) throw badRequest("Round not found");
  if (!round.revealedSeed) {
    return res.json({ ready: false, seedHash: round.seedHash, message: "Seed will be revealed after settlement" });
  }
  const recalculated = verifyRound(round.revealedSeed, round.configJson as unknown as typeof roundConfig);
  const verificationNow = new Date(round.startAt.getTime() + 10_000_000);
  const events = serializeWorldEvents(round, verificationNow);
  const eventChecks = verifyWorldEvents(round.revealedSeed, events);
  res.json({
    ready: true,
    roundId: round.id,
    seed: round.revealedSeed,
    seedHash: round.seedHash,
    recalculated,
    eventChecks,
    eventsMatch: eventChecks.every((item) => item.matches),
    stored: serializeRound(round)
  });
});

gameRouter.post("/rounds/:id/boosts/history", requireAuth, actionLimiter, async (req, res) => {
  const roundId = req.params.id;
  if (!roundId) throw badRequest("Round not found");
  const result = await purchaseChartBoost(prisma, req.user!.id, roundId);
  res.status(201).json(result);
});

gameRouter.post("/rounds/:id/boosts/chart", requireAuth, actionLimiter, async (req, res) => {
  const roundId = req.params.id;
  if (!roundId) throw badRequest("Round not found");
  const result = await purchaseChartBoost(prisma, req.user!.id, roundId);
  res.status(201).json(result);
});

gameRouter.post("/rounds/:id/boosts/hint", requireAuth, actionLimiter, async (req, res) => {
  const roundId = req.params.id;
  if (!roundId) throw badRequest("Round not found");
  const result = await purchaseHintBoost(prisma, req.user!.id, roundId);
  res.status(201).json(result);
});

gameRouter.post("/bets", requireAuth, betLimiter, validateBody(placeBetSchema), async (req, res) => {
  const bet = await placeBet(prisma, req.user!.id, req.body);
  res.status(201).json({
    bet: {
      id: bet.id,
      roundId: bet.roundId,
      assetId: bet.assetId,
      assetName: bet.asset?.name ?? null,
      amount: bet.amount,
      betType: bet.betType,
      eventId: bet.eventId,
      eventOutcome: bet.eventOutcome,
      horizon: bet.horizon,
      status: bet.status,
      payout: bet.payout,
      placedAt: bet.placedAt.toISOString(),
      settledAt: bet.settledAt?.toISOString() ?? null,
      verifyPath: `/rounds/${bet.roundId}/verify`
    }
  });
});

gameRouter.get("/bets/history", requireAuth, validateQuery(historyQuerySchema), async (req, res) => {
  const bets = await prisma.bet.findMany({
    where: { userId: req.user!.id },
    include: {
      asset: true,
      round: {
        select: {
          winningAssetId: true,
          seedHash: true,
          seedSecret: true,
          revealedSeed: true,
          startAt: true,
          endAt: true,
          configJson: true,
          assets: { select: { id: true, name: true, createdAt: true, chartDataJson: true, finalReturn: true } }
        }
      }
    },
    orderBy: { placedAt: "desc" },
    take: Number(req.query.limit)
  });
  res.json({ bets: bets.map(serializeBet) });
});

gameRouter.get("/leaderboard/daily", requireAuth, leaderboardLimiter, validateQuery(leaderboardQuerySchema), async (req, res) => {
  const date = req.query.date ? new Date(`${req.query.date}T00:00:00.000Z`) : dayStartUtc();
  const rows = await prisma.leaderboardDaily.findMany({
    where: { date },
    include: { user: true },
    orderBy: [{ netProfit: "desc" }, { winsCount: "desc" }],
    take: 10
  });
  res.json({ date: date.toISOString().slice(0, 10), rows: rows.map(serializeLeaderboardRow) });
});

gameRouter.get("/profile", requireAuth, async (req, res) => {
  res.json(await getProfile(prisma, req.user!.id));
});

gameRouter.get("/referral", requireAuth, async (req, res) => {
  res.json(await getReferralOverview(prisma, req.user!.id));
});

gameRouter.post("/internal/rounds/tick", requireInternalSecret, async (_req, res) => {
  const result = await withJobLock("rounds_tick", 55_000, async () => {
    const settled = await settleDueRounds(prisma);
    const current = await ensureCurrentRound(prisma);
    return { settled, currentRoundId: current.id };
  });
  res.json(result ?? { skipped: true });
});

function serializeBet(bet: {
  id: string;
  roundId: string;
  assetId: string;
  amount: number;
  betType?: string;
  eventId?: string | null;
  eventOutcome?: string | null;
  horizon: "short" | "long";
  status: string;
  payout: number;
  placedAt: Date;
  settledAt: Date | null;
  asset?: { name: string } | null;
  round?: {
    winningAssetId: string | null;
    seedHash: string;
    seedSecret: string;
    revealedSeed: string | null;
    startAt: Date;
    endAt: Date;
    configJson: unknown;
    assets?: Array<{
      id: string;
      name: string;
      createdAt: Date;
      chartDataJson: Prisma.JsonValue;
      finalReturn: Prisma.Decimal;
    }>;
  } | null;
}) {
  const winningAsset =
    bet.round?.assets && bet.round
      ? getWinningAssetForBet(
          {
            revealedSeed: bet.round.revealedSeed,
            seedSecret: bet.round.seedSecret,
            configJson: bet.round.configJson as Prisma.JsonValue,
            assets: bet.round.assets
          },
          bet.horizon
        )
      : null;

  return {
    id: bet.id,
    roundId: bet.roundId,
    assetId: bet.assetId,
    assetName: bet.asset?.name ?? null,
    winningAssetName: winningAsset?.name ?? null,
    amount: bet.amount,
    betType: bet.betType ?? "asset",
    eventId: bet.eventId ?? null,
    eventOutcome: bet.eventOutcome ?? null,
    horizon: bet.horizon,
    status: bet.status,
    payout: bet.payout,
    placedAt: bet.placedAt.toISOString(),
    settledAt: bet.settledAt?.toISOString() ?? null,
    winningAssetId: winningAsset?.id ?? null,
    seedHash: bet.round?.seedHash ?? null,
    revealedSeed: bet.round?.revealedSeed ?? null,
    verifyPath: bet.roundId ? `/rounds/${bet.roundId}/verify` : null,
    startAt: bet.round?.startAt.toISOString() ?? null,
    endAt: bet.round?.endAt.toISOString() ?? null
  };
}

function serializeLeaderboardRow(row: {
  user: { nickname: string | null; username: string | null; firstName: string | null; photoUrl: string | null; currentStreak?: number };
  betsCount: number;
  winsCount: number;
  totalWagered: number;
  totalPayout: number;
  netProfit: number;
}) {
  return {
    name: row.user.nickname ?? row.user.username ?? row.user.firstName ?? "Игрок",
    photoUrl: row.user.photoUrl,
    betsCount: row.betsCount,
    winsCount: row.winsCount,
    winRate: row.betsCount === 0 ? 0 : Math.round((row.winsCount / row.betsCount) * 100),
    currentStreak: row.user.currentStreak ?? 0,
    totalWagered: row.totalWagered,
    totalPayout: row.totalPayout,
    netProfit: row.netProfit,
    score: row.netProfit
  };
}
