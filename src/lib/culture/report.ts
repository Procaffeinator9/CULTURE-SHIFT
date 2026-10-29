import { analyzeObservations, type Analysis } from "./analyze.ts";
import { ENGINE_VERSION } from "./analytics.ts";
import type { AgentRecord, Brief, Investigation } from "./types.ts";
import { money, simulateAll, unitsLabel } from "./simulator.ts";

function lines(title: string, items: string[]): string {
  if (!items.length) return `### ${title}\n\nNone on file.\n`;
  return `### ${title}\n\n${items.map((item) => `- ${item}`).join("\n")}\n`;
}

function analysisBlock(analysis: Analysis): string {
  const parts = [
    `Numeric observations: ${analysis.numericObservations}`,
    `Duplicates collapsed (last signal kept): ${analysis.prepared.duplicatesCollapsed}`,
    `Incomplete rows dropped (invalid date or non-numeric signal; not coerced to zero): ${analysis.prepared.incompleteDropped}`,
    `Span days: ${analysis.prepared.spanDays ?? "not applicable"}`,
    `Unique source labels: ${analysis.uniqueSources}`,
    `Lifecycle: ${analysis.lifecycle.label}. ${analysis.lifecycle.detail}`,
  ];
  if (analysis.velocity.status === "not-estimable") parts.push(`Velocity: not estimable. ${analysis.velocity.reason}`);
  else {
    parts.push(
      `Velocity: absolute change ${analysis.velocity.absoluteChange} over ${analysis.velocity.spanDays} days. Relative per 30 days: ${
        analysis.velocity.relativePer30Days == null ? "not estimable" : analysis.velocity.relativePer30Days.toFixed(3)
      }. Score: ${analysis.velocity.score == null ? "withheld" : analysis.velocity.score.toFixed(3)}. ${analysis.velocity.reason}`,
    );
  }
  if (analysis.persistence.status === "not-estimable") parts.push(`Persistence: not estimable. ${analysis.persistence.reason}`);
  else {
    parts.push(
      `Persistence: ${analysis.persistence.held} of ${analysis.persistence.total} points at or above half the peak. Score ${analysis.persistence.score.toFixed(3)}.`,
    );
  }
  if (analysis.halfLife.status === "not-estimable") parts.push(`Half-life: not estimable. ${analysis.halfLife.reason}`);
  else {
    parts.push(
      `Half-life: ${analysis.halfLife.days.toFixed(2)} days from peak ${analysis.halfLife.peakSignal} on ${analysis.halfLife.peakDate} (${analysis.halfLife.method}). ${analysis.halfLife.reason}`,
    );
  }
  return parts.map((item) => `- ${item}`).join("\n");
}

function opportunityBlock(analysis: Analysis): string {
  if (analysis.opportunity.status === "not-scored") {
    return `${analysis.opportunity.reason}\n\nExcluded:\n${
      analysis.opportunity.excluded.map((row) => `- ${row.key}: ${row.reason}`).join("\n") || "- None"
    }`;
  }
  const rows = analysis.opportunity.included
    .map(
      (row) =>
        `- ${row.label} [${row.kind}]: score ${row.score.toFixed(3)}, design weight ${row.rawWeight.toFixed(3)}, renormalized ${row.renormWeight.toFixed(3)}, contribution ${row.contribution.toFixed(3)}`,
    )
    .join("\n");
  const excluded = analysis.opportunity.excluded.map((row) => `- ${row.key}: ${row.reason}`).join("\n");
  return `Score (0–1): ${analysis.opportunity.score.toFixed(3)}\n\n${analysis.opportunity.note}\n\nIncluded:\n${rows}\n\nExcluded:\n${excluded || "- None"}`;
}

function agentBlock(agent: AgentRecord | null): string {
  if (!agent) return "Agents have not been run for this investigation.";
  const label =
    agent.bots
      ? (["anthropologist", "skeptic", "strategist"] as const)
          .map((role) => `${role}: ${agent.bots?.[role]?.source ?? agent.source}`)
          .join("; ")
      : agent.source === "grok-4.5"
        ? `Model ${agent.model}`
        : "Non-AI demo logic. No model was called.";
  const a = agent.output.anthropologist;
  const s = agent.output.skeptic;
  const g = agent.output.strategist;
  return [
    `${label}. Prompt ${agent.promptVersion}. Recorded ${agent.at}.`,
    agent.warnings.length ? `Warnings: ${agent.warnings.join(" ")}` : "Warnings: none.",
    "",
    "Anthropologist hypotheses:",
    ...a.hypotheses.map(
      (item) =>
        `- (${item.uncertainty}) ${item.claim} Evidence IDs: ${item.evidenceIds.length ? item.evidenceIds.join(", ") : "none"}.`,
    ),
    ...a.alternatives.map((item) => `- Alternative: ${item}`),
    `- Next observation: ${a.nextObservation}`,
    "",
    `Skeptic — evidence insufficient: ${s.insufficient ? "yes" : "no"}.`,
    ...s.weakAssumptions.map((item) => `- Weak assumption: ${item}`),
    ...s.missingEvidence.map((item) => `- Missing: ${item}`),
    ...s.biases.map((item) => `- Bias: ${item}`),
    ...s.contradictions.map((item) => `- Contradiction: ${item}`),
    ...s.whyTemporary.map((item) => `- Why it might be temporary: ${item}`),
    `- What would change the conclusion: ${s.whatWouldChange}`,
    "",
    "Brand strategist (no financial figures — those live in the simulator):",
    `- Concept: ${g.concept}`,
    `- Audience hypothesis: ${g.audienceHypothesis}`,
    `- Brand fit: ${g.brandFit}`,
    `- Experiment: ${g.experiment}`,
    `- Budget assumption: ${g.budgetAssumption}`,
    `- Success metric: ${g.successMetric}`,
    `- Stop: ${g.stopCriteria}`,
    ...g.risks.map((item) => `- Risk: ${item}`),
  ].join("\n");
}

export function investigationMarkdown(inv: Investigation, brief: Brief, analysis: Analysis, exportedAt: string): string {
  const sim = inv.simulation
    ? simulateAll(inv.simulation.input)
    : null;
  const simBlock = !inv.simulation
    ? "No simulation was saved with this investigation."
    : (["pessimistic", "baseline", "optimistic"] as const)
        .map((name) => {
          const result = sim?.[name];
          if (!result || !result.ok) return `### ${name}\n\nInvalid inputs.`;
          return [
            `### ${name} (hypothetical, factor ${result.factor})`,
            "",
            `- Units: ${unitsLabel(result.units)}`,
            `- Revenue: ${money(result.revenue)}`,
            `- Variable costs: ${money(result.variableTotal)}`,
            `- Contribution per unit: ${money(result.contributionPerUnit)}`,
            `- Contribution total: ${money(result.contributionTotal)}`,
            `- Fixed costs: ${money(result.fixed)}`,
            `- Profit: ${money(result.profit)}`,
            `- Break-even units: ${result.breakEvenUnits == null ? "not defined" : unitsLabel(result.breakEvenUnits)}`,
            `- Marketing cost per acquired customer: ${result.cac == null ? "not defined" : money(result.cac)}`,
          ].join("\n");
        })
        .join("\n\n") +
      `\n\nAssumptions:\n${sim?.baseline && sim.baseline.ok ? sim.baseline.assumptions.map((item) => `- ${item}`).join("\n") : ""}` +
      `\n\nSaved note: ${inv.simulation.note || "none"}\n\nInputs: price ${inv.simulation.input.price}, variable cost ${inv.simulation.input.variableCost}, marketing ${inv.simulation.input.marketingBudget}, other fixed ${inv.simulation.input.otherFixed}, reach ${inv.simulation.input.audienceReached}, conversion ${inv.simulation.input.conversionRate}.`;

  return `# CULTURE//SHIFT research brief

Cultural signals. Evidence. Decisions.

## 1. Research question

${inv.question}

- Title: ${inv.title}
- Context: ${inv.context || "none"}
- Brand category: ${inv.brandCategory || "unspecified"}
- Audience note: ${inv.audience || "none"}
- Created: ${inv.createdAt}
- Updated: ${inv.updatedAt}
- Exported: ${exportedAt}
- Engine: ${ENGINE_VERSION}

## 2. Cultural snapshot

${brief.snapshot.map((item) => `- (${item.kind}) ${item.text}`).join("\n")}

Frames that fired from the wording: ${brief.framesFired.length ? brief.framesFired.join(", ") : "none"}.

## 3. Observed evidence

${brief.supplied.length ? brief.supplied.map((item) => `- ${item}`).join("\n") : "No observations were supplied. Do not read the hypotheses below as findings."}

## 4. Data coverage and provenance

- Sources are whatever labels were typed or imported. This app does not fetch social platforms.
- Synthetic demonstration rows, if present, are tagged provenance synthetic-demonstration and are not real-world evidence.
- ${analysis.hint}

## 5. Calculated metrics

${analysisBlock(analysis)}

## 6. Opportunity-score breakdown

${opportunityBlock(analysis)}

Brand-fit assumption: ${inv.brandFitAssumption == null ? "not set" : inv.brandFitAssumption}
Novelty assumption: ${inv.noveltyAssumption == null ? "not set" : inv.noveltyAssumption}

## 7. Why it might resonate (hypotheses)

${brief.resonance.map((item) => `- (${item.kind}) ${item.text}`).join("\n")}

## 8. Skeptic material from the rule brief

${lines("Alternative explanations", brief.alternatives.map((item) => item.text))}

${lines("Risks and gaps", brief.risks.map((item) => `(${item.kind}) ${item.text}`))}

## 9. Agent record

${agentBlock(inv.agent)}

## 10. Brand experiment

- Experiment: ${brief.nextAction.experiment}
- What would make it worthwhile: ${brief.nextAction.success}
- What would make you stop: ${brief.nextAction.stop}

${lines("Opportunity hypotheses", brief.opportunities.map((item) => `(${item.kind}) ${item.text}`))}

## 11. Simulation

All figures below are hypothetical.

${simBlock}

## 12. Recommended next step

${analysis.hint}

---

Facts, calculations, hypotheses, and simulations are labelled in place. This file is not a forecast.
`;
}

export function investigationJson(inv: Investigation, brief: Brief, analysis: Analysis, exportedAt: string) {
  return {
    product: "CULTURE//SHIFT",
    exportedAt,
    engine: ENGINE_VERSION,
    investigation: inv,
    brief,
    analysis,
    simulation:
      inv.simulation == null
        ? null
        : {
            hypothetical: true,
            input: inv.simulation.input,
            note: inv.simulation.note,
            scenarios: simulateAll(inv.simulation.input),
          },
  };
}
