import { deterministicRandom } from "./round-engine.js";

export type EventType =
  | "plane_delivery"
  | "ship_delivery"
  | "truck_delivery"
  | "storm"
  | "delay"
  | "accident"
  | "successful_delivery";

export type TransportType = "plane" | "ship" | "truck" | "weather";
export type EventOutcome = "success" | "delay" | "fail";
export type EventStatus = "active" | "resolved";
export type EventTone = "green" | "blue" | "orange" | "red" | "purple";

export type WorldEvent = {
  id: string;
  round_id: string;
  type: EventType;
  title: string;
  description: string;
  route_from: string;
  route_to: string;
  transport_type: TransportType;
  related_asset_id: string;
  related_asset_name: string;
  duration_seconds: number;
  remaining_seconds: number;
  status: EventStatus;
  probability_success: number;
  probability_delay: number;
  probability_fail: number;
  success_impact: number;
  delay_impact: number;
  fail_impact: number;
  outcome: EventOutcome | null;
  committed_outcome: EventOutcome;
  impact_applied: boolean;
  created_at: string;
  resolves_at: string;
  tone: EventTone;
  map: {
    from: { x: number; y: number };
    to: { x: number; y: number };
    card: { x: number; y: number };
    vehicle: { x: number; y: number };
  };
};

export type EventOutcomeView = {
  id: EventOutcome;
  label: string;
  probability: number;
  impactPercent: number;
};

export type ImpactAssetState = {
  currentPrice: number;
  change5m: number;
  chartData: { tick: number; value: number }[];
};

type EventAsset = {
  id: string;
  name: string;
};

type EventRound = {
  id: string;
  seed: string;
  startAt: Date;
  assets: EventAsset[];
};

type EventTemplate = {
  id: string;
  type: EventType;
  title: string;
  description: string;
  routeFrom: string;
  routeTo: string;
  transportType: TransportType;
  relatedAssetName: string;
  durationSeconds: number;
  probabilitySuccess: number;
  probabilityDelay: number;
  probabilityFail: number;
  successImpact: number;
  delayImpact: number;
  failImpact: number;
  tone: EventTone;
  map: WorldEvent["map"];
};

export const eventCityLabels = [
  { name: "Нью-Йорк", x: 22, y: 38 },
  { name: "Берлин", x: 52, y: 33 },
  { name: "Токио", x: 82, y: 42 },
  { name: "Дубай", x: 61, y: 51 },
  { name: "Сан-Паулу", x: 35, y: 72 },
  { name: "Сидней", x: 84, y: 76 },
  { name: "Кейптаун", x: 53, y: 78 },
  { name: "Роттердам", x: 49, y: 31 },
  { name: "Шанхай", x: 76, y: 48 }
];

export const worldEventTemplates: EventTemplate[] = [
  {
    id: "air-ny-berlin",
    type: "plane_delivery",
    title: "Авиадоставка в Берлин",
    description: "Доставка электроники",
    routeFrom: "Нью-Йорк",
    routeTo: "Берлин",
    transportType: "plane",
    relatedAssetName: "AeroTexa",
    durationSeconds: 18,
    probabilitySuccess: 65,
    probabilityDelay: 25,
    probabilityFail: 10,
    successImpact: 4.2,
    delayImpact: 1.5,
    failImpact: -6.7,
    tone: "blue",
    map: {
      from: { x: 22, y: 38 },
      to: { x: 52, y: 33 },
      card: { x: 37, y: 19 },
      vehicle: { x: 40, y: 34 }
    }
  },
  {
    id: "ship-rotterdam-shanghai",
    type: "ship_delivery",
    title: "Танкер с чипами",
    description: "Морская поставка чипов",
    routeFrom: "Роттердам",
    routeTo: "Шанхай",
    transportType: "ship",
    relatedAssetName: "QuantCircuit",
    durationSeconds: 95,
    probabilitySuccess: 60,
    probabilityDelay: 28,
    probabilityFail: 12,
    successImpact: 4.2,
    delayImpact: -1.3,
    failImpact: -7.4,
    tone: "green",
    map: {
      from: { x: 49, y: 31 },
      to: { x: 76, y: 48 },
      card: { x: 56, y: 60 },
      vehicle: { x: 65, y: 47 }
    }
  },
  {
    id: "air-tokyo-dubai",
    type: "plane_delivery",
    title: "Авиадоставка",
    description: "Задержка на воздушном маршруте",
    routeFrom: "Токио",
    routeTo: "Дубай",
    transportType: "plane",
    relatedAssetName: "AeroTexa",
    durationSeconds: 42,
    probabilitySuccess: 54,
    probabilityDelay: 31,
    probabilityFail: 15,
    successImpact: 4.2,
    delayImpact: 1.5,
    failImpact: -6.7,
    tone: "red",
    map: {
      from: { x: 82, y: 42 },
      to: { x: 61, y: 51 },
      card: { x: 70, y: 24 },
      vehicle: { x: 73, y: 45 }
    }
  },
  {
    id: "truck-cape-dubai",
    type: "truck_delivery",
    title: "Грузовик с сырьём",
    description: "Сырьё для производства",
    routeFrom: "Кейптаун",
    routeTo: "Дубай",
    transportType: "truck",
    relatedAssetName: "SkyForge",
    durationSeconds: 27,
    probabilitySuccess: 68,
    probabilityDelay: 22,
    probabilityFail: 10,
    successImpact: 2.4,
    delayImpact: 0.5,
    failImpact: -3.2,
    tone: "orange",
    map: {
      from: { x: 53, y: 78 },
      to: { x: 61, y: 51 },
      card: { x: 30, y: 55 },
      vehicle: { x: 58, y: 64 }
    }
  }
];

export function generateWorldEvents(round: EventRound, now = new Date()): WorldEvent[] {
  return worldEventTemplates.map((template, index) => {
    const relatedAsset = findRelatedAsset(round.assets, template.relatedAssetName);
    const createdAt = round.startAt;
    const resolvesAt = new Date(round.startAt.getTime() + template.durationSeconds * 1000);
    const remainingSeconds = Math.max(0, Math.ceil((resolvesAt.getTime() - now.getTime()) / 1000));
    const resolved = remainingSeconds === 0;
    const committedOutcome = determineEventOutcome(round.seed, template);

    return {
      id: template.id,
      round_id: round.id,
      type: template.type,
      title: template.title,
      description: template.description,
      route_from: template.routeFrom,
      route_to: template.routeTo,
      transport_type: template.transportType,
      related_asset_id: relatedAsset.id,
      related_asset_name: relatedAsset.name,
      duration_seconds: template.durationSeconds,
      remaining_seconds: remainingSeconds,
      status: resolved ? "resolved" : "active",
      probability_success: template.probabilitySuccess,
      probability_delay: template.probabilityDelay,
      probability_fail: template.probabilityFail,
      success_impact: template.successImpact,
      delay_impact: template.delayImpact,
      fail_impact: template.failImpact,
      outcome: resolved ? committedOutcome : null,
      committed_outcome: committedOutcome,
      impact_applied: resolved,
      created_at: createdAt.toISOString(),
      resolves_at: resolvesAt.toISOString(),
      tone: template.tone,
      map: template.map
    };
  });
}

export function eventOutcomes(event: WorldEvent): EventOutcomeView[] {
  const labels = outcomeLabels(event.transport_type);
  return [
    { id: "success", label: labels.success, probability: event.probability_success, impactPercent: event.success_impact },
    { id: "delay", label: labels.delay, probability: event.probability_delay, impactPercent: event.delay_impact },
    { id: "fail", label: labels.fail, probability: event.probability_fail, impactPercent: event.fail_impact }
  ];
}

export function impactForOutcome(event: Pick<WorldEvent, "success_impact" | "delay_impact" | "fail_impact">, outcome: EventOutcome) {
  if (outcome === "success") return event.success_impact;
  if (outcome === "delay") return event.delay_impact;
  return event.fail_impact;
}

export function applyEventImpactOnce<T extends ImpactAssetState>(
  asset: T,
  event: Pick<WorldEvent, "outcome" | "impact_applied" | "success_impact" | "delay_impact" | "fail_impact">
): { asset: T; applied: boolean } {
  if (!event.outcome || event.impact_applied) {
    return { asset, applied: false };
  }

  const impact = impactForOutcome(event, event.outcome);
  const lastPoint = asset.chartData[asset.chartData.length - 1] ?? { tick: 0, value: 100 };
  const nextPoint = {
    tick: lastPoint.tick + 1,
    value: round2(lastPoint.value * (1 + impact / 100))
  };

  return {
    asset: {
      ...asset,
      currentPrice: Math.max(1, Math.round(asset.currentPrice * (1 + impact / 100))),
      change5m: round1(asset.change5m + impact),
      chartData: [...asset.chartData, nextPoint]
    },
    applied: true
  };
}

export function verifyWorldEvents(seed: string, events: WorldEvent[]) {
  return events.map((event) => {
    const template = worldEventTemplates.find((item) => item.id === event.id);
    const expectedOutcome = template ? determineEventOutcome(seed, template) : null;
    return {
      id: event.id,
      type: event.type,
      route: `${event.route_from} → ${event.route_to}`,
      expectedOutcome,
      storedOutcome: event.outcome ?? event.committed_outcome,
      matches: expectedOutcome === (event.outcome ?? event.committed_outcome)
    };
  });
}

function determineEventOutcome(seed: string, template: EventTemplate): EventOutcome {
  const random = deterministicRandom(`${seed}:event:${template.id}`)();
  if (random < template.probabilitySuccess / 100) return "success";
  if (random < (template.probabilitySuccess + template.probabilityDelay) / 100) return "delay";
  return "fail";
}

function findRelatedAsset(assets: EventAsset[], preferredName: string): EventAsset {
  return assets.find((asset) => asset.name === preferredName) ?? assets[0] ?? { id: "asset-dev", name: preferredName };
}

function outcomeLabels(transportType: TransportType) {
  if (transportType === "ship") {
    return { success: "Танкер прибыл", delay: "Задержался", fail: "Потерял груз / шторм" };
  }
  if (transportType === "truck") {
    return { success: "Доставлен", delay: "Задержан", fail: "Не доставлен" };
  }
  return { success: "Успешная доставка", delay: "Задержка", fail: "Неудача" };
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
