"use server";

import { genkit, z } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import { AiInputLoop, AiSuggestion, AI_FOLLOWUP_PROMPT } from "./shared";

const ai = genkit({
  plugins: [googleAI({apiKey: process.env.GEMINI_API_KEY || ""})],
});

const SuggestionSchema = z.object({
  loopId: z.string(),
  rationale: z.string(),
  score: z.number(),
});

const OutputSchema = z.object({
  suggestions: z.array(SuggestionSchema),
});

export async function getAiFollowUpSuggestions(loops: AiInputLoop[]): Promise<AiSuggestion[]> {
  const { output } = await ai.generate({
    model: googleAI.model("gemini-3-flash-preview"),
    prompt: `${AI_FOLLOWUP_PROMPT.trim()}\n\nHere are the loops:\n${JSON.stringify(loops)}`,
    config: {
      apiKey: process.env.GEMINI_API_KEY || "",
    },
    output: { schema: OutputSchema },
  });

  return output?.suggestions ?? [];
}
