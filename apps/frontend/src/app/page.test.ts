import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";

const filePath = fileURLToPath(new URL("./page.tsx", import.meta.url));
const source = fs.readFileSync(path.resolve(filePath), "utf8").toLowerCase();

describe("home screen copy", () => {
  it("uses the new upliks framing", () => {
    expect(source).toContain("upliks");
    expect(source).toContain("карта событий");
    expect(source).toContain("сделать ставку");
  });

  it("does not expose real-money or textual currency prompts", () => {
    const forbidden = ["real money", "buy coins", "premium purchase", "subscriptions", "top up", "store", "бурмалда", "coins", "tokens"];
    for (const term of forbidden) expect(source).not.toContain(term);
  });
});
