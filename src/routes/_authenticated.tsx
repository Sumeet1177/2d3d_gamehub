import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: AuthLayout,
});

function AuthLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };
  return (
    <div className="min-h-screen">
      <header className="border-b border-border/40 backdrop-blur sticky top-0 z-50 bg-background/70">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="font-display text-sm text-neon-pink text-glow-pink">◆ NEON ARCADE</Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link to="/dashboard" className="font-display text-[10px] sm:text-xs hover:text-neon-cyan" activeProps={{ className: "text-neon-cyan" }}>HUB</Link>
            <Link to="/leaderboard" className="font-display text-[10px] sm:text-xs hover:text-neon-cyan" activeProps={{ className: "text-neon-cyan" }}>RANKS</Link>
            <span className="hidden sm:inline font-display text-[10px] text-muted-foreground">{user?.email}</span>
            <button onClick={handleSignOut} className="font-display text-[10px] sm:text-xs rounded border border-border px-3 py-1.5 hover:bg-secondary">EXIT</button>
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
