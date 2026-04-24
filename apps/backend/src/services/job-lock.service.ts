import { redis } from "../lib/redis.js";
import { logger } from "../lib/logger.js";

export async function withJobLock<T>(key: string, ttlMs: number, run: () => Promise<T>): Promise<T | null> {
  try {
    const acquired = await redis.set(`lock:${key}`, process.pid.toString(), "PX", ttlMs, "NX");
    if (acquired !== "OK") return null;
    try {
      return await run();
    } finally {
      await redis.del(`lock:${key}`);
    }
  } catch (error) {
    logger.warn({ error, key }, "redis lock unavailable; running job without distributed lock");
    return run();
  }
}
