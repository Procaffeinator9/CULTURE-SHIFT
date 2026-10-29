import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDimensions,
  halfLife,
  lifecycle,
  opportunityScore,
  persistence,
  prepareSeries,
  velocity,
} from "./analytics.ts";
import { DEFAULT_WEIGHTS } from "./types.ts";

describe("prepareSeries", () => {
  it("does not coerce missing signals to zero and keeps the last duplicate", () => {
    const prepared = prepareSeries([
      { date: "2024-01-01", signal: 5 },
      { date: "2024-01-01", signal: 9 },
      { date: "2024-02-01", signal: null },
      { date: "bad", signal: 3 },
    ]);
    assert.equal(prepared.points.length, 1);
    assert.equal(prepared.points[0].signal, 9);
    assert.equal(prepared.duplicatesCollapsed, 1);
    assert.equal(prepared.incompleteDropped, 2);
  });
});

describe("velocity and lifecycle", () => {
  it("withholds growth metrics for a single observation", () => {
    const points = [{ date: "2024-01-01", signal: 12 }];
    assert.equal(velocity(points).status, "not-estimable");
    assert.equal(persistence(points).status, "not-estimable");
    assert.equal(halfLife(points).status, "not-estimable");
    assert.equal(lifecycle(points).label, "Not classified");
  });

  it("withholds a percent score when the first signal is zero", () => {
    const result = velocity([
      { date: "2024-01-01", signal: 0 },
      { date: "2024-02-01", signal: 5 },
    ]);
    assert.equal(result.status, "ok");
    if (result.status === "ok") {
      assert.equal(result.absoluteChange, 5);
      assert.equal(result.score, null);
      assert.equal(result.relativePer30Days, null);
    }
  });
});

describe("halfLife", () => {
  it("measures an exact 50% crossing", () => {
    const result = halfLife([
      { date: "2024-01-01", signal: 10 },
      { date: "2024-01-11", signal: 20 },
      { date: "2024-01-21", signal: 10 },
    ]);
    assert.equal(result.status, "ok");
    if (result.status === "ok") {
      assert.equal(result.days, 10);
      assert.equal(result.method, "exact");
      assert.equal(result.peakDate, "2024-01-11");
    }
  });

  it("interpolates between observations", () => {
    const result = halfLife([
      { date: "2024-01-01", signal: 10 },
      { date: "2024-01-11", signal: 40 },
      { date: "2024-01-21", signal: 30 },
      { date: "2024-01-31", signal: 10 },
    ]);
    assert.equal(result.status, "ok");
    if (result.status === "ok") {
      assert.equal(result.method, "linear-interpolation");
      assert.equal(result.days, 15);
    }
  });

  it("returns not estimable when the series never halves", () => {
    const result = halfLife([
      { date: "2024-01-01", signal: 10 },
      { date: "2024-01-11", signal: 20 },
      { date: "2024-01-21", signal: 14 },
    ]);
    assert.equal(result.status, "not-estimable");
  });
});

describe("opportunityScore", () => {
  it("does not score when fewer than two dimensions exist", () => {
    const points = [{ date: "2024-01-01", signal: 4 }];
    const dimensions = buildDimensions({
      points,
      uniqueSources: 1,
      spanDays: null,
      behaviorOrMeaningNotes: 0,
      brandFitAssumption: null,
      noveltyAssumption: null,
    });
    const scored = opportunityScore(dimensions, DEFAULT_WEIGHTS);
    assert.equal(scored.status, "not-scored");
  });

  it("renormalizes weights across the dimensions that exist", () => {
    const dimensions = buildDimensions({
      points: [
        { date: "2024-01-01", signal: 10 },
        { date: "2024-02-01", signal: 10 },
        { date: "2024-03-01", signal: 10 },
      ],
      uniqueSources: 1,
      spanDays: 60,
      behaviorOrMeaningNotes: 0,
      brandFitAssumption: null,
      noveltyAssumption: null,
    });
    const scored = opportunityScore(dimensions, DEFAULT_WEIGHTS);
    assert.equal(scored.status, "scored");
    if (scored.status === "scored") {
      const keys = scored.included.map((row) => row.key).sort();
      assert.deepEqual(keys, ["evidence", "persistence", "velocity"]);
      const weightSum = scored.included.reduce((acc, row) => acc + row.renormWeight, 0);
      assert.ok(Math.abs(weightSum - 1) < 1e-9);
      assert.ok(scored.excluded.some((row) => row.key === "novelty"));
      assert.ok(scored.excluded.some((row) => row.key === "resonance"));
    }
  });
});
