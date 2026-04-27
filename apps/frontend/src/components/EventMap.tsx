import { useMemo } from "react";
import type { MapEvent, MapPoint } from "@/app/page";
import { AppIcon } from "./Icon";
import { EventCard } from "./EventCard";
import { RouteLayer } from "./RouteLayer";

type Props = {
  events: MapEvent[];
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onEventSelect: (event: MapEvent) => void;
};

type CityPoint = {
  id: string;
  name: string;
  point: MapPoint;
};

const CITIES: CityPoint[] = [
  { id: "new-york", name: "Нью-Йорк", point: { x: 22, y: 38 } },
  { id: "berlin", name: "Берлин", point: { x: 52, y: 33 } },
  { id: "tokyo", name: "Токио", point: { x: 82, y: 42 } },
  { id: "dubai", name: "Дубай", point: { x: 61, y: 51 } },
  { id: "sao-paulo", name: "Сан-Паулу", point: { x: 35, y: 72 } },
  { id: "sydney", name: "Сидней", point: { x: 84, y: 76 } },
  { id: "cape-town", name: "Кейптаун", point: { x: 53, y: 78 } },
  { id: "rotterdam", name: "Роттердам", point: { x: 49, y: 31 } },
  { id: "shanghai", name: "Шанхай", point: { x: 76, y: 48 } }
];

const MODEL_ASSET_LIBRARY = [
  "/map-assets/model-drone.svg",
  "/map-assets/model-passenger-plane.svg",
  "/map-assets/model-cargo-plane.svg",
  "/map-assets/model-tanker.svg",
  "/map-assets/model-container-ship.svg",
  "/map-assets/model-truck.svg"
] as const;

function cardPoint(event: MapEvent) {
  if (event.id.includes("air-ny")) return { x: 40, y: 32 };
  if (event.id.includes("air-tokyo")) return { x: 73, y: 28 };
  if (event.id.includes("ship")) return { x: 36, y: 57 };
  if (event.id.includes("truck")) return { x: 62, y: 75 };
  return event.card;
}

function pointOnCurve(event: MapEvent) {
  const duration = Math.max(1, event.durationSeconds);
  const progress = event.status === "resolved" ? 1 : Math.max(0, Math.min(1, (duration - event.remainingSeconds) / duration));

  if (event.transport !== "plane") {
    return {
      x: event.from.x + (event.to.x - event.from.x) * progress,
      y: event.from.y + (event.to.y - event.from.y) * progress
    };
  }

  const mid = {
    x: (event.from.x + event.to.x) / 2,
    y: Math.min(event.from.y, event.to.y) - (Math.abs(event.to.x - event.from.x) > 24 ? 12 : 8)
  };
  const oneMinus = 1 - progress;

  return {
    x: oneMinus * oneMinus * event.from.x + 2 * oneMinus * progress * mid.x + progress * progress * event.to.x,
    y: oneMinus * oneMinus * event.from.y + 2 * oneMinus * progress * mid.y + progress * progress * event.to.y
  };
}

function CityLayer() {
  return (
    <div className="upliks-city-layer" aria-hidden="true">
      {CITIES.map((city) => (
        <div key={city.id} className="upliks-city-pin" style={{ left: `${city.point.x}%`, top: `${city.point.y}%` }}>
          <span className="upliks-city-dot" />
          <span className="upliks-city-label">{city.name}</span>
        </div>
      ))}
    </div>
  );
}

function vehicleModel(event: MapEvent) {
  if (event.transport === "truck") {
    return { src: MODEL_ASSET_LIBRARY[5], label: "Грузовик", icon: "truck" as const };
  }

  if (event.transport === "ship") {
    const normalized = `${event.title} ${event.description}`.toLowerCase();
    const isContainer = normalized.includes("контейнер");
    return {
      src: isContainer ? MODEL_ASSET_LIBRARY[4] : MODEL_ASSET_LIBRARY[3],
      label: isContainer ? "Контейнерное судно" : "Танкер",
      icon: "ship" as const
    };
  }

  const normalized = `${event.title} ${event.description}`.toLowerCase();
  const isCargo = event.accent === "red" || normalized.includes("груз") || normalized.includes("срочн");
  return {
    src: isCargo ? MODEL_ASSET_LIBRARY[2] : MODEL_ASSET_LIBRARY[1],
    label: isCargo ? "Грузовой самолёт" : "Пассажирский самолёт",
    icon: "plane" as const
  };
}

function routeAngle(event: MapEvent) {
  return Math.atan2(event.to.y - event.from.y, event.to.x - event.from.x) * (180 / Math.PI);
}

function VehicleMarker({ event }: { event: MapEvent }) {
  const point = pointOnCurve(event);
  const model = vehicleModel(event);
  const iconTone = event.accent === "green" ? "lime" : event.accent === "blue" ? "cyan" : event.accent;

  return (
    <div
      className={`upliks-vehicle-anchor transport-${event.transport}`}
      style={{ left: `${point.x}%`, top: `${point.y}%`, ["--vehicle-angle" as string]: `${routeAngle(event)}deg` }}
    >
      <span
        className={`upliks-vehicle-marker tone-${event.accent} ${event.status === "resolved" ? "is-resolved" : ""}`}
        aria-label={model.label}
        data-model={model.src}
      >
        <AppIcon name={model.icon} size={16} tone={iconTone} />
      </span>
    </div>
  );
}

export function EventMap({ events, zoom, onZoomIn, onZoomOut, onEventSelect }: Props) {
  const routeEvents = useMemo(
    () =>
      events.map((event) => ({
        ...event,
        routeOpacity: event.status === "resolved" ? 0.7 : 1
      })),
    [events]
  );

  return (
    <div className="upliks-map-card">
      <div className="upliks-map-controls">
        <button type="button" className="map-control" aria-label="Увеличить карту" onClick={onZoomIn}>
          <AppIcon name="plus" size={18} tone="text" />
        </button>
        <button type="button" className="map-control" aria-label="Уменьшить карту" onClick={onZoomOut}>
          <AppIcon name="minus" size={18} tone="text" />
        </button>
      </div>

      <div className="upliks-map-layer" style={{ ["--map-zoom" as string]: zoom }}>
        <div className="upliks-map-background" aria-hidden="true" />
        <div className="upliks-map-overlay" aria-hidden="true" />
        <CityLayer />
        <RouteLayer events={routeEvents} />

        {events.map((event) => (
          <VehicleMarker key={`${event.id}:vehicle`} event={event} />
        ))}

        {events.map((event) => {
          const point = cardPoint(event);
          return (
            <div
              key={`${event.id}:card`}
              className="upliks-map-event-anchor"
              style={{
                left: `${point.x}%`,
                top: `${point.y}%`
              }}
            >
              <EventCard event={event} onClick={() => onEventSelect(event)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
