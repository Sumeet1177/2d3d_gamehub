import { useEffect, useRef, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { GameFrame } from "@/components/game/GameFrame";
import { useGameLoop, useGameState, useKeys } from "@/components/game/useGameLoop";

export const Route = createFileRoute("/_authenticated/play/runner")({
  component: RunnerGame,
});

interface Obstacle { x: number; w: number; h: number; }
interface Coin { x: number; y: number; }

function RunnerGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state, setState, start, pause, resume, over } = useGameState();
  const keys = useKeys();

  const player = useRef({ y: 0, vy: 0, jumping: false });
  const obstacles = useRef<Obstacle[]>([]);
  const coins = useRef<Coin[]>([]);
  const speed = useRef(280);
  const spawnT = useRef(0);
  const coinT = useRef(0);
  const distance = useRef(0);

  const reset = useCallback(() => {
    player.current = { y: 0, vy: 0, jumping: false };
    obstacles.current = [];
    coins.current = [];
    speed.current = 280;
    spawnT.current = 0; coinT.current = 0; distance.current = 0;
    setState({ score: 0, level: 1, status: "ready" });
  }, [setState]);

  useGameLoop(state.status, (dt) => {
    const c = canvasRef.current;
    if (!c) return;
    const W = c.width, H = c.height;
    const GROUND = H - 60;

    // input — jump
    const jumpKey = keys.current.has(" ") || keys.current.has("arrowup") || keys.current.has("w");
    if (jumpKey && !player.current.jumping) {
      player.current.vy = -620;
      player.current.jumping = true;
    }
    // physics
    player.current.vy += 1800 * dt;
    player.current.y += player.current.vy * dt;
    if (player.current.y >= 0) { player.current.y = 0; player.current.vy = 0; player.current.jumping = false; }

    // move world
    const v = speed.current;
    distance.current += v * dt;
    obstacles.current.forEach((o) => (o.x -= v * dt));
    coins.current.forEach((cn) => (cn.x -= v * dt));
    obstacles.current = obstacles.current.filter((o) => o.x + o.w > 0);
    coins.current = coins.current.filter((cn) => cn.x > -20);

    spawnT.current -= dt;
    if (spawnT.current <= 0) {
      const h = 30 + Math.random() * 50;
      obstacles.current.push({ x: W + 20, w: 20 + Math.random() * 25, h });
      spawnT.current = 0.7 + Math.random() * 0.8 - Math.min(0.5, distance.current / 5000);
    }
    coinT.current -= dt;
    if (coinT.current <= 0) {
      coins.current.push({ x: W + 20, y: GROUND - 80 - Math.random() * 80 });
      coinT.current = 1.2 + Math.random() * 1.5;
    }

    // collisions
    const px = 80, pw = 36, ph = 48;
    const py = GROUND - ph + player.current.y;
    for (const o of obstacles.current) {
      if (px + pw > o.x && px < o.x + o.w && py + ph > GROUND - o.h) {
        over();
        return;
      }
    }
    coins.current = coins.current.filter((cn) => {
      if (Math.abs(cn.x - (px + pw/2)) < 20 && Math.abs(cn.y - (py + ph/2)) < 25) {
        setState((s) => ({ ...s, score: s.score + 25 }));
        return false;
      }
      return true;
    });

    // score & level
    setState((s) => {
      const newScore = s.score + Math.floor(v * dt * 0.1);
      const newLevel = 1 + Math.floor(distance.current / 1500);
      return { ...s, score: newScore, level: newLevel };
    });
    speed.current = 280 + Math.min(320, distance.current / 20);

    // render
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 0, W, H);
    // parallax stars
    ctx.fillStyle = "#1a1a3a";
    for (let i = 0; i < 40; i++) {
      const sx = (i * 137 - distance.current * 0.2) % W;
      ctx.fillRect((sx + W) % W, (i * 53) % (H - 100), 2, 2);
    }
    // ground
    ctx.fillStyle = "#2a2a4a";
    ctx.fillRect(0, GROUND, W, 60);
    ctx.fillStyle = "#ff2d92";
    ctx.fillRect(0, GROUND, W, 3);
    // ground stripes
    for (let i = 0; i < W / 40; i++) {
      const sx = (i * 40 - distance.current) % W;
      ctx.fillStyle = "#3a3a5a";
      ctx.fillRect((sx + W) % W, GROUND + 15, 20, 3);
    }
    // obstacles
    ctx.fillStyle = "#ff2d92";
    for (const o of obstacles.current) {
      ctx.fillRect(o.x, GROUND - o.h, o.w, o.h);
      ctx.fillStyle = "#fff";
      ctx.fillRect(o.x, GROUND - o.h, o.w, 3);
      ctx.fillStyle = "#ff2d92";
    }
    // coins
    for (const cn of coins.current) {
      ctx.fillStyle = "#ffd166";
      ctx.beginPath(); ctx.arc(cn.x, cn.y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff7c2";
      ctx.beginPath(); ctx.arc(cn.x - 2, cn.y - 2, 3, 0, Math.PI * 2); ctx.fill();
    }
    // player
    ctx.fillStyle = "#7df9ff";
    ctx.fillRect(px, py, pw, ph);
    ctx.fillStyle = "#fff";
    ctx.fillRect(px + 8, py + 10, 6, 6);
    ctx.fillRect(px + 22, py + 10, 6, 6);
  });

  // canvas size
  useEffect(() => {
    const c = canvasRef.current!;
    const fit = () => {
      const r = c.parentElement!.getBoundingClientRect();
      c.width = r.width; c.height = r.height;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(c.parentElement!);
    return () => ro.disconnect();
  }, []);

  // touch jump
  const jump = () => {
    if (state.status !== "playing") return;
    if (!player.current.jumping) {
      player.current.vy = -620;
      player.current.jumping = true;
    }
  };

  return (
    <GameFrame
      gameId="runner" title="Endless Runner" emoji="🏃"
      controls="SPACE / ↑ / W to jump · tap screen on mobile. Collect coins, dodge spikes."
      state={state}
      onStart={start} onPause={pause} onResume={resume} onRestart={() => { reset(); setTimeout(start, 50); }}
    >
      <canvas ref={canvasRef} onPointerDown={jump} className="block w-full h-full" />
    </GameFrame>
  );
}
