import type { ReactNode } from "react";
import { dict } from "@/shared/lib/i18n";

/** Short names that fit on a collectible tile. The full title stays on the card itself. */
export const CARD_SHORT: Record<string, string> = {
  stock: "Stock",
  "order-types": "Order types",
  fees: "Fees & spread",
  pnl: "Profit & loss",
  "signal-noise": "Signal vs. noise",
  "priced-in": "Priced in",
  rumor: "Buy the rumor",
  volatility: "Volatility",
  diversification: "Diversify",
  etf: "ETF",
  compound: "Compounding",
  "savings-plan": "Savings plan",
};

// Card short names render without cards.ts loaded (Investor Simulator), so they carry their own German.
dict({ Stock: "Aktie", "Fees & spread": "Gebühren & Spread", "Profit & loss": "Gewinn & Verlust", "Signal vs. noise": "Signal vs. Rauschen", "Priced in": "Eingepreist", ETF: "ETF", "Order types": "Orderarten", "Buy the rumor": "Gerüchte kaufen", Volatility: "Volatilität", Diversify: "Streuen", Compounding: "Zinseszins", "Savings plan": "Sparplan" });

const FILL = "var(--art-fill, none)";
const SOFT = 0.45;

/** One authored pictogram per concept card: a single 2.5 stroke family on a 48 grid, `currentColor` for ink and `--art-fill` for the solid parts. */
const ART: Record<string, ReactNode> = {
  // A pie: the wedge pulled out is "your piece" of the company.
  stock: <>
    <circle cx="21" cy="27" r="15" fill={FILL} />
    <path d="M21 27V12A15 15 0 0 1 36 27z" fill="currentColor" transform="translate(5 -5)" />
  </>,
  // A falling price meets the dashed limit line and the order fills there.
  "order-types": <>
    <path d="M5 16l10 6 8-3 10 11 10 5" />
    <path d="M5 30h38" strokeDasharray="3 5" opacity={SOFT + 0.2} />
    <circle cx="33" cy="30" r="4.5" fill={FILL} />
  </>,
  // A price tag: every order carries one.
  fees: <>
    <path d="M7 9a3 3 0 0 1 3-3h13l19 19-16 16L7 22z" fill={FILL} />
    <circle cx="15" cy="14" r="3" fill="currentColor" stroke="none" />
    <path d="M24 28l6-6" opacity={SOFT + 0.2} />
  </>,
  // Your cost line, and where the price sits relative to it.
  pnl: <>
    <path d="M5 30h38" strokeDasharray="3 5" opacity={SOFT + 0.2} />
    <path d="M5 39l10-6 8 4 10-13 10-9" />
    <circle cx="43" cy="15" r="4.5" fill={FILL} />
  </>,
  // The thin, jittery line is the noise; the one bold spike is the signal.
  "signal-noise": <>
    <path d="M4 26l3-6 3 9 3-11 3 10 3-7 3 8 3-9 3 7 3-5 3 6 3-4 3 5" strokeWidth="1.6" opacity={SOFT} />
    <path d="M4 26h14l5-17 5 31 4-14h12" />
  </>,
  // The price climbs before the flag goes up, then lies flat once the news lands.
  "priced-in": <>
    <path d="M4 39C14 38 17 17 27 15h17" />
    <path d="M33 9v32" strokeDasharray="3 5" opacity={SOFT + 0.2} />
    <path d="M33 9h9l-3 4 3 4h-9z" fill={FILL} />
  </>,
  // A speech bubble with a question mark: not confirmed yet.
  rumor: <>
    <path d="M8 9h32a3 3 0 0 1 3 3v18a3 3 0 0 1-3 3H25l-9 8v-8H8a3 3 0 0 1-3-3V12a3 3 0 0 1 3-3z" fill={FILL} />
    <path d="M19 19a5 5 0 1 1 7 4.6c-2 1-2.5 2-2.5 4" />
    <circle cx="23.5" cy="31" r="1.4" fill="currentColor" />
  </>,
  // Jagged price path, with the peak-to-trough drop measured on the side.
  volatility: <>
    <path d="M4 34l7-15 6 10 8-21 8 26 4-8" />
    <path d="M42 8v26" strokeDasharray="3 5" opacity={SOFT + 0.2} />
    <path d="M38.5 30L42 34l3.5-4" />
  </>,
  // Three small baskets, one egg each.
  diversification: <>
    <path d="M3 33h12a6 6 0 0 1-12 0z" fill={FILL} />
    <path d="M18 33h12a6 6 0 0 1-12 0z" fill={FILL} />
    <path d="M33 33h12a6 6 0 0 1-12 0z" fill={FILL} />
    <ellipse cx="9" cy="25" rx="3.5" ry="4.5" fill="currentColor" stroke="none" />
    <ellipse cx="24" cy="25" rx="3.5" ry="4.5" fill="currentColor" stroke="none" />
    <ellipse cx="39" cy="25" rx="3.5" ry="4.5" fill="currentColor" stroke="none" />
  </>,
  // Many companies dropping into one basket, bought in a single order.
  etf: <>
    <path d="M6 24h36l-4 16H10z" fill={FILL} />
    <path d="M16 24l5-9m11 9l-5-9" opacity={SOFT + 0.2} />
    <circle cx="14" cy="8" r="2.8" fill="currentColor" stroke="none" />
    <circle cx="24" cy="12" r="2.8" fill="currentColor" stroke="none" />
    <circle cx="34" cy="8" r="2.8" fill="currentColor" stroke="none" />
    <circle cx="16" cy="32" r="2.2" fill="currentColor" stroke="none" />
    <circle cx="24" cy="32" r="2.2" fill="currentColor" stroke="none" />
    <circle cx="32" cy="32" r="2.2" fill="currentColor" stroke="none" />
  </>,
  // A snowball: each turn gains size on the one before.
  compound: <>
    <circle cx="9" cy="37" r="4.5" fill={FILL} />
    <circle cx="22" cy="29" r="8" fill={FILL} />
    <circle cx="36" cy="16" r="11.5" fill={FILL} />
    <path d="M5 11c6-5 12-5 17 0" opacity={SOFT + 0.2} />
  </>,
  // A calendar with the monthly stack growing.
  "savings-plan": <>
    <rect x="6" y="9" width="36" height="31" rx="4" fill={FILL} />
    <path d="M6 18h36M15 5v8M33 5v8" />
    <path d="M14 34v-4M22 34v-8M30 34v-12" strokeWidth="4" />
  </>,
  // Onboarding goals, same family. A sprout rising from a coin: first steps.
  "goal-start": <>
    <ellipse cx="24" cy="38" rx="13" ry="4.5" fill={FILL} />
    <path d="M24 37V20" />
    <path d="M24 27c-8 0-12-5-12-11 7 0 12 4 12 11z" fill={FILL} />
    <path d="M24 21c0-7 4-11 12-11 0 7-4 11-12 11z" fill="currentColor" />
  </>,
  // A house: kids and a home.
  "goal-home": <>
    <path d="M11 20v20h26V20" fill={FILL} />
    <path d="M6 23L24 8l18 15" />
    <rect x="20" y="29" width="8" height="11" rx="1.5" fill="currentColor" stroke="none" />
    <path d="M33 8v6" opacity={SOFT + 0.2} />
  </>,
  // The sun on the horizon: retirement.
  "goal-retire": <>
    <path d="M10 31a14 14 0 0 1 28 0z" fill={FILL} />
    <path d="M4 31h40" />
    <path d="M24 7v5M10 13l3.5 3.5M38 13l-3.5 3.5" opacity={SOFT + 0.2} />
    <path d="M11 38h11M27 38h9" opacity={SOFT + 0.2} />
  </>,
};

export default function CardArt({ id, size = 64 }: { id: string; size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {ART[id]}
    </svg>
  );
}
