import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { GenerationResultSchema, type GenerationResult } from "./schema";
import { buildGenerationPrompt } from "./prompt";
import type { GenerationInput } from "./types";

// Single isolation point for the generation LLM call — separate from the
// Bridge Analysis provider so either can change independently.
const client = new Anthropic();

const DEFAULT_MODEL = "claude-sonnet-5";
const MODEL = process.env.BRIDGE_GENERATION_MODEL || DEFAULT_MODEL;

const EFFORT_LEVELS = ["low", "medium", "high", "xhigh", "max"] as const;
type EffortLevel = (typeof EFFORT_LEVELS)[number];
const DEFAULT_EFFORT: EffortLevel = "medium";
const configuredEffort = process.env.BRIDGE_GENERATION_EFFORT;
const EFFORT: EffortLevel = EFFORT_LEVELS.includes(configuredEffort as EffortLevel)
  ? (configuredEffort as EffortLevel)
  : DEFAULT_EFFORT;

export async function generateVersion(input: GenerationInput): Promise<GenerationResult> {
  const { system, user } = buildGenerationPrompt(input);

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system,
    output_config: {
      format: zodOutputFormat(GenerationResultSchema),
      effort: EFFORT,
    },
    messages: [{ role: "user", content: user }],
  });

  if (!response.parsed_output) {
    throw new Error("Generation did not return a valid structured response.");
  }

  return response.parsed_output;
}
