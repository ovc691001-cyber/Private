import { Router } from "express";
import { authTelegramSchema } from "@volatility/shared";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { validateBody } from "../middleware/validate.js";
import { generateSessionToken, hashSessionToken } from "../utils/crypto.js";
import { validateTelegramInitData } from "../services/telegram.service.js";
import { logSecurityEvent } from "../services/security.service.js";
import { publicUser } from "../services/user.service.js";
import { attachReferrerOnSignup } from "../services/referral.service.js";

export const authRouter = Router();

authRouter.post("/telegram", validateBody(authTelegramSchema), async (req, res, next) => {
  try {
    const parsed = validateTelegramInitData(req.body.initData);
    const ip = req.ip;
    const userAgent = req.get("user-agent") ?? null;
    const token = generateSessionToken();
    const tokenHash = await hashSessionToken(token);

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { telegramUserId: String(parsed.user.id) } });
      const user = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: {
              username: parsed.user.username ?? null,
              firstName: parsed.user.first_name ?? null,
              languageCode: parsed.user.language_code ?? null,
              photoUrl: parsed.user.photo_url ?? null,
              lastLoginAt: new Date()
            }
          })
        : await tx.user.create({
            data: {
              telegramUserId: String(parsed.user.id),
              username: parsed.user.username ?? null,
              firstName: parsed.user.first_name ?? null,
              languageCode: parsed.user.language_code ?? null,
              photoUrl: parsed.user.photo_url ?? null,
              referralStartParam: parsed.startParam ?? null,
              balance: config.STARTING_BALANCE,
              lastLoginAt: new Date(),
              transactions: {
                create: {
                  type: "signup_bonus",
                  amount: config.STARTING_BALANCE,
                  balanceBefore: 0,
                  balanceAfter: config.STARTING_BALANCE,
                  referenceType: "user",
                  idempotencyKey: `signup_bonus:telegram:${parsed.user.id}`
                }
              }
            }
          });

      if (!existing) {
        await attachReferrerOnSignup(tx, user.id, String(parsed.user.id), parsed.startParam ?? null);
      }

      const session = await tx.session.create({
        data: {
          userId: user.id,
          telegramInitQueryId: parsed.queryId ?? null,
          tokenHash,
          ip,
          userAgent,
          deviceFingerprint: req.body.deviceFingerprint ?? null
        }
      });

      await logSecurityEvent(tx, {
        userId: user.id,
        type: existing ? "auth_login" : "auth_signup",
        ip,
        userAgent,
        payload: { telegramUserId: parsed.user.id, startParam: parsed.startParam ?? null }
      });

      return { user, sessionId: session.id };
    });

    res.cookie("vc_session", token, {
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      sameSite: config.COOKIE_SECURE ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/"
    });
    res.cookie("vc_session_id", result.sessionId, {
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      sameSite: config.COOKIE_SECURE ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/"
    });
    res.json({ user: publicUser(result.user), sessionToken: `${result.sessionId}.${token}` });
  } catch (error) {
    await logSecurityEvent(prisma, {
      type: "auth_failed",
      ip: req.ip,
      userAgent: req.get("user-agent"),
      payload: { reason: error instanceof Error ? error.message : "unknown" }
    });
    next(error);
  }
});

authRouter.post("/dev", async (req, res, next) => {
  try {
    if (config.NODE_ENV === "production" || !config.ENABLE_DEV_AUTH) {
      return res.status(404).json({ error: { code: "not_found", message: "Not found" } });
    }

    const ip = req.ip;
    const userAgent = req.get("user-agent") ?? null;
    const token = generateSessionToken();
    const tokenHash = await hashSessionToken(token);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { telegramUserId: "dev-local-user" },
        create: {
          telegramUserId: "dev-local-user",
          username: "local_dev",
          firstName: "Local",
          languageCode: "ru",
          photoUrl: null,
          nickname: "local_player",
          rulesAcceptedAt: new Date(),
          balance: config.STARTING_BALANCE,
          lastLoginAt: new Date(),
          transactions: {
            create: {
              type: "signup_bonus",
              amount: config.STARTING_BALANCE,
              balanceBefore: 0,
              balanceAfter: config.STARTING_BALANCE,
              referenceType: "user",
              idempotencyKey: "signup_bonus:dev-local-user"
            }
          }
        },
        update: {
          lastLoginAt: new Date()
        }
      });

      const session = await tx.session.create({
        data: {
          userId: user.id,
          tokenHash,
          ip,
          userAgent,
          deviceFingerprint: req.body?.deviceFingerprint ?? "dev-browser"
        }
      });

      await logSecurityEvent(tx, {
        userId: user.id,
        type: "auth_dev_login",
        ip,
        userAgent,
        payload: { mode: "local_dev" }
      });

      return { user, sessionId: session.id };
    });

    res.cookie("vc_session", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/"
    });
    res.cookie("vc_session_id", result.sessionId, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/"
    });
    res.json({ user: publicUser(result.user), sessionToken: `${result.sessionId}.${token}` });
  } catch (error) {
    next(error);
  }
});
