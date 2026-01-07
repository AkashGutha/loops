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

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const parseDate = (value?: string | null): Date | null => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
};

export async function getAiFollowUpSuggestions(loops: AiInputLoop[]): Promise<AiSuggestion[]> {
    console.log("AI prompt being sent:", AI_FOLLOWUP_PROMPT);
    console.log("Loop payload length:", loops.length);

    // Mock external call latency
    await new Promise((resolve) => setTimeout(resolve, 800));

    const suggestions = loops
        .filter((loop) => loop.status !== "closed")
        .map((loop) => {
            const now = Date.now();
            const due = parseDate(loop.dueAt)?.getTime() ?? null;
            const updated = parseDate(loop.updatedAt)?.getTime() ?? null;
            const stale = parseDate(loop.staleAt)?.getTime() ?? null;

            const rationale: string[] = [];
            let score = 0;

            // Priority
            if (loop.priority === "high") {
                score += 4;
                rationale.push("High priority");
            } else if (loop.priority === "medium") {
                score += 2;
            }

            // Status urgency
            if (loop.status === "stalled") {
                score += 4;
                rationale.push("Stalled and needs movement");
            } else if (loop.status === "act_on") {
                score += 3;
                rationale.push("Flagged to act on");
            } else if (loop.status === "active") {
                score += 1;
            }

            // Due date pressure
            if (due) {
                const diffDays = (due - now) / ONE_DAY_MS;
                if (diffDays < 0) {
                    score += 5;
                    rationale.push(`Overdue by ${Math.abs(Math.floor(diffDays))} days`);
                } else if (diffDays <= 3) {
                    score += 3;
                    rationale.push("Due within 3 days");
                } else if (diffDays <= 7) {
                    score += 1;
                    rationale.push("Due within a week");
                }
            }

            // Staleness / last touch
            if (stale && now - stale > 2 * ONE_DAY_MS) {
                score += 2;
                rationale.push("Stale for 48h+");
            } else if (updated && now - updated > 2 * ONE_DAY_MS) {
                score += 1;
                rationale.push("Not updated in 48h");
            }

            // Missing next step
            if (!loop.immediateNextStep) {
                score += 1;
                rationale.push("Needs next step defined");
            }

            return {
                loopId: loop.id,
                score,
                rationale: rationale.join(", ") || "Routine check",
            } satisfies AiSuggestion;
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

    return suggestions;
}
