import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: (s.mode as "signin" | "signup") || "signin",
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: LoginPage,
});

function LoginPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const isSignup = mode === "signup";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { username: username || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created — entering arcade...");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back, player.");
      }
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md card-arcade rounded-xl p-8">
        <Link to="/" className="font-display text-xs text-neon-cyan hover:underline">← BACK</Link>
        <h1 className="mt-4 font-display text-2xl text-neon-pink text-glow-pink">
          {isSignup ? "NEW PLAYER" : "PLAYER LOGIN"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSignup ? "Register to save your high scores." : "Enter the arcade."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {isSignup && (
            <div>
              <label className="block font-display text-[10px] text-muted-foreground mb-2">USERNAME</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-md bg-input border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="player_one"
                maxLength={32}
              />
            </div>
          )}
          <div>
            <label className="block font-display text-[10px] text-muted-foreground mb-2">EMAIL</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md bg-input border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="you@arcade.io"
            />
          </div>
          <div>
            <label className="block font-display text-[10px] text-muted-foreground mb-2">PASSWORD</label>
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              className="w-full rounded-md bg-input border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full rounded-md bg-primary py-3 text-primary-foreground font-display text-sm hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "..." : isSignup ? "▶ CREATE ACCOUNT" : "▶ SIGN IN"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {isSignup ? (
            <>Have an account? <Link to="/login" search={{ mode: "signin" }} className="text-neon-cyan hover:underline">Sign in</Link></>
          ) : (
            <>New player? <Link to="/login" search={{ mode: "signup" }} className="text-neon-pink hover:underline">Create account</Link></>
          )}
        </div>
      </div>
    </div>
  );
}
