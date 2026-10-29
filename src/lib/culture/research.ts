import { createServerFn } from "@tanstack/react-start";
import { PROMPT_VERSION, type AgentOutput, type Uncertainty } from "./types.ts";

export type EvidenceInput = {
  id: string;
  date: string;
  signal: number | null;
  note: string;
  source: string;
  kind: string;
};

export type AskRequest = {
  apiKey: string;
  baseUrl: string;
  model: string;
  question: string;
  context: string;
  evidence: EvidenceInput[];
};

export type AskResponse =
  | { ok: true; model: string; promptVersion: string; output: AgentOutput; warnings: string[] }
  | { ok: false; message: string };

const UNCERTAINTY = new Set<Uncertainty>(["high", "medium", "low"]);

function asString(value: unknown, max = 500): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item, 320)).filter(Boolean).slice(0, 5);
}

function blockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (host === "0.0.0.0" || host === "::1" || host === "metadata.google.internal") return true;
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;
  const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

export function assertChatUrl(baseUrl: string): string {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error("The API address is not a valid URL.");
  }
  if (url.protocol !== "https:") throw new Error("The API address must use https.");
  if (url.username || url.password) throw new Error("Put the key in the key field, not in the address.");
  if (blockedHost(url.hostname)) throw new Error("That address is not allowed.");
  const path = url.pathname.replace(/\/$/, "");
  url.pathname = path.endsWith("/chat/completions") ? path : `${path}/chat/completions`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = (fenced?.[1] ?? text).trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(body.slice(start, end + 1));
  return JSON.parse(body);
}

function parseOutput(raw: unknown, allowedIds: Set<string>): { output: AgentOutput; warnings: string[] } {
  const warnings: string[] = [];
  const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const anthropologist = (record.anthropologist ?? {}) as Record<string, unknown>;
  const skeptic = (record.skeptic ?? {}) as Record<string, unknown>;
  const strategist = (record.strategist ?? {}) as Record<string, unknown>;
  const hypothesesIn = Array.isArray(anthropologist.hypotheses) ? anthropologist.hypotheses : [];
  const hypotheses = hypothesesIn
    .slice(0, 4)
    .map((item) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const ids = Array.isArray(row.evidenceIds) ? row.evidenceIds.map((id) => asString(id, 80)) : [];
      const kept = ids.filter((id) => allowedIds.has(id));
      if (kept.length !== ids.filter(Boolean).length) warnings.push("Removed an evidence id the model invented.");
      const uncertainty = UNCERTAINTY.has(row.uncertainty as Uncertainty) ? (row.uncertainty as Uncertainty) : "high";
      return { claim: asString(row.claim), evidenceIds: kept, uncertainty };
    })
    .filter((item) => item.claim);

  const output: AgentOutput = {
    anthropologist: {
      hypotheses: hypotheses.length
        ? hypotheses
        : [{ claim: "The model did not return a usable hypothesis.", evidenceIds: [], uncertainty: "high" }],
      alternatives: asStringList(anthropologist.alternatives),
      nextObservation: asString(anthropologist.nextObservation, 360) || "The model did not name a next observation.",
    },
    skeptic: {
      insufficient: Boolean(skeptic.insufficient) || allowedIds.size === 0,
      weakAssumptions: asStringList(skeptic.weakAssumptions),
      missingEvidence: asStringList(skeptic.missingEvidence),
      biases: asStringList(skeptic.biases),
      contradictions: asStringList(skeptic.contradictions),
      whyTemporary: asStringList(skeptic.whyTemporary),
      whatWouldChange: asString(skeptic.whatWouldChange) || "The model did not say what would change the conclusion.",
    },
    strategist: {
      concept: asString(strategist.concept) || "The model did not propose a concept.",
      audienceHypothesis: asString(strategist.audienceHypothesis) || "The model did not name an audience.",
      brandFit: asString(strategist.brandFit) || "The model did not discuss brand fit.",
      experiment: asString(strategist.experiment) || "The model did not describe an experiment.",
      budgetAssumption: asString(strategist.budgetAssumption, 280) || "Set any budget in the simulator. Do not treat model prose as a cost.",
      successMetric: asString(strategist.successMetric, 280) || "The model did not name a success metric.",
      stopCriteria: asString(strategist.stopCriteria, 280) || "The model did not name a stopping rule.",
      risks: asStringList(strategist.risks),
    },
  };
  return { output, warnings };
}

function safeMessage(status: number, body: string, secret: string): string {
  const cleaned = body.replaceAll(secret, "••••").slice(0, 180);
  if (status === 401 || status === 403) return "The key was rejected. Check the key and the provider.";
  return `The model could not be reached (status ${status}). ${cleaned}`;
}

export const askWithUserKey = createServerFn({ method: "POST" })
  .validator((input: unknown): AskRequest => {
    if (!input || typeof input !== "object") throw new Error("Invalid request");
    const data = input as Record<string, unknown>;
    const apiKey = typeof data.apiKey === "string" ? data.apiKey.trim() : "";
    if (apiKey.length < 8 || apiKey.length > 400) throw new Error("Paste a key between 8 and 400 characters.");
    const baseUrl = typeof data.baseUrl === "string" ? data.baseUrl.trim() : "";
    const model = typeof data.model === "string" ? data.model.trim().slice(0, 80) : "";
    if (!model) throw new Error("Name the model.");
    const question = typeof data.question === "string" ? data.question.trim() : "";
    if (question.length < 3 || question.length > 500) throw new Error("Use a question between 3 and 500 characters.");
    const context = typeof data.context === "string" ? data.context.slice(0, 1200) : "";
    const evidence = Array.isArray(data.evidence) ? data.evidence.slice(0, 16) : [];
    const clean: EvidenceInput[] = [];
    for (const item of evidence) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const id = typeof row.id === "string" ? row.id.slice(0, 80) : "";
      if (!id) continue;
      clean.push({
        id,
        date: typeof row.date === "string" ? row.date.slice(0, 20) : "",
        signal: typeof row.signal === "number" && Number.isFinite(row.signal) ? row.signal : null,
        note: typeof row.note === "string" ? row.note.slice(0, 240) : "",
        source: typeof row.source === "string" ? row.source.slice(0, 80) : "",
        kind: typeof row.kind === "string" ? row.kind.slice(0, 40) : "",
      });
    }
    assertChatUrl(baseUrl);
    return { apiKey, baseUrl, model, question, context, evidence: clean };
  })
  .handler(async ({ data }): Promise<AskResponse> => {
    let endpoint = "";
    try {
      endpoint = assertChatUrl(data.baseUrl);
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "The API address was rejected." };
    }
    const evidenceBlock = data.evidence.length
      ? data.evidence
          .map((item) => `- id ${item.id}; date ${item.date}; signal ${item.signal ?? "none"}; kind ${item.kind}; note ${item.note || "none"}`)
          .join("\n")
      : "No evidence was supplied.";
    const body = {
      model: data.model,
      temperature: 0.3,
      max_tokens: 900,
      messages: [
        {
          role: "system",
          content:
            "You are three labelled research roles for CULTURE//SHIFT. Return one JSON object and nothing else. Do not invent citations, URLs, dates, engagement, prices, or market sizes. evidenceIds may only repeat ids from the supplied list. If evidence is empty, skeptic.insufficient must be true. Numbers belong in the calculator, not in prose.",
        },
        {
          role: "user",
          content: `Question: ${data.question}\nContext: ${data.context || "none"}\nEvidence:\n${evidenceBlock}\n\nJSON shape:\n{"anthropologist":{"hypotheses":[{"claim":"","evidenceIds":[],"uncertainty":"high"}],"alternatives":[""],"nextObservation":""},"skeptic":{"insufficient":true,"weakAssumptions":[],"missingEvidence":[],"biases":[],"contradictions":[],"whyTemporary":[],"whatWouldChange":""},"strategist":{"concept":"","audienceHypothesis":"","brandFit":"","experiment":"","budgetAssumption":"","successMetric":"","stopCriteria":"","risks":[]}}`,
        },
      ],
    };
    try {
      const run = () =>
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.apiKey}` },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(25_000),
        });
      let res = await run();
      if (res.status >= 500 || res.status === 429) res = await run();
      if (!res.ok) {
        const text = await res.text();
        return { ok: false, message: safeMessage(res.status, text, data.apiKey) };
      }
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = json.choices?.[0]?.message?.content ?? "";
      const parsed = extractJson(text);
      const allowed = new Set(data.evidence.map((item) => item.id));
      const { output, warnings } = parseOutput(parsed, allowed);
      return { ok: true, model: data.model, promptVersion: PROMPT_VERSION, output, warnings };
    } catch (error) {
      const message = error instanceof Error ? error.message.replaceAll(data.apiKey, "••••") : "The request failed.";
      if (message.includes("JSON") || message.toLowerCase().includes("json")) {
        return { ok: false, message: "The model replied, but the reply was not valid JSON. Nothing was invented to fill the gap." };
      }
      return { ok: false, message: "The model request failed before a usable reply. The local brief is unchanged." };
    }
  });
