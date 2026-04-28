import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";

const filePath = fileURLToPath(new URL("./page.tsx", import.meta.url));
const source = fs.readFileSync(path.resolve(filePath), "utf8").toLowerCase();
const eventMapPath = fileURLToPath(new URL("../components/EventMap.tsx", import.meta.url));
const eventMapSource = fs.readFileSync(path.resolve(eventMapPath), "utf8").toLowerCase();
const mapGeoPath = fileURLToPath(new URL("../components/mapGeo.ts", import.meta.url));
const mapGeoSource = fs.readFileSync(path.resolve(mapGeoPath), "utf8").toLowerCase();

describe("event map screen copy", () => {
  it("uses the new upliks event map framing", () => {
    expect(source).toContain("upliks");
    expect(source).toContain("карта событий");
    expect(source).toContain("серверное");
    expect(source).toContain("время");
  });

  it("keeps the round and demo-balance actions visible", () => {
    expect(source).toContain("играть в раунд");
    expect(source).toContain("demo-top-up");
    expect(source).toContain("вложить на бирже");
    expect(source).toContain("подтвердить ставку");
  });

  it("does not expose real-money or store prompts", () => {
    const forbidden = ["real money", "buy coins", "premium purchase", "subscriptions", "top up", "store", "coins", "tokens"];
    for (const term of forbidden) expect(source).not.toContain(term);
  });

  it("keeps transport model assets available while rendering compact map markers", () => {
    for (const asset of [
      "model-passenger-plane.svg",
      "model-cargo-plane.svg",
      "model-drone.svg",
      "model-tanker.svg",
      "model-container-ship.svg",
      "model-truck.svg"
    ]) {
      expect(eventMapSource).toContain(asset);
    }
    expect(eventMapSource).toContain("data-model");
    expect(eventMapSource).toContain("routeangle");
  });

  it("projects event routes from real city coordinates", () => {
    expect(mapGeoSource).toContain("export const map_cities");
    expect(mapGeoSource).toContain("lat: 40.7128");
    expect(mapGeoSource).toContain("lon: -74.006");
    expect(mapGeoSource).toContain("((lon + 180) / 360) * 100");
    expect(mapGeoSource).toContain("((90 - lat) / 180) * 100");
    expect(source).toContain("fromcityid");
    expect(source).toContain("tocityid");
    expect(source).toContain("pointforcityid");
    expect(eventMapSource).not.toContain("const cities");
  });
});
