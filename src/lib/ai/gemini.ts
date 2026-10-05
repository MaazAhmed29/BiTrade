import type { AIChatInput, AIChatResult, AIProvider, AIToolCall } from "@/lib/ai/types";
import type { AiConfig } from "@/lib/ai/config";

type GeminiPart = {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: unknown };
  thoughtSignature?: string;
};

type GeminiContent = {
  role: "user" | "model";
  parts: GeminiPart[];
};

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }>;
  error?: { message?: string };
};

const REQUEST_TIMEOUT_MS = 45_000;
const RETRYABLE_STATUS = new Set([429, 503]);
const MAX_RETRIES = 2;

function toContents(turns: AIChatInput["turns"]): GeminiContent[] {
  const contents: GeminiContent[] = [];
  for (const turn of turns) {
    if (turn.role === "user") {
      contents.push({ role: "user", parts: [{ text: turn.content }] });
    } else if (turn.role === "assistant") {
      contents.push({ role: "model", parts: [{ text: turn.content }] });
    } else if (turn.role === "assistantToolCalls") {
      contents.push({
        role: "model",
        parts: turn.calls.map((call) => ({
          functionCall: { name: call.name, args: call.args },
          ...(call.thoughtSignature ? { thoughtSignature: call.thoughtSignature } : {}),
        })),
      });
    } else {
      contents.push({
        role: "user",
        parts: turn.results.map((entry) => ({
          functionResponse: { name: entry.name, response: entry.result },
        })),
      });
    }
  }
  return contents;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createGeminiProvider(config: AiConfig): AIProvider {
  return {
    async chat(input: AIChatInput): Promise<AIChatResult> {
      const body: Record<string, unknown> = {
        systemInstruction: { parts: [{ text: input.systemInstruction }] },
        contents: toContents(input.turns),
        generationConfig: { temperature: 0.2 },
      };
      if (input.tools.length > 0) {
        body.tools = [
          {
            functionDeclarations: input.tools.map((tool) => ({
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters,
            })),
          },
        ];
      }

      const url = `${config.baseUrl}/models/${encodeURIComponent(config.model)}:generateContent`;
      let lastError = "AI request failed.";

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
        let response: Response;
        try {
          response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": config.apiKey },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          });
        } catch {
          lastError = "The AI provider could not be reached.";
          continue;
        }

        if (!response.ok) {
          let detail = "";
          try {
            const payload = (await response.json()) as GeminiResponse;
            detail = payload.error?.message ?? "";
          } catch {
            detail = "";
          }
          lastError = detail || `AI provider returned status ${response.status}.`;
          if (RETRYABLE_STATUS.has(response.status) && attempt < MAX_RETRIES) {
            await sleep(1_500 * (attempt + 1));
            continue;
          }
          throw new Error(lastError);
        }

        const payload = (await response.json()) as GeminiResponse;
        const parts = payload.candidates?.[0]?.content?.parts ?? [];
        const text = parts
          .map((part) => part.text ?? "")
          .filter((entry) => entry.length > 0)
          .join("");
        const toolCalls: AIToolCall[] = parts
          .filter((part) => part.functionCall?.name)
          .map((part) => ({
            name: part.functionCall!.name,
            args: part.functionCall!.args ?? {},
            ...(part.thoughtSignature ? { thoughtSignature: part.thoughtSignature } : {}),
          }));

        return { text: text.length > 0 ? text : null, toolCalls };
      }

      throw new Error(lastError);
    },
  };
}
