import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { analyzeObservations } from "@/lib/culture/analyze";
import { useLab } from "@/lib/culture/store";
import { SAMPLE_CASES, type SampleCase } from "@/lib/culture/sample";
import { DEFAULT_WEIGHTS } from "@/lib/culture/types";
import { RadarPlot } from "@/components/radar-plot";
import { PageHeader, Panel, Tag, fieldClass } from "@/components/ui";

export const Route = createFileRoute("/radar")({ component: RadarPage });

const CATEGORIES = ["All", "Novelty", "Nostalgia", "Aesthetics", "Humor", "Community", "Friction"] as const;

function RadarPage() {
  const investigations = useLab((state) => state.investigations);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [lifecycle, setLifecycle] = useState("Any");
  const [evidence, setEvidence] = useState("Any");
  const [brand, setBrand] = useState("Any");
  const [activeId, setActiveId] = useState(SAMPLE_CASES[0]?.id ?? "");

  const brands = ["Any", ...new Set(SAMPLE_CASES.flatMap((item) => item.brandAngles))];

  const enriched = useMemo(() => {
    return SAMPLE_CASES.map((item) => {
      const linked = investigations.filter((inv) => inv.sampleCaseId === item.id);
      const withNumbers = linked.filter((inv) => inv.observations.some((obs) => obs.signal != null));
      const newest = withNumbers[0];
      const analysis = newest
        ? analyzeObservations(newest.observations, newest.weights ?? DEFAULT_WEIGHTS, {
            brandFit: newest.brandFitAssumption,
            novelty: newest.noveltyAssumption,
          })
        : null;
      return { item, linked: linked.length, analysis };
    });
  }, [investigations]);

  const filtered = enriched.filter(({ item, analysis }) => {
    const haystack = `${item.name} ${item.question} ${item.description}`.toLowerCase();
    if (query && !haystack.includes(query.toLowerCase())) return false;
    if (category !== "All" && item.category !== category) return false;
    if (brand !== "Any" && !item.brandAngles.includes(brand)) return false;
    if (evidence === "None" && analysis && analysis.numericObservations > 0) return false;
    if (evidence === "Saved" && !(analysis && analysis.numericObservations > 0)) return false;
    if (lifecycle !== "Any") {
      const label = analysis?.lifecycle.label ?? "Not classified";
      if (label !== lifecycle) return false;
    }
    return true;
  });

  const active = filtered.find((row) => row.item.id === activeId) ?? filtered[0] ?? null;
  const coverage: Record<string, number | null> = {};
  for (const row of enriched) {
    const evidenceScore = row.analysis?.dimensions.find((dimension) => dimension.key === "evidence")?.score ?? null;
    coverage[row.item.id] = row.analysis ? evidenceScore : null;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        kicker="Lab / Radar"
        title="Cases to investigate, not a live ranking."
        lede="These eight prompts are a curated shelf. Position shows category, and distance from the center shows coverage only when you have saved a series. Nothing here is a current internet chart."
      />

      <div className="grid gap-3 md:grid-cols-4">
        <label className="md:col-span-2">
          <span className="sr-only">Search cases</span>
          <input
            className={fieldClass}
            placeholder="Search the shelf"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <Select label="Category" value={category} options={[...CATEGORIES]} onChange={setCategory} />
        <Select
          label="Lifecycle"
          value={lifecycle}
          options={["Any", "Not classified", "Rising in this series", "Holding near peak in this series", "Post-peak decline in this series", "Mixed in this series"]}
          onChange={setLifecycle}
        />
        <Select label="Evidence" value={evidence} options={["Any", "None", "Saved"]} onChange={setEvidence} />
        <Select label="Brand angle" value={brand} options={brands} onChange={setBrand} />
      </div>
      <p className="mt-3 text-xs text-muted">
        Time period is not a filter on this shelf. The sample cases have no dates. Dates appear only after you save observations, and then only inside that investigation.
      </p>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel>
          <RadarPlot
            cases={filtered.map((row) => row.item)}
            activeId={active?.item.id ?? null}
            coverage={coverage}
            onSelect={setActiveId}
          />
          <p className="mt-2 text-center font-mono text-xs text-muted">
            Outer ring = no saved series. Closer to the center = higher evidence coverage on a file you saved, not a more important trend.
          </p>
        </Panel>
        {active ? <CaseCard item={active.item} numeric={active.analysis?.numericObservations ?? 0} lifecycle={active.analysis?.lifecycle.label ?? "Not classified"} /> : null}
      </div>

      <ul className="mt-6 divide-y divide-line border-t border-line">
        {filtered.map(({ item, analysis }) => (
          <li key={item.id}>
            <button
              type="button"
              className={`flex min-h-16 w-full items-start justify-between gap-4 border-l-2 px-3 py-4 text-left ${
                item.id === active?.item.id ? "border-lime bg-panel-2" : "border-transparent"
              }`}
              onClick={() => setActiveId(item.id)}
            >
              <span>
                <span className="block text-fg">{item.name}</span>
                <span className="mt-1 block text-sm text-muted">{item.question}</span>
              </span>
              <span className="shrink-0 text-right">
                <Tag kind="context">{item.category}</Tag>
                <span className="mt-1 block font-mono text-xs text-muted">
                  {analysis && analysis.numericObservations > 0 ? `${analysis.numericObservations} saved signals` : "No series"}
                </span>
              </span>
            </button>
          </li>
        ))}
        {!filtered.length ? <li className="py-8 text-sm text-muted">No cases match these filters.</li> : null}
      </ul>
    </div>
  );
}

function CaseCard({ item, numeric, lifecycle }: { item: SampleCase; numeric: number; lifecycle: string }) {
  return (
    <Panel>
      <Tag kind="context">{item.category}</Tag>
      <h2 className="mt-2 font-serif text-3xl">{item.name}</h2>
      <p className="mt-3 text-sm">{item.description}</p>
      <p className="mt-3 text-sm text-muted">{item.question}</p>
      <p className="mt-3 font-mono text-xs text-muted">
        Lifecycle: {lifecycle}. Numeric observations on a linked file: {numeric}. Opportunity is not shown here unless you open the investigation.
      </p>
      <p className="mt-2 text-xs text-muted">Brand angles to consider, not a fit score: {item.brandAngles.join(", ")}.</p>
      <Link
        to="/scan"
        search={{ q: item.question, mode: "quick", caseId: item.id }}
        className="mt-5 inline-flex min-h-11 items-center bg-lime px-4 text-sm font-medium text-ink"
      >
        Investigate this question
      </Link>
    </Panel>
  );
}

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select className={fieldClass} value={value} aria-label={label} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
