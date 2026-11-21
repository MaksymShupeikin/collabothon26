// Small line icons for controls: one stroke weight, currentColor.
const PATHS = {
  minus: <path d="M5 12h14" />,
  plus: <path d="M12 5v14M5 12h14" />,
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
