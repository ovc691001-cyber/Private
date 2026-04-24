import dotenv from "dotenv";
import path from "node:path";
import { z } from "zod";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env"), override: false });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1).default("postgresql://volatility:volatility@localhost:5432/volatility_club?schema=public"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  BACKEND_PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  TELEGRAM_BOT_TOKEN: z.string().min(1).default("dev-telegram-token"),
  TELEGRAM_BOT_USERNAME: z.string().min(3).default("UpliksBot"),
  SESSION_SECRET: z.string().min(16).default("dev-session-secret-change-me"),
  INTERNAL_SECRET: z.string().min(8).default("dev-internal-secret"),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  ENABLE_DEV_AUTH: z.coerce.boolean().default(process.env.NODE_ENV === "production" ? false : true),
  ROUND_DURATION_SECONDS: z.coerce.number().int().min(60).max(7200).default(5077),
  ROUND_BET_AMOUNT: z.coerce.number().int().positive().default(100),
  ROUND_PAYOUT_MULTIPLIER: z.coerce.number().positive().default(2.7),
  STARTING_BALANCE: z.coerce.number().int().positive().default(1000),
  DAILY_LOGIN_BONUS_AMOUNT: z.coerce.number().int().positive().default(200),
  RESCUE_REFILL_AMOUNT: z.coerce.number().int().positive().default(200),
  RESCUE_REFILL_THRESHOLD: z.coerce.number().int().positive().default(200),
  RESCUE_REFILL_COOLDOWN_HOURS: z.coerce.number().int().positive().default(3),
  MISSION_REWARD_AMOUNT: z.coerce.number().int().positive().default(100),
  REFERRAL_SIGNUP_REWARD: z.coerce.number().int().positive().default(300),
  REFERRAL_ACTIVE_REWARD: z.coerce.number().int().positive().default(300),
  BOOST_CHART_PRICE: z.coerce.number().int().positive().default(50),
  BOOST_HINT_PRICE: z.coerce.number().int().positive().default(100)
});

export const config = envSchema.superRefine((value, ctx) => {
  if (value.NODE_ENV === "production") {
    for (const key of ["TELEGRAM_BOT_TOKEN", "SESSION_SECRET", "INTERNAL_SECRET"] as const) {
      if (value[key].startsWith("dev-")) {
        ctx.addIssue({ code: "custom", path: [key], message: `${key} must be set in production` });
      }
    }
  }
}).parse(process.env);

export const roundConfig = {
  assetCount: 5,
  ticks: 16,
  publicTicks: 5,
  shortTickIndex: 5,
  longTickIndex: 15,
  betOptions: [100, 250, 500, 1000],
  durationSeconds: config.ROUND_DURATION_SECONDS,
  betAmount: config.ROUND_BET_AMOUNT,
  payoutMultiplier: config.ROUND_PAYOUT_MULTIPLIER
};
