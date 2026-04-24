import { z } from "zod";

export const userStatusSchema = z.enum(["active", "suspicious", "soft_banned", "hard_banned"]);
export type UserStatus = z.infer<typeof userStatusSchema>;

export const roundStatusSchema = z.enum(["upcoming", "active", "finished", "cancelled"]);
export type RoundStatus = z.infer<typeof roundStatusSchema>;

export const betStatusSchema = z.enum(["pending", "won", "lost", "cancelled"]);
export type BetStatus = z.infer<typeof betStatusSchema>;

export const forecastHorizonSchema = z.enum(["short", "long"]);
export type ForecastHorizon = z.infer<typeof forecastHorizonSchema>;

export const roundBetAmountSchema = z.union([
  z.literal(100),
  z.literal(250),
  z.literal(500),
  z.literal(1000)
]);
export type RoundBetAmount = z.infer<typeof roundBetAmountSchema>;

export const assetIdSchema = z.string().min(1).max(64);
export const eventOutcomeSchema = z.enum(["success", "delay", "fail"]);
export type EventOutcome = z.infer<typeof eventOutcomeSchema>;

export const profilePatchSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(2)
    .max(24)
    .regex(/^[a-zA-Z0-9а-яА-ЯёЁ _.-]+$/u, "Nickname contains unsupported characters")
    .optional(),
  rulesAccepted: z.boolean().optional(),
  deviceFingerprint: z.string().trim().max(256).optional()
});

export const authTelegramSchema = z.object({
  initData: z.string().min(20).max(8192),
  deviceFingerprint: z.string().trim().max(256).optional()
});

export const placeBetSchema = z
  .object({
    roundId: z.string().uuid(),
    assetId: z.string().uuid().optional(),
    eventId: z.string().trim().min(1).max(80).optional(),
    outcome: eventOutcomeSchema.optional(),
    horizon: forecastHorizonSchema.default("short"),
    amount: roundBetAmountSchema
  })
  .refine((value) => Boolean(value.assetId || value.eventId), {
    message: "assetId or eventId is required",
    path: ["assetId"]
  });

export const missionIdSchema = z.enum([
  "play_five_rounds",
  "win_two_rounds",
  "streak_two_wins",
  "use_one_boost",
  "pick_three_assets",
  "three_round_chain",
  "stake_above_250",
  "play_long_horizon",
  "play_short_horizon"
]);
export type MissionId = z.infer<typeof missionIdSchema>;

export const claimMissionSchema = z.object({
  missionId: missionIdSchema
});

export const roundBoostTypeSchema = z.enum(["chart", "hint"]);
export type RoundBoostType = z.infer<typeof roundBoostTypeSchema>;

export const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(10)
});

export const leaderboardQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

export const lessonIdSchema = z.string().trim().min(1).max(64);

export type AssetChartPoint = {
  tick: number;
  value: number;
};

export type RoundAssetView = {
  id: string;
  name: string;
  sector: string;
  description: string;
  volatilityType: string;
  volatilityLabel: string;
  volatilityScore: number;
  iconToken: string;
  chartData: AssetChartPoint[];
  finalReturn: number | null;
};

export type PublicUser = {
  id: string;
  telegramUserId: string;
  username: string | null;
  firstName: string | null;
  photoUrl: string | null;
  nickname: string | null;
  balance: number;
  status: UserStatus;
  rulesAcceptedAt: string | null;
  currentStreak?: number;
  bestStreak?: number;
};
