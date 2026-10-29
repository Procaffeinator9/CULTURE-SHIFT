import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { newId, useLab } from "@/lib/culture/store";
import {
  ILLUSTRATIVE_DEFAULTS,
  money,
  sensitivity,
  simulateAll,
  unitsLabel,
  worthwhile,
} from "@/lib/culture/simulator";
import type { Investigation, SimInput } from "@/lib/culture/types";
import { DEFAULT_WEIGHTS } from "@/lib/culture/types";
import { Button, Field, fieldClass, PageHeader, Panel, Tag } from "@/components/ui";

type SimSearch = { q: string };

export const Route = createFileRoute("/simulator")({
  validateSearch: (search: Record<string, unknown>): SimSearch => ({
    q: typeof search.q === "string" ? search.q.slice(0, 200) : "",
  }),
  component: SimulatorPage,
});

function SimulatorPage() {
  const { q } = Route.useSearch();
  const hydrated = useLab((state) => state.hydrated);
  const upsert = useLab((state) => state.upsert);
  const investigations = useLab((state) => state.investigations);
  const [input, setInput] = useState<SimInput>({
    ...ILLUSTRATIVE_DEFAULTS,
    concept: q || ILLUSTRATIVE_DEFAULTS.concept,
  });
  const [previous, setPrevious] = useState<SimInput | null>(null);
  const [target, setTarget] = useState(0);
  const [attach, setAttach] = useState(investigations[0]?.id ?? "new");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!q) return;
    setInput((current) => (current.concept === q ? current : { ...current, concept: q }));
  }, [q]);

  const results = useMemo(() => simulateAll(input), [input]);
  const shocks = useMemo(() => sensitivity(input), [input]);
  const judgement = useMemo(() => worthwhile(input, target), [input, target]);
  const baseline = results.baseline;
  const untouched =
    input.price === ILLUSTRATIVE_DEFAULTS.price &&
    input.variableCost === ILLUSTRATIVE_DEFAULTS.variableCost &&
    input.marketingBudget === ILLUSTRATIVE_DEFAULTS.marketingBudget &&
    input.otherFixed === ILLUSTRATIVE_DEFAULTS.otherFixed &&
    input.audienceReached === ILLUSTRATIVE_DEFAULTS.audienceReached &&
    input.conversionRate === ILLUSTRATIVE_DEFAULTS.conversionRate;

  function patch<K extends keyof SimInput>(key: K, value: SimInput[K]) {
    setInput((current) => {
      setPrevious(current);
      return { ...current, [key]: value };
    });
  }

  function saveScenario() {
    if (!hydrated) return;
    const now = new Date().toISOString();
    const simulation = {
      savedAt: now,
      input,
      note: "Hypothetical. Units are assumed from reach × conversion × scenario factor, not from observed demand.",
    };
    if (attach === "new") {
      const id = newId("inv");
      const record: Investigation = {
        id,
        title: input.concept || q || "Simulator scenario",
        question: q || input.concept || "Untitled simulation",
        context: "",
        brandCategory: "Unspecified",
        audience: "",
        sampleCaseId: null,
        createdAt: now,
        updatedAt: now,
        observations: [],
        brandFitAssumption: null,
        noveltyAssumption: null,
        weights: DEFAULT_WEIGHTS,
        agent: null,
        simulation,
      };
      upsert(record);
      setAttach(id);
      setStatus("Saved as a new investigation on this device.");
      return;
    }
    const existing = investigations.find((item) => item.id === attach);
    if (!existing) {
      setStatus("That investigation is no longer on this device.");
      return;
    }
    upsert({ ...existing, updatedAt: now, simulation });
    setStatus("Scenario attached to the investigation. It is still hypothetical.");
  }

  const changes: string[] = [];
  if (previous) {
    const keys: (keyof SimInput)[] = ["concept", "price", "variableCost", "marketingBudget", "otherFixed", "audienceReached", "conversionRate"];
    for (const key of keys) {
      if (previous[key] !== input[key]) changes.push(`${key}: ${String(previous[key])} → ${String(input[key])}`);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        kicker="Lab / Simulator"
        title="A fictional test, with the arithmetic showing."
        lede="Every output is hypothetical. The model does not write these numbers. Defaults are illustrative, not market data."
      />
      {untouched ? (
        <p className="mb-4 text-sm text-warn">Illustrative defaults are loaded. They are not observations.</p>
      ) : null}
      {!baseline.ok ? (
        <ul className="mb-4 space-y-1 text-sm text-warn">
          {baseline.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Panel>
          <Tag kind="assumption">Assumptions</Tag>
          <div className="mt-4 space-y-4">
            <Field label="Concept">
              <input className={fieldClass} value={input.concept} onChange={(event) => patch("concept", event.target.value)} />
            </Field>
            <NumberField label="Price" value={input.price} onChange={(value) => patch("price", value)} />
            <NumberField label="Variable cost / unit" value={input.variableCost} onChange={(value) => patch("variableCost", value)} />
            <NumberField label="Marketing budget" value={input.marketingBudget} onChange={(value) => patch("marketingBudget", value)} />
            <NumberField label="Other fixed costs" value={input.otherFixed} onChange={(value) => patch("otherFixed", value)} />
            <NumberField label="Audience reached" value={input.audienceReached} onChange={(value) => patch("audienceReached", value)} hint="Assumed reach, not a measured audience." />
            <Field label="Conversion rate %" hint="Typed as a percent. Stored as a fraction. Assumed, not observed.">
              <input
                className={fieldClass}
                inputMode="decimal"
                value={Number.isFinite(input.conversionRate) ? String(Math.round(input.conversionRate * 1000) / 10) : ""}
                onChange={(event) => patch("conversionRate", Number(event.target.value) / 100)}
              />
            </Field>
            <Field label="Profit target" hint="Your bar for “worthwhile”. Default is zero.">
              <input className={fieldClass} inputMode="decimal" value={String(target)} onChange={(event) => setTarget(Number(event.target.value))} />
            </Field>
          </div>
        </Panel>

        <div>
          <div className="grid gap-3 md:grid-cols-3">
            {(["pessimistic", "baseline", "optimistic"] as const).map((name) => {
              const result = results[name];
              return (
                <Panel key={name}>
                  <Tag kind="simulated">{name}</Tag>
                  {result.ok ? (
                    <dl className="mt-3 space-y-2 font-mono text-xs">
                      <Row k="Factor" v={String(result.factor)} />
                      <Row k="Units" v={unitsLabel(result.units)} />
                      <Row k="Revenue" v={money(result.revenue)} />
                      <Row k="Variable cost" v={money(result.variableTotal)} />
                      <Row k="Contribution / unit" v={money(result.contributionPerUnit)} />
                      <Row k="Contribution" v={money(result.contributionTotal)} />
                      <Row k="Fixed" v={money(result.fixed)} />
                      <Row k="Profit" v={money(result.profit)} />
                      <Row k="Break-even units" v={result.breakEvenUnits == null ? "Not defined" : unitsLabel(result.breakEvenUnits)} />
                      <Row k="Cost / acquired" v={result.cac == null ? "Not defined" : money(result.cac)} />
                    </dl>
                  ) : (
                    <p className="mt-3 text-sm text-warn">Invalid inputs.</p>
                  )}
                </Panel>
              );
            })}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Panel>
              <h2 className="font-serif text-2xl">What changed</h2>
              {changes.length ? (
                <ul className="mt-3 space-y-1 text-sm">
                  {changes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted">Edit an assumption. The previous value is kept for one step.</p>
              )}
              <h3 className="mt-5 font-mono text-xs tracking-widest text-muted uppercase">What moves profit most</h3>
              {shocks[0] ? (
                <p className="mt-2 text-sm">
                  {shocks[0].driver}. A 10% relative shock changes baseline profit by {money(shocks[0].profitDelta)}. {shocks[0].note}
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted">Sensitivity waits for valid inputs.</p>
              )}
              <ul className="mt-3 space-y-1 font-mono text-xs text-muted">
                {shocks.map((row) => (
                  <li key={row.driver}>
                    {row.driver}: {money(row.profitDelta)}
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel>
              <h2 className="font-serif text-2xl">Keep or stop</h2>
              <p className="mt-3 text-sm">{judgement.worthReason}</p>
              <p className="mt-2 text-sm text-warn">{judgement.stopReason}</p>
              <p className="mt-4 text-xs text-muted">
                Stop rules: contribution per unit is not positive, or the pessimistic loss is larger than the marketing budget. Both are design choices.
              </p>
              {baseline.ok ? (
                <ul className="mt-4 space-y-2 text-xs text-muted">
                  {baseline.assumptions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </Panel>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label>
              <span className="mb-1 block font-mono text-xs tracking-widest text-muted uppercase">Attach to</span>
              <select className={fieldClass} value={attach} onChange={(event) => setAttach(event.target.value)}>
                <option value="new">New investigation</option>
                {investigations.map((item) => (
                  <option key={item.id} value={item.id}>{item.title}</option>
                ))}
              </select>
            </label>
            <Button onClick={saveScenario} disabled={!hydrated}>Save scenario</Button>
          </div>
          <p className="mt-2 text-sm text-muted" role="status">{status}</p>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line py-1">
      <dt className="text-muted">{k}</dt>
      <dd className="text-fg tabular-nums">{v}</dd>
    </div>
  );
}

function NumberField({
  label,
  value,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  hint?: string;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <input className={fieldClass} inputMode="decimal" value={Number.isFinite(value) ? String(value) : ""} onChange={(event) => onChange(Number(event.target.value))} />
    </Field>
  );
}
