CREATE TYPE "ForecastHorizon" AS ENUM ('short', 'long');

ALTER TABLE "assets"
ADD COLUMN "meta_json" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "bets"
ADD COLUMN "horizon" "ForecastHorizon" NOT NULL DEFAULT 'short';
