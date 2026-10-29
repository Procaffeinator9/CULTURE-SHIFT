import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CSV_TEMPLATE } from "@/lib/culture/csv";
import { useLab } from "@/lib/culture/store";
import { DEFAULT_WEIGHTS, DIMENSIONS } from "@/lib/culture/types";
import { Button, downloadText, PageHeader, Panel } from "@/components/ui";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const weights = useLab((state) => state.weights);
  const setWeights = useLab((state) => state.setWeights);
  const clearAll = useLab((state) => state.clearAll);
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        kicker="Lab / Settings"
        title="Sources, weights, and what this lab will not pretend."
        lede="The shelf is local to this browser. No social platform is connected. No key is stored in an investigation."
      />

      <div className="space-y-4">
        <Panel>
          <h2 className="font-serif text-2xl">Data sources</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>Built-in cases are research prompts. They are not a live ranking and they carry no dates.</li>
            <li>You can type observations or import a small CSV with columns date, signal, note, source, kind.</li>
            <li>Synthetic demonstration series exist only inside the Half-Life Lab, and they are labelled as constructed.</li>
            <li>External connectors: none configured. The app does not scrape TikTok, Instagram, Reddit, or search trends.</li>
          </ul>
          <Button className="mt-4" variant="ghost" onClick={() => downloadText("culture-shift-template.csv", CSV_TEMPLATE, "text/csv")}>
            Download CSV template
          </Button>
        </Panel>

        <Panel>
          <h2 className="font-serif text-2xl">Opportunity weights</h2>
          <p className="mt-2 text-sm text-muted">
            Initial design assumptions: velocity 20, persistence 20, novelty 15, resonance 15, brand fit 15, evidence 15. They are renormalized over dimensions the series can support. They are not validated weights, and the score is not a probability of success.
          </p>
          <div className="mt-4 space-y-3">
            {DIMENSIONS.map((key) => (
              <label key={key} className="block">
                <span className="flex justify-between font-mono text-xs text-muted">
                  <span>{key}</span>
                  <span className="tabular-nums">{Math.round((weights[key] ?? 0) * 100)}</span>
                </span>
                <input
                  className="w-full accent-lime"
                  type="range"
                  min={0}
                  max={50}
                  value={Math.round((weights[key] ?? 0) * 100)}
                  onChange={(event) => setWeights({ ...weights, [key]: Number(event.target.value) / 100 })}
                />
              </label>
            ))}
          </div>
          <button type="button" className="mt-3 min-h-11 text-sm text-lime" onClick={() => setWeights(DEFAULT_WEIGHTS)}>
            Reset to the initial design weights
          </button>
        </Panel>

        <Panel>
          <h2 className="font-serif text-2xl">No model in this lab</h2>
          <p className="mt-2 text-sm text-muted">
            Briefs are written by local rules from your question and the observations you add. Switching sections does not call Grok. The simulator math is separate and is never overwritten by prose.
          </p>
        </Panel>

        <Panel>
          <h2 className="font-serif text-2xl">Clear this device</h2>
          <p className="mt-2 text-sm text-muted">Deletes saved investigations and weight changes in this browser. It does not affect anyone else.</p>
          {confirm ? (
            <div className="mt-4 flex gap-2">
              <Button variant="warn" onClick={() => { clearAll(); setConfirm(false); }}>Confirm delete</Button>
              <Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button>
            </div>
          ) : (
            <Button className="mt-4" variant="ghost" onClick={() => setConfirm(true)}>Delete local investigations</Button>
          )}
        </Panel>
      </div>
    </div>
  );
}
