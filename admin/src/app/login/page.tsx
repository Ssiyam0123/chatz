"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Shield, AlertCircle, Eye, EyeOff, ArrowRight, BarChart3, Users, ShieldCheck } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data
              ?.message || "Login failed. Check your credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 rounded-lg border border-input bg-card/60 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all";

  return (
    <div className="relative flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between w-[46%] bg-brand-gradient text-white overflow-hidden p-12">
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.3), transparent 45%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.15), transparent 40%)" }} />
        <div className="relative flex items-center gap-3">
          <span className="grid place-items-center h-11 w-11 rounded-2xl bg-white/15 backdrop-blur-sm">
            <Shield size={24} />
          </span>
          <span className="text-xl font-bold tracking-tight">ChatZ Admin</span>
        </div>

        <div className="relative space-y-6">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Run your community<br />with confidence.
          </h1>
          <p className="text-white/75 max-w-md leading-relaxed">
            A unified control center for moderation, growth analytics, and user
            management — built for speed and clarity.
          </p>
          <div className="grid grid-cols-1 gap-3 max-w-md">
            {[
              { icon: ShieldCheck, text: "Real-time moderation queue & SLA tracking" },
              { icon: BarChart3, text: "Live growth, retention & engagement analytics" },
              { icon: Users, text: "Granular roles, bulk actions & audit trails" },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3 text-white/85">
                <span className="grid place-items-center h-9 w-9 rounded-lg bg-white/12 backdrop-blur-sm shrink-0">
                  <f.icon size={16} />
                </span>
                <span className="text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/50">© {new Date().getFullYear()} ChatZ. All rights reserved.</p>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-1 items-center justify-center bg-aurora p-6">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md animate-rise">
          <div className="lg:hidden text-center mb-8">
            <span className="inline-grid place-items-center h-14 w-14 rounded-2xl bg-brand-gradient mb-4 shadow-glow">
              <Shield size={28} className="text-white" />
            </span>
            <h1 className="text-2xl font-bold">ChatZ Admin</h1>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-1">Sign in to access the admin panel.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-start gap-2 bg-destructive/10 text-destructive border border-destructive/25 text-sm p-3 rounded-lg">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className={inputClass}
                autoComplete="email"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass + " pr-10"}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-brand-gradient text-primary-foreground font-medium text-sm shadow-soft hover:shadow-glow disabled:opacity-50 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin-slow" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
