import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useLab } from "@/lib/culture/store";
import { BRAND_CATEGORIES, EXAMPLE_PROMPTS } from "@/lib/culture/sample";
import { Button, fieldClass } from "@/components/ui";

export const Route = createFileRoute("/")({ component: Home });

type Mode = "quick" | "investigate" | "simulate";

function Home() {
  const navigate = useNavigate();
  const setDraft = useLab((state) => state.setDraft);
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState<Mode>("quick");
  const [context, setContext] = useState("");
  const [brandCategory, setBrandCategory] = useState("Unspecified");
  const [audience, setAudience] = useState("");
  const [error, setError] = useState("");

  function begin(nextQuestion = question) {
    const trimmed = nextQuestion.trim();
    if (trimmed.length < 3) {
      setError("Write a question of at least a few words.");
      return;
    }
    setDraft({ question: trimmed, context, brandCategory, audience, sampleCaseId: null });
    if (mode === "simulate") {
      void navigate({ to: "/simulator", search: { q: trimmed } });
      return;
    }
    void navigate({
      to: "/scan",
      search: { q: trimmed, mode: mode === "investigate" ? "investigate" : "quick", caseId: "" },
    });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <p className="font-mono text-xs tracking-widest text-lime uppercase">Lab / 00</p>
      <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-none text-fg md:text-7xl">
        WHAT’S HAPPENING IN CULTURE?
      </h1>
      <p className="mt-5 max-w-xl text-lg text-muted">Explore the signal. Challenge the hype. Find the opportunity.</p>

      <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Mode">
        {(
          [
            ["quick", "Quick scan", "A fast hypothesis map from one sentence."],
            ["investigate", "Investigate", "Add notes or a small CSV before you conclude."],
            ["simulate", "Simulate", "Price a fictional test. Numbers stay hypothetical."],
          ] as const
        ).map(([id, label, hint]) => (
          <button
            key={id}
            type="button"
            aria-pressed={mode === id}
            onClick={() => {
              setMode(id);
              setDraft({ question, context, brandCategory, audience, sampleCaseId: null });
            }}
            className={`min-h-11 px-4 text-left text-sm ${mode === id ? "bg-lime text-ink" : "bg-panel text-muted shadow-card"}`}
          >
            <span className="block font-medium tracking-wide uppercase">{label}</span>
            <span className={`mt-0.5 block text-xs ${mode === id ? "text-ink" : "text-muted"}`}>{hint}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 max-w-xl text-sm text-muted">
        {mode === "quick"
          ? "Begin opens a fast brief. The section buttons keep this question, so Radar, Scan, and the simulator stay on the same signal."
          : mode === "investigate"
            ? "Begin opens the brief with the observation table open. Other sections still show this question."
            : "Begin opens the calculator. The concept is this question. The numbers stay hypothetical."}
      </p>

      <form
        className="mt-6"
        onSubmit={(event) => {
          event.preventDefault();
          begin();
        }}
      >
        <label className="block">
          <span className="sr-only">Cultural question</span>
          <div className="flex flex-col gap-2 bg-panel p-2 shadow-card sm:flex-row">
            <input
              className="min-h-14 flex-1 bg-transparent px-3 text-base text-fg placeholder:text-muted"
              placeholder="Try: Why is Gen Z obsessed with miniature desk pets?"
              value={question}
              onChange={(event) => {
                const next = event.target.value;
                setQuestion(next);
                setError("");
                setDraft({ question: next, context, brandCategory, audience, sampleCaseId: null });
              }}
            />
            <Button type="submit" className="min-h-14 px-5">
              Begin <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </label>
        {error ? <p className="mt-2 text-sm text-warn">{error}</p> : null}
      </form>

      <div className="mt-8">
        <h2 className="font-mono text-xs tracking-widest text-muted uppercase">Example questions, not trend claims</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((prompt) => (
            <li key={prompt}>
              <button
                type="button"
                className="min-h-11 bg-panel-2 px-3 text-left text-sm text-fg shadow-card hover:shadow-card-hover"
                onClick={() => begin(prompt)}
              >
                {prompt}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <details className="mt-8 bg-panel p-4 shadow-card">
        <summary className="min-h-11 cursor-pointer text-sm text-muted">Advanced settings</summary>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-1 block font-mono text-xs tracking-widest text-muted uppercase">Context</span>
            <textarea className={`${fieldClass} min-h-24 py-2`} value={context} onChange={(event) => setContext(event.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block font-mono text-xs tracking-widest text-muted uppercase">Brand category</span>
            <select className={fieldClass} value={brandCategory} onChange={(event) => setBrandCategory(event.target.value)}>
              {BRAND_CATEGORIES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block font-mono text-xs tracking-widest text-muted uppercase">Audience note</span>
            <input className={fieldClass} value={audience} onChange={(event) => setAudience(event.target.value)} />
          </label>
        </div>
      </details>
    </div>
  );
}
