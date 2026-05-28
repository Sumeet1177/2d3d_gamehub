import { useEffect, useRef, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { GameFrame } from "@/components/game/GameFrame";
import { useGameLoop, useGameState } from "@/components/game/useGameLoop";

export const Route = createFileRoute("/_authenticated/play/fps")({
  component: FpsGame,
});

interface Target { x: number; y: number; z: number; vx: number; vy: number; r: number; alive: boolean; }

function FpsGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state, setState, start, pause, resume, over } = useGameState({ health: 30 });
  const mouse = useRef({ x: 0, y: 0 });
  const targets = useRef<Target[]>([]);
  const spawnT = useRef(0.5);
  const timeLeft = useRef(30);
  const flash = useRef(0);

  const reset = useCallback(() => {
    targets.current = []; spawnT.current = 0.5; timeLeft.current = 30; flash.current = 0;
    setState({ score: 0, level: 1, status: "ready", health: 30 });
  }, [setState]);

  useGameLoop(state.status, (dt) => {
    const c = canvasRef.current!;
    const W = c.width, H = c.height;

    timeLeft.current -= dt;
    if (timeLeft.current <= 0) { over(); return; }
    setState((s) => ({ ...s, health: Math.max(0, Math.ceil(timeLeft.current)) }));

    spawnT.current -= dt;
    if (spawnT.current <= 0) {
      targets.current.push({
        x: 0.2 + Math.random() * 0.6,
        y: 0.25 + Math.random() * 0.5,
        z: 1, // 0..1 (0 = closest)
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.06,
        r: 0,
        alive: true,
      });
      spawnT.current = Math.max(0.3, 1.0 - state.level * 0.04);
    }

    targets.current.forEach((t) => {
      t.z -= dt * 0.18;
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      if (t.x < 0.1 || t.x > 0.9) t.vx *= -1;
      if (t.y < 0.2 || t.y > 0.8) t.vy *= -1;
      t.r = 12 + (1 - t.z) * 50;
    });
    // missed targets cost time
    targets.current = targets.current.filter((t) => {
      if (t.z <= 0) {
        timeLeft.current = Math.max(0, timeLeft.current - 1.5);
        return false;
      }
      if (!t.alive) return false;
      return true;
    });

    flash.current = Math.max(0, flash.current - dt * 4);
    setState((s) => ({ ...s, level: 1 + Math.floor(s.score / 200) }));

    // render
    const ctx = c.getContext("2d")!;
    // sky / floor
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#0a0518"); sky.addColorStop(0.5, "#1a0530"); sky.addColorStop(0.5, "#2a1a0a"); sky.addColorStop(1, "#0a0a0a");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // perspective grid floor
    ctx.strokeStyle = "rgba(125,249,255,0.4)"; ctx.lineWidth = 1;
    for (let i = 1; i < 10; i++) {
      const y = H * 0.5 + (H * 0.5) * (i / 10) * (i / 10);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    for (let i = -10; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo(W / 2 + i * 30, H * 0.5);
      ctx.lineTo(W / 2 + i * 200, H);
      ctx.stroke();
    }

    // targets
    targets.current.forEach((t) => {
      const px = t.x * W, py = t.y * H;
      // rings
      for (let r = 3; r >= 1; r--) {
        ctx.fillStyle = r === 3 ? "#fff" : r === 2 ? "#ff2d92" : "#7df9ff";
        ctx.beginPath(); ctx.arc(px, py, t.r * (r / 3), 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(px, py, t.r * 0.15, 0, Math.PI * 2); ctx.fill();
    });

    // muzzle flash
    if (flash.current > 0) {
      ctx.fillStyle = `rgba(255,209,102,${flash.current * 0.4})`;
      ctx.fillRect(0, 0, W, H);
    }

    // gun
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.moveTo(W * 0.3, H);
    ctx.lineTo(W * 0.55, H * 0.7);
    ctx.lineTo(W * 0.7, H * 0.72);
    ctx.lineTo(W * 0.85, H);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#444";
    ctx.fillRect(W * 0.62, H * 0.7, W * 0.03, H * 0.1);

    // crosshair
    ctx.strokeStyle = "#7df9ff"; ctx.lineWidth = 2;
    const cx = mouse.current.x, cy = mouse.current.y;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy); ctx.lineTo(cx - 4, cy);
    ctx.moveTo(cx + 4, cy); ctx.lineTo(cx + 12, cy);
    ctx.moveTo(cx, cy - 12); ctx.lineTo(cx, cy - 4);
    ctx.moveTo(cx, cy + 4); ctx.lineTo(cx, cy + 12);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 1.5, 0, Math.PI * 2); ctx.fill();
  });

  useEffect(() => {
    const c = canvasRef.current!;
    const fit = () => {
      const r = c.parentElement!.getBoundingClientRect();
      c.width = r.width; c.height = r.height;
      mouse.current = { x: r.width / 2, y: r.height / 2 };
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(c.parentElement!);

    const mv = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      mouse.current.x = (e.clientX - r.left) * (c.width / r.width);
      mouse.current.y = (e.clientY - r.top) * (c.height / r.height);
    };
    const shoot = (e: PointerEvent) => {
      mv(e);
      flash.current = 1;
      const W = c.width, H = c.height;
      let hit = false;
      for (const t of targets.current) {
        if (!t.alive) continue;
        const px = t.x * W, py = t.y * H;
        if (Math.hypot(mouse.current.x - px, mouse.current.y - py) < t.r) {
          t.alive = false;
          hit = true;
          const points = Math.round(50 * (1 - t.z) + 20);
          setState((s) => ({ ...s, score: s.score + points }));
          timeLeft.current += 0.5;
          break;
        }
      }
      if (!hit) timeLeft.current = Math.max(0, timeLeft.current - 0.5);
    };
    c.addEventListener("pointermove", mv);
    c.addEventListener("pointerdown", shoot);
    return () => {
      ro.disconnect();
      c.removeEventListener("pointermove", mv);
      c.removeEventListener("pointerdown", shoot);
    };
  }, [setState]);

  return (
    <GameFrame
      gameId="fps" title="FPS Shooting" emoji="🎯"
      controls="Move mouse to aim · Click to shoot · Don't let targets escape (30s, +0.5s per hit)"
      state={state}
      onStart={start} onPause={pause} onResume={resume} onRestart={() => { reset(); setTimeout(start, 50); }}
    >
      <canvas ref={canvasRef} className="block w-full h-full cursor-none" />
    </GameFrame>
  );
}
