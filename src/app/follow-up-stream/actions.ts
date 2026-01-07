import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "../../lib/firebaseClient";
import { LoopPriority, LoopStatus } from "../../types";

export type AiInputLoop = {
  id: string;
  title: string;
  primaryObjective: string;
  immediateNextStep?: string;
  status: LoopStatus;
  priority: LoopPriority;
  dueAt?: string | null;
  updatedAt?: string | null;
  staleAt?: string | null;
};

export type AiSuggestion = {
  loopId: string;
  rationale: string;
  score: number;
};

export const AI_FOLLOWUP_PROMPT = `
You are a follow-up copilot. Given a list of loops (tasks) return the 3-5 that need action first.

Consider, in order:
- Priority: high > medium > low.
- Status: stalled or act_on are urgent; active is mid; new can wait; closed is never returned.
- Due dates: overdue > due within 3 days > due within 7 days > later/none.
- Staleness / last update: items untouched for 48h should be lifted.
- Clarity of next step: if immediateNextStep is missing, call that out.

Respond with a short rationale for each picked loop explaining why it bubbled up.
`;

export async function getAiFollowUpSuggestions(loops: AiInputLoop[]): Promise<AiSuggestion[]> {
  const functions = getFunctions(getFirebaseApp());
  const callable = httpsCallable<
    { prompt: string; loops: AiInputLoop[] },
    { suggestions?: AiSuggestion[] }
  >(functions, "followUpSuggestions");

  const result = await callable({ prompt: AI_FOLLOWUP_PROMPT.trim(), loops });
  return result.data?.suggestions ?? [];
}
