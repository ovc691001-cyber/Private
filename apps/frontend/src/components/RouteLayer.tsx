import type { MapEvent, MapPoint } from "@/app/page";

type RouteEvent = MapEvent & {
  routeOpacity?: number;
};

function pathForRoute(event: RouteEvent) {
  const { from, to } = event;
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (event.transport !== "plane") {
    const curve = event.transport === "ship" ? 3 : 5;
    const cx1 = from.x + dx * 0.35;
    const cy1 = from.y + dy * 0.35 + curve;
    const cx2 = from.x + dx * 0.68;
    const cy2 = from.y + dy * 0.68 + curve;
    return `M ${from.x} ${from.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${to.x} ${to.y}`;
  }

  const curve = Math.abs(dx) > 24 ? -12 : dx > 0 ? -7 : 7;
  const cx1 = from.x + dx * 0.34;
  const cy1 = from.y + dy * 0.18 + curve;
  const cx2 = from.x + dx * 0.72;
  const cy2 = to.y - dy * 0.18 + curve;
  return `M ${from.x} ${from.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${to.x} ${to.y}`;
}

export function RouteLayer({ events }: { events: RouteEvent[] }) {
  return (
    <svg className="upliks-route-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <filter id="routeGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="0.85" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {events.map((event) => (
        <g key={event.id}>
          <path
            className={`route route-${event.accent} route-${event.transport} ${event.status === "resolved" ? "route-resolved" : ""}`}
            d={pathForRoute(event)}
            filter="url(#routeGlow)"
            style={{ opacity: event.routeOpacity ?? 1 }}
          />
          <circle className={`route-end route-${event.accent}`} cx={event.from.x} cy={event.from.y} r="0.7" style={{ opacity: event.routeOpacity ?? 1 }} />
          <circle className={`route-end route-${event.accent}`} cx={event.to.x} cy={event.to.y} r="0.7" style={{ opacity: event.routeOpacity ?? 1 }} />
        </g>
      ))}
    </svg>
  );
}
