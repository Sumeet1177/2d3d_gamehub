import { useEffect, useRef, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { GameFrame } from "@/components/game/GameFrame";
import { useGameLoop, useGameState, useKeys } from "@/components/game/useGameLoop";

export const Route = createFileRoute("/_authenticated/play/shooter")({
  component: ShooterGame,
});

interface Entity { x: number; y: number; vx?: number; vy?: number; hp?: number; }

function ShooterGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state, setState, start, pause, resume, over } = useGameState({ health: 3 });
  const keys = useKeys();

  const player = useRef({ x: 0, y: 0 });
  const bullets = useRef<Entity[]>([]);
  const enemies = useRef<Entity[]>([]);
  const ebullets = useRef<Entity[]>([]);
  const stars = useRef<{ x: number; y: number; s: number }[]>([]);
  const fireT = useRef(0);
  const spawnT = useRef(1);
  const tnow = useRef(0);

  const reset = useCallback(() => {
    bullets.current = []; enemies.current = []; ebullets.current = [];
    fireT.current = 0; spawnT.current = 1; tnow.current = 0;
    setState({ score: 0, level: 1, status: "ready", health: 3 });
  }, [setState]);

  useGameLoop(state.status, (dt) => {
    const c = canvasRef.current!;
    const W = c.width, H = c.height;
    tnow.current += dt;

    if (!stars.current.length) {
      for (let i = 0; i < 60; i++) stars.current.push({ x: Math.random() * W, y: Math.random() * H, s: 0.3 + Math.random() });
    }

    // init player
    if (player.current.x === 0 && player.current.y === 0) {
      player.current.x = W / 2; player.current.y = H - 60;
    }

    // input
    const sp = 320 * dt;
    if (keys.current.has("arrowleft") || keys.current.has("a")) player.current.x -= sp;
    if (keys.current.has("arrowright") || keys.current.has("d")) player.current.x += sp;
    if (keys.current.has("arrowup") || keys.current.has("w")) player.current.y -= sp;
    if (keys.current.has("arrowdown") || keys.current.has("s")) player.current.y += sp;
    player.current.x = Math.max(20, Math.min(W - 20, player.current.x));
    player.current.y = Math.max(20, Math.min(H - 20, player.current.y));

    fireT.current -= dt;
    if ((keys.current.has(" ") || keys.current.has("f")) && fireT.current <= 0) {
      bullets.current.push({ x: player.current.x, y: player.current.y - 20, vy: -560 });
      fireT.current = 0.18;
    }

    // spawn enemies
    spawnT.current -= dt;
    if (spawnT.current <= 0) {
      const cnt = 1 + Math.floor(state.level / 2);
      for (let i = 0; i < cnt; i++) {
        enemies.current.push({
          x: 40 + Math.random() * (W - 80),
          y: -30 - i * 40,
          vy: 60 + Math.random() * 60 + state.level * 8,
          hp: 1,
        });
      }
      spawnT.current = Math.max(0.4, 1.5 - state.level * 0.05);
    }

    // move
    bullets.current.forEach((b) => (b.y += b.vy! * dt));
    bullets.current = bullets.current.filter((b) => b.y > -10);
    ebullets.current.forEach((b) => (b.y += b.vy! * dt));
    ebullets.current = ebullets.current.filter((b) => b.y < H + 10);
    enemies.current.forEach((e) => {
      e.y += e.vy! * dt;
      if (Math.random() < 0.003) ebullets.current.push({ x: e.x, y: e.y + 12, vy: 240 });
    });

    // collisions: bullet vs enemy
    bullets.current = bullets.current.filter((b) => {
      for (const e of enemies.current) {
        if (Math.abs(b.x - e.x) < 18 && Math.abs(b.y - e.y) < 18) {
          e.hp! -= 1;
          setState((s) => ({ ...s, score: s.score + 10 }));
          return false;
        }
      }
      return true;
    });
    enemies.current = enemies.current.filter((e) => {
      if (e.hp! <= 0) { setState((s) => ({ ...s, score: s.score + 50 })); return false; }
      if (e.y > H + 20) return false;
      return true;
    });

    // enemy bullet vs player
    for (const b of ebullets.current) {
      if (Math.abs(b.x - player.current.x) < 18 && Math.abs(b.y - player.current.y) < 18) {
        b.y = H + 100;
        setState((s) => {
          const hp = (s.health ?? 0) - 1;
          if (hp <= 0) { setTimeout(over, 0); return { ...s, health: 0 }; }
          return { ...s, health: hp };
        });
      }
    }
    // enemy collide player
    for (const e of enemies.current) {
      if (Math.abs(e.x - player.current.x) < 22 && Math.abs(e.y - player.current.y) < 22) {
        e.hp = 0;
        setState((s) => {
          const hp = (s.health ?? 0) - 1;
          if (hp <= 0) { setTimeout(over, 0); return { ...s, health: 0 }; }
          return { ...s, health: hp };
        });
      }
    }

    setState((s) => ({ ...s, level: 1 + Math.floor(s.score / 500) }));

    // render
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#02030a"; ctx.fillRect(0, 0, W, H);
    // stars
    stars.current.forEach((st) => {
      st.y += (20 + st.s * 30) * dt;
      if (st.y > H) { st.y = 0; st.x = Math.random() * W; }
      ctx.fillStyle = `rgba(125,249,255,${0.3 + st.s * 0.4})`;
      ctx.fillRect(st.x, st.y, st.s * 2, st.s * 2);
    });
    // player ship
    ctx.fillStyle = "#7df9ff";
    ctx.beginPath();
    ctx.moveTo(player.current.x, player.current.y - 16);
    ctx.lineTo(player.current.x - 16, player.current.y + 14);
    ctx.lineTo(player.current.x + 16, player.current.y + 14);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ff2d92";
    ctx.fillRect(player.current.x - 4, player.current.y + 14, 8, 6);
    // bullets
    ctx.fillStyle = "#ffd166";
    bullets.current.forEach((b) => ctx.fillRect(b.x - 2, b.y - 8, 4, 12));
    ctx.fillStyle = "#ff2d92";
    ebullets.current.forEach((b) => ctx.fillRect(b.x - 2, b.y - 6, 4, 12));
    // enemies
    enemies.current.forEach((e) => {
      ctx.fillStyle = "#b14aff";
      ctx.beginPath();
      ctx.moveTo(e.x, e.y + 14);
      ctx.lineTo(e.x - 16, e.y - 10);
      ctx.lineTo(e.x + 16, e.y - 10);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(e.x - 3, e.y - 3, 6, 6);
    });
  });

  useEffect(() => {
    const c = canvasRef.current!;
    const fit = () => {
      const r = c.parentElement!.getBoundingClientRect();
      c.width = r.width; c.height = r.height;
      player.current = { x: r.width / 2, y: r.height - 60 };
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(c.parentElement!);
    return () => ro.disconnect();
  }, []);

  return (
    <GameFrame
      gameId="shooter" title="Space Shooter" emoji="🔫"
      controls="WASD / Arrows to move · SPACE / F to fire"
      state={state}
      onStart={start} onPause={pause} onResume={resume} onRestart={() => { reset(); setTimeout(start, 50); }}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </GameFrame>
  );
}
