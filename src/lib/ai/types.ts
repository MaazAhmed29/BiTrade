export type AIToolCall = {
  name: string;
  args: Record<string, unknown>;
  thoughtSignature?: string;
};

export type AIToolResult = {
  name: string;
  result: unknown;
};

export type AIChatTurn =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string }
  | { role: "assistantToolCalls"; calls: AIToolCall[] }
  | { role: "toolResults"; results: AIToolResult[] };

export type AIToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type AIChatInput = {
  systemInstruction: string;
  turns: AIChatTurn[];
  tools: AIToolDefinition[];
};

export type AIChatResult = {
  text: string | null;
  toolCalls: AIToolCall[];
};

export interface AIProvider {
  chat(input: AIChatInput): Promise<AIChatResult>;
}
