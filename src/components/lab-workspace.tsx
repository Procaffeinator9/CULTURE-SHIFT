import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { analyzeObservations } from "@/lib/culture/analyze";
import { buildBrief } from "@/lib/culture/brief";
import { CSV_TEMPLATE, parseObservationCsv } from "@/lib/culture/csv";
import { loadAi, useAiStatus } from "@/lib/culture/ai-settings";
import { investigationJson, investigationMarkdown } from "@/lib/culture/report";
import { askWithUserKey } from "@/lib/culture/research";
import { newId, useLab } from "@/lib/culture/store";
import { BRAND_CATEGORIES } from "@/lib/culture/sample";
import { PROMPT_VERSION } from "@/lib/culture/types";
import type { AgentRecord, EvidenceKind, Investigation, Observation, Provenance } from "@/lib/culture/types";
import { AnalysisView } from "./analysis-view";
import { BriefView } from "./brief-view";
import { Button, downloadText, Field, fieldClass, Panel, Tag } from "./ui";

type Mode = "quick" | "investigate";

export function LabWorkspace({
  mode,
  seedQuestion = "",
  sampleCaseId: sampleFromRoute = null,
  investigation = null,
}: {
  mode: Mode;
  seedQuestion?: string;
  sampleCaseId?: string | null;
  investigation?: Investigation | null;
}) {
  const hydrated = useLab((state) => state.hydrated);
  const weights = useLab((state) => state.weights);
  const draft = useLab((state) => state.draft);
  const upsert = useLab((state) => state.upsert);
  const setDraft = useLab((state) => state.setDraft);

  const seed = investigation
    ? {
        question: investigation.question,
        context: investigation.context,
        brandCategory: investigation.brandCategory,
        audience: investigation.audience,
        sampleCaseId: investigation.sampleCaseId,
      }
    : draft && draft.question === seedQuestion
      ? draft
      : {
          question: seedQuestion,
          context: "",
          brandCategory: "Unspecified",
          audience: "",
          sampleCaseId: sampleFromRoute,
        };

  const [question, setQuestion] = useState(seed.question);
  const [context, setContext] = useState(seed.context);
  const [brandCategory, setBrandCategory] = useState(seed.brandCategory || "Unspecified");
  const [audience, setAudience] = useState(seed.audience);
  const [sampleCaseId] = useState(sampleFromRoute || seed.sampleCaseId);
  const [observations, setObservations] = useState<Observation[]>(investigation?.observations ?? []);
  const [brandFit, setBrandFit] = useState<number | null>(investigation?.brandFitAssumption ?? null);
  const [novelty, setNovelty] = useState<number | null>(investigation?.noveltyAssumption ?? null);
  const [agent, setAgent] = useState<AgentRecord | null>(investigation?.agent ?? null);
  const [savedId, setSavedId] = useState<string | null>(investigation?.id ?? null);
  const [createdAt] = useState(investigation?.createdAt ?? new Date().toISOString());
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const model = useAiStatus();
  const [showObservations, setShowObservations] = useState(mode === "investigate" || (investigation?.observations.length ?? 0) > 0);
  const [csvNotes, setCsvNotes] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [signal, setSignal] = useState("");
  const [note, setNote] = useState("");
  const [source, setSource] = useState("");
  const [kind, setKind] = useState<EvidenceKind>("attention");

  const brief = useMemo(
    () =>
      buildBrief({
        question: question || "Untitled question",
        context,
        brandCategory,
        audience,
        observations,
      }),
    [question, context, brandCategory, audience, observations],
  );
  const analysis = useMemo(
    () => analyzeObservations(observations, weights, { brandFit, novelty }),
    [observations, weights, brandFit, novelty],
  );

  useEffect(() => {
    if (investigation) return;
    const trimmed = question.trim();
    if (trimmed.length < 3) return;
    setDraft({ question: trimmed, context, brandCategory, audience, sampleCaseId });
  }, [audience, brandCategory, context, investigation, question, sampleCaseId, setDraft]);

  function currentRecord(id: string): Investigation {
    return {
      id,
      title: question.trim() || "Untitled investigation",
      question: question.trim(),
      context,
      brandCategory,
      audience,
      sampleCaseId,
      createdAt,
      updatedAt: new Date().toISOString(),
      observations,
      brandFitAssumption: brandFit,
      noveltyAssumption: novelty,
      weights,
      agent,
      simulation: investigation?.simulation ?? null,
    };
  }

  function save() {
    if (!question.trim()) {
      setStatus("Write a question before saving.");
      return;
    }
    const id = savedId ?? newId("inv");
    upsert(currentRecord(id));
    setSavedId(id);
    setStatus("Saved on this device.");
  }

  function addObservation(provenance: Provenance) {
    if (!date) {
      setStatus("A date is required. A blank signal is allowed and is not stored as zero.");
      return;
    }
    let numeric: number | null = null;
    if (signal.trim() !== "") {
      numeric = Number(signal);
      if (!Number.isFinite(numeric)) {
        setStatus("Signal must be a number or left blank.");
        return;
      }
    }
    const row: Observation = {
      id: newId("obs"),
      date,
      signal: numeric,
      note: note.trim(),
      source: source.trim() || "user",
      kind,
      provenance,
    };
    setObservations((curr) => [...curr, row]);
    setSignal("");
    setNote("");
    setStatus("Observation added. It is labelled as yours, not as outside research.");
  }

  function onCsv(file: File) {
    void file.text().then((text) => {
      const parsed = parseObservationCsv(text);
      setCsvNotes(parsed.errors);
      if (!parsed.rows.length) {
        setStatus(parsed.errors[0] ?? "No rows imported.");
        return;
      }
      setObservations((curr) => [
        ...curr,
        ...parsed.rows.map((row) => ({ ...row, id: newId("obs") })),
      ]);
      setShowObservations(true);
      setStatus(`Imported ${parsed.rows.length} row${parsed.rows.length === 1 ? "" : "s"}.`);
    });
  }

  async function askModel() {
    if (!question.trim()) {
      setStatus("Write a question first.");
      return;
    }
    const ai = loadAi();
    if (!ai) {
      setStatus("No key on this device. Add one in Settings. The local brief is unchanged.");
      return;
    }
    setBusy(true);
    setStatus("Asking your model. One request. The calculator is not involved.");
    try {
      const result = await askWithUserKey({
        data: {
          apiKey: ai.apiKey,
          baseUrl: ai.baseUrl,
          model: ai.model,
          question: question.trim(),
          context,
          evidence: observations.map((obs) => ({
            id: obs.id,
            date: obs.date,
            signal: obs.signal,
            note: obs.note,
            source: obs.source,
            kind: obs.kind,
          })),
        },
      });
      if (!result.ok) {
        setStatus(result.message);
        return;
      }
      setAgent({
        source: "user-key",
        model: result.model,
        promptVersion: result.promptVersion || PROMPT_VERSION,
        at: new Date().toISOString(),
        warnings: result.warnings,
        output: result.output,
      });
      setStatus("Model text is below. It is not evidence, and it does not change the score.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The model request failed.");
    } finally {
      setBusy(false);
    }
  }

  function exportMarkdown() {
    const record = currentRecord(savedId ?? "unsaved");
    const markdown = investigationMarkdown(record, brief, analysis, new Date().toISOString());
    downloadText("culture-shift-brief.md", markdown, "text/markdown");
  }

  function exportJson() {
    const record = currentRecord(savedId ?? "unsaved");
    const payload = investigationJson(record, brief, analysis, new Date().toISOString());
    downloadText("culture-shift-brief.json", JSON.stringify(payload, null, 2), "application/json");
  }

  async function copyBrief() {
    const record = currentRecord(savedId ?? "unsaved");
    const markdown = investigationMarkdown(record, brief, analysis, new Date().toISOString());
    try {
      await navigator.clipboard.writeText(markdown);
      setStatus("Copied the brief.");
    } catch {
      setStatus("Clipboard was blocked. Use the Markdown export instead.");
    }
  }

  const synthetic = observations.some((obs) => obs.provenance === "synthetic-demonstration");

  return (
    <div className="mx-auto max-w-6xl">
      <p className="font-mono text-xs tracking-widest text-lime uppercase">
        {mode === "investigate" ? "Lab / Investigate" : "Lab / Quick scan"}
      </p>
      <h1 className="mt-2 max-w-3xl font-serif text-4xl text-fg md:text-5xl">
        {question.trim() || "Name the signal"}
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        A one-line question is enough. The brief is a hypothesis map until you add observations.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
        <Field label="Research question">
          <input className={fieldClass} value={question} onChange={(event) => setQuestion(event.target.value)} />
        </Field>
        <Field label="Brand category" hint="Optional. Constrains ideas only.">
          <select className={fieldClass} value={brandCategory} onChange={(event) => setBrandCategory(event.target.value)}>
            {BRAND_CATEGORIES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
      </div>

      <details className="mt-4 bg-panel p-4 shadow-card">
        <summary className="min-h-11 cursor-pointer text-sm text-muted">Advanced context, audience, and assumptions</summary>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Context you already have">
            <textarea className={`${fieldClass} min-h-24 py-2`} value={context} onChange={(event) => setContext(event.target.value)} />
          </Field>
          <Field label="Audience note" hint="Your assumption, not a detected segment.">
            <input className={fieldClass} value={audience} onChange={(event) => setAudience(event.target.value)} />
          </Field>
          <Assumption
            label="Novelty assumption"
            value={novelty}
            onChange={setNovelty}
            hint="Only if you want this term in the score. It is not measured."
          />
          <Assumption
            label="Brand-fit assumption"
            value={brandFit}
            onChange={setBrandFit}
            hint="Your judgement, labelled as such. Leave off to keep fit unscored."
          />
        </div>
      </details>

      {synthetic ? (
        <p className="mt-4 text-sm text-warn">
          This file includes synthetic demonstration rows. They are not real-world evidence.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={save} disabled={!hydrated}>
          {hydrated ? "Save investigation" : "Opening local file…"}
        </Button>
        <Button variant="ghost" onClick={() => void copyBrief()}>
          Copy
        </Button>
        <Button variant="ghost" onClick={exportMarkdown}>
          Export Markdown
        </Button>
        <Button variant="ghost" onClick={exportJson}>
          Export JSON
        </Button>
        {model.ready ? (
          <Button variant="violet" onClick={() => void askModel()} disabled={busy}>
            {busy ? "Asking your model…" : `Ask ${model.label}`}
          </Button>
        ) : (
          <Link
            to="/settings"
            className="inline-flex min-h-11 items-center border border-line px-4 text-sm text-violet transition-colors duration-200 hover:border-violet"
          >
            Add a model key
          </Link>
        )}
        <Link
          to="/simulator"
          search={{ q: question }}
          className="inline-flex min-h-11 items-center px-4 text-sm text-fg shadow-card"
        >
          Open in simulator
        </Link>
      </div>
      <p className="mt-3 min-h-5 text-sm text-muted" role="status">
        {status}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <BriefView brief={brief} />
        <div className="space-y-4">
          <AnalysisView analysis={analysis} />
          <p className="text-xs text-muted">
            Score weights are the lab defaults. Change them in Settings. They are design assumptions.
          </p>
        </div>
      </div>

      {agent ? (
        <div className="page-in">
          <ModelReading agent={agent} />
        </div>
      ) : null}

      <div className="mt-6">
        <button
          type="button"
          className="min-h-11 text-sm text-lime"
          aria-expanded={showObservations}
          onClick={() => setShowObservations((value) => !value)}
        >
          {showObservations ? "Hide observations" : "Add observations"}
        </button>
        {showObservations ? (
          <Panel className="mt-3">
            <Tag kind="supplied">Your evidence</Tag>
            <p className="mt-2 text-sm text-muted">
              Blank signal is stored as missing, never as zero. Duplicate dates keep the latest number when scored.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-5">
              <Field label="Date">
                <input className={fieldClass} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </Field>
              <Field label="Signal">
                <input className={fieldClass} inputMode="decimal" value={signal} onChange={(event) => setSignal(event.target.value)} placeholder="Optional" />
              </Field>
              <Field label="Kind">
                <select className={fieldClass} value={kind} onChange={(event) => setKind(event.target.value as EvidenceKind)}>
                  <option value="attention">attention</option>
                  <option value="behavior">behavior</option>
                  <option value="meaning">meaning</option>
                </select>
              </Field>
              <Field label="Source">
                <input className={fieldClass} value={source} onChange={(event) => setSource(event.target.value)} placeholder="Where it came from" />
              </Field>
              <Field label="Note">
                <input className={fieldClass} value={note} onChange={(event) => setNote(event.target.value)} />
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => addObservation("user")}>Add observation</Button>
              <Button variant="ghost" onClick={() => downloadText("culture-shift-template.csv", CSV_TEMPLATE, "text/csv")}>
                CSV template
              </Button>
              <label className="inline-flex min-h-11 cursor-pointer items-center px-4 text-sm text-fg shadow-card">
                Import CSV
                <input
                  className="sr-only"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onCsv(file);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
            {csvNotes.length ? (
              <ul className="mt-3 space-y-1 text-xs text-warn">
                {csvNotes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
            {observations.length ? (
              <ul className="mt-4 divide-y divide-line">
                {observations.map((obs) => (
                  <li key={obs.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
                    <div>
                      <p className="font-mono text-xs text-lime">
                        {obs.date} · {obs.signal == null ? "no signal" : obs.signal} · {obs.kind} · {obs.provenance}
                      </p>
                      <p className="mt-1">{obs.note || "No note."}</p>
                      <p className="text-xs text-muted">{obs.source}</p>
                    </div>
                    <button
                      type="button"
                      className="min-h-11 text-xs text-muted"
                      onClick={() => setObservations((curr) => curr.filter((item) => item.id !== obs.id))}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted">No observations yet. The brief above is still usable.</p>
            )}
          </Panel>
        ) : null}
      </div>
    </div>
  );
}

function ModelReading({ agent }: { agent: AgentRecord }) {
  const a = agent.output.anthropologist;
  const s = agent.output.skeptic;
  const g = agent.output.strategist;
  return (
    <div className="mt-6">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Tag kind="hypothesis">Your model · {agent.model}</Tag>
        <span className="text-xs text-muted">Not evidence. Not used by the score or the simulator.</span>
      </div>
      {agent.warnings.length ? <p className="mb-3 text-xs text-warn">{agent.warnings[0]}</p> : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel>
          <h3 className="font-serif text-xl">Anthropologist</h3>
          <ul className="mt-3 space-y-3 text-sm">
            {a.hypotheses.map((item) => (
              <li key={item.claim}>
                <p>{item.claim}</p>
                <p className="mt-1 font-mono text-xs text-muted">
                  Evidence: {item.evidenceIds.length ? item.evidenceIds.join(", ") : "none cited"}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <h3 className="font-serif text-xl">Skeptic</h3>
          <p className="mt-2 text-sm">{s.insufficient ? "Evidence is insufficient." : "The skeptic did not call the file insufficient."}</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {[...s.weakAssumptions, ...s.missingEvidence, ...s.whatWouldChange].filter(Boolean).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <h3 className="font-serif text-xl">Brand strategist</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>{g.concept}</li>
            <li className="text-muted">{g.experiment}</li>
            <li className="text-muted">{g.budgetAssumption}</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function Assumption({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const on = value != null;
  return (
    <Field label={label} hint={hint}>
      <div className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          checked={on}
          onChange={(event) => onChange(event.target.checked ? 0.5 : null)}
          aria-label={`Include ${label}`}
        />
        <input
          className="w-full accent-lime disabled:opacity-40"
          type="range"
          min={0}
          max={100}
          disabled={!on}
          value={Math.round((value ?? 0.5) * 100)}
          onChange={(event) => onChange(Number(event.target.value) / 100)}
        />
        <span className="w-8 font-mono text-xs tabular-nums">{on ? Math.round((value ?? 0) * 100) : "—"}</span>
      </div>
    </Field>
  );
}
