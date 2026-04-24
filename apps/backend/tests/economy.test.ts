import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getEducationLessonById, getEducationLessons } from "../src/services/education.service.js";
import { isActivityFeedItem } from "../src/services/activity.service.js";
import { canPurchaseBoost, softHintText } from "../src/services/boost.service.js";
import { buildDailyMissionPlan, missionRewardKey } from "../src/services/mission.service.js";
import { calculatePoolPayouts } from "../src/services/pool.service.js";
import { buildReferralLink, parseReferralCode } from "../src/services/referral.service.js";
import { canClaimRescue } from "../src/services/user.service.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("economy and content rules", () => {
  it("calculates totalizator payouts on the server side", () => {
    const [winner] = calculatePoolPayouts(
      [
        { id: "winner", amount: 100, outcomeId: "asset-a" },
        { id: "other", amount: 900, outcomeId: "asset-b" }
      ],
      "asset-a"
    );
    expect(winner?.payout).toBe(900);
  });

  it("daily mission claim key is stable per mission and day", () => {
    const now = new Date("2026-04-21T10:00:00.000Z");
    expect(missionRewardKey("user-1", "play_five_rounds", now)).toBe("mission_reward:user-1:play_five_rounds:2026-04-21");
  });

  it("rescue refill respects the 3 hour cooldown", () => {
    const now = new Date("2026-04-21T10:00:00.000Z");
    expect(canClaimRescue(150, new Date("2026-04-21T06:30:00.000Z"), now)).toBe(true);
    expect(canClaimRescue(150, new Date("2026-04-21T08:00:01.000Z"), now)).toBe(false);
    expect(canClaimRescue(250, null, now)).toBe(false);
  });

  it("boost purchase deducts only when funds are enough", () => {
    expect(canPurchaseBoost(100, 50)).toBe(true);
    expect(canPurchaseBoost(40, 50)).toBe(false);
  });

  it("hint text stays soft and non-explicit", () => {
    const hint = softHintText({ hintProfile: "Есть шанс позднего импульса." });
    expect(hint.toLowerCase()).not.toContain("точно");
    expect(hint.toLowerCase()).not.toContain("гарант");
  });

  it("referral codes and links are built deterministically", () => {
    expect(parseReferralCode("ref_777")).toBe("777");
    expect(parseReferralCode("hello")).toBeNull();
    expect(buildReferralLink("ref_777")).toContain("start=ref_777");
  });

  it("daily missions are generated without duplicates", () => {
    const plan = buildDailyMissionPlan("user-1", new Date("2026-04-22T10:00:00.000Z"));
    expect(new Set(plan.map((item) => item.id)).size).toBe(plan.length);
  });

  it("activity feed items match the expected structure", () => {
    expect(isActivityFeedItem({ id: "activity-1", kind: "system", text: "В этом раунде сделано выборов: 12" })).toBe(true);
  });

  it("education lessons are reachable", () => {
    expect(getEducationLessons().length).toBeGreaterThan(5);
    expect(getEducationLessonById("volatility")?.title).toBe("Что такое волатильность?");
  });

  it("UI copy no longer exposes money, subscriptions or textual currency labels", () => {
    const pageSource = fs.readFileSync(path.join(root, "apps/frontend/src/app/page.tsx"), "utf8").toLowerCase();
    const forbidden = ["real money", "subscriptions", "premium purchase", "buy coins", "top up", "store", "бурмалда", "coins", "tokens"];
    for (const term of forbidden) expect(pageSource).not.toContain(term);
  });
});
