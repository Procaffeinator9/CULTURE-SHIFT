import type { Observation } from "./types.ts";

export type SampleCase = {
  id: string;
  name: string;
  question: string;
  description: string;
  category: "Novelty" | "Nostalgia" | "Aesthetics" | "Humor" | "Community" | "Friction";
  brandAngles: string[];
};

/**
 * Research prompts, not a live ranking.
 * Descriptions say what a phrase usually refers to. They do not claim that attention, search, or sales are rising.
 */
export const SAMPLE_CASES: SampleCase[] = [
  {
    id: "desk-pets",
    name: "Miniature desk pets",
    question: "Why are miniature desk pets becoming popular?",
    description:
      "Usually refers to small animal or character figures kept on a desk. People talk about them as toys, comfort objects, and desk styling. Whether attention is rising is not measured in this lab.",
    category: "Novelty",
    brandAngles: ["Desk accessories", "Collectibles", "Gifts"],
  },
  {
    id: "digicam",
    name: "Digital cameras, again",
    question: "Why are digital cameras appealing again?",
    description:
      "Refers to interest in older compact digital cameras and their lo-fi photos. Nostalgia is one hypothesis. A status signal or a reaction to phone photos are others. No search series is attached.",
    category: "Nostalgia",
    brandAngles: ["Electronics", "Apparel graphics", "Photo printing"],
  },
  {
    id: "clean-girl",
    name: "Clean-girl aesthetic",
    question: "Is the clean-girl aesthetic losing relevance?",
    description:
      "A named look: slick hair, minimal makeup, neutral clothes. The question of decline is open. This card does not contain a time series, so the lab will not call it fading.",
    category: "Aesthetics",
    brandAngles: ["Beauty", "Apparel", "Fragrance"],
  },
  {
    id: "perfume-bottles",
    name: "Unusual perfume bottles",
    question: "Why are consumers attracted to unusual perfume bottles?",
    description:
      "Refers to fragrance packaging that is sculptural, odd, or inconvenient to display. Attraction is a hypothesis to test, not a recorded purchase motive.",
    category: "Aesthetics",
    brandAngles: ["Fragrance", "Gifts"],
  },
  {
    id: "absurd-snack",
    name: "Absurdist snack humor",
    question: "Could absurdist humor inspire a new snack brand?",
    description:
      "A strategy question about joke-led food brands and internet humor. It is not evidence that a joke format sells snacks.",
    category: "Humor",
    brandAngles: ["Snacks", "Beverage"],
  },
  {
    id: "inconvenient",
    name: "Deliberately inconvenient products",
    question: "Why do people buy products that are deliberately inconvenient?",
    description:
      "Covers goods that add friction on purpose: slow coffee, fussy routines, objects that are worse on paper. Inconvenience can be identity, ritual, or a status cue. Those are rival hypotheses.",
    category: "Friction",
    brandAngles: ["Food", "Home", "Apparel"],
  },
  {
    id: "nostalgia-buy",
    name: "Nostalgia as a purchase motive",
    question: "Is nostalgia becoming a stronger purchasing motivation?",
    description:
      "Asks whether memory is doing more work in purchase decisions than before. The lab has no baseline era to compare, so the question stays open.",
    category: "Nostalgia",
    brandAngles: ["Food", "Beauty", "Entertainment"],
  },
  {
    id: "niche-communities",
    name: "Niche internet communities",
    question: "What makes niche internet communities attractive to brands?",
    description:
      "Small, high-context groups with in-jokes and gatekeeping. Attractiveness to a brand is not the same thing as permission to enter. No community has been scraped for this card.",
    category: "Community",
    brandAngles: ["Any — with a fit test"],
  },
];

export const EXAMPLE_PROMPTS = SAMPLE_CASES.map((c) => c.question);

export type SyntheticSeries = {
  id: string;
  name: string;
  disclaimer: string;
  observations: Observation[];
};

function synth(id: string, rows: Array<[string, number]>): Observation[] {
  return rows.map(([date, signal], index) => ({
    id: `${id}-${index + 1}`,
    date,
    signal,
    note: "Synthetic demonstration point. Not observed on a platform.",
    source: "synthetic-demonstration",
    kind: "attention" as const,
    provenance: "synthetic-demonstration" as const,
  }));
}

export const SYNTHETIC_SERIES: SyntheticSeries[] = [
  {
    id: "synth-decline",
    name: "Demonstration A — peak, then a real decline",
    disclaimer:
      "These numbers were written so the half-life formula has a peak and a later drop through 50%. They were not measured.",
    observations: synth("synth-decline", [
      ["2024-01-01", 12],
      ["2024-02-01", 22],
      ["2024-03-01", 36],
      ["2024-04-01", 51],
      ["2024-05-01", 66],
      ["2024-06-01", 74],
      ["2024-07-01", 60],
      ["2024-08-01", 44],
      ["2024-09-01", 31],
      ["2024-10-01", 22],
    ]),
  },
  {
    id: "synth-flat",
    name: "Demonstration B — holds, no half-life",
    disclaimer:
      "A flat constructed series. Half-life should come back not estimable, because the signal never falls to half its peak.",
    observations: synth("synth-flat", [
      ["2024-01-01", 40],
      ["2024-02-01", 42],
      ["2024-03-01", 39],
      ["2024-04-01", 41],
      ["2024-05-01", 40],
      ["2024-06-01", 43],
      ["2024-07-01", 38],
      ["2024-08-01", 41],
    ]),
  },
  {
    id: "synth-short",
    name: "Demonstration C — too short to classify",
    disclaimer: "Two constructed points. Velocity may be described. Lifecycle, persistence, and half-life must stay withheld.",
    observations: synth("synth-short", [
      ["2024-03-01", 10],
      ["2024-05-01", 16],
    ]),
  },
];

export const BRAND_CATEGORIES = [
  "Unspecified",
  "Desk accessories",
  "Fragrance",
  "Snacks",
  "Beauty",
  "Apparel",
  "Beverage",
  "Electronics",
  "Other",
] as const;
