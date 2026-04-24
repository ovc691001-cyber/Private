import { PrismaClient } from "@prisma/client";
import { roundConfig } from "../src/config.js";
import { generateRoundFromSeed } from "../src/services/round-engine.js";
import { sha256Hex } from "../src/utils/crypto.js";
import { addSeconds } from "../src/utils/time.js";

const prisma = new PrismaClient();

async function main() {
  const seed = "local-dev-seed-volatility-club";
  const engine = generateRoundFromSeed(seed, roundConfig);
  const startAt = new Date();
  const endAt = addSeconds(startAt, roundConfig.durationSeconds);

  const existing = await prisma.round.findFirst({ where: { status: "active" } });
  if (!existing) {
    await prisma.round.create({
      data: {
        status: "active",
        startAt,
        endAt,
        seedHash: sha256Hex(seed),
        seedSecret: seed,
        configJson: roundConfig,
        assets: {
          create: engine.assets.map((asset) => ({
            name: asset.name,
            metaJson: asset.meta,
            volatilityType: asset.volatilityType,
            chartDataJson: asset.chartData,
            finalReturn: asset.longReturn
          }))
        }
      }
    });
  }
}

main().finally(() => prisma.$disconnect());
