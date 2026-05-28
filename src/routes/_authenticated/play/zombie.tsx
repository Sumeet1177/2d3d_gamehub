import { useEffect, useRef, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { GameFrame } from "@/components/game/GameFrame";
import { useGameLoop, useGameState, useKeys } from "@/components/game/useGameLoop";

export const Route = createFileRoute("/_authenticated/play/zombie")({
  component: ZombieGame,
});

interface Zomb { x: number; y: number; hp: number; }
interface Bullet { x: number; y: number; vx: number; vy: number; }

function ZombieGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state, setState, start, pause, resume, over } = useGameState({ health: 5 });
  const keys = useKeys();
  const mouse = useRef({ x: 0, y: 0, down: false });

  const player = useRef({ x: 0, y: 0, angle: 0 });
  const zombies = useRef<Zomb[]>([]);
  const bullets = useRef<Bullet[]>([]);
  const spawnT = useRef(1);
  const fireT = useRef(0);

  const reset = useCallback(() => {
    zombies.current = []; bullets.current = [];
    spawnT.current = 1; fireT.current = 0;
    setState({ score: 0, level: 1, status: "ready", health: 5 });
  }, [setState]);

  useGameLoop(state.status, (dt) => {
    const c = canvasRef.current!;
    const W = c.width, H = c.height;

    const sp = 200 * dt;
    if (keys.current.has("w") || keys.current.has("arrowup")) player.current.y -= sp;
    if (keys.current.has("s") || keys.current.has("arrowdown")) player.current.y += sp;
    if (keys.current.has("a") || keys.current.has("arrowleft")) player.current.x -= sp;
    if (keys.current.has("d") || keys.current.has("arrowright")) player.current.x += sp;
    player.current.x = Math.max(20, Math.min(W - 20, player.current.x));
    player.current.y = Math.max(20, Math.min(H - 20, player.current.y));
    player.current.angle = Math.atan2(mouse.current.y - player.current.y, mouse.current.x - player.current.x);

    fireT.current -= dt;
    if (mouse.current.down && fireT.current <= 0) {
      bullets.current.push({
        x: player.current.x, y: player.current.y,
        vx: Math.cos(player.current.angle) * 520,
        vy: Math.sin(player.current.angle) * 520,
      });
      fireT.current = 0.22;
    }

    spawnT.current -= dt;
    if (spawnT.current <= 0) {
      const side = Math.floor(Math.random() * 4);
      const pos = side === 0 ? { x: Math.random() * W, y: -20 }
                 : side === 1 ? { x: W + 20, y: Math.random() * H }
                 : side === 2 ? { x: Math.random() * W, y: H + 20 }
                              : { x: -20, y: Math.random() * H };
      zombies.current.push({ ...pos, hp: 1 + Math.floor(state.level / 3) });
      spawnT.current = Math.max(0.3, 1.4 - state.level * 0.06);
    }

    zombies.current.forEach((z) => {
      const dx = player.current.x - z.x, dy = player.current.y - z.y;
      const d = Math.hypot(dx, dy) || 1;
      const zs = (45 + state.level * 4) * dt;
      z.x += (dx / d) * zs; z.y += (dy / d) * zs;
    });

    bullets.current.forEach((b) => { b.x += b.vx * dt; b.y += b.vy * dt; });
    bullets.current = bullets.current.filter((b) => b.x > -20 && b.x < W + 20 && b.y > -20 && b.y < H + 20);

    bullets.current = bullets.current.filter((b) => {
      for (const z of zombies.current) {
        if (Math.hypot(b.x - z.x, b.y - z.y) < 16) {
          z.hp -= 1;
          setState((s) => ({ ...s, score: s.score + 5 }));
          return false;
        }
      }
      return true;
    });
    zombies.current = zombies.current.filter((z) => {
      if (z.hp <= 0) { setState((s) => ({ ...s, score: s.score + 20 })); return false; }
      if (Math.hypot(z.x - player.current.x, z.y - player.current.y) < 22) {
        setState((s) => {
          const hp = (s.health ?? 0) - 1;
          if (hp <= 0) { setTimeout(over, 0); return { ...s, health: 0 }; }
          return { ...s, health: hp };
        });
        return false;
      }
      return true;
    });

    setState((s) => ({ ...s, level: 1 + Math.floor(s.score / 300) }));

    // render
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#0a0a0a"; ctx.fillRect(0, 0, W, H);
    // tile pattern
    ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // zombies
    zombies.current.forEach((z) => {
      ctx.fillStyle = "#4ade80";
      ctx.beginPath(); ctx.arc(z.x, z.y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ff2d92";
      ctx.fillRect(z.x - 5, z.y - 5, 3, 3);
      ctx.fillRect(z.x + 2, z.y - 5, 3, 3);
    });

    // bullets
    ctx.fillStyle = "#ffd166";
    bullets.current.forEach((b) => { ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill(); });

    // player
    ctx.save();
    ctx.translate(player.current.x, player.current.y);
    ctx.rotate(player.current.angle);
    ctx.fillStyle = "#7df9ff";
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ff2d92";
    ctx.fillRect(8, -3, 14, 6);
    ctx.restore();
  });

  useEffect(() => {
    const c = canvasRef.current!;
    const fit = () => {
      const r = c.parentElement!.getBoundingClientRect();
      c.width = r.width; c.height = r.height;
      player.current = { x: r.width / 2, y: r.height / 2, angle: 0 };
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(c.parentElement!);

    const mv = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      mouse.current.x = (e.clientX - r.left) * (c.width / r.width);
      mouse.current.y = (e.clientY - r.top) * (c.height / r.height);
    };
    const dn = (e: PointerEvent) => { mouse.current.down = true; mv(e); };
    const up = () => (mouse.current.down = false);
    c.addEventListener("pointermove", mv);
    c.addEventListener("pointerdown", dn);
    window.addEventListener("pointerup", up);
    return () => {
      ro.disconnect();
      c.removeEventListener("pointermove", mv);
      c.removeEventListener("pointerdown", dn);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  return (
    <GameFrame
      gameId="zombie" title="Zombie Survival" emoji="🧟"
      controls="WASD to move · Mouse aim · Click & hold to fire"
      state={state}
      onStart={start} onPause={pause} onResume={resume} onRestart={() => { reset(); setTimeout(start, 50); }}
    >
      <canvas ref={canvasRef} className="block w-full h-full cursor-crosshair" />
    </GameFrame>
  );
}
