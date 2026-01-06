"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  Activity,
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  Clock3,
  Flag,
} from "lucide-react";
import {
  Timestamp,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "../lib/firebaseClient";
import { Loop, LoopStatus, LoopPriority, FILTERS, FilterKey } from "../types";

const staleWindowMs = 48 * 60 * 60 * 1000;

type SortOption = "updated" | "priority";

export default function Home() {
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();

  const [user, setUser] = useState<User | null>(null);
  const [loops, setLoops] = useState<Loop[]>([]);
  const [loadingLoops, setLoadingLoops] = useState(true);
  const [filter, setFilter] = useState<FilterKey[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("updated");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, [auth]);

  useEffect(() => {
    if (!user) {
      setLoops([]);
      return undefined;
    }

    setLoadingLoops(true);
    const loopsQuery = query(
      collection(db, "loops"),
      where("ownerId", "==", user.uid),
      orderBy("updatedAt", "desc"),
    );

    const unsub = onSnapshot(
      loopsQuery,
      (snapshot) => {
        const next = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            title: data.title ?? "Untitled",
            primaryObjective: data.primaryObjective ?? "",
            immediateNextStep: data.immediateNextStep ?? "",
            status: (data.status as LoopStatus) ?? "active",
            priority: (data.priority as LoopPriority) ?? "medium",
            ownerId: data.ownerId ?? "",
            createdAt: data.createdAt ?? null,
            updatedAt: data.updatedAt ?? null,
            staleAt: data.staleAt ?? null,
            dueAt: data.dueAt ?? null,
          } satisfies Loop;
        });
        setLoops(next);
        setLoadingLoops(false);
      },
      (err) => {
        setError(err.message);
        setLoadingLoops(false);
      },
    );

    return () => unsub();
  }, [db, user]);

  const isStale = (loop: Loop) => {
    const stale = loop.staleAt?.toMillis();
    return typeof stale === "number" && stale < Date.now();
  };

  const filteredLoops = useMemo(() => {
    let result = loops;
    
    if (filter.length > 0) {
      result = loops.filter((loop) => {
        return filter.some((f) => {
          const filterConfig = FILTERS[f];
          
          if (f === "all") return true;
          if (f === "act-on") return loop.status === "act_on";
          if (f === "due-soon") {
            const stale = loop.staleAt?.toMillis();
            return typeof stale === "number" && stale - Date.now() < 12 * 60 * 60 * 1000;
          }
          
          return filterConfig.statuses?.includes(loop.status) ?? false;
        });
      });
    }

    const priorityValue = (p: string) => {
      switch (p) {
        case "high":
          return 3;
        case "medium":
          return 2;
        case "low":
          return 1;
        default:
          return 0;
      }
    };

    if (sortBy === "priority") {
      result = [...result].sort(
        (a, b) => priorityValue(b.priority) - priorityValue(a.priority)
      );
    }

    return result;
  }, [filter, loops, sortBy]);

  const stats = useMemo(() => {
    const byStatus = loops.reduce((acc, loop) => {
       acc[loop.status] = (acc[loop.status] || 0) + 1;
       return acc;
    }, {} as Record<string, number>);

    const staleSoon = loops.filter((loop) => {
      if (loop.status === "closed") return false;
      const stale = loop.staleAt?.toMillis();
      return typeof stale === "number" && stale - Date.now() < 12 * 60 * 60 * 1000;
    }).length;

    return {
      total: loops.length,
      active: byStatus["active"] || 0,
      stalled: byStatus["stalled"] || 0,
      closed: byStatus["closed"] || 0,
      actOn: byStatus["act_on"] || 0,
      staleSoon,
    };
  }, [loops]);

  const updateLoop = async (loopId: string, payload: Partial<Omit<Loop, "id" | "ownerId">>) => {
    const ref = doc(db, "loops", loopId);
    await updateDoc(ref, {
      ...payload,
      updatedAt: serverTimestamp(),
      staleAt: Timestamp.fromMillis(Date.now() + staleWindowMs),
    });
  };

  const changeStatus = async (loopId: string, status: LoopStatus) => {
    setError(null);
    try {
      await updateLoop(loopId, { status });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update status";
      setError(message);
    }
  };

  const formatRelativeTime = (timestamp?: Timestamp | null) => {
    if (!timestamp) return "n/a";
    const ms = timestamp.toMillis();
    const diff = Date.now() - ms;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const statusPillClass = (status: LoopStatus, stalled: boolean) => {
    // Stalled has highest info priority for colors, but "act_on" is a specific status.
    // If it's literally status="stalled" or forced stale, use amber.
    if (status === "stalled" || stalled) return "bg-amber-100/50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20";
    if (status === "closed") return "bg-emerald-100/50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20";
    if (status === "act_on") return "bg-amber-100/50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20";
    if (status === "new") return "bg-slate-100/50 text-slate-700 ring-1 ring-slate-600/20 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-400/20";
    // active, etc.
    return "bg-sky-100/50 text-sky-700 ring-1 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/20";
  };

  const formatDue = (dueAt?: Timestamp | null) => {
    if (!dueAt) return { label: "No due date", tone: "text-slate-600 bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700" };
    const diff = dueAt.toMillis() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return { label: `Overdue by ${Math.abs(days)}d`, tone: "text-rose-600 bg-rose-50 ring-1 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-400/30" };
    if (days === 0) return { label: "Due today", tone: "text-amber-700 bg-amber-50 ring-1 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-400/30" };
    return { label: `Due in ${days}d`, tone: "text-sky-700 bg-sky-50 ring-1 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-200 dark:ring-sky-400/30" };
  };

  const renderLoopRow = (loop: Loop) => {
    const stalled = isStale(loop) || loop.status === "stalled";
    const updatedText = formatRelativeTime(loop.updatedAt);
    const nextSnippet = loop.immediateNextStep || "—";
    const due = formatDue(loop.dueAt);

    return (
      <Link
        key={loop.id}
        href={`/loops/${loop.id}`}
        className="group block px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-base font-semibold text-slate-900 transition-colors group-hover:text-amber-600 dark:text-slate-50">
                  {loop.title || "Untitled"}
                </p>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusPillClass(loop.status, stalled)}`}
                  aria-label={`Status ${stalled ? "stalled" : loop.status}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                  {stalled ? "Stalled" : loop.status === "act_on" ? "Act on" : loop.status === "new" ? "New" : loop.status === "active" ? "Active" : loop.status === "closed" ? "Closed" : loop.status}
                </span>
                {loop.status === "act_on" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                    Needs attention
                  </span>
                )}
              </div>
              <p className="line-clamp-1 text-sm text-slate-600 dark:text-slate-300">{loop.primaryObjective || "—"}</p>
              <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <Clock3 className="h-3.5 w-3.5" aria-hidden />
                Updated {updatedText}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:text-right">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold shadow-sm ${due.tone}`}>
                <Clock3 className="h-3.5 w-3.5" aria-hidden />
                {due.label}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Next step</div>
            <p className="mt-1 line-clamp-3 leading-relaxed">{nextSnippet}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ring-1 ring-slate-200/60 dark:ring-slate-700/70 ${
                loop.priority === "high"
                  ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
                  : loop.priority === "medium"
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                  : "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
              }`}
            >
              <Flag className="h-3 w-3" fill="currentColor" /> {loop.priority}
            </span>
          </div>
        </div>
      </Link>
    );
  };

  const emptyState = (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
        <Flag className="h-5 w-5" aria-hidden />
      </div>
      <p className="text-base font-semibold text-slate-900 dark:text-slate-50">No loops yet</p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">Capture your first loop to start tracking objectives, next steps, and due dates.</p>
      <div className="mt-5 flex justify-center">
        <Link
          href="/create"
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 active:translate-y-0 dark:bg-white dark:text-slate-900"
        >
          Start a loop
        </Link>
      </div>
    </div>
  );

  const statusFilters = [
    { key: "all" as FilterKey, label: FILTERS.all.label, count: stats.total },
    { key: "act-on" as FilterKey, label: FILTERS["act-on"].label, count: stats.actOn },
    { key: "new" as FilterKey, label: FILTERS.new.label, count: loops.filter(l => l.status === "new").length },
    { key: "active" as FilterKey, label: FILTERS.active.label, count: stats.active },
    { key: "due-soon" as FilterKey, label: FILTERS["due-soon"].label, count: stats.staleSoon },
    { key: "stalled" as FilterKey, label: FILTERS.stalled.label, count: stats.stalled },
    { key: "closed" as FilterKey, label: FILTERS.closed.label, count: stats.closed },
  ];

  if (!user) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center text-slate-500">Loading user…</main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl space-y-6 px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 px-6 py-6 text-white shadow-sm ring-1 ring-white/10 dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:ring-white/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200">Loops dashboard</p>
            <h1 className="text-2xl font-semibold text-white">Stay on top of every loop</h1>
            <p className="max-w-2xl text-sm text-slate-200/80">Compact layout with calm tones to scan active work, due dates, and stalled loops quickly.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/create"
              className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-100 active:translate-y-0"
            >
              <span className="text-lg leading-none">+</span>
              New loop
            </Link>
            <button
              type="button"
              onClick={() => setFilter(["act-on"])}
              className="inline-flex items-center gap-2 rounded-md border border-white/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-white/10"
            >
              Focus on act on
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 px-4 py-2.5 sm:px-6 dark:border-slate-800">
          {statusFilters.map(({ key, label, count }) => {
            const isActive = 
              key === "all" ? filter.length === 0 :
              filter.includes(key);

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  if (key === "all") {
                    setFilter([]);
                  } else if (isActive) {
                    setFilter(filter.filter((f) => f !== key));
                  } else {
                    setFilter([...filter, key]);
                  }
                }}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold ring-1 transition ${
                  isActive
                    ? "bg-slate-900 text-white ring-slate-900 dark:bg-white dark:text-slate-900 dark:ring-white"
                    : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800"
                }`}
              >
                <span>{label}</span>
                <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${isActive ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>
                  {count}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setSortBy((prev) => (prev === "updated" ? "priority" : "updated"))}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
            {sortBy === "updated" ? "Latest" : "Priority"}
          </button>
        </div>

        <div className="space-y-3 px-4 py-4 sm:px-6">
          {loadingLoops ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse bg-slate-100/70 dark:bg-slate-800/70"
                  />
                ))}
              </div>
            </div>
          ) : filteredLoops.length === 0 ? (
            emptyState
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredLoops.map(renderLoopRow)}
              </div>
            </div>
          )}
        </div>
      </section>
      </div>
    </div>
  );
}
