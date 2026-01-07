"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, ArrowRight, Clock, Sparkles, Pencil, X } from "lucide-react";
import { LoopPriority, LoopStatus } from "../../types";

type Suggestion = {
  id: string;
  title: string;
  priority: LoopPriority;
  status: LoopStatus;
  primaryObjective: string;
  dueAt?: string | null;
  rationale?: string;
};

type UpdateItem = {
  id: string;
  loopId: string;
  loopTitle: string;
  body: string;
  createdAt?: string | null;
};

type FollowUpStreamClientProps = {
  prompt: string;
  suggestions: Suggestion[];
  updates: UpdateItem[];
};

const formatTimeAgo = (value?: string | null) => {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const intervals: [number, string][] = [
    [31536000, "year"],
    [2592000, "month"],
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
  ];

  for (const [secs, label] of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count} ${label}${count > 1 ? "s" : ""} ago`;
  }
  return `${seconds} seconds ago`;
};

export default function FollowUpStreamClient({ prompt, suggestions, updates }: FollowUpStreamClientProps) {
  const [promptText, setPromptText] = useState(prompt);
  const [showPromptModal, setShowPromptModal] = useState(false);

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-slate-50 dark:bg-slate-950/50">
      <div className="mx-auto w-full max-w-5xl space-y-8 px-6 py-12">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Follow-up Stream</h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">Server-rendered follow-ups with AI suggestions and your recent work.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowPromptModal(true)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 shadow-sm transition hover:border-purple-300 hover:text-purple-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-purple-600"
            aria-label="Edit AI prompt"
          >
            <Pencil className="h-3.5 w-3.5" />
            Prompt
          </button>
        </div>

        {/* AI Suggestions Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">AI Follow-up Suggestions</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {suggestions.length === 0 ? (
              <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white/50 p-8 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
                No urgent follow-ups detected by AI.
              </div>
            ) : (
              suggestions.map((loop) => (
                <Link key={loop.id} href={`/loops/${loop.id}`} className="group block h-full">
                  <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-purple-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-purple-700">
                    <div>
                      <div className="mb-3 flex items-start justify-between">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            loop.priority === "high"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                              : loop.priority === "medium"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {loop.priority}
                        </span>
                        {(loop.status === "stalled" || loop.status === "act_on") && (
                          <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-500">
                            <AlertTriangle className="h-3 w-3" /> {loop.status === "stalled" ? "Stalled" : "Act on"}
                          </span>
                        )}
                      </div>
                      <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400">
                        {loop.title}
                      </h3>
                      {loop.rationale && (
                        <div className="mb-3 rounded bg-purple-50 px-2 py-1.5 text-xs text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">
                          Why: {loop.rationale}
                        </div>
                      )}
                      <p className="mb-4 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{loop.primaryObjective || "No objective set"}</p>
                    </div>

                    <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        {loop.dueAt ? (
                          <>
                            <Clock className="h-3.5 w-3.5" />
                            <span className={new Date(loop.dueAt) < new Date() ? "text-red-500" : ""}>Due {formatTimeAgo(loop.dueAt)}</span>
                          </>
                        ) : (
                          <span>No due date</span>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Work Done Stream Section */}
        <section className="space-y-4 pt-8">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Work Done Stream</h2>
          </div>

          <div className="relative space-y-8 border-l-2 border-slate-200 pl-6 dark:border-slate-800">
            {updates.length === 0 ? (
              <div className="py-8 text-sm text-slate-500">No recent activity found.</div>
            ) : (
              updates.map((update) => (
                <div key={update.id} className="relative group">
                  <span className="absolute -left-[31px] top-4 flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 ring-4 ring-slate-50 transition-colors group-hover:bg-blue-100 dark:bg-slate-900 dark:ring-slate-950 dark:group-hover:bg-blue-900/50">
                    <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                  </span>
                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-900">
                    <div className="mb-2 flex items-start justify-between gap-4">
                      <div className="flex flex-col">
                        <Link href={`/loops/${update.loopId}`} className="font-semibold text-slate-900 hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-400">
                          {update.loopTitle}
                        </Link>
                        <span className="text-xs text-slate-400 dark:text-slate-500">{formatTimeAgo(update.createdAt)}</span>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">{update.body}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {showPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Edit AI Prompt</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Adjust the guidance sent to the AI with your loop payload.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPromptModal(false)}
                className="rounded-full border border-slate-200 p-1 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              rows={10}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-purple-500 dark:focus:ring-purple-900/40"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPromptModal(false)}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowPromptModal(false)}
                className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
