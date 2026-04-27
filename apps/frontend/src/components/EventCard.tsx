import type { MapEvent } from "@/app/page";
import { AppIcon } from "./Icon";

const transportIcon: Record<MapEvent["transport"], "plane" | "ship" | "truck"> = {
  plane: "plane",
  ship: "ship",
  truck: "truck"
};

function timerLabel(event: MapEvent) {
  if (event.status !== "resolved") return event.timer;
  if (event.outcome === "delay") return "Задержка";
  if (event.outcome === "fail") return "Провал";
  return "Готово";
}

export function EventCard({ event, onClick }: { event: MapEvent; onClick?: () => void }) {
  const iconTone = event.accent === "green" ? "lime" : event.accent === "blue" ? "cyan" : event.accent;
  const Tag = onClick ? "button" : "article";

  return (
    <Tag type={onClick ? "button" : undefined} className={`upliks-map-event tone-${event.accent}`} onClick={onClick}>
      <div className="upliks-map-event-row">
        <span className="upliks-map-event-icon">
          <AppIcon name={transportIcon[event.transport]} size={14} tone={iconTone} />
        </span>
        <strong>{event.title}</strong>
      </div>
      <span>{event.route}</span>
      <time className={event.status === "resolved" ? "is-resolved" : ""}>{timerLabel(event)}</time>
      <small>{event.assetName}</small>
    </Tag>
  );
}
