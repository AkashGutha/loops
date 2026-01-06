"use client";

import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import { 
  CheckCircle2, 
  Target, 
  Zap, 
  ArrowRight, 
  LayoutTemplate,
  Activity 
} from "lucide-react";
import { getFirebaseAuth } from "../../lib/firebaseClient";

export default function LoginPage() {
  const router = useRouter();
  const auth = getFirebaseAuth();
  const [error, setError] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);

  const handleSignIn = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign-in failed";
      setError(message);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-slate-950 text-white lg:grid lg:grid-cols-2">
      {/* Visual / Brand Section */}
      <div className="relative hidden w-full flex-col justify-between overflow-hidden bg-slate-900 p-12 lg:flex">
        {/* Abstract Background Art */}
        <div className="absolute inset-0 z-0">
          <div className="absolute -left-20 -top-20 h-[500px] w-[500px] rounded-full bg-indigo-600/20 blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-800/50 bg-slate-800/10" />
          <div className="absolute top-1/2 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-700/30" />
          <div className="absolute top-1/2 left-1/2 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-600/20" />
          <div className="absolute bottom-0 right-0 h-[600px] w-[600px] translate-x-1/3 translate-y-1/4 rounded-full bg-amber-500/10 blur-[120px]" />
        </div>

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-slate-950">
              <Activity className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Loops</span>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <h1 className="max-w-md text-5xl font-extrabold tracking-tight leading-tight text-white">
            Close every loop <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
              with clarity.
            </span>
          </h1>
          
          <div className="space-y-4 max-w-sm">
            {[
              { icon: Target, text: "Define clear objectives for every task" },
              { icon: Zap, text: "Capture immediate next steps instantly" },
              { icon: CheckCircle2, text: "Track progress and close loops faster" },
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-300">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800/50 text-amber-400">
                  <feature.icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-sm text-slate-500">© 2026 Loops. All rights reserved.</p>
        </div>
      </div>

      {/* Login Section */}
      <div className="flex w-full items-center justify-center bg-slate-950 px-6 py-12 lg:px-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-amber-500 lg:hidden">
              <Activity className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Welcome back</h2>
            <p className="mt-2 text-sm text-slate-400">
              Sign in to your account to continue tracking your progress.
            </p>
          </div>

          <div className="mt-10">
            <button
              onClick={handleSignIn}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              className="group relative flex w-full items-center justify-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-8 py-4 text-base font-semibold text-white transition-all duration-200 hover:border-amber-500/50 hover:bg-slate-800 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              <svg className="h-5 w-5 opacity-70 transition-opacity group-hover:opacity-100" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span>Continue with Google</span>
              <ArrowRight className={`ml-2 h-4 w-4 text-amber-500 transition-all duration-300 ${isHovering ? 'translate-x-1 opacity-100' : '-translate-x-1 opacity-0'}`} />
            </button>
            
            <div className="mt-8 flex items-center justify-center gap-2">
              <div className="h-px w-16 bg-slate-800" />
              <span className="text-xs text-slate-600">SECURE LOGIN</span>
              <div className="h-px w-16 bg-slate-800" />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-center text-sm text-rose-300">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
