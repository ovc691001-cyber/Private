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

const SUPPORT_MODELS = [
  { id: "scan-drone", src: "/map-assets/model-drone.svg", label: "Дрон мониторинга", x: 42, y: 54, tone: "purple" },
  { id: "container-ship", src: "/map-assets/model-container-ship.svg", label: "Контейнерное судно", x: 74, y: 68, tone: "blue" }
] as const;

function cardShift(eventId: string) {
  if (eventId.includes("ny")) return { x: -8, y: -8 };
  if (eventId.includes("tokyo")) return { x: 9, y: -2 };
  if (eventId.includes("ship")) return { x: -7, y: 0 };
  return { x: 7, y: 6 };
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
    return { src: "/map-assets/model-truck.svg", label: "Грузовик" };
  }

  if (event.transport === "ship") {
    const normalized = `${event.title} ${event.description}`.toLowerCase();
    const isContainer = normalized.includes("контейнер");
    return {
      src: isContainer ? "/map-assets/model-container-ship.svg" : "/map-assets/model-tanker.svg",
      label: isContainer ? "Контейнерное судно" : "Танкер"
    };
  }

  const normalized = `${event.title} ${event.description}`.toLowerCase();
  const isCargo = event.accent === "red" || normalized.includes("груз") || normalized.includes("срочн");
  return {
    src: isCargo ? "/map-assets/model-cargo-plane.svg" : "/map-assets/model-passenger-plane.svg",
    label: isCargo ? "Грузовой самолёт" : "Пассажирский самолёт"
  };
}

function SupportModelLayer() {
  return (
    <div className="upliks-support-model-layer" aria-hidden="true">
      {SUPPORT_MODELS.map((model) => (
        <img
          key={model.id}
          src={model.src}
          alt=""
          draggable={false}
          className={`upliks-support-model support-${model.id} tone-${model.tone}`}
          style={{ left: `${model.x}%`, top: `${model.y}%` }}
        />
      ))}
    </div>
  );
}

function VehicleMarker({ event }: { event: MapEvent }) {
  const point = pointOnCurve(event);
  const model = vehicleModel(event);

  return (
    <div className={`upliks-vehicle-anchor transport-${event.transport}`} style={{ left: `${point.x}%`, top: `${point.y}%` }}>
      <span className={`upliks-vehicle-marker tone-${event.accent} ${event.status === "resolved" ? "is-resolved" : ""}`} aria-label={model.label}>
        <img className="upliks-vehicle-model" src={model.src} alt="" draggable={false} />
      </span>

      <div className="upliks-vehicle-meta">
        <span className="upliks-vehicle-timer">{event.timer}</span>
        {event.outcome ? (
          <span className={`upliks-event-result-pill ${event.outcome === "fail" ? "fail" : "success"}`}>
            {event.outcome === "success" ? "Готово" : event.outcome === "delay" ? "Задержка" : "Провал"}
          </span>
        ) : null}
      </div>
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
        <SupportModelLayer />

        {events.map((event) => (
          <VehicleMarker key={`${event.id}:vehicle`} event={event} />
        ))}

        {events.map((event) => {
          const shift = cardShift(event.id);
          return (
            <div
              key={`${event.id}:card`}
              className="upliks-map-event-anchor"
              style={{
                left: `${event.card.x}%`,
                top: `${event.card.y}%`,
                ["--card-offset-x" as string]: `${shift.x}px`,
                ["--card-offset-y" as string]: `${shift.y}px`
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
