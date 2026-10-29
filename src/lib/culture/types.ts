export const ENGINE_VERSION = "engine-v1";
export const PROMPT_VERSION = "culture-shift-agents-v2";
export const MODEL_ID = "grok-4.5";

export const DIMENSIONS = [
  "velocity",
  "persistence",
  "novelty",
  "resonance",
  "brandFit",
  "evidence",
] as const;

export type DimensionKey = (typeof DIMENSIONS)[number];

export type Weights = Record<DimensionKey, number>;

export const DEFAULT_WEIGHTS: Weights = {
  velocity: 0.2,
  persistence: 0.2,
  novelty: 0.15,
  resonance: 0.15,
  brandFit: 0.15,
  evidence: 0.15,
};

export type EvidenceKind = "attention" | "behavior" | "meaning";

export type Provenance = "user" | "csv-import" | "synthetic-demonstration";

export type Observation = {
  id: string;
  date: string;
  signal: number | null;
  note: string;
  source: string;
  kind: EvidenceKind;
  provenance: Provenance;
};

export type LineKind = "context" | "hypothesis" | "missing" | "supplied";

export type TaggedLine = {
  text: string;
  kind: LineKind;
};

export type Brief = {
  question: string;
  subject: string;
  generatedBy: "rule-engine-v1";
  framesFired: string[];
  snapshot: TaggedLine[];
  resonance: TaggedLine[];
  audiences: TaggedLine[];
  alternatives: TaggedLine[];
  opportunities: TaggedLine[];
  risks: TaggedLine[];
  nextAction: { experiment: string; success: string; stop: string };
  missing: string[];
  supplied: string[];
};

export type Uncertainty = "high" | "medium" | "low";

export type AgentOutput = {
  anthropologist: {
    hypotheses: { claim: string; evidenceIds: string[]; uncertainty: Uncertainty }[];
    alternatives: string[];
    nextObservation: string;
  };
  skeptic: {
    insufficient: boolean;
    weakAssumptions: string[];
    missingEvidence: string[];
    biases: string[];
    contradictions: string[];
    whyTemporary: string[];
    whatWouldChange: string;
  };
  strategist: {
    concept: string;
    audienceHypothesis: string;
    brandFit: string;
    experiment: string;
    budgetAssumption: string;
    successMetric: string;
    stopCriteria: string;
    risks: string[];
  };
};

export type BotRole = "anthropologist" | "skeptic" | "strategist";

export type BotMeta = {
  source: "grok-4.5" | "non-ai-demo";
  model: string | null;
  warnings: string[];
};

export type AgentRecord = {
  source: "user-key" | "grok-4.5" | "non-ai-demo" | "mixed";
  model: string | null;
  promptVersion: string;
  at: string;
  warnings: string[];
  bots?: Partial<Record<BotRole, BotMeta>>;
  output: AgentOutput;
};

export type ScenarioName = "pessimistic" | "baseline" | "optimistic";

export type SimInput = {
  concept: string;
  price: number;
  variableCost: number;
  marketingBudget: number;
  otherFixed: number;
  audienceReached: number;
  conversionRate: number;
};

export type SavedSimulation = {
  savedAt: string;
  input: SimInput;
  note: string;
};

export type Investigation = {
  id: string;
  title: string;
  question: string;
  context: string;
  brandCategory: string;
  audience: string;
  sampleCaseId: string | null;
  createdAt: string;
  updatedAt: string;
  observations: Observation[];
  brandFitAssumption: number | null;
  noveltyAssumption: number | null;
  weights: Weights;
  agent: AgentRecord | null;
  simulation: SavedSimulation | null;
};

export type Draft = {
  question: string;
  context: string;
  brandCategory: string;
  audience: string;
  sampleCaseId: string | null;
};
