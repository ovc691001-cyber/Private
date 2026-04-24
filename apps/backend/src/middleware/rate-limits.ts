import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false
});

export const betLimiter = rateLimit({
  windowMs: 30_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false
});

export const profileLimiter = rateLimit({
  windowMs: 60_000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false
});

export const leaderboardLimiter = rateLimit({
  windowMs: 30_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false
});

export const actionLimiter = rateLimit({
  windowMs: 30_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false
});

export const activityLimiter = rateLimit({
  windowMs: 15_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false
});
