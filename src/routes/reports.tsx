import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { analyzeObservations } from "@/lib/culture/analyze";
import { buildBrief } from "@/lib/culture/brief";
import { investigationJson, investigationMarkdown } from "@/lib/culture/report";
import { useLab } from "@/lib/culture/store";
import { Button, downloadText, fieldClass, PageHeader } from "@/components/ui";

export const Route = createFileRoute("/reports")({ component: ReportsPage });

function ReportsPage() {
  const hydrated = useLab((state) => state.hydrated);
  const investigations = useLab((state) => state.investigations);
  const [id, setId] = useState("");
  const selected = investigations.find((item) => item.id === id) ?? null;
  const brief = selected
    ? buildBrief({
        question: selected.question,
        context: selected.context,
        brandCategory: selected.brandCategory,
        audience: selected.audience,
        observations: selected.observations,
      })
    : null;
  const analysis = selected
    ? analyzeObservations(selected.observations, selected.weights, {
        brandFit: selected.brandFitAssumption,
        novelty: selected.noveltyAssumption,
      })
    : null;
  const markdown = selected && brief && analysis ? investigationMarkdown(selected, brief, analysis, new Date().toISOString()) : "";

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        kicker="Lab / Reports"
        title="A brief you can hand to someone."
        lede="Markdown and JSON, generated when you export. Facts, calculations, hypotheses, and simulations stay labelled. No market statistics are added on the way out."
      />
      {!hydrated ? <p className="text-sm text-muted">Opening local files…</p> : null}
      {hydrated && !investigations.length ? (
        <p className="text-sm text-muted">Save an investigation first. There is nothing to export.</p>
      ) : null}
      {investigations.length ? (
        <label className="block max-w-md">
          <span className="mb-1 block font-mono text-xs tracking-widest text-muted uppercase">Investigation</span>
          <select className={fieldClass} value={id} onChange={(event) => setId(event.target.value)}>
            <option value="">Choose one</option>
            {investigations.map((item) => (
              <option key={item.id} value={item.id}>{item.title}</option>
            ))}
          </select>
        </label>
      ) : null}
      {selected && brief && analysis ? (
        <div className="mt-6">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => downloadText(`${slug(selected.title)}.md`, markdown, "text/markdown")}>Download Markdown</Button>
            <Button
              variant="ghost"
              onClick={() =>
                downloadText(
                  `${slug(selected.title)}.json`,
                  JSON.stringify(investigationJson(selected, brief, analysis, new Date().toISOString()), null, 2),
                  "application/json",
                )
              }
            >
              Download JSON
            </Button>
          </div>
          <pre className="mt-4 max-h-[32rem] overflow-auto bg-panel p-4 font-mono text-xs leading-relaxed text-fg shadow-card">{markdown}</pre>
        </div>
      ) : null}
    </div>
  );
}

function slug(value: string): string {
  const clean = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return clean || "culture-shift-brief";
}
