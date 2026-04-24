import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.stubEnv("TELEGRAM_BOT_TOKEN", "123:test");
vi.stubEnv("DATABASE_URL", "postgresql://u:p@localhost:5432/db");
vi.stubEnv("SESSION_SECRET", "session-secret-for-tests");
vi.stubEnv("INTERNAL_SECRET", "internal-secret");

const { validateTelegramInitData } = await import("../src/services/telegram.service.js");

function sign(params: Record<string, string>) {
  const pairs = Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("\n");
  const secretKey = crypto.createHmac("sha256", "WebAppData").update("123:test").digest();
  return crypto.createHmac("sha256", secretKey).update(pairs).digest("hex");
}

describe("telegram initData", () => {
  it("validates signed initData", () => {
    const params = {
      auth_date: String(Math.floor(Date.now() / 1000)),
      query_id: "q1",
      user: JSON.stringify({ id: 42, first_name: "Ada", username: "ada" })
    };
    const initData = new URLSearchParams({ ...params, hash: sign(params) }).toString();
    expect(validateTelegramInitData(initData).user.id).toBe(42);
  });

  it("rejects bad signatures", () => {
    const initData = new URLSearchParams({
      auth_date: String(Math.floor(Date.now() / 1000)),
      user: JSON.stringify({ id: 42 }),
      hash: "00"
    }).toString();
    expect(() => validateTelegramInitData(initData)).toThrow();
  });
});
