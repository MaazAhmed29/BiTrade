import { NextResponse } from "next/server";
import { AI_UNAVAILABLE_MESSAGE, aiSetupHint, getAiConfig } from "@/lib/ai/config";
import { createGeminiProvider } from "@/lib/ai/gemini";
import { buildSystemInstruction } from "@/lib/ai/prompt";
import { AI_TOOL_DEFINITIONS, executeAiTool } from "@/lib/ai/tools";
import type { TradeProposal } from "@/lib/ai/proposals";
import type { AIToolResult, AIChatTurn } from "@/lib/ai/types";
import { getApiUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_MESSAGE_LENGTH = 2_000;
const MAX_HISTORY_MESSAGES = 20;
const MAX_HISTORY_LENGTH = 4_000;
const MAX_TOOL_ROUNDS = 5;

type ChatBody = {
  message: string;
  history?: Array<{ role: string; content: string }>;
};

function parseChatBody(body: unknown): { ok: true; value: ChatBody } | { ok: false } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return { ok: false };
  const record = body as Record<string, unknown>;

  if (typeof record.message !== "string") return { ok: false };
  const message = record.message.trim();
  if (message.length === 0 || message.length > MAX_MESSAGE_LENGTH) return { ok: false };

  const history: Array<{ role: string; content: string }> = [];
  if (record.history !== undefined) {
    if (!Array.isArray(record.history) || record.history.length > MAX_HISTORY_MESSAGES) {
      return { ok: false };
    }
    for (const entry of record.history) {
      if (typeof entry !== "object" || entry === null) return { ok: false };
      const item = entry as Record<string, unknown>;
      if (item.role !== "user" && item.role !== "assistant") return { ok: false };
      if (typeof item.content !== "string") return { ok: false };
      if (item.content.length === 0 || item.content.length > MAX_HISTORY_LENGTH)
        return { ok: false };
      history.push({ role: item.role, content: item.content });
    }
  }

  return { ok: true, value: { message, history } };
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = parseChatBody(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Message must be a non empty string and history must be valid." },
      { status: 400 },
    );
  }

  const config = getAiConfig();
  if (!config) {
    return NextResponse.json(
      { error: AI_UNAVAILABLE_MESSAGE, hint: aiSetupHint() },
      { status: 503 },
    );
  }

  const provider = createGeminiProvider(config);
  const supabase = await createClient();
  const proposals: TradeProposal[] = [];

  const turns: AIChatTurn[] = [
    ...(parsed.value.history ?? []).map<AIChatTurn>((entry) => ({
      role: entry.role === "user" ? "user" : "assistant",
      content: entry.content,
    })),
    { role: "user", content: parsed.value.message },
  ];

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const result = await provider.chat({
        systemInstruction: buildSystemInstruction(),
        turns,
        tools: AI_TOOL_DEFINITIONS,
      });

      if (result.toolCalls.length === 0) {
        return NextResponse.json({
          reply: result.text?.trim() || "I could not complete that request.",
          proposals,
        });
      }

      turns.push({ role: "assistantToolCalls", calls: result.toolCalls });

      const toolResults: AIToolResult[] = [];
      for (const call of result.toolCalls) {
        const execution = await executeAiTool(call.name, call.args, {
          supabase,
          userId: user.userId,
        });
        if (execution.proposal) proposals.push(execution.proposal);
        toolResults.push({ name: call.name, result: execution.result });
      }
      turns.push({ role: "toolResults", results: toolResults });
    }

    return NextResponse.json({
      reply: "I could not finish that request. Please try again.",
      proposals,
    });
  } catch (error) {
    console.error("AI chat failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: AI_UNAVAILABLE_MESSAGE, hint: aiSetupHint() },
      { status: 503 },
    );
  }
}
