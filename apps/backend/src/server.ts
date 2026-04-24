import { config } from "./config.js";
import { createApp } from "./app.js";
import { logger } from "./lib/logger.js";
import { redis } from "./lib/redis.js";
import { prisma } from "./lib/prisma.js";
import { ensureCurrentRound, settleDueRounds } from "./services/round.service.js";

const app = createApp();

await redis.connect().catch((error: unknown) => {
  logger.warn({ error }, "redis unavailable; rate limiter still uses in-memory defaults");
});

app.listen(config.BACKEND_PORT, () => {
  logger.info({ port: config.BACKEND_PORT }, "backend listening");
});

setInterval(() => {
  settleDueRounds(prisma)
    .then(() => ensureCurrentRound(prisma))
    .catch((error) => logger.error({ error }, "round scheduler failed"));
}, 30_000);
