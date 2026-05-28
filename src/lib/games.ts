export interface GameMeta {
  id: string;
  title: string;
  emoji: string;
  tag: "2D" | "3D";
  blurb: string;
  accent: string; // tailwind text color class
  status: "playable" | "coming-soon";
  path?: string;
}

export const GAMES: GameMeta[] = [
  { id: "runner", title: "Endless Runner", emoji: "🏃", tag: "2D", blurb: "Sprint forever. Dodge obstacles. Survive.", accent: "text-neon-lime", status: "playable", path: "/play/runner" },
  { id: "shooter", title: "Space Shooter", emoji: "🔫", tag: "2D", blurb: "Blast invaders across the void.", accent: "text-neon-cyan", status: "playable", path: "/play/shooter" },
  { id: "zombie", title: "Zombie Survival", emoji: "🧟", tag: "2D", blurb: "Hold the line against the undead horde.", accent: "text-neon-pink", status: "playable", path: "/play/zombie" },
  { id: "racing", title: "Car Racing", emoji: "🚗", tag: "3D", blurb: "Top-down high-octane lane racing.", accent: "text-neon-amber", status: "playable", path: "/play/racing" },
  { id: "fps", title: "FPS Shooting", emoji: "🎯", tag: "3D", blurb: "Reflex training — frag the targets.", accent: "text-neon-violet", status: "playable", path: "/play/fps" },
  { id: "horror", title: "Horror Escape", emoji: "👻", tag: "3D", blurb: "Find the keys. Don't get caught.", accent: "text-neon-pink", status: "playable", path: "/play/horror" },
];

export const getGame = (id: string) => GAMES.find((g) => g.id === id);
