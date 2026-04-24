-- AlterEnum
ALTER TYPE "TransactionType" RENAME TO "TransactionType_old";

CREATE TYPE "TransactionType" AS ENUM (
  'signup_bonus',
  'bet_place',
  'bet_win',
  'daily_login_bonus',
  'rescue_refill',
  'mission_reward',
  'boost_purchase',
  'referral_reward',
  'manual_adjustment'
);

ALTER TABLE "transactions"
  ALTER COLUMN "type" TYPE "TransactionType"
  USING (
    CASE
      WHEN "type"::text = 'hourly_refill' THEN 'daily_login_bonus'::text
      ELSE "type"::text
    END
  )::"TransactionType";

DROP TYPE "TransactionType_old";

-- CreateEnum
CREATE TYPE "BoostType" AS ENUM ('chart', 'hint');

-- AlterTable
ALTER TABLE "users"
  ADD COLUMN "referred_by_user_id" TEXT,
  ADD COLUMN "current_streak" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "best_streak" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "round_boosts" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "round_id" TEXT NOT NULL,
  "type" "BoostType" NOT NULL,
  "price" INTEGER NOT NULL,
  "payload_json" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "round_boosts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_referred_by_user_id_idx" ON "users"("referred_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "round_boosts_user_id_round_id_type_key" ON "round_boosts"("user_id", "round_id", "type");

-- CreateIndex
CREATE INDEX "round_boosts_round_id_user_id_idx" ON "round_boosts"("round_id", "user_id");

-- AddForeignKey
ALTER TABLE "users"
  ADD CONSTRAINT "users_referred_by_user_id_fkey"
  FOREIGN KEY ("referred_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_boosts"
  ADD CONSTRAINT "round_boosts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_boosts"
  ADD CONSTRAINT "round_boosts_round_id_fkey"
  FOREIGN KEY ("round_id") REFERENCES "rounds"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
