import type { CSSProperties } from "react";

type Point = {
  tick: number;
  value: number;
};

type Props = {
  points: Point[];
  tone?: "lime" | "purple" | "cyan" | "red";
  className?: string;
  showArea?: boolean;
  compact?: boolean;
};

const TONES = {
  lime: {
    stroke: "#C6FF4D",
    glow: "rgba(198,255,77,0.48)",
    fill: "rgba(198,255,77,0.18)"
  },
  purple: {
    stroke: "#8A4DFF",
    glow: "rgba(138,77,255,0.48)",
    fill: "rgba(138,77,255,0.18)"
  },
  cyan: {
    stroke: "#00E5FF",
    glow: "rgba(0,229,255,0.44)",
    fill: "rgba(0,229,255,0.16)"
  },
  red: {
    stroke: "#FF5D7A",
    glow: "rgba(255,93,122,0.4)",
    fill: "rgba(255,93,122,0.16)"
  }
} as const;

export function NeonChart({ points, tone = "lime", className, showArea = true, compact = false }: Props) {
  const palette = TONES[tone];
  const { linePath, areaPath, endPoint } = buildChart(points);
  const chartId = `upliks-${tone}-${Math.abs(linePath.length * 17 + areaPath.length)}`;

  return (
    <div className={`neon-chart${className ? ` ${className}` : ""}`}>
      <svg viewBox="0 0 220 104" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={`${chartId}-fill`} x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor={palette.fill} />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <filter id={`${chartId}-glow`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation={compact ? "1.8" : "3"} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="neon-chart-grid">
          <path d="M10 22H210" />
          <path d="M10 52H210" />
          <path d="M10 82H210" />
          <path d="M52 14V90" />
          <path d="M110 14V90" />
          <path d="M168 14V90" />
        </g>

        {showArea ? <path d={areaPath} fill={`url(#${chartId}-fill)`} /> : null}

        <path
          d={linePath}
          fill="none"
          stroke={palette.stroke}
          strokeWidth={compact ? "2.8" : "3.6"}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${chartId}-glow)`}
          style={{ "--chart-glow": palette.glow } as CSSProperties}
        />

        <circle cx={endPoint.x} cy={endPoint.y} r={compact ? "3.8" : "4.8"} fill={palette.stroke} />
        <circle cx={endPoint.x} cy={endPoint.y} r={compact ? "7" : "9"} fill={palette.glow} opacity="0.35" />
      </svg>
    </div>
  );
}

function buildChart(points: Point[]) {
  const safe = points.length ? points : [{ tick: 0, value: 0 }, { tick: 1, value: 1 }];
  const min = Math.min(...safe.map((point) => point.value));
  const max = Math.max(...safe.map((point) => point.value));
  const range = max - min || 1;

  const mapped = safe.map((point, index) => {
    const x = 14 + (index / Math.max(1, safe.length - 1)) * 192;
    const y = 82 - ((point.value - min) / range) * 52;
    return { x, y };
  });

  const linePath = mapped
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  const last = mapped[mapped.length - 1] ?? { x: 206, y: 52 };
  const first = mapped[0] ?? { x: 14, y: 52 };
  const areaPath = `${linePath} L${last.x.toFixed(2)} 90 L${first.x.toFixed(2)} 90 Z`;

  return {
    linePath,
    areaPath,
    endPoint: last
  };
}
