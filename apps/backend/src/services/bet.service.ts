import { PrismaClient } from "@prisma/client";
import { placeBetSchema } from "@volatility/shared";
import { z } from "zod";
import { roundConfig } from "../config.js";
import { badRequest, conflict, forbidden } from "../lib/errors.js";
import { applyBalanceChange } from "./economy.service.js";
import { generateWorldEvents } from "./event-engine.js";

export async function placeBet(db: PrismaClient, userId: string, input: z.infer<typeof placeBetSchema>) {
  return db.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.status === "hard_banned" || user.status === "soft_banned") throw forbidden("User is disabled");
    if (!roundConfig.betOptions.includes(input.amount)) throw badRequest("Недопустимый размер ставки");
    if (user.balance < input.amount) throw badRequest("Недостаточно средств для ставки");

    const round = await tx.round.findUnique({ where: { id: input.roundId }, include: { assets: true } });
    if (!round || round.status !== "active") throw badRequest("Round is not active");
    const now = new Date();
    if (round.startAt > now || round.endAt <= now) throw badRequest("Round is closed");

    if (input.eventId && !input.outcome) throw badRequest("Event outcome is required");

    let assetId = input.assetId;
    if (!assetId && input.eventId) {
      const events = generateWorldEvents({
        id: round.id,
        seed: round.revealedSeed ?? round.seedSecret,
        startAt: round.startAt,
        assets: round.assets.map((asset) => ({ id: asset.id, name: asset.name }))
      });
      const event = events.find((candidate) => candidate.id === input.eventId);
      if (!event) throw badRequest("Event does not belong to this round");
      assetId = event.related_asset_id;
    }

    const asset = round.assets.find((candidate) => candidate.id === assetId);
    if (!asset) throw badRequest("Asset does not belong to this round");

    const existing = await tx.bet.findUnique({ where: { userId_roundId: { userId, roundId: round.id } } });
    if (existing) throw conflict("Only one bet per round is allowed");

    const bet = await tx.bet.create({
      data: {
        userId: user.id,
        roundId: round.id,
        assetId: asset.id,
        betType: input.eventId ? "event_outcome" : "asset",
        eventId: input.eventId ?? null,
        eventOutcome: input.outcome ?? null,
        horizon: input.horizon,
        amount: input.amount,
        status: "pending",
        payout: 0
      },
      include: { asset: true, round: true }
    });

    await applyBalanceChange(tx, {
      userId: user.id,
      delta: -input.amount,
      type: "bet_place",
      referenceType: "bet",
      referenceId: bet.id,
      idempotencyKey: `bet_place:${bet.id}`
    });

    return bet;
  });
}
