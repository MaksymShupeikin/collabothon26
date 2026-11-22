// Small line icons for controls: one stroke weight, currentColor.
const PATHS = {
  minus: <path d="M5 12h14" />,
  plus: <path d="M12 5v14M5 12h14" />,
  // Backtest (bar replay) controls
  rewind: <><path d="M4 12a8 8 0 1 0 2.3-5.6" /><path d="M4 4v4.5h4.5" /></>,
  barReplay: <><path d="M11 6l-6 6 6 6" /><path d="M19 6l-6 6 6 6" /></>,
  scissors: <><circle cx="6" cy="6" r="2.5" /><circle cx="6" cy="18" r="2.5" /><path d="M8.1 7.8L19 18" /><path d="M19 6L8.1 16.2" /></>,
  stepBack: <><path d="M6 5v14" /><path d="M18 6l-8 6 8 6z" /></>,
  stepForward: <><path d="M18 5v14" /><path d="M6 6l8 6-8 6z" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  close: <path d="M6 6l12 12M18 6L6 18" />,
} as const;

export type GlyphName = keyof typeof PATHS;

export default function Glyph({ name, size = 16, label }: { name: GlyphName; size?: number; label?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="glyph" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {PATHS[name]}
    </svg>
  );
}
