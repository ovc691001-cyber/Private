import { Prisma, PrismaClient } from "@prisma/client";
import { MissionId } from "@volatility/shared";
import { config } from "../config.js";
import { badRequest } from "../lib/errors.js";
import { applyBalanceChange, dateKey } from "./economy.service.js";
import { getTodayBetSummary } from "./user.service.js";

type Db = PrismaClient | Prisma.TransactionClient;

type MissionDefinition = {
  id: MissionId;
  title: string;
  description: string;
  target: number;
  reward: number;
  evaluate: (summary: Awaited<ReturnType<typeof getTodayBetSummary>>, currentStreak: number) => number;
};

const missionPool: MissionDefinition[] = [
  {
    id: "play_five_rounds",
    title: "Сыграй 5 раундов",
    description: "Проведи пять завершенных раундов за день.",
    target: 5,
    reward: 100,
    evaluate: (summary) => summary.plays
  },
  {
    id: "win_two_rounds",
    title: "Выиграй 2 раунда",
    description: "Возьми два точных прогноза за день.",
    target: 2,
    reward: 100,
    evaluate: (summary) => summary.wins
  },
  {
    id: "streak_two_wins",
    title: "Собери серию из 2 побед",
    description: "Держи серию и забери дополнительную награду.",
    target: 2,
    reward: 100,
    evaluate: (_summary, currentStreak) => currentStreak
  },
  {
    id: "use_one_boost",
    title: "Используй 1 инфо-буст",
    description: "Купи подсказку или расширенную историю в активном раунде.",
    target: 1,
    reward: 75,
    evaluate: (summary) => summary.boosts
  },
  {
    id: "pick_three_assets",
    title: "Выбери 3 разных актива",
    description: "Не зацикливайся на одной кампании в течение дня.",
    target: 3,
    reward: 75,
    evaluate: (summary) => summary.uniqueAssets
  },
  {
    id: "three_round_chain",
    title: "Сыграй 3 раунда подряд",
    description: "Сохрани ритм и проведи серию без долгой паузы.",
    target: 3,
    reward: 75,
    evaluate: (summary) => summary.chainLength
  },
  {
    id: "stake_above_250",
    title: "Сделай ставку 250+",
    description: "Испытай более высокий риск хотя бы один раз за день.",
    target: 1,
    reward: 50,
    evaluate: (summary) => summary.highStakeCount
  },
  {
    id: "play_long_horizon",
    title: "Сыграй перспективу",
    description: "Выбери длинный горизонт хотя бы один раз.",
    target: 1,
    reward: 50,
    evaluate: (summary) => summary.longCount
  },
  {
    id: "play_short_horizon",
    title: "Сыграй ближайшие тики",
    description: "Поймай короткое движение хотя бы в одном раунде.",
    target: 1,
    reward: 50,
    evaluate: (summary) => summary.shortCount
  }
];

export function missionRewardKey(userId: string, missionId: MissionId, now = new Date()) {
  return `mission_reward:${userId}:${missionId}:${dateKey(now)}`;
}

export function buildDailyMissionPlan(userId: string, now = new Date()) {
  const seed = `${userId}:${dateKey(now)}`;
  const used = new Set<MissionId>();
  const chosen: MissionDefinition[] = [];
  let cursor = hashCode(seed);

  while (chosen.length < 4 && used.size < missionPool.length) {
    const index = Math.abs(cursor) % missionPool.length;
    const candidate = missionPool[index]!;
    if (!used.has(candidate.id)) {
      used.add(candidate.id);
      chosen.push(candidate);
    }
    cursor = hashCode(`${seed}:${cursor}:${chosen.length}`);
  }

  return chosen;
}

export async function getMissionBoard(db: Db, userId: string, now = new Date()) {
  const [summary, user, claimed] = await Promise.all([
    getTodayBetSummary(db, userId, now),
    db.user.findUniqueOrThrow({ where: { id: userId } }),
    db.transaction.findMany({
      where: {
        userId,
        type: "mission_reward",
        createdAt: { gte: new Date(`${dateKey(now)}T00:00:00.000Z`) }
      },
      select: { idempotencyKey: true }
    })
  ]);

  const claimedSet = new Set(claimed.map((item) => item.idempotencyKey).filter(Boolean));

  return buildDailyMissionPlan(userId, now).map((mission) => {
    const progress = mission.evaluate(summary, user.currentStreak);
    const claimKey = missionRewardKey(userId, mission.id, now);
    return {
      id: mission.id,
      title: mission.title,
      description: mission.description,
      target: mission.target,
      progress: Math.min(progress, mission.target),
      reward: mission.reward,
      claimed: claimedSet.has(claimKey),
      claimable: progress >= mission.target && !claimedSet.has(claimKey)
    };
  });
}

export async function claimMissionReward(db: Db, userId: string, missionId: MissionId, now = new Date()) {
  const board = await getMissionBoard(db, userId, now);
  const current = board.find((item) => item.id === missionId);
  if (!current) throw badRequest("Mission not found");
  if (current.claimed) throw badRequest("Награда уже получена");
  if (!current.claimable) throw badRequest("Миссия еще не выполнена");

  const updated = await applyBalanceChange(db, {
    userId,
    delta: current.reward,
    type: "mission_reward",
    referenceType: "mission",
    referenceId: missionId,
    idempotencyKey: missionRewardKey(userId, missionId, now)
  });

  return {
    missionId,
    reward: current.reward,
    balance: updated.balance
  };
}

function hashCode(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return hash || config.MISSION_REWARD_AMOUNT;
}
