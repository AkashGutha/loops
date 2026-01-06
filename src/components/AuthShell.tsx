"use client";

import { useEffect, useState } from "react";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirebaseAuth } from "../lib/firebaseClient";
import { Sidebar } from "./Sidebar";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, PlusCircle, LogOut } from "lucide-react";

export function AuthShell({ children }: { children: React.ReactNode }) {
  const auth = getFirebaseAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, [auth]);

  useEffect(() => {
    if (loading) return;

    if (!user && pathname !== "/login") {
      router.push("/login");
    } else if (user && pathname === "/login") {
      router.push("/");
    }
  }, [user, loading, pathname, router]);

  const handleSignOut = async () => {
    await signOut(auth);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-sm text-slate-300 animate-pulse">Loading environment...</p>
      </div>
    );
  }

  // If on login page, render children (the login page content) without the shell
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // If not logged in (and not on login page, though the effect should redirect), render nothing or loading
  if (!user) {
    return null; 
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-foreground">
        <Sidebar
          onSignOut={handleSignOut}
          user={{ name: user.displayName, email: user.email }}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((prev) => !prev)}
        />
        <div className={`flex flex-col min-h-screen md:pl-64 ${collapsed ? "md:pl-20" : "md:pl-64"}`}>
            {/* Mobile Header */}
            <header className="md:hidden flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-background px-4 py-3">
                 <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-500">Loops</span>
                 <button onClick={handleSignOut} className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
                   <LogOut className="h-4 w-4" aria-hidden />
                   Sign Out
                 </button>
            </header>
            
            {/* Mobile Nav */}
             <nav className="md:hidden flex gap-4 overflow-x-auto border-b border-slate-200 dark:border-slate-800 bg-background px-4 py-2">
                 <Link href="/" className={`inline-flex items-center gap-2 text-sm font-medium whitespace-nowrap ${pathname === '/' ? 'text-sky-600' : 'text-slate-500'}`}>
                   <LayoutDashboard className="h-4 w-4" aria-hidden />
                   My Loops
                 </Link>
                 <Link href="/create" className={`inline-flex items-center gap-2 text-sm font-medium whitespace-nowrap ${pathname === '/create' ? 'text-sky-600' : 'text-slate-500'}`}>
                   <PlusCircle className="h-4 w-4" aria-hidden />
                   Create Loop
                 </Link>
            </nav>

            <main className="flex-1 p-6 lg:p-10">
                {children}
            </main>
        </div>
    </div>
  );
}

