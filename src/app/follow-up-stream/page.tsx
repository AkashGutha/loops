
import FollowUpStreamClient from "./FollowUpStreamClient";
import { AI_FOLLOWUP_PROMPT, AiInputLoop, getAiFollowUpSuggestions } from "./actions";

const mockLoops: AiInputLoop[] = [
  {
    id: "loop-high-stalled",
    title: "Ship onboarding walkthrough",
    primaryObjective: "Publish the interactive walkthrough for new users",
    immediateNextStep: "Blockers: final QA on step 4",
    status: "stalled",
    priority: "high",
    dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    staleAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "loop-medium-acton",
    title: "Revamp billing emails",
    primaryObjective: "Improve clarity of invoice and receipt emails",
    immediateNextStep: "Draft new copy for renewal notice",
    status: "act_on",
    priority: "medium",
    dueAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    staleAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "loop-low-active",
    title: "Refine analytics dashboard",
    primaryObjective: "Tighten empty states and loading indicators",
    immediateNextStep: "Review metrics table skeleton states",
    status: "active",
    priority: "low",
    dueAt: null,
    updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    staleAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const mockUpdates = [
  {
    id: "upd-1",
    loopId: "loop-high-stalled",
    loopTitle: "Ship onboarding walkthrough",
    body: "Reviewed QA feedback and logged defects for step 4 CTA alignment.",
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "upd-2",
    loopId: "loop-medium-acton",
    loopTitle: "Revamp billing emails",
    body: "Drafted new renewal notice copy; awaiting product review.",
    createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "upd-3",
    loopId: "loop-low-active",
    loopTitle: "Refine analytics dashboard",
    body: "Added shimmer placeholders to the metrics table for slow queries.",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default async function FollowUpStreamPage() {
  const aiSuggestions = await getAiFollowUpSuggestions(mockLoops);

  const suggestionCards = aiSuggestions
    .map((suggestion) => {
      const loop = mockLoops.find((item) => item.id === suggestion.loopId);
      if (!loop) return null;
      return { ...loop, rationale: suggestion.rationale };
    })
    .filter(Boolean) as Array<(typeof mockLoops)[number] & { rationale?: string }>;

  return (
    <FollowUpStreamClient
      prompt={AI_FOLLOWUP_PROMPT}
      suggestions={suggestionCards}
      updates={mockUpdates}
    />
  );
}
