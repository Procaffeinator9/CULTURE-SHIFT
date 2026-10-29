import type { AgentOutput, Brief } from "./types.ts";
import { PROMPT_VERSION } from "./types.ts";

export { PROMPT_VERSION };

/** Deterministic stand-in. Not a language model. Uses only the brief and supplied evidence ids. */
export function fallbackAgents(brief: Brief, evidenceIds: string[]): AgentOutput {
  const insufficient = evidenceIds.length === 0;
  const topHypothesis = brief.resonance.find((line) => line.kind === "hypothesis")?.text ?? brief.snapshot[0]?.text ?? brief.question;
  return {
    anthropologist: {
      hypotheses: [
        {
          claim: topHypothesis,
          evidenceIds: evidenceIds.slice(0, 3),
          uncertainty: insufficient ? "high" : "medium",
        },
      ],
      alternatives: brief.alternatives.map((line) => line.text).slice(0, 4),
      nextObservation: brief.missing[0] ?? "Record the same signal on another date.",
    },
    skeptic: {
      insufficient,
      weakAssumptions: [
        "Interpretive frames fired from keywords in the question. Keyword presence is not evidence of a trend.",
        ...(brief.framesFired.length ? [`Frames used: ${brief.framesFired.join(", ")}.`] : ["No specific frame matched."]),
      ],
      missingEvidence: brief.missing.slice(0, 4),
      biases: [
        "A single researcher’s examples are a convenience sample.",
        "Publishing a clever reading makes weak evidence feel finished.",
      ],
      contradictions: evidenceIds.length
        ? ["Check whether later observations move against the first reading before you keep it."]
        : ["There are no observations on file to contradict. Absence of contradiction is not support."],
      whyTemporary: [
        "A behavior tied to a joke, a season, or a single platform can end without a cultural replacement.",
      ],
      whatWouldChange: insufficient
        ? "Dated observations from more than one source, plus one note about meaning that is not written by the brand."
        : "A comparison series, or a note that records a motive in someone else’s words.",
    },
    strategist: {
      concept: brief.nextAction.experiment,
      audienceHypothesis: brief.audiences[0]?.text ?? "No audience hypothesis yet.",
      brandFit: "Not scored unless you set a brand-fit assumption. This fallback will not invent one.",
      experiment: brief.nextAction.experiment,
      budgetAssumption: "Set the budget in the Culture Simulator. This text does not choose a number.",
      successMetric: brief.nextAction.success,
      stopCriteria: brief.nextAction.stop,
      risks: brief.risks.map((line) => line.text).slice(0, 4),
    },
  };
}
