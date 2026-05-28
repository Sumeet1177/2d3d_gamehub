import { createFileRoute, Link } from "@tanstack/react-router";
import { GAMES } from "@/lib/games";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Hub — Neon Arcade" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ["my-stats", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("scores")
        .select("game_id, score")
        .eq("user_id", user!.id)
        .order("score", { ascending: false });
      const best: Record<string, number> = {};
      let total = 0;
      let games = 0;
      data?.forEach((r) => {
        if (!best[r.game_id] || r.score > best[r.game_id]) best[r.game_id] = r.score;
        total += r.score;
        games++;
      });
      return { best, total, games };
    },
    enabled: !!user,
  });

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="card-arcade rounded-xl p-6 sm:p-8 flex items-center gap-5">
        <div className="text-5xl sm:text-6xl">{profile?.avatar_emoji ?? "🎮"}</div>
        <div className="flex-1">
          <div className="font-display text-[10px] text-neon-cyan">PLAYER 1</div>
          <h1 className="font-display text-xl sm:text-2xl text-neon-pink text-glow-pink mt-1">
            {profile?.username ?? "..."}
          </h1>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground font-body">
            <span>🏆 Total: <span className="text-foreground font-bold">{stats?.total ?? 0}</span></span>
            <span>🎯 Plays: <span className="text-foreground font-bold">{stats?.games ?? 0}</span></span>
          </div>
        </div>
      </div>

      <h2 className="mt-10 font-display text-lg text-neon-lime">▸ SELECT GAME</h2>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {GAMES.map((g) => {
          const best = stats?.best[g.id] ?? 0;
          const card = (
            <div className={`card-arcade rounded-xl p-6 h-full ${g.status === "playable" ? "hover:scale-[1.03] cursor-pointer" : "opacity-60"} transition-transform`}>
              <div className="flex items-start justify-between">
                <div className="text-5xl">{g.emoji}</div>
                <span className={`text-[10px] font-display px-2 py-1 rounded border ${g.tag === "3D" ? "border-neon-violet/60 text-neon-violet" : "border-neon-cyan/60 text-neon-cyan"}`}>{g.tag}</span>
              </div>
              <h3 className={`mt-4 font-display text-base ${g.accent}`}>{g.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{g.blurb}</p>
              <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
                <span className="font-display text-[10px] text-muted-foreground">BEST</span>
                <span className="font-display text-sm text-neon-amber">{best.toLocaleString()}</span>
              </div>
            </div>
          );
          return g.path ? (
            <Link key={g.id} to={g.path}>{card}</Link>
          ) : (
            <div key={g.id}>{card}</div>
          );
        })}
      </div>
    </main>
  );
}
