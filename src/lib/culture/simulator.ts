import type { ScenarioName, SimInput } from "./types.ts";

export const SCENARIO_FACTOR: Record<ScenarioName, number> = {
  pessimistic: 0.5,
  baseline: 1,
  optimistic: 1.6,
};

export const ILLUSTRATIVE_DEFAULTS: SimInput = {
  concept: "",
  price: 24,
  variableCost: 9,
  marketingBudget: 1200,
  otherFixed: 300,
  audienceReached: 8000,
  conversionRate: 0.015,
};

export type SimOk = {
  ok: true;
  hypothetical: true;
  scenario: ScenarioName;
  factor: number;
  units: number;
  revenue: number;
  variableTotal: number;
  contributionPerUnit: number;
  contributionTotal: number;
  fixed: number;
  profit: number;
  breakEvenUnits: number | null;
  cac: number | null;
  assumptions: string[];
};

export type SimResult = SimOk | { ok: false; errors: string[] };

const ASSUMPTIONS = [
  "Units sold = audience reached × conversion rate × scenario factor. This is an assumption stack, not observed demand.",
  "Pessimistic factor 0.5, baseline 1, optimistic 1.6. The factors are illustrative, not calibrated to a category.",
  "Revenue = units × selling price.",
  "Contribution per unit = selling price − variable cost per unit.",
  "Fixed costs = marketing budget + other fixed costs.",
  "Break-even units = fixed costs ÷ contribution per unit, only when contribution per unit is positive.",
  "Cost per acquired customer = marketing budget ÷ units, only when units are positive. Other fixed costs are excluded from that figure, so it is not a full cost-to-serve.",
];

export function validateSim(input: SimInput): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(input.price) || input.price < 0) errors.push("Price must be a number zero or greater.");
  if (!Number.isFinite(input.variableCost) || input.variableCost < 0) {
    errors.push("Variable cost must be a number zero or greater.");
  }
  if (!Number.isFinite(input.marketingBudget) || input.marketingBudget < 0) {
    errors.push("Marketing budget must be a number zero or greater.");
  }
  if (!Number.isFinite(input.otherFixed) || input.otherFixed < 0) {
    errors.push("Other fixed costs must be a number zero or greater.");
  }
  if (!Number.isFinite(input.audienceReached) || input.audienceReached < 0) {
    errors.push("Audience reached must be a number zero or greater.");
  }
  if (!Number.isFinite(input.conversionRate) || input.conversionRate < 0 || input.conversionRate > 1) {
    errors.push("Conversion rate must be between 0 and 1.");
  }
  return errors;
}

export function simulate(input: SimInput, scenario: ScenarioName): SimResult {
  const errors = validateSim(input);
  if (errors.length) return { ok: false, errors };
  const factor = SCENARIO_FACTOR[scenario];
  const units = input.audienceReached * input.conversionRate * factor;
  const revenue = units * input.price;
  const variableTotal = units * input.variableCost;
  const contributionPerUnit = input.price - input.variableCost;
  const contributionTotal = units * contributionPerUnit;
  const fixed = input.marketingBudget + input.otherFixed;
  const profit = contributionTotal - fixed;
  const breakEvenUnits = contributionPerUnit > 0 ? fixed / contributionPerUnit : null;
  const cac = units > 0 ? input.marketingBudget / units : null;
  return {
    ok: true,
    hypothetical: true,
    scenario,
    factor,
    units,
    revenue,
    variableTotal,
    contributionPerUnit,
    contributionTotal,
    fixed,
    profit,
    breakEvenUnits,
    cac,
    assumptions: ASSUMPTIONS,
  };
}

export function simulateAll(input: SimInput): Record<ScenarioName, SimResult> {
  return {
    pessimistic: simulate(input, "pessimistic"),
    baseline: simulate(input, "baseline"),
    optimistic: simulate(input, "optimistic"),
  };
}

export type SensitivityRow = {
  driver: string;
  profitDelta: number;
  note: string;
};

/** One-at-a-time ±10% relative shocks on the baseline scenario. Deterministic. */
export function sensitivity(input: SimInput): SensitivityRow[] {
  const base = simulate(input, "baseline");
  if (!base.ok) return [];
  const shocks: { driver: string; next: SimInput; note: string }[] = [
    {
      driver: "Price",
      next: { ...input, price: input.price * 1.1 },
      note: "Selling price raised 10%.",
    },
    {
      driver: "Variable cost",
      next: { ...input, variableCost: input.variableCost * 1.1 },
      note: "Variable cost raised 10%.",
    },
    {
      driver: "Conversion",
      next: { ...input, conversionRate: Math.min(1, input.conversionRate * 1.1) },
      note: "Assumed conversion raised 10% relative, capped at 100%.",
    },
    {
      driver: "Audience reached",
      next: { ...input, audienceReached: input.audienceReached * 1.1 },
      note: "Assumed reach raised 10%.",
    },
    {
      driver: "Marketing budget",
      next: { ...input, marketingBudget: input.marketingBudget * 1.1 },
      note: "Marketing budget raised 10%.",
    },
  ];
  return shocks
    .map((shock) => {
      const next = simulate(shock.next, "baseline");
      const profitDelta = next.ok ? next.profit - base.profit : 0;
      return { driver: shock.driver, profitDelta, note: shock.note };
    })
    .sort((a, b) => Math.abs(b.profitDelta) - Math.abs(a.profitDelta));
}

export function worthwhile(input: SimInput, targetProfit: number): {
  baselineClears: boolean | null;
  stop: boolean;
  stopReason: string;
  worthReason: string;
} {
  const base = simulate(input, "baseline");
  const pessimistic = simulate(input, "pessimistic");
  if (!base.ok || !pessimistic.ok) {
    return {
      baselineClears: null,
      stop: true,
      stopReason: "Inputs are invalid, so the experiment cannot be judged.",
      worthReason: "Fix the inputs before comparing scenarios.",
    };
  }
  const stop = base.contributionPerUnit <= 0 || pessimistic.profit < -input.marketingBudget;
  let stopReason = "Neither stop rule has fired.";
  if (base.contributionPerUnit <= 0) {
    stopReason = "Stop. Contribution per unit is not positive, so more volume does not create margin.";
  } else if (pessimistic.profit < -input.marketingBudget) {
    stopReason =
      "Stop rule fired under the pessimistic case: the loss is larger than the marketing budget. That rule is a design choice, not a market law.";
  }
  const baselineClears = base.profit >= targetProfit;
  const worthReason = baselineClears
    ? "The baseline hypothetical profit meets the target you set. It is still hypothetical."
    : "The baseline hypothetical profit does not meet the target you set.";
  return { baselineClears, stop, stopReason, worthReason };
}

export function money(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function unitsLabel(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
}
