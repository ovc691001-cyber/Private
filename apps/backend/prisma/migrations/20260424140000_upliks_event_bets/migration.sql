ALTER TABLE "bets"
  ADD COLUMN "bet_type" TEXT NOT NULL DEFAULT 'asset',
  ADD COLUMN "event_id" TEXT,
  ADD COLUMN "event_outcome" TEXT;

CREATE INDEX "bets_round_id_event_id_idx" ON "bets"("round_id", "event_id");
