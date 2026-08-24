const ZONES = [
  { max: 25, color: "#d64545", short: "Extreme Fear", tag: "EF" },
  { max: 45, color: "#e07b39", short: "Fear", tag: "F" },
  { max: 55, color: "#d4b84a", short: "Neutral", tag: "N" },
  { max: 75, color: "#7bc97a", short: "Greed", tag: "G" },
  { max: 100, color: "#2ea86a", short: "Extreme Greed", tag: "EG" },
];

function roundCoord(value: number) {
  return Math.round(value * 1000) / 1000;
}

function segmentPath(index: number, cx: number, cy: number, radius: number) {
  const startAngle = Math.PI - (index / 5) * Math.PI;
  const endAngle = Math.PI - ((index + 1) / 5) * Math.PI;
  const gap = 0.07;
  const a0 = startAngle - gap / 2;
  const a1 = endAngle + gap / 2;
  const x0 = roundCoord(cx + radius * Math.cos(a0));
  const y0 = roundCoord(cy - radius * Math.sin(a0));
  const x1 = roundCoord(cx + radius * Math.cos(a1));
  const y1 = roundCoord(cy - radius * Math.sin(a1));
  return `M ${x0} ${y0} A ${radius} ${radius} 0 0 1 ${x1} ${y1}`;
}

function backgroundArc(cx: number, cy: number, radius: number) {
  const x0 = roundCoord(cx + radius * Math.cos(Math.PI));
  const y0 = roundCoord(cy - radius * Math.sin(Math.PI));
  const x1 = roundCoord(cx + radius * Math.cos(0));
  const y1 = roundCoord(cy - radius * Math.sin(0));
  return `M ${x0} ${y0} A ${radius} ${radius} 0 0 1 ${x1} ${y1}`;
}

function pointOnArc(value: number, cx: number, cy: number, radius: number) {
  const angle = Math.PI * (1 - value / 100);
  return {
    x: roundCoord(cx + radius * Math.cos(angle)),
    y: roundCoord(cy - radius * Math.sin(angle)),
  };
}

function getZone(score: number | null) {
  if (!Number.isFinite(score)) return ZONES[2];
  return ZONES.find((zone) => score! <= zone.max) ?? ZONES[ZONES.length - 1];
}

export default function FearGreedGauge({
  value,
  label,
}: {
  value?: number | null;
  label?: string;
}) {
  const score =
    Number.isFinite(value) && value != null
      ? Math.max(0, Math.min(100, value))
      : null;
  const cx = 100;
  const cy = 94;
  const radius = 68;
  const zone = getZone(score);
  const displayLabel = label || zone.short;
  const angle = score != null ? Math.PI * (1 - score / 100) : null;
  const dotX = angle != null ? roundCoord(cx + radius * Math.cos(angle)) : cx;
  const dotY =
    angle != null ? roundCoord(cy - radius * Math.sin(angle)) : cy - radius;
  const ticks = [0, 25, 50, 75, 100];

  return (
    <div className="ex-fng-gauge">
      <svg
        viewBox="0 0 200 118"
        role="img"
        aria-label={
          score != null
            ? `Fear and Greed ${score}, ${displayLabel}`
            : "Fear and Greed"
        }
      >
        <path
          d={backgroundArc(cx, cy, radius)}
          stroke="rgba(16, 16, 18, 0.08)"
          strokeWidth="14"
          strokeLinecap="round"
          fill="none"
        />

        {ZONES.map((segment, index) => (
          <path
            key={segment.short}
            d={segmentPath(index, cx, cy, radius)}
            stroke={segment.color}
            strokeWidth="12"
            strokeLinecap="round"
            fill="none"
          />
        ))}

        {ticks.map((tick) => {
          const pos = pointOnArc(tick, cx, cy, radius + 14);
          return (
            <text
              key={`label-${tick}`}
              x={pos.x}
              y={pos.y + 3}
              textAnchor="middle"
              className="ex-fng-gauge-scale"
            >
              {tick}
            </text>
          );
        })}

        {score != null ? (
          <>
            <circle cx={dotX} cy={dotY} r="9" fill="rgba(255, 255, 255, 0.95)" />
            <circle cx={dotX} cy={dotY} r="6" fill="#101012" />
          </>
        ) : null}
      </svg>

      <div className="ex-fng-gauge-readout">
        <span className="ex-fng-gauge-value">
          {score != null ? Math.round(score) : "—"}
        </span>
        <span
          className="ex-fng-gauge-label"
          style={score != null ? { color: zone.color } : undefined}
        >
          {displayLabel}
        </span>
      </div>
    </div>
  );
}
