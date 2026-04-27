import { claimMissionSchema, profilePatchSchema } from "@volatility/shared";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { actionLimiter, profileLimiter } from "../middleware/rate-limits.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { applyBalanceChange } from "../services/economy.service.js";
import { claimMissionReward, getMissionBoard } from "../services/mission.service.js";
import { claimDailyLoginBonus, claimRescueRefill, getProfile, publicUser } from "../services/user.service.js";

export const meRouter = Router();

meRouter.get("/", requireAuth, async (req, res) => {
  const profile = await getProfile(prisma, req.user!.id);
  res.json(profile);
});

meRouter.get("/missions", requireAuth, async (req, res) => {
  const missions = await getMissionBoard(prisma, req.user!.id);
  res.json({ missions });
});

meRouter.post("/claim-daily-login", requireAuth, actionLimiter, async (req, res) => {
  const result = await prisma.$transaction((tx) => claimDailyLoginBonus(tx, req.user!.id));
  res.json(result);
});

meRouter.post("/claim-rescue", requireAuth, actionLimiter, async (req, res) => {
  const result = await prisma.$transaction((tx) => claimRescueRefill(tx, req.user!.id));
  res.json(result);
});

meRouter.post("/demo-top-up", requireAuth, actionLimiter, async (req, res) => {
  const user = await prisma.$transaction((tx) =>
    applyBalanceChange(tx, {
      userId: req.user!.id,
      delta: 1000,
      type: "manual_adjustment",
      referenceType: "demo_top_up",
      referenceId: req.user!.id
    })
  );
  res.json({ amount: 1000, user: publicUser(user) });
});

meRouter.post("/claim-mission", requireAuth, actionLimiter, validateBody(claimMissionSchema), async (req, res) => {
  const result = await prisma.$transaction((tx) => claimMissionReward(tx, req.user!.id, req.body.missionId));
  res.json(result);
});

meRouter.patch("/profile", requireAuth, profileLimiter, validateBody(profilePatchSchema), async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      nickname: req.body.nickname,
      rulesAcceptedAt: req.body.rulesAccepted ? new Date() : undefined
    }
  });
  if (req.body.deviceFingerprint) {
    await prisma.session.update({
      where: { id: req.user!.sessionId },
      data: { deviceFingerprint: req.body.deviceFingerprint }
    });
  }
  res.json({ user: publicUser(user) });
});
