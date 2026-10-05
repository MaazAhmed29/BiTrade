export const AI_UNAVAILABLE_MESSAGE =
  "AI assistant is temporarily unavailable. You can still trade manually using paper trading.";

export type AiConfig = {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl: string;
};

const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-flash-latest";

export function getAiConfig(): AiConfig | null {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase() ?? "";
  const apiKey = process.env.AI_API_KEY?.trim() ?? "";
  if (!provider || !apiKey) return null;
  if (provider !== "gemini") return null;

  const baseUrl = (process.env.AI_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const model = process.env.AI_MODEL?.trim() || DEFAULT_MODEL;
  return { provider, apiKey, model, baseUrl };
}

export function aiSetupHint(): string | null {
  if (process.env.NODE_ENV === "production") return null;
  return "Set AI_PROVIDER, AI_API_KEY, and AI_MODEL in .env.local to enable the assistant.";
}
