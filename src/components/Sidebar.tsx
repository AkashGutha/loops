"use client";

import { ChevronLeft, ChevronRight, LayoutDashboard, PlusCircle, LogOut, UserRound, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeSwitcher } from "./ThemeSwitcher";

type SidebarProps = {
  onSignOut: () => void;
  user?: { name?: string | null; email?: string | null };
  collapsed: boolean;
  onToggleCollapse: () => void;
};

export function Sidebar({ onSignOut, user, collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "My Loops", icon: LayoutDashboard },
    { href: "/follow-up-stream", label: "Follow Up", icon: Sparkles },
    { href: "/create", label: "Create Loop", icon: PlusCircle },
  ];

  const collapseIcon = collapsed ? <ChevronRight className="h-4 w-4" aria-hidden /> : <ChevronLeft className="h-4 w-4" aria-hidden />;

  return (
    <aside
      className={`fixed inset-y-0 left-0 hidden flex-col border-r border-slate-200/50 bg-background/80 backdrop-blur-2xl transition-all duration-300 dark:border-slate-800/50 md:flex ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      <div className={`flex h-16 items-center ${collapsed ? "justify-center px-3" : "justify-between px-6"} pt-2`}>
        {collapsed ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-[11px] font-black uppercase tracking-[0.2em] text-amber-600 dark:bg-amber-400/10 dark:text-amber-200">
            L
          </span>
        ) : (
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-500/90 dark:text-amber-500">
            Loops
          </span>
        )}
        <div className="flex items-center gap-2">
          {!collapsed && <ThemeSwitcher />}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapseIcon}
          </button>
        </div>
      </div>

      <nav className={`flex-1 space-y-1.5 ${collapsed ? "px-2 py-4" : "px-4 py-6"}`}>
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-in-out ${
                isActive
                  ? "bg-slate-900/5 text-slate-900 shadow-sm ring-1 ring-slate-900/5 dark:bg-white/10 dark:text-white dark:ring-white/10"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200"
              }`}
            >
              <Icon
                className={`h-4.5 w-4.5 transition-colors ${
                  isActive
                    ? "text-amber-500 dark:text-amber-400"
                    : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300"
                }`}
                aria-hidden
              />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      <div className={`${collapsed ? "p-2" : "p-4"}`}>
        <div
          className={`flex flex-col gap-1 rounded-2xl border border-slate-200/60 bg-slate-50/50 p-4 dark:border-slate-800/60 dark:bg-slate-900/50 ${
            collapsed ? "items-center" : ""
          }`}
        >
          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-800 dark:ring-white/10">
              <UserRound className="h-4 w-4 text-slate-600 dark:text-slate-300" aria-hidden />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {user?.name || "Authenticated"}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={onSignOut}
            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            {!collapsed && "Sign out"}
          </button>
        </div>
      </div>
    </aside>
  );
}
