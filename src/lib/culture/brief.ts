import type { Brief, Observation, TaggedLine } from "./types.ts";

type Motif = {
  id: string;
  label: string;
  test: RegExp;
  snapshot: string;
  resonance: string[];
  audiences: string[];
  opportunities: string[];
  risks: string[];
};

const MOTIFS: Motif[] = [
  {
    id: "miniature-desk-pets",
    label: "miniature objects",
    test: /mini(ature)?|desk pet|tiny (animal|figure|pet)|diorama/i,
    snapshot:
      "The wording points at small figures or creatures kept on a desk. That is a definition of the phrase, not a growth claim.",
    resonance: [
      "A desk is a daily stage. A tiny object can be a private joke that other people still recognize on camera.",
      "Scale itself can feel controllable when the rest of life does not. That is a hypothesis about comfort, not a finding.",
    ],
    audiences: [
      "People who already style a workspace and post it.",
      "Gift buyers looking for something small, odd, and under a casual budget.",
    ],
    opportunities: [
      "A desk-accessory line could test one figure, not a universe. Scarcity should be a decision, not a costume.",
      "A stationery or monitor-arm brand could add a single perch or base rather than inventing a character.",
    ],
    risks: [
      "Novelty toys fatigue quickly if the joke is the whole product.",
      "A brand that is serious by reputation can look like it is borrowing a child’s toy without a point.",
    ],
  },
  {
    id: "digicam",
    label: "digital cameras",
    test: /digital camera|digicam|ccd|lo-?fi photo/i,
    snapshot:
      "The wording points at compact digital cameras and the pictures they make. Appeal can be nostalgia, texture, or a break from the phone. Those are rivals, not a ranking.",
    resonance: [
      "A worse camera can feel more intentional than a phone. Friction becomes part of the picture.",
      "Older hardware can signal taste: knowing the reference, not just owning the newest tool.",
    ],
    audiences: [
      "People who already photograph for friends rather than for clients.",
      "Collectors of recent-past electronics, if the object matters as much as the photo.",
    ],
    opportunities: [
      "A print, film, or apparel brand could commission a small run of photos made on a named camera, and say so.",
      "An electronics reseller could test a certified used compact with a plain return window.",
    ],
    risks: [
      "Nostalgia creative that any brand could run is not a camera business.",
      "Supply of used cameras is lumpy. A campaign can outrun the actual stock.",
    ],
  },
  {
    id: "clean-girl",
    label: "named aesthetic",
    test: /clean-?girl|clean girl|aesthetic/i,
    snapshot:
      "A named look is a bundle of hair, makeup, clothes, and setting. Asking whether it is fading is reasonable. This lab will not answer that without dates.",
    resonance: [
      "Minimal looks can read as discipline, money, or fatigue with louder trends. Those readings conflict.",
      "Once a look has a meme name, using it can mark someone as late rather than early. That is a hypothesis about timing.",
    ],
    audiences: [
      "Beauty buyers who follow tutorial language.",
      "People opting out of a look, who are a different segment from people still buying it.",
    ],
    opportunities: [
      "A beauty brand could test a claim about ease, and keep the meme name out of the headline until a fit check says otherwise.",
      "If the question is decline, the useful test is a comparison of save or search behavior over time, not a new product.",
    ],
    risks: [
      "Arriving with the joke name after the joke has turned is a reputation cost, not just a wasted post.",
      "Aesthetic labels hide many products. Fit can be wrong even when the word is familiar.",
    ],
  },
  {
    id: "perfume",
    label: "fragrance objects",
    test: /perfume|fragrance|scent|bottle/i,
    snapshot:
      "The wording is about fragrance as an object, not only as a smell. Bottle shape can carry the interest even when the juice is ordinary. That is a hypothesis.",
    resonance: [
      "An odd bottle is a display decision. It can signal taste more loudly than an invisible scent.",
      "Inconvenient packaging can make a routine feel ceremonial. Ritual is one reading; waste is another.",
    ],
    audiences: [
      "Gift buyers who choose with their eyes.",
      "Collectors who keep bottles after the scent is gone.",
    ],
    opportunities: [
      "A fragrance house could test one unusual vessel at a small volume before a full line.",
      "A home brand adjacent to scent could test a single object that holds a refill, if the bottle is the point.",
    ],
    risks: [
      "Packaging-led interest can collapse at the second purchase if the scent does not earn a repeat.",
      "Odd forms raise shipping damage and returns. That is an operations risk, not a cultural one.",
    ],
  },
  {
    id: "absurd",
    label: "absurdist humor",
    test: /absurd|joke|meme|humou?r|snack brand|ironic/i,
    snapshot:
      "The wording treats humor as a possible brand strategy. A joke can earn attention and still fail as a product. Those are separate questions.",
    resonance: [
      "Shared absurdity is a membership test. If you get it, you are in the room.",
      "Irony lets someone try a product without looking earnest. That protection can also block loyalty.",
    ],
    audiences: [
      "People who already circulate jokes in a specific community.",
      "Occasional buyers who will try one unit because the name is funny.",
    ],
    opportunities: [
      "A snack test can be one flavor, one joke, and a preorder cap. The cap is the measurement.",
      "Put the joke in the name or the film, not in a worse recipe, unless the inconvenience is the idea and you say so.",
    ],
    risks: [
      "Humor that mocks the buyer, or a group the buyer cares about, does not stay funny in a media cycle.",
      "If the joke is detachable from the product, a faster account can copy the joke and skip the inventory.",
    ],
  },
  {
    id: "inconvenient",
    label: "deliberate friction",
    test: /inconvenient|friction|hard(er)? to use|ritual|slow coffee|analog/i,
    snapshot:
      "The wording is about products that are harder than the obvious alternative. People can still buy them. Motive is not established.",
    resonance: [
      "Friction can make a result feel earned. That is the craft hypothesis.",
      "Friction can also be a status marker: time to spare, knowledge to spare. That is the distinction hypothesis.",
    ],
    audiences: [
      "Hobbyists who already accept a fussy setup.",
      "Gift buyers purchasing the idea of a ritual for someone else.",
    ],
    opportunities: [
      "Offer the inconvenient version next to an easy one and see which unit actually leaves the shelf.",
      "Price the friction honestly. If the hard version must be cheaper to sell, the identity story is weaker than it looks.",
    ],
    risks: [
      "Inconvenience that looks like a defect will be reviewed as a defect.",
      "A brand known for saving time contradicts itself if it starts selling delay without a reason.",
    ],
  },
  {
    id: "nostalgia",
    label: "nostalgia",
    test: /nostalg|throwback|y2k|retro|memory|childhood/i,
    snapshot:
      "Nostalgia here means memory used as a reason to pay attention or to buy. Strength relative to other motives is not measured.",
    resonance: [
      "Memory can lower the cost of explaining a product. People already know the reference.",
      "The same reference can feel warm to one cohort and empty to another. Age is a hypothesis, not a segment you have sampled.",
    ],
    audiences: [
      "People who lived through the reference.",
      "Younger buyers using the reference as style, who may not want the original function.",
    ],
    opportunities: [
      "Revive one cue — a color, a format, a name — and keep the rest current. Test which part people mention.",
      "If the question is whether nostalgia got stronger, you need the same measure in two periods. A mood board will not answer it.",
    ],
    risks: [
      "Nostalgia creative is crowded. Familiarity can read as a lack of a new idea.",
      "Rights, trademarks, and living memory of a brand’s actual past are constraints, not flavor.",
    ],
  },
  {
    id: "community",
    label: "niche communities",
    test: /communit|niche|forum|fandom|subculture|in-?group/i,
    snapshot:
      "A niche community is a high-context group with its own references. Attention from outside is not the same as an invitation.",
    resonance: [
      "In-jokes keep the group small on purpose. Recognition is the reward.",
      "Brands are often read as extraction: showing up to borrow credibility. That reading can be fair.",
    ],
    audiences: [
      "Members, who can reject a campaign that non-members enjoy.",
      "Observers who want the aesthetic without the obligations. They are a different buyer.",
    ],
    opportunities: [
      "A collaboration with a named member, paid, and limited, is a cleaner test than a targeted ad using the group’s language.",
      "Measure whether members claim the work, not whether outsiders like the look.",
    ],
    risks: [
      "Misusing an in-joke is public and sticky.",
      "Small groups cannot absorb a large media budget. Saturation can happen at a tiny absolute number.",
    ],
  },
];

const GENERIC_RESONANCE = [
  "Identity: the behavior might help someone show who they are, or who they are not.",
  "Novelty: it might be interesting because it is new to the person, not because it is new to the culture.",
  "Practical need: it might simply work better, cost less, or be easier to find.",
  "Social circulation: it might be spreading because it is easy to copy, not because attachment is deep.",
];

const GENERIC_ALTERNATIVES = [
  "The pattern is an artifact of one platform’s ranking, not a change in taste.",
  "A few loud accounts are being mistaken for a wider public.",
  "Season, price promotion, or a news event explains the moment better than a cultural shift.",
  "The behavior is a commercial seeding that looks organic from the outside.",
];

function subjectFromQuestion(question: string): string {
  const stripped = question
    .replace(/^\s*(why are|why is|why do|why does|is the|is |are |could |what makes|what )\s+/i, "")
    .replace(/\?+\s*$/, "")
    .trim();
  return stripped || question.trim();
}

function line(text: string, kind: TaggedLine["kind"]): TaggedLine {
  return { text, kind };
}

export function buildBrief(args: {
  question: string;
  context?: string;
  brandCategory?: string;
  audience?: string;
  observations?: Observation[];
}): Brief {
  const question = args.question.trim();
  const subject = subjectFromQuestion(question);
  const fired = MOTIFS.filter((motif) => motif.test.test(`${question} ${args.context ?? ""}`));
  const observations = args.observations ?? [];

  const supplied = observations.map((obs) => {
    const signal = obs.signal == null ? "no numeric signal" : `signal ${obs.signal}`;
    return `${obs.date}: ${signal}, source “${obs.source || "unnamed"}”, kind ${obs.kind}, provenance ${obs.provenance}. ${obs.note}`.trim();
  });

  const snapshot: TaggedLine[] = [
    line(
      `“${subject}” is the phrase under investigation. Nothing in this brief is a measured trend unless a supplied observation says so.`,
      "context",
    ),
  ];
  if (args.context?.trim()) {
    snapshot.push(line(`You added context: ${args.context.trim()}`, "supplied"));
  }
  for (const motif of fired) snapshot.push(line(motif.snapshot, "context"));
  if (!fired.length) {
    snapshot.push(
      line(
        "No built-in interpretive frame matched the wording. The notes below are generic questions a researcher would ask about any unfamiliar behavior.",
        "missing",
      ),
    );
  }

  const resonance: TaggedLine[] = [];
  if (fired.length) {
    for (const motif of fired) for (const item of motif.resonance) resonance.push(line(item, "hypothesis"));
  } else {
    for (const item of GENERIC_RESONANCE) resonance.push(line(item, "hypothesis"));
  }

  const audiences: TaggedLine[] = [];
  if (args.audience?.trim()) {
    audiences.push(
      line(
        `You named “${args.audience.trim()}” as the audience to keep in view. That is your assumption, not a detected segment.`,
        "supplied",
      ),
    );
  }
  if (fired.length) {
    for (const motif of fired) {
      for (const item of motif.audiences) audiences.push(line(item, "hypothesis"));
    }
  } else {
    audiences.push(
      line("People already doing the behavior, who can say why in their own words.", "hypothesis"),
      line("People adjacent to it, who recognize it but have not spent money or time.", "hypothesis"),
      line("A brand’s current buyers, who may be indifferent or hostile.", "hypothesis"),
    );
  }

  const alternatives = GENERIC_ALTERNATIVES.map((item) => line(item, "hypothesis"));

  const opportunities: TaggedLine[] = [];
  const category = args.brandCategory?.trim();
  if (category && category !== "Unspecified") {
    opportunities.push(
      line(
        `You set the brand category to ${category}. Ideas below are hypotheses about that category, not a measured fit score.`,
        "supplied",
      ),
    );
  }
  if (fired.length) {
    for (const motif of fired) for (const item of motif.opportunities) opportunities.push(line(item, "hypothesis"));
  } else {
    opportunities.push(
      line(
        "Pick the smallest product or message that would be true if the hypothesis is right, and false if it is wrong.",
        "hypothesis",
      ),
      line("Keep the test inside one category so a vague “everyone” result cannot be mistaken for demand.", "hypothesis"),
    );
  }

  const risks: TaggedLine[] = [
    line("With no time series, calling this emerging, saturated, or fading would be a story, not a result.", "missing"),
    line("Trend language travels faster than repeat purchase. Attention is not demand.", "hypothesis"),
  ];
  for (const motif of fired) for (const item of motif.risks) risks.push(line(item, "hypothesis"));
  if (!observations.length) {
    risks.push(line("No observations are on file. Every cultural claim in this brief is provisional.", "missing"));
  }

  const missing = [
    observations.length < 2
      ? "At least two dated signals, from named sources, before any change is calculated."
      : "More dates only help if they use the same signal definition.",
    "A note tagged as behavior or meaning, if you want resonance to enter the score. Attention counts will not be substituted.",
    "A comparison group, if you want to know whether the pattern is specific to this phenomenon.",
    category && category !== "Unspecified"
      ? "A brand-fit assumption you are willing to label as yours, or a reason to leave fit unscored."
      : "A brand category, only if you want ideas constrained. It is optional.",
  ];

  const experiment = category && category !== "Unspecified"
    ? `Run a one-week, capped test in ${category}: one offer, one sentence of positioning, and a count of people who take a costly action (preorder, waitlist with an email, or a purchase).`
    : "Run a one-week, capped test: one offer, one sentence of positioning, and a count of people who take a costly action rather than a like.";

  return {
    question,
    subject,
    generatedBy: "rule-engine-v1",
    framesFired: fired.map((motif) => motif.label),
    snapshot,
    resonance,
    audiences,
    alternatives,
    opportunities,
    risks,
    nextAction: {
      experiment,
      success: "A costly action from people who can name a reason that matches the hypothesis you wrote down before the test.",
      stop: "Stop if the costly actions come with reasons that fit a rival explanation, or if you cannot say what the signal was.",
    },
    missing,
    supplied,
  };
}
