import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { analyzeObservations } from "@/lib/culture/analyze";
import { halfLife, opportunityScore, buildDimensions } from "@/lib/culture/analytics";
import { prepareSeries } from "@/lib/culture/analytics";
import { useLab } from "@/lib/culture/store";
import { SYNTHETIC_SERIES } from "@/lib/culture/sample";
import { DEFAULT_WEIGHTS, DIMENSIONS, type Weights } from "@/lib/culture/types";
import { SignalChart } from "@/components/signal-chart";
import { PageHeader, Panel, Tag } from "@/components/ui";

export const Route = createFileRoute("/halflife")({ component: HalfLifePage });

const PRESETS: { id: string; label: string; weights: Weights }[] = [
  { id: "initial", label: "Initial design", weights: DEFAULT_WEIGHTS },
  {
    id: "velocity",
    label: "Velocity-heavy",
    weights: { velocity: 0.4, persistence: 0.15, novelty: 0.1, resonance: 0.1, brandFit: 0.1, evidence: 0.15 },
  },
  {
    id: "persistence",
    label: "Persistence-heavy",
    weights: { velocity: 0.1, persistence: 0.4, novelty: 0.1, resonance: 0.15, brandFit: 0.1, evidence: 0.15 },
  },
  {
    id: "evidence",
    label: "Evidence-heavy",
    weights: { velocity: 0.1, persistence: 0.15, novelty: 0.1, resonance: 0.1, brandFit: 0.1, evidence: 0.45 },
  },
];

function HalfLifePage() {
  const investigations = useLab((state) => state.investigations);
  const setWeights = useLab((state) => state.setWeights);
  const stored = useLab((state) => state.weights);
  const [source, setSource] = useState("none");
  const [localWeights, setLocalWeights] = useState<Weights>(stored);
  const [grow, setGrow] = useState(false);
  const [fade, setFade] = useState(false);

  const selected = useMemo(() => {
    if (source.startsWith("inv:")) {
      const found = investigations.find((item) => item.id === source.slice(4));
      return found
        ? { label: found.title, observations: found.observations, disclaimer: "", brandFit: found.brandFitAssumption, novelty: found.noveltyAssumption }
        : null;
    }
    if (source.startsWith("syn:")) {
      const found = SYNTHETIC_SERIES.find((item) => item.id === source.slice(4));
      return found
        ? { label: found.name, observations: found.observations, disclaimer: found.disclaimer, brandFit: null, novelty: null }
        : null;
    }
    return null;
  }, [source, investigations]);

  const observedPoints = selected ? prepareSeries(selected.observations.map((obs) => ({ date: obs.date, signal: obs.signal }))).points : [];
  const simulated = useMemo(() => simulatePath(observedPoints, grow, fade), [observedPoints, grow, fade]);
  const observedHalf = halfLife(observedPoints);
  const simulatedHalf = halfLife(simulated);
  const analysis = selected
    ? analyzeObservations(selected.observations, localWeights, { brandFit: selected.brandFit, novelty: selected.novelty })
    : null;

  const peak = observedPoints.length ? Math.max(...observedPoints.map((point) => point.signal)) : null;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        kicker="Lab / Half-life"
        title="How long until a signal is half its peak?"
        lede="Half-life is the time for a supplied signal to fall by 50% from its peak, after that peak. If the series never does that, the answer is not estimable. Simulated paths are drawn separately and never replace the supplied points."
      />

      <label className="block max-w-xl">
        <span className="mb-1 block font-mono text-xs tracking-widest text-muted uppercase">Series</span>
        <select className="min-h-11 w-full bg-panel-2 px-3 text-sm shadow-card" value={source} onChange={(event) => setSource(event.target.value)}>
          <option value="none">Choose a series</option>
          <optgroup label="Your investigations">
            {investigations.map((item) => (
              <option key={item.id} value={`inv:${item.id}`}>{item.title}</option>
            ))}
          </optgroup>
          <optgroup label="Synthetic demonstrations — not measurements">
            {SYNTHETIC_SERIES.map((item) => (
              <option key={item.id} value={`syn:${item.id}`}>{item.name}</option>
            ))}
          </optgroup>
        </select>
      </label>

      {!selected ? (
        <p className="mt-6 max-w-xl text-sm text-muted">
          No series is loaded. Sample radar cases do not include dates, so half-life is not estimable for them. Load a demonstration series to see the formula, or save observations on an investigation.
        </p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Panel>
            <div className="flex flex-wrap items-center gap-2">
              <Tag kind={source.startsWith("syn:") ? "simulated" : "supplied"}>
                {source.startsWith("syn:") ? "Synthetic" : "Supplied"}
              </Tag>
              <h2 className="font-serif text-2xl">{selected.label}</h2>
            </div>
            {selected.disclaimer ? <p className="mt-2 text-sm text-warn">{selected.disclaimer}</p> : null}
            <div className="mt-4">
              <SignalChart
                observed={observedPoints}
                simulated={grow || fade ? simulated : null}
                halfMark={peak != null && peak > 0 ? peak / 2 : null}
              />
            </div>
            <p className="mt-2 text-xs text-muted">Lime is the supplied series. Violet dashes are a simulated what-if. The amber line, when the peak is positive, is 50% of the peak.</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <label className="flex min-h-11 items-center gap-2">
                <input type="checkbox" checked={grow} onChange={(event) => setGrow(event.target.checked)} />
                Attention grows faster after the midpoint (simulated ×1.25)
              </label>
              <label className="flex min-h-11 items-center gap-2">
                <input type="checkbox" checked={fade} onChange={(event) => setFade(event.target.checked)} />
                Interest fades sooner after the peak (simulated ×0.7)
              </label>
            </div>
            <dl className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <dt className="font-mono text-xs tracking-widest text-lime uppercase">Observed half-life</dt>
                <dd className="mt-1 text-sm">{observedHalf.status === "ok" ? `${observedHalf.days.toFixed(1)} days (${observedHalf.method})` : "Not estimable"}</dd>
                <dd className="text-xs text-muted">{observedHalf.reason}</dd>
              </div>
              <div>
                <dt className="font-mono text-xs tracking-widest text-violet uppercase">Simulated half-life</dt>
                <dd className="mt-1 text-sm">
                  {grow || fade ? (simulatedHalf.status === "ok" ? `${simulatedHalf.days.toFixed(1)} days` : "Not estimable") : "No scenario selected"}
                </dd>
                <dd className="text-xs text-muted">{grow || fade ? simulatedHalf.reason : "Turn on a scenario to compare. It does not edit the series."}</dd>
              </div>
            </dl>
          </Panel>
          <div className="space-y-4">
            <Panel>
              <h2 className="font-serif text-2xl">Weight assumptions</h2>
              <p className="mt-2 text-xs text-muted">Sliders change a preview. They are not a better science. Missing dimensions stay missing.</p>
              <div className="mt-4 space-y-3">
                {DIMENSIONS.map((key) => (
                  <label key={key} className="block">
                    <span className="flex justify-between font-mono text-xs text-muted">
                      <span>{key}</span>
                      <span className="tabular-nums">{Math.round(localWeights[key] * 100)}</span>
                    </span>
                    <input
                      className="w-full accent-lime"
                      type="range"
                      min={0}
                      max={50}
                      value={Math.round(localWeights[key] * 100)}
                      onChange={(event) => setLocalWeights({ ...localWeights, [key]: Number(event.target.value) / 100 })}
                    />
                  </label>
                ))}
              </div>
              <button type="button" className="mt-3 min-h-11 text-sm text-lime" onClick={() => setWeights(localWeights)}>
                Use these weights as the lab default
              </button>
              {analysis ? (
                <p className="mt-3 text-sm">
                  {analysis.opportunity.status === "scored"
                    ? `Preview score ${(analysis.opportunity.score * 100).toFixed(0)} after renormalizing over what this series can support.`
                    : analysis.opportunity.reason}
                </p>
              ) : null}
            </Panel>
            <Panel>
              <h2 className="font-serif text-2xl">Same series, other weights</h2>
              <ul className="mt-3 space-y-3 text-sm">
                {PRESETS.map((preset) => {
                  if (!selected) return null;
                  const dimensions = buildDimensions({
                    points: observedPoints,
                    uniqueSources: new Set(selected.observations.map((obs) => obs.source).filter(Boolean)).size,
                    spanDays: observedPoints.length >= 2 ? analysis?.prepared.spanDays ?? null : null,
                    behaviorOrMeaningNotes: selected.observations.filter((obs) => obs.kind !== "attention" && obs.note.trim()).length,
                    brandFitAssumption: selected.brandFit,
                    noveltyAssumption: selected.novelty,
                  });
                  const scored = opportunityScore(dimensions, preset.weights);
                  return (
                    <li key={preset.id}>
                      <span className="text-fg">{preset.label}. </span>
                      <span className="text-muted">
                        {scored.status === "scored" ? scored.score.toFixed(2) : "Not scored"}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-xs text-muted">Changing weights does not create evidence. A series that cannot support velocity still cannot support it.</p>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

function simulatePath(points: { date: string; signal: number }[], grow: boolean, fade: boolean) {
  if (!points.length || (!grow && !fade)) return [];
  const peak = Math.max(...points.map((point) => point.signal));
  let seenPeak = false;
  const mid = Math.floor(points.length / 2);
  return points.map((point, index) => {
    let signal = point.signal;
    if (grow && index >= mid) signal *= 1.25;
    if (point.signal === peak) seenPeak = true;
    if (fade && seenPeak && point.signal !== peak) signal *= 0.7;
    return { date: point.date, signal };
  });
}
