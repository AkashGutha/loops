"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp, Timestamp } from "firebase/firestore";
import { Flag, CheckCircle2, Sparkles, CornerUpRight, PauseCircle, Ban } from "lucide-react";
import { getFirebaseAuth, getFirebaseDb } from "../../lib/firebaseClient";
import { LoopPriority, LoopStatus } from "../../types";
import { DictationBlock } from "../../components/DictationBlock";

const staleWindowMs = 48 * 60 * 60 * 1000;

export default function CreateLoopPage() {
  const router = useRouter();
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();
  
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<LoopPriority>("medium");
  const [status, setStatus] = useState<LoopStatus>("new");
  const [ideaNote, setIdeaNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyNoteToFields = () => {
    const note = ideaNote.trim();
    if (!note) return;

    const sentences = note.split(/[.!?]\s+/).filter(Boolean);
    const firstLine = sentences[0] ?? note;

    if (!title.trim()) {
      setTitle(firstLine.slice(0, 80));
    }
    if (!objective.trim()) {
      setObjective(note);
    }
    if (!nextStep.trim()) {
      setNextStep(`Proposed next step: ${firstLine}`);
    }
  };

  const createLoop = async () => {
    const user = auth.currentUser;
    if (!user) {
        setError("You must be logged in.");
        return;
    }
    if (!title.trim() || !objective.trim()) {
      setError("Title and objective are required");
      return;
    }
    if (!dueDate) {
      setError("A due date keeps the loop accountable");
      return;
    }

    if (Number.isNaN(new Date(dueDate).getTime())) {
      setError("Choose a valid due date");
      return;
    }
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // If 'due' (set to end of selected day effectively) is strictly less than 'todayStart'
    // But since we want to allow "today", we just need to ensure the selected date
    // isn't yesterday or before.
    // Let's normalize `due` to start of day for easier comparison.
    const dueStart = new Date(dueDate);
    dueStart.setHours(0,0,0,0);
    // There's a timezone issue with just new Date(string).
    // Let's just compare the string YYYY-MM-DD since that's what the input gives
    
    // Better approach:
    // Create date from input string part by part to avoid UTC shifts
    const [y, m, d] = dueDate.split('-').map(Number);
    const selectedDate = new Date(y, m - 1, d); // Local midnight
    
    if (selectedDate < todayStart) {
      setError("Due date cannot be in the past");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const now = Date.now();
      await addDoc(collection(db, "loops"), {
        title: title.trim(),
        primaryObjective: objective.trim(),
        immediateNextStep: nextStep.trim(),
        status,
        priority,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        staleAt: Timestamp.fromMillis(now + staleWindowMs),
        dueAt: Timestamp.fromDate(selectedDate),
      });
      router.push("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create loop";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6">
      <header className="mb-10 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Create a new loop</h1>
        <p className="mt-3 text-lg text-slate-500 dark:text-slate-400">Define the outcome and set a deadline to get started.</p>
      </header>

      <div className="mb-8 space-y-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Intelligent loop creation</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Capture an idea by typing or dictating; apply it to prefill fields.</p>
        </div>

        <DictationBlock
          label="Idea note"
          description="Dictate or paste context; we will use it to prefill title, objective, and first step."
          placeholder="Explain the desired outcome, key constraints, owners, and timeline..."
          value={ideaNote}
          onChange={setIdeaNote}
          onSubmit={applyNoteToFields}
          submitLabel="Apply"
          minRows={3}
        />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); createLoop(); }} className="space-y-8">
        <div className="space-y-6">
          <div className="grid gap-2">
            <label htmlFor="title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Loop Title
            </label>
            <input
              id="title"
              type="text"
              autoFocus
              className="block w-full rounded-lg border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-amber-500/40"
              placeholder="e.g., Q1 Roadmap Planning"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="objective" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Primary Objective
            </label>
            <textarea
              id="objective"
              rows={3}
              className="block w-full rounded-lg border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-amber-500/40"
              placeholder="What specifically needs to happen to close this loop?"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              disabled={saving}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">Be specific about the definition of done.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-1">
            <div className="grid gap-2">
               <label htmlFor="dueDate" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                 Due Date
               </label>
               <input
                 id="dueDate"
                 type="date"
                 className="block w-full rounded-lg border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-amber-500/40"
                 value={dueDate}
                 onChange={(e) => setDueDate(e.target.value)}
                 min={new Date().toISOString().split("T")[0]}
                 disabled={saving}
               />
            </div>
          </div>

          <div className="grid gap-2">
            <label htmlFor="nextStep" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              First Step (Optional)
            </label>
            <textarea
              id="nextStep"
              rows={3}
              className="block w-full rounded-lg border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-amber-500/40"
              placeholder="Initial action item..."
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              disabled={saving}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-900 dark:text-slate-100 block mb-2">Priority</label>
            <div className="flex gap-3">
              {(["low", "medium", "high"] as LoopPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  disabled={saving}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition ${
                    priority === p
                      ? "border-transparent bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  <Flag
                    className={`w-4 h-4 ${
                      p === "high"
                        ? "text-rose-500"
                        : p === "medium"
                        ? "text-amber-500"
                        : "text-blue-500"
                    }`}
                    fill={priority === p ? "currentColor" : "none"}
                  />
                  <span className="capitalize">{p}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-900 dark:text-slate-100 block mb-2">Status</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(
                [
                  { value: "new" as LoopStatus, label: "New", icon: Sparkles, color: "slate" },
                  { value: "act_on" as LoopStatus, label: "Act on", icon: CornerUpRight, color: "amber" },
                  { value: "active" as LoopStatus, label: "Active", icon: CheckCircle2, color: "blue" },
                  { value: "stalled" as LoopStatus, label: "Stalled", icon: PauseCircle, color: "yellow" },
                  { value: "closed" as LoopStatus, label: "Closed", icon: Ban, color: "emerald" },
                ] as const
              ).map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatus(value)}
                  disabled={saving}
                  className={`flex flex-col items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-semibold transition ${
                    status === value
                      ? color === "slate"
                        ? "border-slate-500 bg-slate-100 text-slate-800 dark:border-slate-500 dark:bg-slate-700 dark:text-white"
                        : color === "amber"
                        ? "border-amber-500 bg-amber-100 text-amber-800 dark:border-amber-500 dark:bg-amber-500/20 dark:text-amber-200"
                        : color === "blue"
                        ? "border-blue-500 bg-blue-100 text-blue-800 dark:border-blue-500 dark:bg-blue-500/20 dark:text-blue-200"
                        : color === "yellow"
                        ? "border-yellow-500 bg-yellow-100 text-yellow-800 dark:border-yellow-500 dark:bg-yellow-500/20 dark:text-yellow-200"
                        : "border-emerald-500 bg-emerald-100 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-200"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-300" role="alert">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-4 pt-4">
           <button
             type="button"
             onClick={() => router.back()}
             className="text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
             disabled={saving}
           >
             Cancel
           </button>
           <button
             type="submit"
             disabled={saving}
             className="inline-flex justify-center rounded-lg bg-slate-900 px-8 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 dark:focus:ring-white dark:focus:ring-offset-slate-950"
           >
             {saving ? "Creating..." : "Create Loop"}
           </button>
        </div>
      </form>
    </div>
  );
}
