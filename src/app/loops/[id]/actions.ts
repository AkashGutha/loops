"use server";

import { genkit, z } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";

const ai = genkit({
  plugins: [googleAI({apiKey: process.env.GEMINI_API_KEY || ""})],
});

const SuggestionSchema = z.object({
  nextStep: z.string(),
});

export async function generateNextStepSuggestion(objective: string, updates: string[]): Promise<string> {
  const prompt = `
    You are an expert project manager.
    Your goal is to suggest a concrete, actionable, immediate next step for a project loop.
    
    Primary Objective: "${objective}"
    
    Recent Updates (most recent first):
    ${updates.map(u => `- ${u}`).join("\n")}
    
    Based on the objective and the recent updates, formulate a single, clear, immediate next step.
    The next step should be actionable and specific.
    Ideally include an owner and a due date if implied by context, otherwise keep it general but actionable.
    Keep it under 200 characters.
  `;

  try {
    const { output } = await ai.generate({
      model: googleAI.model("gemini-3-flash-preview"),
      prompt: prompt,
      config: {
        apiKey: process.env.GEMINI_API_KEY || "",
      },
      output: { schema: SuggestionSchema },
    });
    return output?.nextStep ?? "Review recent updates and decide on the next action.";
  } catch (error) {
    console.error("AI Generation failed:", error);
    return "Could not generate suggestion. Please try again.";
  }
}
