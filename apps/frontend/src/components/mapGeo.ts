import type { Accent, MapPoint, TransportType } from "@/app/page";

export type CityPriority = "major" | "normal";

export type City = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  region: string;
  priority?: CityPriority;
};

export type EventType = "air" | "sea" | "land";
export type EventStatus = "active" | "done" | "delayed" | "failed";
export type MapAsset = "SkyForge" | "QuantCircuit" | "AeroTexa" | "NeuroPharm" | "EcoVolt";

export const MAP_CITIES: City[] = [
  { id: "new-york", name: "Нью-Йорк", lat: 40.7128, lon: -74.006, region: "north-america", priority: "major" },
  { id: "los-angeles", name: "Лос-Анджелес", lat: 34.0522, lon: -118.2437, region: "north-america" },
  { id: "toronto", name: "Торонто", lat: 43.6532, lon: -79.3832, region: "north-america" },
  { id: "mexico-city", name: "Мехико", lat: 19.4326, lon: -99.1332, region: "north-america" },
  { id: "sao-paulo", name: "Сан-Паулу", lat: -23.5505, lon: -46.6333, region: "south-america", priority: "major" },
  { id: "buenos-aires", name: "Буэнос-Айрес", lat: -34.6037, lon: -58.3816, region: "south-america" },
  { id: "london", name: "Лондон", lat: 51.5074, lon: -0.1278, region: "europe", priority: "major" },
  { id: "paris", name: "Париж", lat: 48.8566, lon: 2.3522, region: "europe" },
  { id: "berlin", name: "Берлин", lat: 52.52, lon: 13.405, region: "europe", priority: "major" },
  { id: "amsterdam", name: "Амстердам", lat: 52.3676, lon: 4.9041, region: "europe" },
  { id: "rotterdam", name: "Роттердам", lat: 51.9244, lon: 4.4777, region: "europe", priority: "major" },
  { id: "madrid", name: "Мадрид", lat: 40.4168, lon: -3.7038, region: "europe" },
  { id: "rome", name: "Рим", lat: 41.9028, lon: 12.4964, region: "europe" },
  { id: "istanbul", name: "Стамбул", lat: 41.0082, lon: 28.9784, region: "europe-asia" },
  { id: "dubai", name: "Дубай", lat: 25.2048, lon: 55.2708, region: "middle-east", priority: "major" },
  { id: "riyadh", name: "Эр-Рияд", lat: 24.7136, lon: 46.6753, region: "middle-east" },
  { id: "cairo", name: "Каир", lat: 30.0444, lon: 31.2357, region: "africa" },
  { id: "lagos", name: "Лагос", lat: 6.5244, lon: 3.3792, region: "africa" },
  { id: "nairobi", name: "Найроби", lat: -1.2921, lon: 36.8219, region: "africa" },
  { id: "cape-town", name: "Кейптаун", lat: -33.9249, lon: 18.4241, region: "africa", priority: "major" },
  { id: "johannesburg", name: "Йоханнесбург", lat: -26.2041, lon: 28.0473, region: "africa" },
  { id: "mumbai", name: "Мумбаи", lat: 19.076, lon: 72.8777, region: "asia" },
  { id: "delhi", name: "Дели", lat: 28.6139, lon: 77.209, region: "asia" },
  { id: "bangkok", name: "Бангкок", lat: 13.7563, lon: 100.5018, region: "asia" },
  { id: "singapore", name: "Сингапур", lat: 1.3521, lon: 103.8198, region: "asia", priority: "major" },
  { id: "hong-kong", name: "Гонконг", lat: 22.3193, lon: 114.1694, region: "asia" },
  { id: "shanghai", name: "Шанхай", lat: 31.2304, lon: 121.4737, region: "asia", priority: "major" },
  { id: "beijing", name: "Пекин", lat: 39.9042, lon: 116.4074, region: "asia" },
  { id: "seoul", name: "Сеул", lat: 37.5665, lon: 126.978, region: "asia" },
  { id: "tokyo", name: "Токио", lat: 35.6762, lon: 139.6503, region: "asia", priority: "major" },
  { id: "sydney", name: "Сидней", lat: -33.8688, lon: 151.2093, region: "oceania", priority: "major" },
  { id: "melbourne", name: "Мельбурн", lat: -37.8136, lon: 144.9631, region: "oceania" }
];

export const CITY_BY_ID = new Map(MAP_CITIES.map((city) => [city.id, city]));

const MAP_PROJECTION = {
  scaleX: 1,
  scaleY: 1,
  offsetX: 0,
  offsetY: 0
} as const;

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function projectGeo(lat: number, lon: number): MapPoint {
  const x = ((lon + 180) / 360) * 100;
  const y = ((90 - lat) / 180) * 100;

  return {
    x: clampPercent((x - 50) * MAP_PROJECTION.scaleX + 50 + MAP_PROJECTION.offsetX),
    y: clampPercent((y - 50) * MAP_PROJECTION.scaleY + 50 + MAP_PROJECTION.offsetY)
  };
}

export function projectCity(city: City): MapPoint {
  return projectGeo(city.lat, city.lon);
}

function normalizeCityName(value: string) {
  return value
    .toLowerCase()
    .replaceAll("ё", "е")
    .replaceAll("й", "и")
    .replace(/[^a-zа-я0-9]/g, "");
}

const CITY_ALIASES = new Map<string, string>();

function addAlias(cityId: string, ...aliases: string[]) {
  const city = CITY_BY_ID.get(cityId);
  if (city) CITY_ALIASES.set(normalizeCityName(city.name), cityId);
  CITY_ALIASES.set(normalizeCityName(cityId), cityId);
  for (const alias of aliases) CITY_ALIASES.set(normalizeCityName(alias), cityId);
}

addAlias("new-york", "new york", "nyc", "нью йорк");
addAlias("los-angeles", "los angeles", "la", "лос анджелес");
addAlias("toronto", "торонто");
addAlias("mexico-city", "mexico city", "cdmx", "мехико");
addAlias("sao-paulo", "sao paulo", "são paulo", "сан паулу");
addAlias("buenos-aires", "buenos aires", "буэнос айрес");
addAlias("london", "лондон");
addAlias("paris", "париж");
addAlias("berlin", "берлин");
addAlias("amsterdam", "амстердам");
addAlias("rotterdam", "роттердам");
addAlias("madrid", "мадрид");
addAlias("rome", "рим");
addAlias("istanbul", "стамбул");
addAlias("dubai", "дубаи", "дубай");
addAlias("riyadh", "riyad", "эр рияд");
addAlias("cairo", "каир");
addAlias("lagos", "лагос");
addAlias("nairobi", "наироби");
addAlias("cape-town", "cape town", "кеиптаун", "кейп таун");
addAlias("johannesburg", "йоханнесбург");
addAlias("mumbai", "мумбаи");
addAlias("delhi", "дели");
addAlias("bangkok", "бангкок");
addAlias("singapore", "сингапур");
addAlias("hong-kong", "hong kong", "гонконг");
addAlias("shanghai", "шанхаи", "шанхай");
addAlias("beijing", "пекин");
addAlias("seoul", "сеул");
addAlias("tokyo", "токио");
addAlias("sydney", "сиднеи", "сидней");
addAlias("melbourne", "мельбурн");

export function cityIdFromName(value: string | null | undefined) {
  if (!value) return null;
  return CITY_ALIASES.get(normalizeCityName(value)) ?? null;
}

export function pointForCityId(cityId: string | null | undefined) {
  const city = cityId ? CITY_BY_ID.get(cityId) : null;
  return city ? projectCity(city) : null;
}

export function eventTypeFromTransport(transport: TransportType): EventType {
  if (transport === "ship") return "sea";
  if (transport === "truck") return "land";
  return "air";
}

export function eventStatusFromState(status: "active" | "resolved", outcome: "success" | "delay" | "fail" | null, accent: Accent): EventStatus {
  if (status === "resolved") {
    if (outcome === "delay") return "delayed";
    if (outcome === "fail") return "failed";
    return "done";
  }

  return accent === "orange" ? "delayed" : "active";
}

export function mapAccentFromEvent(status: EventStatus, impact: number, fallback: Accent): Accent {
  if (status === "failed") return "red";
  if (status === "delayed") return "orange";
  if (impact > 0) return "green";
  if (impact < 0) return "red";
  return fallback === "green" || fallback === "red" || fallback === "orange" ? fallback : "blue";
}

export function assetNameToMapAsset(assetName: string): MapAsset {
  if (assetName === "SkyForge" || assetName === "QuantCircuit" || assetName === "AeroTexa" || assetName === "NeuroPharm" || assetName === "EcoVolt") {
    return assetName;
  }

  return "AeroTexa";
}
