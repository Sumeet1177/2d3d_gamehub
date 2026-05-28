import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { GAMES } from "@/lib/games";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Neon Arcade — Mini Games Hub" },
      { name: "description", content: "Play 6 mini games and battle for the high score. Endless Runner, Space Shooter, Zombie Survival, Car Racing, FPS, Horror Escape." },
      { property: "og:title", content: "Neon Arcade" },
      { property: "og:description", content: "6 mini games. One leaderboard. Insert coin." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <div className="font-display text-neon-pink text-glow-pink text-sm sm:text-base">◆ NEON ARCADE</div>
        <nav className="flex gap-3">
          {user ? (
            <Link to="/dashboard" className="rounded-md bg-primary px-4 py-2 text-primary-foreground font-display text-xs hover:opacity-90">DASHBOARD</Link>
          ) : (
            <>
              <Link to="/login" className="rounded-md border border-border px-4 py-2 font-display text-xs hover:bg-secondary">LOGIN</Link>
              <Link to="/login" search={{ mode: "signup" }} className="rounded-md bg-primary px-4 py-2 text-primary-foreground font-display text-xs hover:opacity-90 animate-pulse-glow">SIGN UP</Link>
            </>
          )}
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pt-12 pb-20">
        <section className="text-center">
          <div className="inline-block font-display text-[10px] text-neon-cyan border border-neon-cyan/40 rounded-full px-3 py-1 mb-6">
            ▸ 6 GAMES · 1 LEADERBOARD ◂
          </div>
          <h1 className="font-display text-4xl sm:text-6xl md:text-7xl leading-tight">
            <span className="text-neon-pink text-glow-pink">INSERT</span>
            <br />
            <span className="text-neon-cyan text-glow-cyan">COIN</span>
          </h1>
          <p className="mt-6 max-w-xl mx-auto text-lg text-muted-foreground font-body">
            A retro-future mini arcade. Six games. One screen. Climb the global leaderboard or perish trying.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to={user ? "/dashboard" : "/login"}
              search={user ? undefined : { mode: "signup" }}
              className="rounded-md bg-primary px-6 py-3 text-primary-foreground font-display text-sm hover:opacity-90 animate-pulse-glow"
            >
              {loading ? "..." : user ? "▶ PLAY NOW" : "▶ START GAME"}
            </Link>
            <a href="#games" className="rounded-md border border-border px-6 py-3 font-display text-sm hover:bg-secondary">BROWSE GAMES</a>
          </div>
        </section>

        <section id="games" className="mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {GAMES.map((g) => (
            <div key={g.id} className="card-arcade rounded-xl p-6 hover:scale-[1.02] transition-transform">
              <div className="flex items-start justify-between">
                <div className="text-5xl">{g.emoji}</div>
                <span className={`text-[10px] font-display px-2 py-1 rounded border ${g.tag === "3D" ? "border-neon-violet/60 text-neon-violet" : "border-neon-cyan/60 text-neon-cyan"}`}>{g.tag}</span>
              </div>
              <h3 className={`mt-4 font-display text-base ${g.accent}`}>{g.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{g.blurb}</p>
            </div>
          ))}
        </section>

        <section className="mt-24 card-arcade rounded-xl p-8 text-center">
          <h2 className="font-display text-2xl text-neon-lime">FEATURES</h2>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {["Player Profiles", "Global Leaderboard", "Multiple Levels", "Power-Ups", "Score Tracking", "Pause / Restart", "Responsive UI", "Six Games"].map((f) => (
              <div key={f} className="rounded-md border border-border/60 px-3 py-3 text-muted-foreground">{f}</div>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/40 py-6 text-center text-xs text-muted-foreground font-display">
        © NEON ARCADE · PLAYER 1 READY
      </footer>
    </div>
  );
}
