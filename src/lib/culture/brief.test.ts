import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildBrief } from "./brief.ts";
import { fallbackAgents } from "./fallback-agents.ts";

describe("buildBrief", () => {
  it("matches a known frame without inventing metrics or links", () => {
    const brief = buildBrief({
      question: "Why are miniature desk pets becoming popular?",
      observations: [],
    });
    assert.ok(brief.framesFired.includes("miniature objects"));
    assert.equal(brief.supplied.length, 0);
    const blob = JSON.stringify(brief);
    assert.equal(blob.includes("http"), false);
    assert.equal(blob.includes("%"), false);
    assert.match(brief.risks.map((line) => line.text).join(" "), /No observations are on file/);
  });

  it("labels an unknown question as unmatched instead of fabricating a history", () => {
    const brief = buildBrief({ question: "Why is everyone suddenly into glacier knitting?" });
    assert.equal(brief.framesFired.length, 0);
    assert.match(brief.snapshot.map((line) => line.text).join(" "), /No built-in interpretive frame/);
  });
});

describe("fallbackAgents", () => {
  it("lets the skeptic call the evidence insufficient when nothing was supplied", () => {
    const brief = buildBrief({ question: "Why is everyone suddenly into glacier knitting?" });
    const agents = fallbackAgents(brief, []);
    assert.equal(agents.skeptic.insufficient, true);
    assert.equal(agents.anthropologist.hypotheses[0]?.evidenceIds.length, 0);
    assert.match(agents.strategist.budgetAssumption, /simulator/i);
  });
});
