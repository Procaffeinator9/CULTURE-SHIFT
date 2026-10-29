import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { analyzeObservations } from "@/lib/culture/analyze";
import { useLab } from "@/lib/culture/store";
import { PageHeader, Button, fieldClass } from "@/components/ui";

export const Route = createFileRoute("/investigations")({ component: InvestigationsPage });

function InvestigationsPage() {
  const hydrated = useLab((state) => state.hydrated);
  const investigations = useLab((state) => state.investigations);
  const rename = useLab((state) => state.upsert);
  const remove = useLab((state) => state.remove);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");

  const a = investigations.find((item) => item.id === left);
  const b = investigations.find((item) => item.id === right);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        kicker="Lab / Files"
        title="Investigations stay on this device."
        lede="Rename, reopen, compare, or delete. Nothing is uploaded. Clearing the browser clears the shelf."
      />
      {!hydrated ? <p className="text-sm text-muted">Opening the local shelf…</p> : null}
      {hydrated && !investigations.length ? (
        <div className="bg-panel p-6 shadow-card">
          <p className="font-serif text-2xl">No investigations yet.</p>
          <p className="mt-2 text-sm text-muted">Start from one sentence on the overview. You can save after the brief appears.</p>
          <Link to="/" className="mt-4 inline-flex min-h-11 items-center bg-lime px-4 text-sm font-medium text-ink">
            Ask a question
          </Link>
        </div>
      ) : null}
      <ul className="divide-y divide-line border-t border-line">
        {investigations.map((item) => {
          const analysis = analyzeObservations(item.observations, item.weights, {
            brandFit: item.brandFitAssumption,
            novelty: item.noveltyAssumption,
          });
          return (
            <li key={item.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <input
                  className="w-full bg-transparent font-serif text-2xl text-fg"
                  aria-label={`Title for ${item.question}`}
                  value={item.title}
                  onChange={(event) => rename({ ...item, title: event.target.value, updatedAt: new Date().toISOString() })}
                />
                <p className="mt-1 truncate text-sm text-muted">{item.question}</p>
                <p className="mt-1 font-mono text-xs text-muted">
                  {analysis.numericObservations} numeric signals · {analysis.lifecycle.label}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to="/investigations/$id" params={{ id: item.id }} className="inline-flex min-h-11 items-center px-3 text-sm text-fg shadow-card">
                  Open
                </Link>
                {pendingDelete === item.id ? (
                  <>
                    <Button variant="warn" onClick={() => { remove(item.id); setPendingDelete(null); }}>
                      Confirm delete
                    </Button>
                    <Button variant="ghost" onClick={() => setPendingDelete(null)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" onClick={() => setPendingDelete(item.id)}>
                    Delete
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {investigations.length >= 2 ? (
        <div className="mt-10">
          <h2 className="font-serif text-3xl">Compare two files</h2>
          <p className="mt-2 text-sm text-muted">Side by side questions and what each file can actually support. Not a winner.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <select className={fieldClass} value={left} onChange={(event) => setLeft(event.target.value)} aria-label="First investigation">
              <option value="">Choose one</option>
              {investigations.map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
            <select className={fieldClass} value={right} onChange={(event) => setRight(event.target.value)} aria-label="Second investigation">
              <option value="">Choose another</option>
              {investigations.map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </div>
          {a && b ? <Compare left={a} right={b} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function Compare({
  left,
  right,
}: {
  left: ReturnType<typeof useLab.getState>["investigations"][number];
  right: ReturnType<typeof useLab.getState>["investigations"][number];
}) {
  const pair = [left, right].map((item) => ({
    item,
    analysis: analyzeObservations(item.observations, item.weights, {
      brandFit: item.brandFitAssumption,
      novelty: item.noveltyAssumption,
    }),
  }));
  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      {pair.map(({ item, analysis }) => (
        <article key={item.id} className="bg-panel p-4 shadow-card">
          <h3 className="font-serif text-2xl">{item.title}</h3>
          <p className="mt-2 text-sm">{item.question}</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="text-muted">Observations</dt>
              <dd>{item.observations.length} rows, {analysis.numericObservations} with a number</dd>
            </div>
            <div>
              <dt className="text-muted">Lifecycle</dt>
              <dd>{analysis.lifecycle.label}</dd>
            </div>
            <div>
              <dt className="text-muted">Half-life</dt>
              <dd>{analysis.halfLife.status === "ok" ? `${analysis.halfLife.days.toFixed(1)} days` : "Not estimable"}</dd>
            </div>
            <div>
              <dt className="text-muted">Opportunity score</dt>
              <dd>
                {analysis.opportunity.status === "scored"
                  ? analysis.opportunity.score.toFixed(2)
                  : "Not scored"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Next evidence</dt>
              <dd className="text-muted">{analysis.hint}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}
