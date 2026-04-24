import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { config } from "./config.js";
import { ApiError } from "./lib/errors.js";
import { logger } from "./lib/logger.js";
import { authLimiter, profileLimiter } from "./middleware/rate-limits.js";
import { authRouter } from "./routes/auth.routes.js";
import { gameRouter } from "./routes/game.routes.js";
import { meRouter } from "./routes/me.routes.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(compression());
  app.use(
    cors({
      origin: config.CORS_ORIGIN.split(","),
      credentials: true
    })
  );
  app.use(express.json({ limit: "32kb" }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/auth", authLimiter, authRouter);
  app.use("/me", profileLimiter, meRouter);
  app.use("/", gameRouter);

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: { code: error.code, message: error.message } });
    }
    const maybe = error as { status?: number; code?: string; message?: unknown };
    if (maybe.status) {
      return res.status(maybe.status).json({ error: { code: maybe.code ?? "error", message: maybe.message } });
    }
    logger.error({ error }, "unhandled request error");
    return res.status(500).json({ error: { code: "internal_error", message: "Internal server error" } });
  });

  return app;
}
