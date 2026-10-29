import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sensitivity, simulate, validateSim, worthwhile } from "./simulator.ts";
import type { SimInput } from "./types.ts";

const input: SimInput = {
  concept: "Desk pet",
  price: 20,
  variableCost: 8,
  marketingBudget: 1000,
  otherFixed: 500,
  audienceReached: 1000,
  conversionRate: 0.1,
};

describe("simulate", () => {
  it("uses the documented baseline formulas", () => {
    const result = simulate(input, "baseline");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.hypothetical, true);
    assert.equal(result.units, 100);
    assert.equal(result.revenue, 2000);
    assert.equal(result.variableTotal, 800);
    assert.equal(result.contributionPerUnit, 12);
    assert.equal(result.contributionTotal, 1200);
    assert.equal(result.fixed, 1500);
    assert.equal(result.profit, -300);
    assert.equal(result.breakEvenUnits, 125);
    assert.equal(result.cac, 10);
  });

  it("scales units by the scenario factor and does not invent a second demand model", () => {
    const pessimistic = simulate(input, "pessimistic");
    const optimistic = simulate(input, "optimistic");
    assert.equal(pessimistic.ok && pessimistic.units, 50);
    assert.equal(optimistic.ok && optimistic.units, 160);
  });

  it("withholds break-even when contribution is not positive", () => {
    const flat = simulate({ ...input, price: 8 }, "baseline");
    const loss = simulate({ ...input, price: 5 }, "baseline");
    assert.equal(flat.ok && flat.breakEvenUnits, null);
    assert.equal(loss.ok && loss.breakEvenUnits, null);
    assert.equal(loss.ok && loss.contributionPerUnit, -3);
  });

  it("rejects a conversion rate outside 0 to 1", () => {
    const errors = validateSim({ ...input, conversionRate: 1.5 });
    assert.equal(errors.length, 1);
    const result = simulate({ ...input, conversionRate: 1.5 }, "baseline");
    assert.equal(result.ok, false);
  });
});

describe("sensitivity and stop rules", () => {
  it("is deterministic about which assumption moves profit most", () => {
    const rows = sensitivity(input);
    assert.equal(rows[0]?.driver, "Price");
    assert.ok(rows[0] && rows[0].profitDelta > 0);
    const again = sensitivity(input);
    assert.deepEqual(rows, again);
  });

  it("does not stop while the pessimistic loss is still inside the marketing budget", () => {
    const judgement = worthwhile(input, 0);
    assert.equal(judgement.baselineClears, false);
    assert.equal(judgement.stop, false);
  });

  it("stops when the pessimistic loss exceeds the marketing budget", () => {
    const judgement = worthwhile({ ...input, otherFixed: 2000 }, 0);
    assert.equal(judgement.stop, true);
  });
});
