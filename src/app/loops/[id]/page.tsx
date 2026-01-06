"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import Link from "next/link";
import {
  Ban,
  CheckCircle2,
  CornerUpRight,
  Flame,
  HelpCircle,
  PauseCircle,
  SignalLow,
  SignalMedium,
  Sparkles,
  Trash2,
} from "lucide-react";
import { getFirebaseAuth, getFirebaseDb } from "../../../lib/firebaseClient";
import { Loop, LoopStatus, LoopUpdate, LoopPriority } from "../../../types";
import { DictationBlock } from "../../../components/DictationBlock";

const staleWindowMs = 48 * 60 * 60 * 1000;

export default function LoopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const db = getFirebaseDb();
  const auth = getFirebaseAuth();

  const [loop, setLoop] = useState<Loop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingNextStep, setEditingNextStep] = useState<string | null>(null);
  const [updates, setUpdates] = useState<LoopUpdate[]>([]);
  const [updateText, setUpdateText] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    const ref = doc(db, "loops", id);
    const unsub = onSnapshot(ref, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLoop({
            id: docSnap.id,
            title: data.title ?? "Untitled",
            primaryObjective: data.primaryObjective ?? "",
            immediateNextStep: data.immediateNextStep ?? "",
            status: (data.status as LoopStatus) ?? "new",
            priority: (data.priority as LoopPriority) ?? "medium",
            ownerId: data.ownerId ?? "",
            createdAt: data.createdAt ?? null,
            updatedAt: data.updatedAt ?? null,
            staleAt: data.staleAt ?? null,
            dueAt: data.dueAt ?? null,
        });
      } else {
        setError("Loop not found");
      }
      setLoading(false);
    }, (err) => {
        setError(err.message);
        setLoading(false);
    });
    return () => unsub();
  }, [db, id]);

  const isLoopReady = !!loop;

  useEffect(() => {
    if (!id || !isLoopReady) return;
    const updatesRef = collection(db, "loops", id, "updates");
    const updatesQuery = query(updatesRef, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      updatesQuery,
      (snapshot) => {
        const next: LoopUpdate[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            body: data.body ?? "",
            authorId: data.authorId ?? "",
            authorName: data.authorName ?? "",
            createdAt: data.createdAt ?? null,
          } satisfies LoopUpdate;
        });
        setUpdates(next);
      },
      (err) => setError(err.message),
    );
    return () => unsub();
  }, [db, id, isLoopReady]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showGuideModal) setShowGuideModal(false);
        if (showDeleteModal) setShowDeleteModal(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [showDeleteModal, showGuideModal]);

  const updateLoop = async (payload: Partial<Omit<Loop, "id" | "ownerId">>) => {
    if (!loop) return;
    try {
      const ref = doc(db, "loops", loop.id);
      await updateDoc(ref, {
        ...payload,
        updatedAt: serverTimestamp(),
        staleAt: Timestamp.fromMillis(Date.now() + staleWindowMs),
      });
    } catch (err) {
      console.error(err);
      setError("Failed to update loop");
    }
  };

  const deleteLoop = async () => {
    if (!loop) return;
    try {
      await deleteDoc(doc(db, "loops", loop.id));
      router.push("/");
    } catch (err) {
      console.error(err);
      setError("Failed to delete loop");
      setShowDeleteModal(false);
    }
  };

  const saveNextStep = async () => {
    if (editingNextStep === null) return;
    await updateLoop({ immediateNextStep: editingNextStep.trim() });
    setEditingNextStep(null);
  };

  const addUpdate = async () => {
    if (!loop) return;
    const body = updateText.trim();
    if (!body) return;
    setError(null);
    try {
      const user = auth.currentUser;
      const updatesRef = collection(db, "loops", loop.id, "updates");
      await addDoc(updatesRef, {
        body,
        authorId: user?.uid ?? "anonymous",
        authorName: user?.displayName ?? user?.email ?? "Unknown",
        createdAt: serverTimestamp(),
      });
      setUpdateText("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not add update";
      setError(message);
    }
  };

  const buildNextStepSuggestion = (objective?: string, latestUpdate?: LoopUpdate | null) => {
    const objectiveText = objective?.trim();
    const updateText = latestUpdate?.body?.trim();
    const excerpt = updateText ? updateText.replace(/\s+/g, " ").slice(0, 160) : null;

    if (objectiveText && excerpt) {
      return `Based on the latest update ("${excerpt}"), define one concrete deliverable, owner, and due date that advances "${objectiveText}".`;
    }

    if (objectiveText) {
      return `Define the next concrete deliverable, owner, and due date that moves "${objectiveText}" forward.`;
    }

    if (excerpt) {
      return `Translate the latest update ("${excerpt}") into a specific deliverable with an owner and due date.`;
    }

    return "Define the next concrete deliverable with an owner and due date.";
  };

  const suggestedNextStep = useMemo(
    () => buildNextStepSuggestion(loop?.primaryObjective, updates[0] ?? null),
    [loop?.primaryObjective, updates],
  );

  const startDictation = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition not supported in this browser");
      setVoiceStatus("unsupported");
      setVoiceStatusText("Speech recognition not supported in this browser.");
      return;
    }
    const recognition: any = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = () => {
      setListening(true);
      setVoiceStatus("listening");
      setVoiceStatusText("Listening - speak clearly, press mic to stop.");
    };
    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      // Walk only the new results to avoid duplicating partial phrases.
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.trim();
        if (!transcript) continue;
        if (event.results[i].isFinal) {
          finalTranscript += `${transcript} `;
        } else {
          interimTranscript += `${transcript} `;
        }
      }

      if (finalTranscript) {
        const cleaned = finalTranscript.trim();
        setUpdateText((prev) => (prev ? `${prev} ${cleaned}` : cleaned));
        setVoiceStatusText(`Captured: "${cleaned}"`);
      } else if (interimTranscript) {
        setVoiceStatusText(`Listening... ${interimTranscript.trim()}`);
      }
    };
    recognition.onend = () => {
      setListening(false);
      setVoiceStatus("idle");
      setVoiceStatusText("Mic stopped.");
    };
    recognition.onerror = () => {
      setListening(false);
      setVoiceStatus("error");
      setVoiceStatusText("Mic issue - please try again.");
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopDictation = () => {
    recognitionRef.current?.stop();
    setListening(false);
    setVoiceStatus("idle");
    setVoiceStatusText("Mic stopped.");
  };

  const magicSuggest = () => {
    if (!loop) return;
    if (updates.length > 0) {
      setEditingNextStep(suggestedNextStep);
      return;
    }
    const seed = loop.primaryObjective || "";
    const suggestion = seed
      ? `Draft the next step toward "${seed}" by setting a concrete deliverable and due date.`
      : "Set a clear deliverable with a date and owner.";
    setEditingNextStep(suggestion);
  };

  const meta = useMemo(() => {
    if (!loop) return null;
    return {
      updated: loop.updatedAt ? new Date(loop.updatedAt.toMillis()).toLocaleString() : "Never",
      created: loop.createdAt ? new Date(loop.createdAt.toMillis()).toLocaleString() : "Unknown",
      staleAt: loop.staleAt ? new Date(loop.staleAt.toMillis()).toLocaleString() : "—",
      due: loop.dueAt ? new Date(loop.dueAt.toMillis()).toLocaleDateString() : "No due date",
    };
  }, [loop]);

  const dueBadge = useMemo(() => {
    if (!loop?.dueAt) return { label: "No due date", tone: "border-slate-200 text-slate-500 bg-white" };
    const diff = loop.dueAt.toMillis() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return { label: `Overdue by ${Math.abs(days)}d`, tone: "border-rose-200 text-rose-700 bg-rose-50" };
    if (days === 0) return { label: "Due today", tone: "border-amber-200 text-amber-700 bg-amber-50" };
    return { label: `Due in ${days}d`, tone: "border-sky-200 text-sky-700 bg-sky-50" };
  }, [loop?.dueAt]);

  if (loading) return <div className="text-slate-500">Loading loop...</div>;
  if (error || !loop) return <div className="text-rose-500">Error: {error}</div>;

  const isStale = (loop.staleAt?.toMillis() ?? 0) < Date.now();
  const stalled = loop.status === "stalled" || isStale;

  const statusOptions: { value: LoopStatus; label: string; icon: JSX.Element }[] = [
    { value: "new", label: "New", icon: <Sparkles className="h-4 w-4" aria-hidden /> },
    { value: "act_on", label: "Act on", icon: <CornerUpRight className="h-4 w-4" aria-hidden /> },
    { value: "active", label: "Active", icon: <CheckCircle2 className="h-4 w-4" aria-hidden /> },
    { value: "stalled", label: "Stalled", icon: <PauseCircle className="h-4 w-4" aria-hidden /> },
    { value: "closed", label: "Closed", icon: <Ban className="h-4 w-4" aria-hidden /> },
  ];

  const priorityOptions: { value: LoopPriority; label: string; icon: JSX.Element }[] = [
    { value: "high", label: "High", icon: <Flame className="h-4 w-4" aria-hidden /> },
    { value: "medium", label: "Medium", icon: <SignalMedium className="h-4 w-4" aria-hidden /> },
    { value: "low", label: "Low", icon: <SignalLow className="h-4 w-4" aria-hidden /> },
  ];

  const statusTone = (value: LoopStatus, isActive: boolean) => {
    if (!isActive) return "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600";
    if (value === "new") return "border-slate-400 bg-slate-50 text-slate-800 shadow-sm dark:border-slate-500/70 dark:bg-slate-800/40 dark:text-slate-100";
    if (value === "act_on") return "border-amber-500 bg-amber-50 text-amber-700 shadow-sm dark:border-amber-500/70 dark:bg-amber-500/10 dark:text-amber-100";
    if (value === "active") return "border-blue-500 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-500/70 dark:bg-blue-500/10 dark:text-blue-100";
    if (value === "stalled") return "border-yellow-400 bg-yellow-50 text-yellow-700 shadow-sm dark:border-yellow-500/70 dark:bg-yellow-500/10 dark:text-yellow-100";
    return "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-500/70 dark:bg-emerald-500/10 dark:text-emerald-100";
  };

  const originalNextStep = loop?.immediateNextStep?.trim() ?? "";
  const displayNextStep = originalNextStep || (updates.length > 0 ? suggestedNextStep : "");

  const priorityTone = (value: LoopPriority, isActive: boolean) => {
    if (!isActive) return "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600";
    if (value === "high") return "border-rose-500 bg-rose-50 text-rose-700 shadow-sm dark:border-rose-500/70 dark:bg-rose-500/10 dark:text-rose-100";
    if (value === "medium") return "border-amber-500 bg-amber-50 text-amber-700 shadow-sm dark:border-amber-500/70 dark:bg-amber-500/10 dark:text-amber-100";
    return "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-500/70 dark:bg-emerald-500/10 dark:text-emerald-100";
  };

  return (
    <div className="mx-auto min-h-screen max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      {/* JIRA-like Header: Breadcrumbs & Actions */}
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-800 dark:hover:text-slate-200">
            Loops
          </Link>
          <span>/</span>
          <span className="font-medium text-slate-900 dark:text-slate-200">{loop.id.slice(0, 8)}</span>
        </div>
        <div className="flex items-center gap-2">
           <button
             onClick={() => setShowDeleteModal(true)}
             className="flex h-9 items-center gap-2 rounded-lg bg-slate-100 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
           >
             <Trash2 className="h-4 w-4" aria-hidden />
             Delete
           </button>
           <Link 
              href="/"
              className="flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
           >
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Done
           </Link>
        </div>
      </header>

      {/* Title Area */}
      <div className="mb-8">
         <h1 className="text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">
           {loop.title}
         </h1>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-lg bg-white p-6 shadow-xl dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Loop?</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Are you sure you want to delete <span className="font-semibold text-slate-900 dark:text-white">"{loop.title}"</span>? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Ban className="h-4 w-4" aria-hidden />
                Cancel
              </button>
              <button
                onClick={deleteLoop}
                className="inline-flex items-center gap-2 rounded bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Delete Loop
              </button>
            </div>
          </div>
        </div>
      )}

      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="loop-guide-title"
            className="w-full max-w-xl overflow-hidden rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
          >
            <div className="flex items-start justify-between gap-4 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Guide</p>
                <h3 id="loop-guide-title" className="text-xl font-bold text-slate-900 dark:text-white">Tips and shortcuts</h3>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Close guide"
              >
                Close
              </button>
            </div>
            <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Keyboard</p>
                <ul className="mt-2 space-y-2 list-disc pl-5">
                  <li><span className="font-semibold">Ctrl/Cmd+Enter</span> posts an update without leaving the keyboard.</li>
                  <li><span className="font-semibold">Tab</span> moves focus across mic, save, and fields in order.</li>
                  <li><span className="font-semibold">Esc</span> closes guide or confirmation dialogs.</li>
                </ul>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-200">Voice input</p>
                <ul className="mt-2 space-y-2 list-disc pl-5">
                  <li>Press the <strong>Voice</strong> button to toggle dictation; press again to stop.</li>
                  <li>Watch the colored badge for live status: green for listening, amber if unsupported, red on errors.</li>
                  <li>Dictated text appends to the composer so you can edit before posting.</li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Posting</p>
                <ul className="mt-2 space-y-2 list-disc pl-5">
                  <li>The <strong>Post</strong> button stays disabled until the composer has text.</li>
                  <li>Status badges above the composer announce when the mic is live or when an error occurs.</li>
                  <li>You can keep typing while dictation runs; nothing is submitted until you hit Post or Ctrl/Cmd+Enter.</li>
                </ul>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Tip: focus stays in the composer so you can dictate and edit quickly.</span>
              <button
                onClick={() => setShowGuideModal(false)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Left Content (Details/Updates) vs Right Sidebar (Meta) */}
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_320px]">
        
        {/* Left Column: Description & Activity */}
        <div className="space-y-10">

          {/* Immediate Next Step - moved into main flow */}
          <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-100">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Next Step
              </span>
              {editingNextStep === null ? (
                <button
                  onClick={() => setEditingNextStep(displayNextStep || suggestedNextStep || "")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  Edit
                </button>
              ) : (
                <button
                  onClick={magicSuggest}
                  className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 dark:border-indigo-500/40 dark:text-indigo-100 dark:hover:bg-indigo-500/10"
                >
                  <Sparkles className="h-4 w-4" aria-hidden />
                  Suggest
                </button>
              )}
            </div>

            {editingNextStep === null ? (
              <div className="space-y-1">
                {displayNextStep ? (
                  <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100">
                    {displayNextStep}
                  </p>
                ) : (
                  <p className="rounded-md border border-dashed border-slate-200 px-3 py-2 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    No next step yet. Click edit to set one.
                  </p>
                )}
                {!originalNextStep && updates.length > 0 && suggestedNextStep && (
                  <p className="text-xs text-indigo-600 dark:text-indigo-300">Suggested: {suggestedNextStep}</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  className="w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-900 shadow-inner placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/30"
                  rows={4}
                  value={editingNextStep}
                  onChange={(e) => setEditingNextStep(e.target.value)}
                  placeholder="Define the next concrete step with owner and due date."
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setEditingNextStep(null)}
                    className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Ban className="h-3.5 w-3.5" aria-hidden />
                    Cancel
                  </button>
                  <button
                    onClick={saveNextStep}
                    disabled={!editingNextStep.trim() || editingNextStep.trim() === originalNextStep}
                    className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:disabled:bg-indigo-700/40"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                    Save Next Step
                  </button>
                </div>
              </div>
            )}
          </section>
          
          {/* Description Section */}
          <section>
             <h2 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Description</h2>
             <div className="group relative rounded-md border border-transparent p-2 -ml-2 hover:border-slate-300 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800/50">
               <p className="whitespace-pre-wrap text-base leading-relaxed text-slate-800 dark:text-slate-300">
                 {loop.primaryObjective || <span className="text-slate-400 italic">No description provided.</span>}
               </p>
             </div>
          </section>

          {/* Updates Section */}
           <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Updates</h2>
                <span id="composer-shortcuts" className="hidden items-center gap-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-200 sm:inline-flex">
                  Ctrl/Cmd+Enter posts
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <HelpCircle className="h-4 w-4" aria-hidden />
                Guide
              </button>
            </div>

            <div className="flex gap-3">
              <div className="h-8 w-8 flex-none rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white dark:ring-slate-900">
                {auth.currentUser?.email?.[0].toUpperCase() || "U"}
              </div>
              <div className="flex-1">
                <DictationBlock
                  label="Post an update"
                  description="Type or dictate; Ctrl/Cmd+Enter posts."
                  placeholder="Add an update..."
                  value={updateText}
                  onChange={setUpdateText}
                  onSubmit={addUpdate}
                  submitLabel="Post"
                  minRows={3}
                />
              </div>
            </div>

            {/* Updates List */}
            <div className="mt-8 space-y-6">
                {updates.map((item) => {
                   const time = item.createdAt ? new Date(item.createdAt.toMillis()).toLocaleString() : "just now";
                   const initials = item.authorName ? item.authorName[0].toUpperCase() : "?";
                   return (
                     <div key={item.id} className="flex gap-4 group">
                        <div className="h-8 w-8 flex-none rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs dark:bg-slate-800 dark:text-slate-400">
                           {initials}
                        </div>
                        <div className="flex-1">
                           <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-slate-900 dark:text-white">{item.authorName}</span>
                              <span className="text-xs text-slate-500">{time}</span>
                           </div>
                           <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{item.body}</p>
                           <div className="mt-2 text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                              <button className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                                <CornerUpRight className="h-3.5 w-3.5" aria-hidden />
                                Reply
                              </button>
                              <button className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                Delete
                              </button>
                           </div>
                        </div>
                     </div>
                   );
                })}
            </div>

          </section>
        </div>

        {/* Right Sidebar: Details & Meta */}
        <aside className="space-y-6">
           
           {/* Status & Actions Panel */}
           <div className="rounded border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="space-y-4">
                 <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Status</label>
                    <div className="flex gap-2">
                      {statusOptions.map((option) => {
                        const isActive = loop.status === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => updateLoop({ status: option.value })}
                            aria-pressed={isActive}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${statusTone(option.value, isActive)}`}
                          >
                            {option.icon}
                            <span>{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                 </div>
                 
                 <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Priority</label>
                    <div className="flex gap-2">
                      {priorityOptions.map((option) => {
                        const isActive = loop.priority === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => updateLoop({ priority: option.value })}
                            aria-pressed={isActive}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${priorityTone(option.value, isActive)}`}
                          >
                            {option.icon}
                            <span>{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                 </div>
              </div>
           </div>

           <hr className="border-slate-200 dark:border-slate-800" />

           {/* Details Grid */}
           <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Details</h2>
              
              <div className="space-y-3">
                 <div className="grid grid-cols-[100px_1fr] items-center gap-2 text-sm">
                    <span className="text-slate-500">Assignee</span>
                    <span className="flex items-center gap-2 text-slate-900 dark:text-slate-200">
                       <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold dark:bg-slate-700">
                          {loop.ownerId ? loop.ownerId[0].toUpperCase() : "?"}
                       </span>
                       <span className="truncate">{loop.ownerId || "Unassigned"}</span>
                    </span>
                 </div>

                 <div className="grid grid-cols-[100px_1fr] items-center gap-2 text-sm">
                    <span className="text-slate-500">Due Date</span>
                    <span className={`${dueBadge.tone} px-2 py-0.5 rounded text-xs self-start inline-block`}>{meta?.due}</span>
                 </div>
                 
                 <div className="grid grid-cols-[100px_1fr] items-center gap-2 text-sm">
                    <span className="text-slate-500">Tags</span>
                    <span className="text-slate-400 text-xs italic">None</span>
                 </div>
              </div>
           </div>
           
           <hr className="border-slate-200 dark:border-slate-800" />

           <div className="space-y-2 text-xs text-slate-500">
              <div className="grid grid-cols-[100px_1fr] gap-2">
                 <span>Created</span>
                 <span>{meta?.created}</span>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-2">
                 <span>Updated</span>
                 <span>{meta?.updated}</span>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-2">
                  <span>Stales In</span>
                  <span>{meta?.staleAt}</span>
              </div>
           </div>

        </aside>

      </div>
    </div>
  );
}
