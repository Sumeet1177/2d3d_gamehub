import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GAMES } from "@/lib/games";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard — Neon Arcade" }] }),
  component: Leaderboard,
});

function Leaderboard() {
  const [game, setGame] = useState<string>("all");
  const { data, isLoading } = useQuery({
    queryKey: ["lb", game],
    queryFn: async () => {
      let q = supabase.from("scores").select("score, game_id, level, created_at, user_id").order("score", { ascending: false }).limit(50);
      if (game !== "all") q = q.eq("game_id", game);
      const { data: scores } = await q;
      const ids = [...new Set((scores ?? []).map((s) => s.user_id))];
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, username, avatar_emoji").in("id", ids)
        : { data: [] as { id: string; username: string; avatar_emoji: string }[] };
      const pmap = new Map((profs ?? []).map((p) => [p.id, p]));
      return (scores ?? []).map((s) => ({ ...s, profile: pmap.get(s.user_id) }));
    },
  });

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="font-display text-2xl sm:text-3xl text-neon-pink text-glow-pink">🏆 LEADERBOARD</h1>
      <p className="text-sm text-muted-foreground mt-2">The top 50 scores across all players.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => setGame("all")}
          className={`font-display text-[10px] px-3 py-2 rounded border ${game === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}
        >ALL GAMES</button>
        {GAMES.map((g) => (
          <button
            key={g.id}
            onClick={() => setGame(g.id)}
            className={`font-display text-[10px] px-3 py-2 rounded border ${game === g.id ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}
          >{g.emoji} {g.title.toUpperCase()}</button>
        ))}
      </div>

      <div className="mt-6 card-arcade rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground font-display text-xs">LOADING...</div>
        ) : !data?.length ? (
          <div className="p-10 text-center text-muted-foreground font-display text-xs">NO SCORES YET — BE THE FIRST</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/40 text-[10px] font-display text-muted-foreground">
                <th className="text-left p-3">#</th>
                <th className="text-left p-3">PLAYER</th>
                <th className="text-left p-3 hidden sm:table-cell">GAME</th>
                <th className="text-right p-3">SCORE</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => {
                const g = GAMES.find((x) => x.id === row.game_id);
                const colors = ["text-neon-amber", "text-neon-cyan", "text-neon-lime"];
                return (
                  <tr key={i} className="border-b border-border/20 hover:bg-secondary/30">
                    <td className={`p-3 font-display text-sm ${i < 3 ? colors[i] : "text-muted-foreground"}`}>{String(i + 1).padStart(2, "0")}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{row.profile?.avatar_emoji ?? "🎮"}</span>
                        <span className="font-body">{row.profile?.username ?? "anon"}</span>
                      </div>
                    </td>
                    <td className="p-3 text-sm hidden sm:table-cell">{g?.emoji} {g?.title}</td>
                    <td className="p-3 text-right font-display text-sm text-neon-pink">{row.score.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
