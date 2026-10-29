import {
  buildDimensions,
  evidenceQuality,
  halfLife,
  lifecycle,
  minimumEvidenceHint,
  opportunityScore,
  persistence,
  prepareSeries,
  velocity,
  type DimensionResult,
  type HalfLifeResult,
  type LifecycleResult,
  type OpportunityResult,
  type PersistenceResult,
  type PreparedSeries,
  type VelocityResult,
} from "./analytics.ts";
import type { Observation, Weights } from "./types.ts";

export type Analysis = {
  prepared: PreparedSeries;
  velocity: VelocityResult;
  persistence: PersistenceResult;
  halfLife: HalfLifeResult;
  lifecycle: LifecycleResult;
  dimensions: DimensionResult[];
  opportunity: OpportunityResult;
  evidenceRule: string;
  uniqueSources: number;
  behaviorOrMeaningNotes: number;
  hint: string;
  numericObservations: number;
};

export function analyzeObservations(
  observations: Observation[],
  weights: Weights,
  assumptions: { brandFit: number | null; novelty: number | null },
): Analysis {
  const prepared = prepareSeries(observations.map((obs) => ({ date: obs.date, signal: obs.signal })));
  const uniqueSources = new Set(
    observations.map((obs) => obs.source.trim()).filter(Boolean),
  ).size;
  const behaviorOrMeaningNotes = observations.filter(
    (obs) => (obs.kind === "behavior" || obs.kind === "meaning") && obs.note.trim(),
  ).length;
  const dimensions = buildDimensions({
    points: prepared.points,
    uniqueSources,
    spanDays: prepared.spanDays,
    behaviorOrMeaningNotes,
    brandFitAssumption: assumptions.brandFit,
    noveltyAssumption: assumptions.novelty,
  });
  const evidence = evidenceQuality({
    numericCount: prepared.points.length,
    uniqueSources,
    spanDays: prepared.spanDays,
  });
  return {
    prepared,
    velocity: velocity(prepared.points),
    persistence: persistence(prepared.points),
    halfLife: halfLife(prepared.points),
    lifecycle: lifecycle(prepared.points),
    dimensions,
    opportunity: opportunityScore(dimensions, weights),
    evidenceRule: evidence.rule,
    uniqueSources,
    behaviorOrMeaningNotes,
    hint: minimumEvidenceHint(prepared.points, behaviorOrMeaningNotes, assumptions.brandFit),
    numericObservations: prepared.points.length,
  };
}
