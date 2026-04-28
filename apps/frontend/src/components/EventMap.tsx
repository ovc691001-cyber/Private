import { useMemo } from "react";
import type { Accent, MapEvent, MapPoint } from "@/app/page";
import { MAP_CITIES, projectCity, type City } from "./mapGeo";
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

type LabelPlacement = "right" | "left" | "top" | "bottom" | "top-right" | "top-left" | "bottom-right" | "bottom-left";

type CollisionBox = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type CityMarker = {
  city: City;
  point: MapPoint;
  active: boolean;
  showLabel: boolean;
  placement: LabelPlacement;
  tone: Accent | null;
};

const MODEL_ASSET_LIBRARY = [
  "/map-assets/model-drone.svg",
  "/map-assets/model-passenger-plane.svg",
  "/map-assets/model-cargo-plane.svg",
  "/map-assets/model-tanker.svg",
  "/map-assets/model-container-ship.svg",
  "/map-assets/model-truck.svg"
] as const;

const LABEL_PLACEMENTS: LabelPlacement[] = ["right", "left", "top-right", "top-left", "bottom-right", "bottom-left", "top", "bottom"];
const DENSE_REGIONS = new Set(["europe", "europe-asia", "asia", "middle-east"]);

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function intersects(a: CollisionBox, b: CollisionBox) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function boxFits(box: CollisionBox) {
  return box.left >= 1 && box.right <= 99 && box.top >= 1 && box.bottom <= 88;
}

function estimatedLabelSize(city: City) {
  return {
    width: clamp(city.name.length * 1.35 + 4, 9, 19),
    height: 4.1
  };
}

function labelBox(city: City, point: MapPoint, placement: LabelPlacement): CollisionBox {
  const size = estimatedLabelSize(city);
  const gap = 1.5;

  if (placement === "left") {
    return { left: point.x - gap - size.width, right: point.x - gap, top: point.y - size.height / 2, bottom: point.y + size.height / 2 };
  }

  if (placement === "top") {
    return { left: point.x - size.width / 2, right: point.x + size.width / 2, top: point.y - gap - size.height, bottom: point.y - gap };
  }

  if (placement === "bottom") {
    return { left: point.x - size.width / 2, right: point.x + size.width / 2, top: point.y + gap, bottom: point.y + gap + size.height };
  }

  if (placement === "top-right") {
    return { left: point.x + gap, right: point.x + gap + size.width, top: point.y - gap - size.height, bottom: point.y - gap };
  }

  if (placement === "top-left") {
    return { left: point.x - gap - size.width, right: point.x - gap, top: point.y - gap - size.height, bottom: point.y - gap };
  }

  if (placement === "bottom-right") {
    return { left: point.x + gap, right: point.x + gap + size.width, top: point.y + gap, bottom: point.y + gap + size.height };
  }

  if (placement === "bottom-left") {
    return { left: point.x - gap - size.width, right: point.x - gap, top: point.y + gap, bottom: point.y + gap + size.height };
  }

  return { left: point.x + gap, right: point.x + gap + size.width, top: point.y - size.height / 2, bottom: point.y + size.height / 2 };
}

function labelPlacementOptions(point: MapPoint): LabelPlacement[] {
  if (point.x > 82) return ["left", "top-left", "bottom-left", "top", "bottom", "right", "top-right", "bottom-right"];
  if (point.x < 18) return ["right", "top-right", "bottom-right", "top", "bottom", "left", "top-left", "bottom-left"];
  if (point.y < 18) return ["bottom-right", "bottom-left", "bottom", "right", "left", "top-right", "top-left", "top"];
  if (point.y > 75) return ["top-right", "top-left", "top", "right", "left", "bottom-right", "bottom-left", "bottom"];
  return LABEL_PLACEMENTS;
}

function cardPoint(event: MapEvent, index: number): MapPoint {
  const midpoint = {
    x: (event.from.x + event.to.x) / 2,
    y: (event.from.y + event.to.y) / 2
  };
  const offsets = [
    { x: -12, y: -10 },
    { x: 11, y: -9 },
    { x: -12, y: 9 },
    { x: 10, y: 10 }
  ];
  const offset = offsets[index % offsets.length] ?? { x: 0, y: 0 };
  const typeBias = event.type === "land" ? 7 : event.type === "sea" ? 3 : -1;

  return {
    x: clamp(midpoint.x + offset.x, 18, 82),
    y: clamp(midpoint.y + offset.y + typeBias, 19, 78)
  };
}

function cardBox(point: MapPoint): CollisionBox {
  return {
    left: point.x - 17,
    right: point.x + 17,
    top: point.y - 7,
    bottom: point.y + 8
  };
}

function tonePriority(tone: Accent) {
  if (tone === "red") return 4;
  if (tone === "orange") return 3;
  if (tone === "green") return 2;
  return 1;
}

function buildCityMarkers(events: MapEvent[], cardBoxes: CollisionBox[]): CityMarker[] {
  const activeCityIds = new Set<string>();
  const cityTones = new Map<string, Accent>();

  for (const event of events) {
    for (const cityId of [event.fromCityId, event.toCityId]) {
      if (!cityId) continue;
      activeCityIds.add(cityId);
      const current = cityTones.get(cityId);
      if (!current || tonePriority(event.accent) > tonePriority(current)) cityTones.set(cityId, event.accent);
    }
  }

  const markers = MAP_CITIES.map((city) => ({
    city,
    point: projectCity(city),
    active: activeCityIds.has(city.id),
    showLabel: false,
    placement: "right" as LabelPlacement,
    tone: cityTones.get(city.id) ?? null
  }));

  const occupied: CollisionBox[] = [
    { left: 0, top: 8, right: 18, bottom: 34 },
    { left: 0, top: 84, right: 100, bottom: 100 },
    ...cardBoxes
  ];

  const labelCandidates = markers
    .filter((marker) => marker.active || (marker.city.priority === "major" && !DENSE_REGIONS.has(marker.city.region)))
    .sort((a, b) => Number(b.active) - Number(a.active) || Number(b.city.priority === "major") - Number(a.city.priority === "major"));

  for (const marker of labelCandidates) {
    const placements = labelPlacementOptions(marker.point);
    const placement = placements.find((option) => {
      const box = labelBox(marker.city, marker.point, option);
      return boxFits(box) && occupied.every((item) => !intersects(box, item));
    });

    if (!placement) continue;

    marker.showLabel = true;
    marker.placement = placement;
    occupied.push(labelBox(marker.city, marker.point, placement));
  }

  return markers;
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

function CityLayer({ events, cardBoxes }: { events: MapEvent[]; cardBoxes: CollisionBox[] }) {
  const cityMarkers = useMemo(() => buildCityMarkers(events, cardBoxes), [events, cardBoxes]);

  return (
    <div className="upliks-city-layer" aria-hidden="true">
      {cityMarkers.map((marker) => (
        <div
          key={marker.city.id}
          className={[
            "upliks-city-pin",
            marker.active ? "is-active" : "",
            marker.city.priority === "major" ? "is-major" : "",
            marker.showLabel ? "has-label" : "",
            marker.tone ? `tone-${marker.tone}` : ""
          ]
            .filter(Boolean)
            .join(" ")}
          data-placement={marker.placement}
          style={{ left: `${marker.point.x}%`, top: `${marker.point.y}%` }}
        >
          <span className="upliks-city-dot" />
          <span className="upliks-city-label">{marker.city.name}</span>
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
  const isCargo = event.accent === "red" || normalized.includes("груз") || normalized.includes("сроч");
  return {
    src: isCargo ? MODEL_ASSET_LIBRARY[2] : MODEL_ASSET_LIBRARY[1],
    label: isCargo ? "Грузовой самолёт" : "Самолёт",
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
  const visibleCardEvents = useMemo(() => {
    const activeEvents = routeEvents.filter((event) => event.status !== "resolved");
    return (activeEvents.length ? activeEvents : routeEvents).slice(0, 4);
  }, [routeEvents]);
  const cardPoints = useMemo(() => new Map(visibleCardEvents.map((event, index) => [event.id, cardPoint(event, index)])), [visibleCardEvents]);
  const cardCollisionBoxes = useMemo(() => [...cardPoints.values()].map(cardBox), [cardPoints]);

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
        <RouteLayer events={routeEvents} />
        <CityLayer events={routeEvents} cardBoxes={cardCollisionBoxes} />

        {routeEvents.map((event) => (
          <VehicleMarker key={`${event.id}:vehicle`} event={event} />
        ))}

        {visibleCardEvents.map((event) => {
          const point = cardPoints.get(event.id) ?? event.card;
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
