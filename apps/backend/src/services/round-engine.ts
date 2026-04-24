import { ForecastHorizon } from "@prisma/client";
import { sha256Hex } from "../utils/crypto.js";

export type RoundEngineConfig = {
  assetCount: number;
  ticks: number;
  publicTicks: number;
  shortTickIndex: number;
  longTickIndex: number;
  durationSeconds: number;
  betAmount: number;
  payoutMultiplier: number;
  betOptions: readonly number[];
};

export type EngineAssetMeta = {
  sector: string;
  description: string;
  iconToken: string;
  volatilityScore: number;
  hintProfile: string;
  currentPrice: number;
  change5m: number;
  players: number;
  pool: number;
  accent: "green" | "blue" | "orange" | "red" | "purple";
};

export type EngineAsset = {
  engineId: number;
  name: string;
  volatilityType: string;
  chartData: { tick: number; value: number }[];
  shortReturn: number;
  longReturn: number;
  meta: EngineAssetMeta;
};

export type EngineRoundResult = {
  seedHash: string;
  assets: EngineAsset[];
  winningEngineIdByHorizon: Record<ForecastHorizon, number>;
};

type CatalogAsset = {
  name: string;
  sector: string;
  description: string;
  iconToken: string;
  volatilityType: string;
  volatilityScore: number;
  hintProfile: string;
  currentPrice: number;
  change5m: number;
  players: number;
  pool: number;
  accent: EngineAssetMeta["accent"];
};

export const upliksAssetCatalog: CatalogAsset[] = [
  {
    name: "SkyForge",
    sector: "Логистика",
    description: "Сеть автономных складов и быстрой доставки для промышленных маршрутов.",
    iconToken: "logistics",
    volatilityType: "trend-following",
    volatilityScore: 3,
    hintProfile: "Сильнее реагирует на успешные наземные и морские поставки.",
    currentPrice: 58_230,
    change5m: 12.4,
    players: 1_248,
    pool: 2_450_000,
    accent: "green"
  },
  {
    name: "QuantCircuit",
    sector: "Технологии",
    description: "Производит вычислительные модули и цепочки поставок для чипов.",
    iconToken: "tech",
    volatilityType: "late-move",
    volatilityScore: 4,
    hintProfile: "Чувствителен к морским поставкам чипов и сырья.",
    currentPrice: 32_410,
    change5m: 6.7,
    players: 944,
    pool: 1_820_000,
    accent: "orange"
  },
  {
    name: "AeroTexa",
    sector: "Транспорт",
    description: "Авиалогистика и транспортные интерфейсы для срочных международных маршрутов.",
    iconToken: "transport",
    volatilityType: "choppy",
    volatilityScore: 5,
    hintProfile: "Сильно зависит от авиадоставок и задержек по ключевым городам.",
    currentPrice: 14_830,
    change5m: -3.8,
    players: 713,
    pool: 1_170_000,
    accent: "purple"
  },
  {
    name: "NeuroPharm",
    sector: "Медицина",
    description: "Лабораторная сеть с быстрыми партиями биоматериалов и фармацевтических компонентов.",
    iconToken: "medicine",
    volatilityType: "stable",
    volatilityScore: 2,
    hintProfile: "Двигается мягче рынка, но выигрывает от стабильных маршрутов.",
    currentPrice: 11_240,
    change5m: 2.1,
    players: 532,
    pool: 840_000,
    accent: "blue"
  },
  {
    name: "EcoVolt",
    sector: "Энергетика",
    description: "Модульные накопители энергии и сырьевые цепочки для городских микросетей.",
    iconToken: "energy",
    volatilityType: "pumpy",
    volatilityScore: 4,
    hintProfile: "Получает импульс от своевременной доставки сырья и энергетических новостей.",
    currentPrice: 26_750,
    change5m: 8.9,
    players: 820,
    pool: 1_390_000,
    accent: "green"
  }
];

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function deterministicRandom(seed: string): () => number {
  return mulberry32(xmur3(seed)());
}

export function generateRoundFromSeed(seed: string, config: RoundEngineConfig): EngineRoundResult {
  const assets: EngineAsset[] = [];
  const count = Math.min(config.assetCount, upliksAssetCatalog.length);

  for (let index = 0; index < count; index += 1) {
    const item = upliksAssetCatalog[index]!;
    const chartData = buildAssetChart(`${seed}:asset:${item.name}`, item.change5m, config.ticks);
    const shortValue = chartData[Math.min(config.shortTickIndex, chartData.length - 1)]?.value ?? 100;
    const longValue = chartData[Math.min(config.longTickIndex, chartData.length - 1)]?.value ?? 100;

    assets.push({
      engineId: index,
      name: item.name,
      volatilityType: item.volatilityType,
      chartData,
      shortReturn: round6(shortValue - 100),
      longReturn: round6(longValue - 100),
      meta: {
        sector: item.sector,
        description: item.description,
        iconToken: item.iconToken,
        volatilityScore: item.volatilityScore,
        hintProfile: item.hintProfile,
        currentPrice: item.currentPrice,
        change5m: item.change5m,
        players: item.players,
        pool: item.pool,
        accent: item.accent
      }
    });
  }

  return {
    seedHash: sha256Hex(seed),
    assets,
    winningEngineIdByHorizon: {
      short: pickWinner(assets, "shortReturn"),
      long: pickWinner(assets, "longReturn")
    }
  };
}

export function verifyRound(seed: string, config: RoundEngineConfig): EngineRoundResult {
  return generateRoundFromSeed(seed, config);
}

export function returnForHorizon(asset: Pick<EngineAsset, "shortReturn" | "longReturn">, horizon: ForecastHorizon) {
  return horizon === "short" ? asset.shortReturn : asset.longReturn;
}

function buildAssetChart(seed: string, targetChange: number, ticks: number) {
  const random = deterministicRandom(seed);
  const points: { tick: number; value: number }[] = [];
  const safeTicks = Math.max(2, ticks);

  for (let tick = 0; tick < safeTicks; tick += 1) {
    const phase = tick / (safeTicks - 1);
    const eased = 1 - Math.pow(1 - phase, 1.85);
    const wave = Math.sin((tick + 1) * 1.16) * 0.54 + Math.cos((tick + 2) * 0.7) * 0.34;
    const noise = (random() - 0.5) * 1.15 * (1 - phase);
    const value = tick === safeTicks - 1 ? 100 + targetChange : 100 + targetChange * eased + wave + noise;
    points.push({ tick, value: round6(value) });
  }

  return points;
}

function pickWinner(assets: EngineAsset[], key: "shortReturn" | "longReturn") {
  return [...assets].sort((a, b) => b[key] - a[key] || a.engineId - b.engineId)[0]?.engineId ?? 0;
}

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
