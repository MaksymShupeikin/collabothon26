import type { ReactNode } from "react";

// Bank-style pictograms: bold, filled shapes in petrol + comdirect yellow.
// `round` = yellow/white symbol on a petrol disc (avatars, mode tiles); otherwise petrol symbol on transparent.
const INK = "var(--color-ink)", ACC = "var(--color-accent)", WHITE = "var(--color-white)", INK2 = "var(--color-ink-2)";
type C = { fg: string; bg: string };

const ICONS: Record<string, (c: C) => ReactNode> = {
  // modes
  compass: ({ fg }) => <><circle cx="24" cy="24" r="16" fill="none" stroke={fg} strokeWidth="4" /><path d="M24 12l5 12-5 12-5-12z" fill={ACC} /></>,
  chart: ({ fg }) => <><path d="M8 40h32" stroke={fg} strokeWidth="4" strokeLinecap="round" /><rect x="9.5" y="27.5" width="8" height="9" rx="1.5" fill="none" stroke={fg} strokeWidth="3" /><rect x="20.5" y="18.5" width="8" height="18" rx="1.5" fill="none" stroke={fg} strokeWidth="3" /><rect x="31" y="8" width="8" height="30" rx="1.5" fill={ACC} /></>,
  // a sapling growing out of a coin stack: money that grows over a lifetime
  sprout: ({ fg }) => <><rect x="10" y="35" width="28" height="7" rx="3.5" fill={fg} /><rect x="13" y="27" width="22" height="7" rx="3.5" fill="none" stroke={fg} strokeWidth="3" /><path d="M24 27V13" stroke={fg} strokeWidth="4" strokeLinecap="round" /><path d="M24 21c-2-7-8-9-14-8 0 6 6 10 14 8zM24 14c2-7 8-9 14-8 0 6-6 10-14 8z" fill={ACC} /></>,
  flag: ({ fg }) => <><path d="M12 6v36" stroke={fg} strokeWidth="4" strokeLinecap="round" /><path d="M14 8h24l-6 8 6 8H14z" fill={fg} /></>,
  hourglass: ({ fg }) => <><path d="M10 7h28M10 41h28" stroke={fg} strokeWidth="4" strokeLinecap="round" /><path d="M14 7c0 10 8 13 8 17s-8 7-8 17h20c0-10-8-13-8-17s8-7 8-17z" fill="none" stroke={fg} strokeWidth="4" strokeLinejoin="round" /><path d="M19 14h10c-1 4-3 5-5 6-2-1-4-2-5-6zM18 37c1-3 3-5 6-5s5 2 6 5z" fill={ACC} /></>,
  // MCP agent bridge: central hub linked to three external nodes
  agent: ({ fg }) => <><path d="M24 24L12 12M24 24L36 12M24 24v15" stroke={fg} strokeWidth="3.5" strokeLinecap="round" /><circle cx="12" cy="12" r="4.5" fill={fg} /><circle cx="36" cy="12" r="4.5" fill={fg} /><circle cx="24" cy="39" r="4.5" fill={fg} /><circle cx="24" cy="24" r="7.5" fill={ACC} stroke={fg} strokeWidth="3" /></>,
  // bots
  waves: ({ fg }) => <><path d="M5 34l9-16 9 18 9-24 11 14" fill="none" stroke={fg} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="32" cy="12" r="5" fill={ACC} /></>,
  max: ({ fg, bg }) => <><path d="M24 6c8 6 10 16 7 26H17C14 22 16 12 24 6z" fill={fg} /><circle cx="24" cy="19" r="4" fill={bg} /><path d="M17 26l-6 9h7M31 26l6 9h-7" fill={fg} /><path d="M19 34h10l-5 10z" fill={ACC} /></>,
  paula: ({ fg, bg }) => <><circle cx="22" cy="26" r="16" fill={fg} /><circle cx="16" cy="22" r="2.6" fill={bg} /><circle cx="28" cy="22" r="2.6" fill={bg} /><ellipse cx="22" cy="32" rx="3.5" ry="4.5" fill={bg} /><path d="M40 4c-3 5-5 8-5 11a5 5 0 0010 0c0-3-2-6-5-11z" fill={ACC} /></>,
  alex: ({ fg, bg }) => <><rect x="8" y="8" width="32" height="32" rx="7" fill={fg} /><circle cx="16" cy="16" r="3.5" fill={bg} /><circle cx="24" cy="24" r="3.5" fill={ACC} /><circle cx="32" cy="32" r="3.5" fill={bg} /></>,
  dan: () => <path d="M28 4L10 28h12l-4 16 20-26H26z" fill={ACC} />,
  hanna: ({ fg, bg }) => <><rect x="8" y="9" width="32" height="30" rx="4" fill={fg} /><rect x="12" y="13" width="24" height="7" rx="1" fill={ACC} /><path d="M13 26h22M13 33h14" stroke={bg} strokeWidth="3.5" strokeLinecap="round" /></>,
  sam: ({ fg }) => <><path d="M7 32a15 15 0 0130 0z" fill={ACC} /><circle cx="40" cy="28" r="5" fill={fg} /><rect x="11" y="31" width="6" height="8" rx="2" fill={fg} /><rect x="27" y="31" width="6" height="8" rx="2" fill={fg} /></>,
  // Investor Simulator rivals: careful Anna's safe, the sleeper's mattress
  anna: ({ fg, bg }) => <><rect x="7" y="7" width="34" height="31" rx="5" fill={fg} /><circle cx="24" cy="22.5" r="8.5" fill={ACC} /><path d="M24 17v5.5l3.5 3" stroke={bg} strokeWidth="3" strokeLinecap="round" fill="none" /><rect x="11" y="38" width="7" height="4" rx="1.5" fill={fg} /><rect x="30" y="38" width="7" height="4" rx="1.5" fill={fg} /></>,
  sleeper: ({ fg }) => <><rect x="5" y="27" width="38" height="9" rx="4" fill={fg} /><path d="M7 36v5M41 36v5" stroke={fg} strokeWidth="4" strokeLinecap="round" /><path d="M27 7h9l-9 9h9M15 14h7l-7 7h7" stroke={ACC} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /></>,
  you: ({ fg }) => <><circle cx="24" cy="16" r="9" fill={fg} /><path d="M8 42c1-10 7-15 16-15s15 5 16 15z" fill={fg} /></>,
  // collection & mini-games
  card: ({ fg }) => <><rect x="11" y="6" width="26" height="36" rx="5" fill={ACC} stroke={fg} strokeWidth="3.5" /><path d="M24 15l6 9-6 9-6-9z" fill={fg} /></>,
  game: ({ fg }) => <><rect x="4" y="14" width="40" height="22" rx="11" fill={fg} /><path d="M14 20v10M9 25h10" stroke={WHITE} strokeWidth="3.5" strokeLinecap="round" /><circle cx="31" cy="22" r="3" fill={ACC} /><circle cx="37" cy="28" r="3" fill={ACC} /></>,
  lock: () => <><path d="M15 22v-6a9 9 0 0118 0v6" fill="none" stroke={INK2} strokeWidth="5" /><rect x="10" y="21" width="28" height="21" rx="5" fill={INK2} /></>,
  egg: ({ fg }) => <path d="M24 5c8 0 14 13 14 22a14 14 0 01-28 0c0-9 6-22 14-22z" fill={WHITE} stroke={fg} strokeWidth="3.5" />,
  basket: ({ fg }) => <><path d="M14 20a10 10 0 0120 0" fill="none" stroke={fg} strokeWidth="4" strokeLinecap="round" /><path d="M5 20h38l-5 21H10z" fill={ACC} stroke={fg} strokeWidth="3.5" strokeLinejoin="round" /></>,
  bucket: ({ fg }) => <><path d="M8 12h32l-5 26H13z" fill={fg} /><path d="M24 38c-3 3-3 7 0 7s3-4 0-7z" fill={ACC} /></>,
  // time controls
  check: () => <path d="M9 25l10 10 20-22" fill="none" stroke={ACC} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />,
  play: ({ fg }) => <path d="M14 8l26 16-26 16z" fill={fg} />,
  pause: ({ fg }) => <><rect x="11" y="8" width="10" height="32" rx="2" fill={fg} /><rect x="27" y="8" width="10" height="32" rx="2" fill={fg} /></>,
};

/** Custom pictogram. `round` puts it on a petrol disc (avatars, mode tiles); `color` recolours a plain one (e.g. yellow on a dark band). */
export default function Icon({ name, size = 20, round = false, label, color }: { name: string; size?: number; round?: boolean; label?: string; color?: string }) {
  const you = name === "you";
  const c: C = round ? { fg: you ? INK : WHITE, bg: you ? ACC : INK } : { fg: color ?? INK, bg: WHITE };
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}
      style={{ verticalAlign: "middle", flexShrink: 0 }}>
      {round && <circle cx="24" cy="24" r="24" fill={c.bg} />}
      <g transform={round ? "translate(8 8) scale(0.667)" : undefined}>{ICONS[name]?.(c)}</g>
    </svg>
  );
}
