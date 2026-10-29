import { addDays, clamp, daysBetween, parseISODate } from "./dates.ts";
import { DEFAULT_WEIGHTS, DIMENSIONS, ENGINE_VERSION, type DimensionKey, type Weights } from "./types.ts";

export { ENGINE_VERSION };

export type Point = { date: string; signal: number };

export type PreparedSeries = {
  points: Point[];
  duplicatesCollapsed: number;
  incompleteDropped: number;
  spanDays: number | null;
};

export type VelocityResult =
  | { status: "not-estimable"; reason: string }
  | {
      status: "ok";
      absoluteChange: number;
      spanDays: number;
      relativePer30Days: number | null;
      score: number | null;
      reason: string;
    };

export type PersistenceResult =
  | { status: "not-estimable"; reason: string }
  | { status: "ok"; score: number; held: number; total: number; reason: string };

export type HalfLifeResult =
  | { status: "not-estimable"; reason: string }
  | {
      status: "ok";
      days: number;
      peakDate: string;
      peakSignal: number;
      crossDate: string;
      method: "exact" | "linear-interpolation";
      reason: string;
    };

export type LifecycleResult = { label: string; detail: string };

export type EvidenceQuality = { score: number; rule: string };

export type DimensionResult = {
  key: DimensionKey;
  label: string;
  status: "ok" | "not-estimable";
  score: number | null;
  reason: string;
  kind: "calculated" | "assumption";
};

export type ScoreBreakdownRow = {
  key: DimensionKey;
  label: string;
  rawWeight: number;
  renormWeight: number;
  score: number;
  contribution: number;
  kind: "calculated" | "assumption";
};

export type OpportunityResult =
  | { status: "not-scored"; reason: string; excluded: { key: DimensionKey; reason: string }[] }
  | {
      status: "scored";
      score: number;
      included: ScoreBreakdownRow[];
      excluded: { key: DimensionKey; reason: string }[];
      note: string;
    };

const LABELS: Record<DimensionKey, string> = {
  velocity: "Velocity",
  persistence: "Persistence",
  novelty: "Novelty",
  resonance: "Cultural resonance",
  brandFit: "Brand fit",
  evidence: "Evidence quality",
};

export function dimensionLabel(key: DimensionKey): string {
  return LABELS[key];
}

/** Last finite signal wins. Null, blank, and invalid dates are dropped — never coerced to zero. */
export function prepareSeries(
  raw: Array<{ date: string; signal: number | null | undefined }>,
): PreparedSeries {
  const byDate = new Map<string, number>();
  let duplicatesCollapsed = 0;
  let incompleteDropped = 0;
  for (const row of raw) {
    if (!parseISODate(row.date) || row.signal == null || !Number.isFinite(row.signal)) {
      incompleteDropped += 1;
      continue;
    }
    if (byDate.has(row.date)) duplicatesCollapsed += 1;
    byDate.set(row.date, row.signal);
  }
  const points = [...byDate.entries()]
    .map(([date, signal]) => ({ date, signal }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const spanDays = points.length >= 2 ? daysBetween(points[0].date, points[points.length - 1].date) : null;
  return { points, duplicatesCollapsed, incompleteDropped, spanDays };
}

export function velocity(points: Point[]): VelocityResult {
  if (points.length < 2) {
    return {
      status: "not-estimable",
      reason: "Velocity needs at least two dated signals. A single observation cannot show change.",
    };
  }
  const first = points[0];
  const last = points[points.length - 1];
  const spanDays = daysBetween(first.date, last.date);
  if (!Number.isFinite(spanDays) || spanDays <= 0) {
    return {
      status: "not-estimable",
      reason: "The dated signals do not span a positive number of days, so a rate is undefined.",
    };
  }
  const absoluteChange = last.signal - first.signal;
  if (first.signal === 0) {
    return {
      status: "ok",
      absoluteChange,
      spanDays,
      relativePer30Days: null,
      score: null,
      reason:
        "Absolute change is reported. The score is withheld because the first signal is zero, and a percent change would be undefined. Missing is not treated as zero elsewhere; this zero was an actual recorded signal.",
    };
  }
  const relativePer30Days = (absoluteChange / Math.abs(first.signal)) * (30 / spanDays);
  const score = clamp(0.5 + relativePer30Days, 0, 1);
  return {
    status: "ok",
    absoluteChange,
    spanDays,
    relativePer30Days,
    score,
    reason:
      "Score = clamp(0.5 + relative change per 30 days, 0, 1). A flat series scores 0.5. Plus or minus 50% per 30 days saturates the scale. This is a display squash, not a probability.",
  };
}

export function persistence(points: Point[]): PersistenceResult {
  if (points.length < 3) {
    return {
      status: "not-estimable",
      reason: "Persistence needs at least three observations. Two points cannot show whether interest held.",
    };
  }
  const peak = Math.max(...points.map((p) => p.signal));
  if (peak <= 0) {
    return {
      status: "not-estimable",
      reason: "Persistence is undefined when the peak signal is not positive.",
    };
  }
  const held = points.filter((p) => p.signal >= peak * 0.5).length;
  return {
    status: "ok",
    score: held / points.length,
    held,
    total: points.length,
    reason: "Share of observations still at or above half the peak. This describes the supplied series only.",
  };
}

/**
 * Half-life: days for the signal to fall to 50% of its peak after that peak.
 * Linear interpolation is used between the last point above the threshold and the first point at or below it.
 * If the series never reaches that threshold, the result is not estimable.
 */
export function halfLife(points: Point[]): HalfLifeResult {
  if (points.length < 3) {
    return {
      status: "not-estimable",
      reason: "Half-life needs at least three dated signals, including history after a peak.",
    };
  }
  let peakIdx = 0;
  for (let i = 1; i < points.length; i += 1) {
    if (points[i].signal > points[peakIdx].signal) peakIdx = i;
  }
  const peak = points[peakIdx];
  if (peak.signal <= 0) {
    return { status: "not-estimable", reason: "A non-positive peak has no meaningful 50% decline." };
  }
  if (peakIdx === points.length - 1) {
    return {
      status: "not-estimable",
      reason: "The peak is the latest point, so no post-peak decline is on record.",
    };
  }
  const target = peak.signal * 0.5;
  for (let i = peakIdx + 1; i < points.length; i += 1) {
    const curr = points[i];
    if (curr.signal > target) continue;
    const prev = points[i - 1];
    if (curr.signal === target || prev.signal === curr.signal) {
      return {
        status: "ok",
        days: daysBetween(peak.date, curr.date),
        peakDate: peak.date,
        peakSignal: peak.signal,
        crossDate: curr.date,
        method: "exact",
        reason:
          "Half-life is the time from the peak until the signal reaches 50% of that peak. This crossing lands on an observation.",
      };
    }
    const span = daysBetween(prev.date, curr.date);
    const frac = (prev.signal - target) / (prev.signal - curr.signal);
    const days = daysBetween(peak.date, prev.date) + frac * span;
    return {
      status: "ok",
      days,
      peakDate: peak.date,
      peakSignal: peak.signal,
      crossDate: addDays(prev.date, frac * span),
      method: "linear-interpolation",
      reason:
        "Half-life is the time from the peak until the signal reaches 50% of that peak. The crossing sits between two observations and is linearly interpolated. It is not a forecast.",
    };
  }
  return {
    status: "not-estimable",
    reason: "The series never falls to 50% of its peak after the peak. Half-life is not estimable.",
  };
}

export function lifecycle(points: Point[]): LifecycleResult {
  if (points.length < 3) {
    return {
      label: "Not classified",
      detail:
        "Fewer than three observations. Rising, saturated, or fading labels are withheld. Two points are still not enough.",
    };
  }
  const hl = halfLife(points);
  const first = points[0].signal;
  const last = points[points.length - 1].signal;
  const peak = Math.max(...points.map((p) => p.signal));
  if (hl.status === "ok" && peak > 0 && last <= peak * 0.6) {
    return {
      label: "Post-peak decline in this series",
      detail:
        "A 50% decline from the peak is present, and the latest signal is at or below 60% of the peak. This describes only the supplied series.",
    };
  }
  if (peak > 0 && last >= first * 1.1 && last >= peak * 0.9) {
    return {
      label: "Rising in this series",
      detail:
        "The latest signal is at least 10% above the first and within 10% of the peak. This is not a forecast and not a claim about the open internet.",
    };
  }
  if (peak > 0 && last >= peak * 0.85) {
    return {
      label: "Holding near peak in this series",
      detail: "The latest signal remains within 15% of the peak. Whether that continues is unknown.",
    };
  }
  return {
    label: "Mixed in this series",
    detail: "The path does not meet the rising, holding, or post-peak rules. No lifecycle label is forced.",
  };
}

export function evidenceQuality(args: {
  numericCount: number;
  uniqueSources: number;
  spanDays: number | null;
}): EvidenceQuality {
  const n = clamp(args.numericCount / 6, 0, 1);
  const s = clamp(args.uniqueSources / 3, 0, 1);
  const d = clamp((args.spanDays ?? 0) / 90, 0, 1);
  return {
    score: n * 0.5 + s * 0.3 + d * 0.2,
    rule: "0.5·min(numeric points/6, 1) + 0.3·min(unique sources/3, 1) + 0.2·min(span days/90, 1). Zero observations score 0 by this explicit rule. Coverage is not the same thing as truth.",
  };
}

export function resonanceScore(behaviorOrMeaningNotes: number): {
  status: "ok" | "not-estimable";
  score: number | null;
  reason: string;
} {
  if (behaviorOrMeaningNotes <= 0) {
    return {
      status: "not-estimable",
      score: null,
      reason:
        "No notes are tagged as behavior or meaning. Attention numbers alone are not treated as cultural resonance.",
    };
  }
  return {
    status: "ok",
    score: clamp(behaviorOrMeaningNotes / 3, 0, 1),
    reason: "min(behavior-or-meaning notes / 3, 1). A coverage count of notes you tagged, not a measured emotion.",
  };
}

export function assumptionScore(value: number | null, label: string): {
  status: "ok" | "not-estimable";
  score: number | null;
  reason: string;
} {
  if (value == null || !Number.isFinite(value)) {
    return {
      status: "not-estimable",
      score: null,
      reason: `${label} was not set. The lab does not invent it.`,
    };
  }
  return {
    status: "ok",
    score: clamp(value, 0, 1),
    reason: `${label} is a user assumption on a 0–1 scale, not a measurement.`,
  };
}

export function normalizeWeights(weights: Weights): Weights {
  const sum = DIMENSIONS.reduce((acc, key) => acc + (Number.isFinite(weights[key]) ? Math.max(0, weights[key]) : 0), 0);
  if (sum <= 0) return { ...DEFAULT_WEIGHTS };
  const next = { ...weights };
  for (const key of DIMENSIONS) next[key] = Math.max(0, weights[key]) / sum;
  return next;
}

export function buildDimensions(args: {
  points: Point[];
  uniqueSources: number;
  spanDays: number | null;
  behaviorOrMeaningNotes: number;
  brandFitAssumption: number | null;
  noveltyAssumption: number | null;
}): DimensionResult[] {
  const v = velocity(args.points);
  const p = persistence(args.points);
  const novelty = assumptionScore(args.noveltyAssumption, "Novelty");
  const resonance = resonanceScore(args.behaviorOrMeaningNotes);
  const brand = assumptionScore(args.brandFitAssumption, "Brand fit");
  const evidence = evidenceQuality({
    numericCount: args.points.length,
    uniqueSources: args.uniqueSources,
    spanDays: args.spanDays,
  });
  return [
    {
      key: "velocity",
      label: LABELS.velocity,
      status: v.status === "ok" && v.score != null ? "ok" : "not-estimable",
      score: v.status === "ok" ? v.score : null,
      reason: v.reason,
      kind: "calculated",
    },
    {
      key: "persistence",
      label: LABELS.persistence,
      status: p.status,
      score: p.status === "ok" ? p.score : null,
      reason: p.reason,
      kind: "calculated",
    },
    {
      key: "novelty",
      label: LABELS.novelty,
      status: novelty.status,
      score: novelty.score,
      reason: novelty.reason,
      kind: "assumption",
    },
    {
      key: "resonance",
      label: LABELS.resonance,
      status: resonance.status,
      score: resonance.score,
      reason: resonance.reason,
      kind: "calculated",
    },
    {
      key: "brandFit",
      label: LABELS.brandFit,
      status: brand.status,
      score: brand.score,
      reason: brand.reason,
      kind: "assumption",
    },
    {
      key: "evidence",
      label: LABELS.evidence,
      status: "ok",
      score: evidence.score,
      reason: evidence.rule,
      kind: "calculated",
    },
  ];
}

export function opportunityScore(dimensions: DimensionResult[], weights: Weights): OpportunityResult {
  const normalized = normalizeWeights(weights);
  const included = dimensions.filter((d) => d.status === "ok" && d.score != null);
  const excluded = dimensions
    .filter((d) => d.status !== "ok" || d.score == null)
    .map((d) => ({ key: d.key, reason: d.reason }));
  if (included.length < 2) {
    return {
      status: "not-scored",
      reason:
        "An opportunity score needs at least two measurable dimensions. Missing dimensions are left out rather than filled with zero. This score is not a probability of commercial success.",
      excluded,
    };
  }
  const weightSum = included.reduce((acc, d) => acc + normalized[d.key], 0);
  const rows: ScoreBreakdownRow[] = included.map((d) => {
    const renormWeight = weightSum > 0 ? normalized[d.key] / weightSum : 0;
    const score = d.score ?? 0;
    return {
      key: d.key,
      label: d.label,
      rawWeight: normalized[d.key],
      renormWeight,
      score,
      contribution: renormWeight * score,
      kind: d.kind,
    };
  });
  const score = rows.reduce((acc, row) => acc + row.contribution, 0);
  return {
    status: "scored",
    score,
    included: rows,
    excluded,
    note: "Provisional design weights, renormalized over dimensions that could actually be measured. Not a probability of commercial success. Initial design weights were velocity 20%, persistence 20%, novelty 15%, resonance 15%, brand fit 15%, evidence 15%, before renormalization.",
  };
}

export function minimumEvidenceHint(points: Point[], behaviorNotes: number, brandFit: number | null): string {
  if (points.length < 2) {
    return "The single most useful addition is another dated signal, on a different day, from a named source. That is the minimum for a change calculation.";
  }
  if (points.length < 3) {
    return "Add a third dated signal. Velocity can be sketched from two points; persistence, lifecycle, and half-life cannot.";
  }
  if (halfLife(points).status !== "ok") {
    return "Half-life stays not estimable until the series actually falls to half of its peak after that peak. More post-peak points would tell you whether a decline happened.";
  }
  if (behaviorNotes <= 0) {
    return "Tag at least one note as behavior or meaning if you want a resonance term. Do not expect attention counts to stand in for it.";
  }
  if (brandFit == null) {
    return "Set a brand-fit assumption only if you are willing to label it as your assumption. Otherwise leave it blank.";
  }
  return "A comparison group — the same metric for a category that is not this trend — would test whether the path is specific.";
}
