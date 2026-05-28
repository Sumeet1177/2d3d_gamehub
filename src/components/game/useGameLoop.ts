import { useEffect, useRef, useState, useCallback } from "react";
import type { GameState } from "./GameFrame";

export function useGameLoop(
  status: GameState["status"],
  tick: (dt: number) => void,
) {
  const tickRef = useRef(tick);
  tickRef.current = tick;
  useEffect(() => {
    if (status !== "playing") return;
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t;
      tickRef.current(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [status]);
}

export function useKeys() {
  const keys = useRef<Set<string>>(new Set());
  useEffect(() => {
    const d = (e: KeyboardEvent) => {
      keys.current.add(e.key.toLowerCase());
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase())) e.preventDefault();
    };
    const u = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", d);
    window.addEventListener("keyup", u);
    return () => {
      window.removeEventListener("keydown", d);
      window.removeEventListener("keyup", u);
    };
  }, []);
  return keys;
}

export function useGameState(initial: Partial<GameState> = {}) {
  const [state, setState] = useState<GameState>({
    score: 0, level: 1, status: "ready", ...initial,
  });
  const start = useCallback(() => setState((s) => ({ ...s, status: "playing" })), []);
  const pause = useCallback(() => setState((s) => (s.status === "playing" ? { ...s, status: "paused" } : s)), []);
  const resume = useCallback(() => setState((s) => (s.status === "paused" ? { ...s, status: "playing" } : s)), []);
  const over = useCallback(() => setState((s) => ({ ...s, status: "over" })), []);
  return { state, setState, start, pause, resume, over };
}
