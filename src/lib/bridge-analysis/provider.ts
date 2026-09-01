import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { BridgeAnalysisResultSchema, type BridgeAnalysisResult } from "./schema";
import { buildAnalysisPrompt } from "./prompt";
import type { BridgeAnalysisInput } from "./types";

// Single isolation point for the LLM provider. Swapping models or providers
// later should only require changes in this file.
const client = new Anthropic();

// Ordinary accommodation analysis doesn't need the most expensive model or
// the highest reasoning effort — both are configurable so cost/quality can
// be tuned per deployment without touching the provider code.
const DEFAULT_MODEL = "claude-sonnet-5";
const MODEL = process.env.BRIDGE_ANALYSIS_MODEL || DEFAULT_MODEL;

const EFFORT_LEVELS = ["low", "medium", "high", "xhigh", "max"] as const;
type EffortLevel = (typeof EFFORT_LEVELS)[number];
const DEFAULT_EFFORT: EffortLevel = "medium";
const configuredEffort = process.env.BRIDGE_ANALYSIS_EFFORT;
const EFFORT: EffortLevel = EFFORT_LEVELS.includes(configuredEffort as EffortLevel)
  ? (configuredEffort as EffortLevel)
  : DEFAULT_EFFORT;

export async function analyzeMaterial(input: BridgeAnalysisInput): Promise<BridgeAnalysisResult> {
  const { system, user } = buildAnalysisPrompt(input);

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system,
    output_config: {
      format: zodOutputFormat(BridgeAnalysisResultSchema),
      effort: EFFORT,
    },
    messages: [{ role: "user", content: user }],
  });

  if (!response.parsed_output) {
    throw new Error("Bridge Analysis did not return a valid structured response.");
  }

  return response.parsed_output;
}
