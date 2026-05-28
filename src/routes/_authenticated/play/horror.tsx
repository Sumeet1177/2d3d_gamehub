import { useEffect, useRef, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { GameFrame } from "@/components/game/GameFrame";
import { useGameLoop, useGameState, useKeys } from "@/components/game/useGameLoop";

export const Route = createFileRoute("/_authenticated/play/horror")({
  component: HorrorGame,
});

// Top-down dark maze with limited vision (flashlight). Collect keys, avoid the ghost.
const MAZE = [
  "###############",
  "#.....#.....K.#",
  "#.###.#.#####.#",
  "#.#...#.#...#.#",
  "#.#.###.#.#.#.#",
  "#.#.#...#.#.#.#",
  "#...#.###.#...#",
  "###.#.#...#.###",
  "#K..#.#.###.K.#",
  "#.###.#.....#.#",
  "#.....######..#",
  "#.###.....#...#",
  "#...#.###.#.#.#",
  "###.#...#.#.#.#",
  "#...###.#...#E#",
  "###############",
];
const CELL = 40;

function HorrorGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state, setState, start, pause, resume, over } = useGameState({ health: 3 });
  const keys = useKeys();

  const player = useRef({ x: 1.5, y: 1.5, angle: 0 });
  const ghost = useRef({ x: 12.5, y: 13.5 });
  const keysLeft = useRef(3);
  const maze = useRef<string[]>([]);
  const won = useRef(false);
  const tFlick = useRef(0);

  const reset = useCallback(() => {
    maze.current = MAZE.map((r) => r);
    player.current = { x: 1.5, y: 1.5, angle: 0 };
    ghost.current = { x: 12.5, y: 13.5 };
    keysLeft.current = 3; won.current = false; tFlick.current = 0;
    setState({ score: 0, level: 1, status: "ready", health: 3 });
  }, [setState]);

  const cellAt = (x: number, y: number) => {
    const row = maze.current[Math.floor(y)];
    if (!row) return "#";
    return row[Math.floor(x)] ?? "#";
  };
  const setCell = (x: number, y: number, ch: string) => {
    const yi = Math.floor(y), xi = Math.floor(x);
    const row = maze.current[yi];
    if (!row) return;
    maze.current[yi] = row.substring(0, xi) + ch + row.substring(xi + 1);
  };

  useGameLoop(state.status, (dt) => {
    if (!maze.current.length) maze.current = MAZE.map((r) => r);
    const c = canvasRef.current!;
    const W = c.width, H = c.height;

    const sp = 2.4 * dt;
    let dx = 0, dy = 0;
    if (keys.current.has("w") || keys.current.has("arrowup")) dy -= 1;
    if (keys.current.has("s") || keys.current.has("arrowdown")) dy += 1;
    if (keys.current.has("a") || keys.current.has("arrowleft")) dx -= 1;
    if (keys.current.has("d") || keys.current.has("arrowright")) dx += 1;
    if (dx || dy) {
      const m = Math.hypot(dx, dy);
      dx /= m; dy /= m;
      player.current.angle = Math.atan2(dy, dx);
      const nx = player.current.x + dx * sp;
      const ny = player.current.y + dy * sp;
      if (cellAt(nx, player.current.y) !== "#") player.current.x = nx;
      if (cellAt(player.current.x, ny) !== "#") player.current.y = ny;
    }

    // pick up key / exit
    const cell = cellAt(player.current.x, player.current.y);
    if (cell === "K") {
      setCell(player.current.x, player.current.y, ".");
      keysLeft.current--;
      setState((s) => ({ ...s, score: s.score + 100, level: 3 - keysLeft.current + 1 }));
    }
    if (cell === "E" && keysLeft.current === 0 && !won.current) {
      won.current = true;
      setState((s) => ({ ...s, score: s.score + 500 }));
      setTimeout(over, 100);
    }

    // ghost chases
    const gdx = player.current.x - ghost.current.x;
    const gdy = player.current.y - ghost.current.y;
    const gd = Math.hypot(gdx, gdy) || 1;
    const gs = 1.6 * dt;
    const ngx = ghost.current.x + (gdx / gd) * gs;
    const ngy = ghost.current.y + (gdy / gd) * gs;
    if (cellAt(ngx, ghost.current.y) !== "#") ghost.current.x = ngx;
    if (cellAt(ghost.current.x, ngy) !== "#") ghost.current.y = ngy;

    if (gd < 0.7) {
      setState((s) => {
        const hp = (s.health ?? 0) - 1;
        if (hp <= 0) { setTimeout(over, 0); return { ...s, health: 0 }; }
        return { ...s, health: hp };
      });
      // respawn ghost far away
      ghost.current = { x: 12.5, y: 13.5 };
    }

    tFlick.current += dt;

    // render
    const ctx = c.getContext("2d")!;
    const offX = W / 2 - player.current.x * CELL;
    const offY = H / 2 - player.current.y * CELL;
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);

    // draw maze
    for (let y = 0; y < maze.current.length; y++) {
      for (let x = 0; x < maze.current[y].length; x++) {
        const ch = maze.current[y][x];
        const px = x * CELL + offX, py = y * CELL + offY;
        if (ch === "#") {
          ctx.fillStyle = "#1a1018";
          ctx.fillRect(px, py, CELL, CELL);
          ctx.strokeStyle = "#3a1530"; ctx.strokeRect(px, py, CELL, CELL);
        } else {
          ctx.fillStyle = "#08050a";
          ctx.fillRect(px, py, CELL, CELL);
        }
        if (ch === "K") {
          ctx.fillStyle = "#ffd166";
          ctx.font = "20px sans-serif";
          ctx.fillText("🗝️", px + 8, py + 28);
        }
        if (ch === "E") {
          ctx.fillStyle = keysLeft.current === 0 ? "#4ade80" : "#ff2d92";
          ctx.fillRect(px + 8, py + 8, CELL - 16, CELL - 16);
          ctx.fillStyle = "#000"; ctx.font = "16px sans-serif";
          ctx.fillText("🚪", px + 10, py + 28);
        }
      }
    }

    // ghost (only visible if close)
    const ggx = ghost.current.x * CELL + offX;
    const ggy = ghost.current.y * CELL + offY;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "30px sans-serif";
    ctx.fillText("👻", ggx - 16, ggy + 10);

    // player
    const ppx = W / 2, ppy = H / 2;
    ctx.fillStyle = "#7df9ff";
    ctx.beginPath(); ctx.arc(ppx, ppy, 10, 0, Math.PI * 2); ctx.fill();

    // flashlight: cone + dark vignette
    const flicker = 1 + Math.sin(tFlick.current * 25) * 0.04;
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    const grd = ctx.createRadialGradient(ppx, ppy, 30, ppx, ppy, 260 * flicker);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.6, "rgba(50,50,50,1)");
    grd.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // cone overlay
    ctx.save();
    ctx.translate(ppx, ppy);
    ctx.rotate(player.current.angle);
    const cone = ctx.createRadialGradient(0, 0, 30, 0, 0, 320);
    cone.addColorStop(0, "rgba(255,240,180,0.5)");
    cone.addColorStop(1, "rgba(255,240,180,0)");
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 340, -0.6, 0.6);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // HUD overlay
    ctx.fillStyle = "#fff";
    ctx.font = "12px monospace";
    ctx.fillText(`KEYS LEFT: ${keysLeft.current}`, 12, 20);
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

  return (
    <GameFrame
      gameId="horror" title="Horror Escape" emoji="👻"
      controls="WASD to move · Collect all 🗝️ keys then reach the 🚪 exit · Don't let the ghost touch you"
      state={state}
      onStart={start} onPause={pause} onResume={resume} onRestart={() => { reset(); setTimeout(start, 50); }}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </GameFrame>
  );
}
