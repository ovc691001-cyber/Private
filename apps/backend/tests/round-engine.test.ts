import { describe, expect, it } from "vitest";
import { placeBetSchema } from "@volatility/shared";
import { roundConfig } from "../src/config.js";
import { generateRoundFromSeed, verifyRound } from "../src/services/round-engine.js";
import { applyEventImpactOnce, generateWorldEvents, verifyWorldEvents } from "../src/services/event-engine.js";
import { calculatePoolPayouts } from "../src/services/pool.service.js";

describe("round engine", () => {
  it("is deterministic", () => {
    const a = generateRoundFromSeed("seed-a", roundConfig);
    const b = generateRoundFromSeed("seed-a", roundConfig);
    expect(a).toEqual(b);
  });

  it("produces fictional campaigns with valid structure", () => {
    const result = generateRoundFromSeed("seed-fictional", roundConfig);
    expect(result.assets).toHaveLength(5);
    for (const asset of result.assets) {
      expect(asset.name).toMatch(/^[A-Z][a-zA-Z]+$/);
      expect(asset.meta.description.toLowerCase()).not.toContain("apple");
      expect(asset.meta.sector.length).toBeGreaterThan(2);
      expect(asset.chartData.length).toBe(roundConfig.ticks);
    }
  });

  it("verifyRound reproduces result", () => {
    expect(verifyRound("seed-b", roundConfig)).toEqual(generateRoundFromSeed("seed-b", roundConfig));
  });

  it("validates horizon and stake choices through schema", () => {
    const parsed = placeBetSchema.parse({
      roundId: "550e8400-e29b-41d4-a716-446655440000",
      assetId: "550e8400-e29b-41d4-a716-446655440001",
      horizon: "short",
      amount: 500,
      payout: 99_999
    });
    expect(parsed).not.toHaveProperty("payout");
    expect(() =>
      placeBetSchema.parse({ roundId: "550e8400-e29b-41d4-a716-446655440000", eventId: "air-ny-berlin", outcome: "success", amount: 250 })
    ).not.toThrow();
    expect(() =>
      placeBetSchema.parse({ roundId: "550e8400-e29b-41d4-a716-446655440000", assetId: "550e8400-e29b-41d4-a716-446655440001", horizon: "week", amount: 500 })
    ).toThrow();
  });

  it("generates deterministic valid world events", () => {
    const engine = generateRoundFromSeed("world-seed", roundConfig);
    const assets = engine.assets.map((asset, index) => ({ id: `asset-${index}`, name: asset.name }));
    const round = { id: "round-1", seed: "world-seed", startAt: new Date("2026-04-24T12:00:00.000Z"), assets };
    const first = generateWorldEvents(round, new Date("2026-04-24T12:00:01.000Z"));
    const second = generateWorldEvents(round, new Date("2026-04-24T12:00:01.000Z"));

    expect(first).toEqual(second);
    expect(first.map((event) => `${event.route_from}-${event.route_to}`)).toContain("Нью-Йорк-Берлин");
    expect(first.every((event) => event.related_asset_id.length > 0)).toBe(true);
  });

  it("applies event impact once", () => {
    const asset = { currentPrice: 1000, change5m: 1, chartData: [{ tick: 0, value: 100 }] };
    const event = { outcome: "success" as const, impact_applied: false, success_impact: 4.2, delay_impact: 1.5, fail_impact: -6.7 };
    const first = applyEventImpactOnce(asset, event);
    const second = applyEventImpactOnce(first.asset, { ...event, impact_applied: true });

    expect(first.applied).toBe(true);
    expect(first.asset.currentPrice).toBe(1042);
    expect(second.applied).toBe(false);
    expect(second.asset.currentPrice).toBe(1042);
  });

  it("verifies event outcomes from the revealed seed", () => {
    const engine = generateRoundFromSeed("verify-seed", roundConfig);
    const assets = engine.assets.map((asset, index) => ({ id: `asset-${index}`, name: asset.name }));
    const events = generateWorldEvents(
      { id: "round-verify", seed: "verify-seed", startAt: new Date("2026-04-24T12:00:00.000Z"), assets },
      new Date("2026-04-24T12:10:00.000Z")
    );

    expect(verifyWorldEvents("verify-seed", events).every((item) => item.matches)).toBe(true);
  });

  it("splits the betting pool after platform fee", () => {
    const payouts = calculatePoolPayouts(
      [
        { id: "a", amount: 100, outcomeId: "win" },
        { id: "b", amount: 300, outcomeId: "win" },
        { id: "c", amount: 600, outcomeId: "lose" }
      ],
      "win",
      0.1
    );

    expect(payouts).toEqual([
      { betId: "a", payout: 225, won: true },
      { betId: "b", payout: 675, won: true },
      { betId: "c", payout: 0, won: false }
    ]);
  });
});
