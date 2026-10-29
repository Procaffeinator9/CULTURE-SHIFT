export type AiProvider = "xai" | "openai" | "compatible";

export type AiSettings = {
  provider: AiProvider;
  baseUrl: string;
  model: string;
  apiKey: string;
};

const STORAGE_KEY = "culture-shift-ai";

export const AI_PRESETS: Record<AiProvider, { baseUrl: string; model: string; label: string }> = {
  xai: { baseUrl: "https://api.x.ai/v1", model: "grok-4.5", label: "xAI (Grok)" },
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o", label: "OpenAI" },
  compatible: { baseUrl: "", model: "", label: "OpenAI-compatible" },
};

export function emptyAi(provider: AiProvider = "xai"): AiSettings {
  const preset = AI_PRESETS[provider];
  return { provider, baseUrl: preset.baseUrl, model: preset.model, apiKey: "" };
}

export function loadAi(): AiSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AiSettings>;
    const provider: AiProvider =
      parsed.provider === "openai" || parsed.provider === "compatible" ? parsed.provider : "xai";
    const apiKey = typeof parsed.apiKey === "string" ? parsed.apiKey : "";
    if (!apiKey) return null;
    return {
      provider,
      baseUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl : AI_PRESETS[provider].baseUrl,
      model: typeof parsed.model === "string" ? parsed.model : AI_PRESETS[provider].model,
      apiKey,
    };
  } catch {
    return null;
  }
}

export function saveAi(settings: AiSettings): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function clearAi(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function maskKey(apiKey: string): string {
  const tail = apiKey.slice(-4);
  return tail ? `••••${tail}` : "";
}
