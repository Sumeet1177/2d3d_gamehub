import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export interface GameState {
  score: number;
  level: number;
  health?: number;
  status: "ready" | "playing" | "paused" | "over";
}

interface Props {
  gameId: string;
  title: string;
  emoji: string;
  controls: string;
  state: GameState;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  children: ReactNode;
}

export function GameFrame({ gameId, title, emoji, controls, state, onStart, onPause, onResume, onRestart, children }: Props) {
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (state.status === "over" && !submitted && user && state.score > 0) {
      setSubmitted(true);
      supabase.from("scores").insert({
        user_id: user.id, game_id: gameId, score: state.score, level: state.level,
      }).then(({ error }) => {
        if (error) toast.error("Could not save score");
        else toast.success(`Score saved: ${state.score}`);
      });
    }
    if (state.status === "playing" || state.status === "ready") setSubmitted(false);
  }, [state.status, state.score, state.level, gameId, user, submitted]);

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <Link to="/dashboard" className="font-display text-[10px] text-neon-cyan hover:underline">← HUB</Link>
        <div className="font-display text-sm text-neon-pink text-glow-pink">{emoji} {title}</div>
        <div className="w-12" />
      </div>

      <div className="card-arcade rounded-xl p-3 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 font-display text-[11px]">
          <div className="flex gap-4">
            <span>SCORE <span className="text-neon-amber ml-1">{state.score.toLocaleString()}</span></span>
            <span>LVL <span className="text-neon-cyan ml-1">{state.level}</span></span>
            {state.health !== undefined && (
              <span>HP <span className="text-neon-pink ml-1">{state.health}</span></span>
            )}
          </div>
          <div className="flex gap-2">
            {state.status === "playing" && (
              <button onClick={onPause} className="rounded border border-border px-3 py-1 hover:bg-secondary">PAUSE</button>
            )}
            {state.status === "paused" && (
              <button onClick={onResume} className="rounded border border-neon-cyan/60 text-neon-cyan px-3 py-1 hover:bg-secondary">RESUME</button>
            )}
            {(state.status === "over" || state.status === "playing" || state.status === "paused") && (
              <button onClick={onRestart} className="rounded border border-border px-3 py-1 hover:bg-secondary">RESTART</button>
            )}
          </div>
        </div>

        <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ aspectRatio: "4 / 3" }}>
          {children}

          {state.status === "ready" && (
            <Overlay>
              <div className="text-6xl mb-4">{emoji}</div>
              <div className="font-display text-xl text-neon-pink text-glow-pink mb-2">{title}</div>
              <div className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">{controls}</div>
              <button onClick={onStart} className="rounded-md bg-primary px-6 py-3 text-primary-foreground font-display text-sm animate-pulse-glow">
                ▶ PRESS START
              </button>
            </Overlay>
          )}
          {state.status === "paused" && (
            <Overlay>
              <div className="font-display text-2xl text-neon-cyan text-glow-cyan">PAUSED</div>
              <button onClick={onResume} className="mt-6 rounded-md bg-primary px-6 py-3 text-primary-foreground font-display text-sm">RESUME</button>
            </Overlay>
          )}
          {state.status === "over" && (
            <Overlay>
              <div className="font-display text-3xl text-neon-pink text-glow-pink mb-2">GAME OVER</div>
              <div className="text-sm text-muted-foreground mb-1">Final score</div>
              <div className="font-display text-4xl text-neon-amber mb-6">{state.score.toLocaleString()}</div>
              <div className="flex gap-3">
                <button onClick={onRestart} className="rounded-md bg-primary px-5 py-2.5 text-primary-foreground font-display text-sm">PLAY AGAIN</button>
                <Link to="/leaderboard" className="rounded-md border border-border px-5 py-2.5 font-display text-sm hover:bg-secondary">LEADERBOARD</Link>
              </div>
            </Overlay>
          )}
        </div>

        <p className="mt-3 text-xs text-muted-foreground text-center">{controls}</p>
      </div>
    </main>
  );
}

function Overlay({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 bg-background/85 backdrop-blur flex flex-col items-center justify-center text-center p-6 z-10">
      {children}
    </div>
  );
}
