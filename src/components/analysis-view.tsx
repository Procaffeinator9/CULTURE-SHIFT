import type { Analysis } from "@/lib/culture/analyze";
import { Meter, Panel, Tag } from "./ui";

export function AnalysisView({ analysis }: { analysis: Analysis }) {
  const score = analysis.opportunity.status === "scored" ? analysis.opportunity.score : null;
  return (
    <Panel>
      <Tag kind="calculated">Calculated</Tag>
      <h2 className="mt-2 font-serif text-2xl">Series reading</h2>
      <p className="mt-2 text-sm text-muted">{analysis.lifecycle.label}</p>
      <p className="mt-1 text-xs text-muted">{analysis.lifecycle.detail}</p>

      <div className="mt-5">
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <span className="font-mono text-xs tracking-widest text-muted uppercase">Opportunity score</span>
        </div>
        <Meter value={score} />
        <p className="mt-2 text-xs text-muted">
          {analysis.opportunity.status === "scored"
            ? analysis.opportunity.note
            : analysis.opportunity.reason}
        </p>
        {analysis.numericObservations < 2 ? (
          <p className="mt-2 text-xs text-warn">
            Fewer than two dated signals. Growth is not calculated. A score, if shown, only reflects coverage and assumptions you set.
          </p>
        ) : null}
      </div>

      <dl className="mt-5 space-y-3 text-sm">
        <div>
          <dt className="text-muted">Half-life</dt>
          <dd className="font-mono text-xs text-fg">
            {analysis.halfLife.status === "ok"
              ? `${analysis.halfLife.days.toFixed(1)} days · ${analysis.halfLife.method}`
              : "Not estimable"}
          </dd>
          <dd className="text-xs text-muted">{analysis.halfLife.reason}</dd>
        </div>
        <div>
          <dt className="text-muted">Velocity</dt>
          <dd className="text-xs text-muted">{analysis.velocity.reason}</dd>
        </div>
        <div>
          <dt className="text-muted">Persistence</dt>
          <dd className="text-xs text-muted">{analysis.persistence.reason}</dd>
        </div>
      </dl>

      {analysis.opportunity.status === "scored" ? (
        <ul className="mt-5 space-y-3">
          {analysis.opportunity.included.map((row) => (
            <li key={row.key}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm">{row.label}</span>
                <Tag kind={row.kind === "assumption" ? "assumption" : "calculated"}>{row.kind}</Tag>
              </div>
              <Meter value={row.score} />
              <p className="mt-1 font-mono text-xs text-muted">
                Weight {row.rawWeight.toFixed(2)} → {row.renormWeight.toFixed(2)} after dropping gaps
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      {analysis.opportunity.excluded.length ? (
        <div className="mt-5">
          <h3 className="font-mono text-xs tracking-widest text-warn uppercase">Insufficient evidence</h3>
          <ul className="mt-2 space-y-2">
            {analysis.opportunity.excluded.map((row) => (
              <li key={row.key} className="text-xs text-muted">
                <span className="text-fg">{row.key}. </span>
                {row.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-5 text-sm text-fg">{analysis.hint}</p>
      <p className="mt-2 font-mono text-xs text-muted">
        {analysis.prepared.duplicatesCollapsed} duplicate dates collapsed · {analysis.prepared.incompleteDropped} incomplete rows dropped
      </p>
    </Panel>
  );
}
