import { CHART } from "@/lib/culture/chart-colors";
import type { SampleCase } from "@/lib/culture/sample";

const ORDER = ["Novelty", "Nostalgia", "Aesthetics", "Humor", "Community", "Friction"] as const;

export function RadarPlot({
  cases,
  activeId,
  coverage,
  onSelect,
}: {
  cases: SampleCase[];
  activeId: string | null;
  coverage: Record<string, number | null>;
  onSelect: (id: string) => void;
}) {
  const size = 520;
  const center = 260;
  const radius = 168;
  const nodes = cases.map((item) => {
    const catIndex = ORDER.indexOf(item.category);
    const siblings = cases.filter((other) => other.category === item.category);
    const indexInCat = siblings.findIndex((other) => other.id === item.id);
    const spread = siblings.length > 1 ? (indexInCat - (siblings.length - 1) / 2) * 0.28 : 0;
    const angle = (-Math.PI / 2 + (catIndex * 2 * Math.PI) / ORDER.length + spread);
    const covered = coverage[item.id];
    const radial = covered == null ? 0.86 : 0.42 + (1 - covered) * 0.4;
    return {
      ...item,
      x: center + Math.cos(angle) * radius * radial,
      y: center + Math.sin(angle) * radius * radial,
    };
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full" role="img" aria-label="Category radar of sample research cases">
      {[0.42, 0.64, 0.86].map((ring) => (
        <circle key={ring} cx={center} cy={center} r={radius * ring} fill="none" stroke={CHART.line} />
      ))}
      {ORDER.map((category, index) => {
        const angle = -Math.PI / 2 + (index * 2 * Math.PI) / ORDER.length;
        const x = center + Math.cos(angle) * (radius + 36);
        const y = center + Math.sin(angle) * (radius + 36);
        return (
          <text key={category} x={x} y={y} textAnchor="middle" fill={CHART.muted} fontSize="11" fontFamily="ui-monospace, monospace">
            {category}
          </text>
        );
      })}
      <text x={center} y={center - 4} textAnchor="middle" fill={CHART.muted} fontSize="10" fontFamily="ui-monospace, monospace">
        MORE COVERAGE
      </text>
      {nodes.map((node) => {
        const active = node.id === activeId;
        return (
          <g
            key={node.id}
            role="button"
            tabIndex={0}
            aria-label={node.name}
            aria-pressed={active}
            className="cursor-pointer"
            onClick={() => onSelect(node.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(node.id);
              }
            }}
          >
            <circle
              cx={node.x}
              cy={node.y}
              r={active ? 11 : 8}
              fill={active ? CHART.lime : CHART.panel}
              stroke={active ? CHART.lime : CHART.fg}
              strokeWidth="1.5"
            />
          </g>
        );
      })}
    </svg>
  );
}
