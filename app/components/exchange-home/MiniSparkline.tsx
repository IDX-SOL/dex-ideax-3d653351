function buildSparklinePath(
  values: number[],
  width: number,
  height: number,
  pad = 2,
) {
  if (!values.length) return { line: "", area: "" };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const points = values.map((value, index) => {
    const x = pad + (index / Math.max(values.length - 1, 1)) * innerW;
    const y = pad + innerH - ((value - min) / range) * innerH;
    return { x, y };
  });

  const line = points
    .map((point, index) => {
      return `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(" ");

  const baseY = pad + innerH;
  const area = `${line} L ${points[points.length - 1].x.toFixed(2)} ${baseY.toFixed(2)} L ${points[0].x.toFixed(2)} ${baseY.toFixed(2)} Z`;

  return { line, area };
}

export default function MiniSparkline({
  closes,
  up,
  loading,
}: {
  closes?: number[];
  up: boolean;
  loading?: boolean;
}) {
  const width = 120;
  const height = 72;
  const stroke = up ? "#16a34a" : "#dc2626";
  const fill = up ? "rgba(22, 163, 74, 0.12)" : "rgba(220, 38, 38, 0.12)";
  const { line, area } =
    closes && closes.length >= 2
      ? buildSparklinePath(closes, width, height)
      : { line: "", area: "" };

  return (
    <div className="ex-markets-grid-sparkline" aria-hidden="true">
      {line ? (
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <path d={area} fill={fill} stroke="none" />
          <path
            d={line}
            fill="none"
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : (
        <span
          className={`ex-markets-grid-sparkline-placeholder${loading ? "" : " is-failed"}`}
        />
      )}
    </div>
  );
}
