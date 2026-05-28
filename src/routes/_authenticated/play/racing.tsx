import { useEffect, useRef, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { GameFrame } from "@/components/game/GameFrame";
import { useGameLoop, useGameState, useKeys } from "@/components/game/useGameLoop";

export const Route = createFileRoute("/_authenticated/play/racing")({
  component: RacingGame,
});

// Pseudo-3D top-down racing with perspective road
interface OtherCar { lane: number; z: number; color: string; }

function RacingGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state, setState, start, pause, resume, over } = useGameState({ health: 3 });
  const keys = useKeys();

  const lane = useRef(1); // 0,1,2
  const targetLane = useRef(1);
  const cars = useRef<OtherCar[]>([]);
  const spawnT = useRef(1);
  const speed = useRef(380);
  const roadOffset = useRef(0);
  const switchT = useRef(0);

  const reset = useCallback(() => {
    lane.current = 1; targetLane.current = 1;
    cars.current = []; spawnT.current = 1;
    speed.current = 380; roadOffset.current = 0; switchT.current = 0;
    setState({ score: 0, level: 1, status: "ready", health: 3 });
  }, [setState]);

  useGameLoop(state.status, (dt) => {
    const c = canvasRef.current!;
    const W = c.width, H = c.height;

    switchT.current -= dt;
    const leftKey = keys.current.has("a") || keys.current.has("arrowleft");
    const rightKey = keys.current.has("d") || keys.current.has("arrowright");
    if (switchT.current <= 0) {
      if (leftKey && targetLane.current > 0) { targetLane.current--; switchT.current = 0.18; }
      else if (rightKey && targetLane.current < 2) { targetLane.current++; switchT.current = 0.18; }
    }
    // smooth lane
    lane.current += (targetLane.current - lane.current) * Math.min(1, dt * 12);

    roadOffset.current = (roadOffset.current + speed.current * dt) % 80;

    // spawn
    spawnT.current -= dt;
    if (spawnT.current <= 0) {
      cars.current.push({
        lane: Math.floor(Math.random() * 3),
        z: 0,
        color: ["#ff2d92", "#ffd166", "#b14aff", "#4ade80"][Math.floor(Math.random() * 4)],
      });
      spawnT.current = Math.max(0.45, 1.2 - state.level * 0.05);
    }

    cars.current.forEach((cc) => (cc.z += speed.current * dt));
    cars.current = cars.current.filter((cc) => cc.z < 1000);

    // collisions when car reaches player z (~ near bottom)
    const playerZ = 700;
    for (const cc of cars.current) {
      if (Math.abs(cc.z - playerZ) < 60 && Math.abs(cc.lane - lane.current) < 0.6) {
        cc.z = 2000; // remove
        setState((s) => {
          const hp = (s.health ?? 0) - 1;
          if (hp <= 0) { setTimeout(over, 0); return { ...s, health: 0 }; }
          return { ...s, health: hp };
        });
      }
    }

    setState((s) => {
      const ns = s.score + Math.floor(speed.current * dt * 0.2);
      const nl = 1 + Math.floor(ns / 800);
      return { ...s, score: ns, level: nl };
    });
    speed.current = 380 + Math.min(280, state.score / 8);

    // render
    const ctx = c.getContext("2d")!;
    // sky
    const grad = ctx.createLinearGradient(0, 0, 0, H * 0.5);
    grad.addColorStop(0, "#1a0a2a"); grad.addColorStop(1, "#3a1050");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H * 0.5);
    // sun
    ctx.fillStyle = "#ff2d92";
    ctx.beginPath(); ctx.arc(W / 2, H * 0.45, 50, 0, Math.PI * 2); ctx.fill();
    // grid horizon
    ctx.strokeStyle = "#ff2d92"; ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const y = H * 0.5 + i * 3;
      ctx.globalAlpha = 1 - i / 12;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // road
    const horizon = H * 0.5;
    ctx.fillStyle = "#101020";
    ctx.beginPath();
    ctx.moveTo(W * 0.35, horizon);
    ctx.lineTo(W * 0.65, horizon);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();

    // road lines (perspective)
    for (let i = 0; i < 14; i++) {
      const t = ((i * 80 - roadOffset.current) % (14 * 80)) / (14 * 80);
      if (t < 0 || t > 1) continue;
      const y = horizon + (H - horizon) * t * t;
      const w = (W * (t * t) * 0.5) + 2;
      ctx.fillStyle = "#fff";
      ctx.fillRect(W / 2 - w / 6, y, w / 12, 8 + t * 20);
    }
    // lane dividers
    for (let li = 1; li <= 2; li++) {
      ctx.strokeStyle = "rgba(125,249,255,0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const xT = W * 0.35 + (W * 0.3) * (li / 3);
      const xB = W * (li / 3);
      ctx.moveTo(xT, horizon); ctx.lineTo(xB, H); ctx.stroke();
    }

    // other cars (back to front)
    const sorted = [...cars.current].sort((a, b) => a.z - b.z);
    for (const cc of sorted) {
      const t = cc.z / 1000;
      const y = horizon + (H - horizon) * t * t;
      const laneXTop = W * 0.35 + (W * 0.3) * ((cc.lane + 0.5) / 3);
      const laneXBot = W * ((cc.lane + 0.5) / 3);
      const x = laneXTop + (laneXBot - laneXTop) * t * t;
      const size = 10 + 80 * t * t;
      ctx.fillStyle = cc.color;
      ctx.fillRect(x - size / 2, y - size * 0.7, size, size * 0.7);
      ctx.fillStyle = "#000";
      ctx.fillRect(x - size / 2 + 4, y - size * 0.55, size - 8, size * 0.2);
    }

    // player car
    const pLaneX = W * ((lane.current + 0.5) / 3);
    const psize = 80;
    ctx.fillStyle = "#7df9ff";
    ctx.fillRect(pLaneX - psize / 2, H - psize - 10, psize, psize * 0.7);
    ctx.fillStyle = "#000";
    ctx.fillRect(pLaneX - psize / 2 + 6, H - psize * 0.9, psize - 12, psize * 0.2);
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(pLaneX - psize / 2 + 4, H - 18, 12, 6);
    ctx.fillRect(pLaneX + psize / 2 - 16, H - 18, 12, 6);
  });

  useEffect(() => {
    const c = canvasRef.current!;
    const fit = () => {
      const r = c.parentElement!.getBoundingClientRect();
      c.width = r.width; c.height = r.height;
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(c.parentElement!);
    return () => ro.disconnect();
  }, []);

  const lanePress = (dir: -1 | 1) => {
    if (state.status !== "playing") return;
    targetLane.current = Math.max(0, Math.min(2, targetLane.current + dir));
  };

  return (
    <GameFrame
      gameId="racing" title="Car Racing" emoji="🚗"
      controls="A / ← left lane · D / → right lane · Avoid traffic"
      state={state}
      onStart={start} onPause={pause} onResume={resume} onRestart={() => { reset(); setTimeout(start, 50); }}
    >
      <div className="relative w-full h-full">
        <canvas ref={canvasRef} className="block w-full h-full" />
        <div className="absolute inset-x-0 bottom-2 flex justify-between px-4 sm:hidden">
          <button onPointerDown={() => lanePress(-1)} className="rounded-full bg-primary/80 px-6 py-3 font-display text-sm">◀</button>
          <button onPointerDown={() => lanePress(1)} className="rounded-full bg-primary/80 px-6 py-3 font-display text-sm">▶</button>
        </div>
      </div>
    </GameFrame>
  );
}
