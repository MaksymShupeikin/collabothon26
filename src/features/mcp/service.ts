import { CARDS, cardById } from "../learn/cards.ts";
import { CONCEPTS, conceptById, WORLDS as CONCEPT_WORLDS } from "../learn/concepts.ts";
import { ALL_COMPANIES, COMPANIES, companyOf, ETF_SYM, type Company } from "../market/companies.ts";
import {
  advance,
  ask,
  bid,
  costBasis,
  dateOf,
  deposit,
  depotValue,
  FEE_FIXED,
  FEE_RATE,
  fee,
  growth,
  maxDrawdown,
  newSim,
  placeOrder,
  priceAt,
  priceNow,
  returnPct,
  riskScore,
  round2,
  SPREAD,
  totalValue,
  universeOf,
  type OrderType,
  type Side,
  type Validity,
} from "../market/engine.ts";
import { MAIN, REPLAYS } from "../market/scenarios.ts";
import { PERSONAS, type PersonaId } from "../game/personas.ts";
import {
  addTx,
  freshSave,
  logSimEvents,
  rankOf,
  RANKS,
  type Save,
} from "../game/save.ts";
import {
  CHAPTERS,
  HISTORY,
  isOpen,
  nextChapter,
  WORLDS,
  worldOpen,
} from "../tour/chapters.ts";
import { dateDE, eur, pct, signed } from "../../shared/lib/format.ts";
import { tr, type Lang } from "../../shared/lib/i18n.core.ts";
import {
  clearCheckpoint,
  loadCheckpoint,
  loadSave,
  storageKind,
  writeCheckpoint,
  writeSave,
  type McpCheckpoint,
  type PositionSnapshot,
} from "./storage.ts";

export const HONESTY_NOTICE =
  "No live real-time news feed is connected. Never fabricate company-specific news to explain a price move. Explain performance using actual price history, fees/spread, volatility, sector exposure, and diversification. Only mention in-sandbox headlines below if explicitly labeled Simulated.";

export const HONESTY_NOTICE_DE =
  "Es ist kein Echtzeit-Newsfeed angebunden. Erfinde niemals unternehmensspezifische Nachrichten, um Kursbewegungen zu erklären. Erkläre die Entwicklung mit echten Kennzahlen (Kursverlauf, Gebühren/Spread, Volatilität, Branchengewicht, Diversifikation) und erwähne Sandbox-Schlagzeilen nur mit klarer Kennzeichnung als „Simuliert“.";

export type PositionDetail = {
  sym: string;
  name: string;
  short: string;
  wkn: string;
  isin: string;
  type: "Aktie" | "ETF";
  sector: string;
  qty: number;
  avgCostPerShare: number;
  costBasis: number;
  currentPrice: number;
  bidPrice: number;
  askPrice: number;
  marketValue: number;
  unrealizedPnlEur: number;
  unrealizedPnlPct: number;
  weightPct: number;
  recentMoves: {
    d1Pct: number;
    d5Pct: number;
    d30Pct: number;
  };
};

export type PositionChange = {
  sym: string;
  short: string;
  status: "opened" | "closed" | "gained" | "lost" | "flat";
  previousQty: number;
  currentQty: number;
  previousPrice: number | null;
  currentPrice: number;
  priceChangePct: number | null;
  previousValue: number;
  currentValue: number;
  valueDeltaEur: number;
  pnlDeltaEur: number;
};

export function resolveLang(input?: unknown): Lang {
  return input === "de" ? "de" : "en";
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function movePct(u: ReturnType<typeof universeOf>, sym: string, day: number, lookback: number): number {
  const curr = priceAt(u, sym, day);
  const prev = priceAt(u, sym, day - lookback);
  if (!(prev > 0)) return 0;
  return round2(((curr - prev) / prev) * 100);
}

export function resolveCompany(query: string): Company | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return (
    COMPANIES.find(
      (c) =>
        c.sym.toLowerCase() === q ||
        c.wkn.toLowerCase() === q ||
        c.isin.toLowerCase() === q,
    ) ??
    COMPANIES.find(
      (c) =>
        c.short.toLowerCase() === q ||
        c.name.toLowerCase() === q ||
        c.short.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q),
    ) ??
    ALL_COMPANIES.find(
      (c) =>
        c.sym.toLowerCase() === q ||
        c.wkn.toLowerCase() === q ||
        c.isin.toLowerCase() === q ||
        c.short.toLowerCase().includes(q),
    ) ??
    null
  );
}

export function buildPositions(save: Save): PositionDetail[] {
  const sim = save.sim;
  const u = universeOf(sim.universe);
  const dep = depotValue(sim);
  const out: PositionDetail[] = [];

  for (const [sym, h] of Object.entries(sim.acct.holdings)) {
    if (!(h.qty > 0)) continue;
    const c = companyOf(sym);
    const currentPrice = priceNow(sim, sym);
    const marketValue = round2(h.qty * currentPrice);
    const unrealizedPnlEur = round2(marketValue - h.cost);
    const unrealizedPnlPct = h.cost > 0 ? round2((unrealizedPnlEur / h.cost) * 100) : 0;
    const avgCostPerShare = round2(h.cost / h.qty);
    const weightPct = dep > 0 ? round2((marketValue / dep) * 100) : 0;
    out.push({
      sym: c.sym,
      name: c.name,
      short: c.short,
      wkn: c.wkn,
      isin: c.isin,
      type: c.type,
      sector: c.sector,
      qty: h.qty,
      avgCostPerShare,
      costBasis: round2(h.cost),
      currentPrice,
      bidPrice: bid(currentPrice),
      askPrice: ask(currentPrice),
      marketValue,
      unrealizedPnlEur,
      unrealizedPnlPct,
      weightPct,
      recentMoves: {
        d1Pct: movePct(u, sym, sim.day, 1),
        d5Pct: movePct(u, sym, sim.day, 5),
        d30Pct: movePct(u, sym, sim.day, 30),
      },
    });
  }

  return out.sort((a, b) => b.marketValue - a.marketValue);
}

export function buildCheckpoint(save: Save): McpCheckpoint {
  const sim = save.sim;
  const u = universeOf(sim.universe);
  const positions = buildPositions(save);
  const posMap: Record<string, PositionSnapshot> = {};
  for (const p of positions) {
    posMap[p.sym] = {
      qty: p.qty,
      price: p.currentPrice,
      marketValue: p.marketValue,
      costBasis: p.costBasis,
      unrealizedPnl: p.unrealizedPnlEur,
      unrealizedPnlPct: p.unrealizedPnlPct,
    };
  }
  const dep = depotValue(sim);
  return {
    day: sim.day,
    simDate: isoDate(dateOf(u, sim.day)),
    checkedAt: new Date().toISOString(),
    giro: round2(save.giro),
    cash: round2(sim.acct.cash),
    depotValue: dep,
    totalValue: round2(save.giro + sim.acct.cash + dep),
    tradeCount: sim.acct.trades.length,
    positions: posMap,
  };
}

function simulatedMacroEvents(save: Save, lookbackDays = 20, lang: Lang = "en") {
  const u = universeOf(save.sim.universe);
  const minDay = save.sim.day - lookbackDays;
  return u.news
    .filter((n) => !n.sym && n.day <= save.sim.day && n.day >= minDay)
    .slice(-5)
    .reverse()
    .map((n) => ({
      simulated: true as const,
      day: n.day,
      date: isoDate(dateOf(u, n.day)),
      scope: n.kind,
      major: n.major,
      source: lang === "de" ? "Simulierter Sandbox-Ticker" : "Simulated sandbox newswire",
      headline: tr(n.headline, lang),
      concept: n.concept,
    }));
}

function portfolioInsights(save: Save, positions: PositionDetail[], lang: Lang): string[] {
  const insights: string[] = [];
  const totalFees = round2(save.sim.acct.trades.reduce((s, t) => s + t.fee, 0));
  const buyVol = round2(
    save.sim.acct.trades.filter((t) => t.side === "buy").reduce((s, t) => s + t.qty * t.price, 0),
  );
  const feeRatio = buyVol > 0 ? round2((totalFees / buyVol) * 100) : 0;

  const concentrated = positions.filter((p) => p.type !== "ETF" && p.weightPct > 30);
  if (concentrated.length > 0) {
    const top = concentrated[0];
    insights.push(
      lang === "de"
        ? `Konzentrationshinweis: ${top.short} macht ${top.weightPct.toFixed(1)} % deines Depots aus (Faustregel in Modul 3: max. 30 % pro Einzelaktie).`
        : `Concentration check: ${top.short} makes up ${top.weightPct.toFixed(1)}% of your portfolio (Module 3 rule of thumb: keep any single stock under 30%).`,
    );
  } else if (positions.length > 0) {
    insights.push(
      lang === "de"
        ? "Diversifikation: Keine Einzelaktie überschreitet 30 % Depotgewicht."
        : "Diversification check: No single stock exceeds 30% of your portfolio.",
    );
  }

  if (feeRatio > 2.5 && save.sim.acct.trades.length > 0) {
    insights.push(
      lang === "de"
        ? `Gebührenquote: ${eur(totalFees)} Ordergebühren entsprechen ${feeRatio.toFixed(2)} % deines Kaufvolumens. Weniger, größere Orders oder ein ETF-Sparplan senken den Fixkostenanteil (4,90 € + 0,25 %).`
        : `Fee drag check: ${eur(totalFees)} in fees equals ${feeRatio.toFixed(2)}% of buy volume. Fewer, larger orders or an ETF savings plan reduce the 4.90 € fixed-fee impact.`,
    );
  }

  if (save.sim.acct.orders.length > 0) {
    insights.push(
      lang === "de"
        ? `${save.sim.acct.orders.length} offene Order(s) warten noch im Orderbuch auf ihren Kurs.`
        : `${save.sim.acct.orders.length} open order(s) waiting in the order book for their trigger price.`,
    );
  }

  if (save.giro > 0 && positions.length === 0 && save.sim.acct.cash === 0) {
    insights.push(
      lang === "de"
        ? `Auf dem Girokonto liegen ${eur(save.giro)} Spielgeld. Überweise einen Teil auf das Verrechnungskonto, um deine erste Position zu kaufen.`
        : `You have ${eur(save.giro)} play money on your current account (Giro). Transfer funds to your trading account (Verrechnungskonto) to open your first position.`,
    );
  }

  return insights;
}

// ── Tool 1: get_account_update ─────────────────────────────────────────────

export async function getAccountUpdate(
  playerId: string,
  opts: { markSeen?: boolean; lang?: Lang } = {},
) {
  const lang = resolveLang(opts.lang);
  const save = await loadSave(playerId);

  if (!save) {
    const text =
      lang === "de"
        ? `Für diese Session (${playerId}) liegt noch kein comdirect edu Sandbox-Konto vor. Öffne die Web-App, starte dein Profil oder nutze das Tool \`seed_demo_portfolio\`, um ein Demo-Depot mit Positionen anzulegen.`
        : `No comdirect edu sandbox account exists yet for this session (${playerId}). Open the web app to complete onboarding, or call \`seed_demo_portfolio\` to create a funded demo portfolio with positions right away.`;
    return {
      text,
      data: {
        hasAccount: false,
        playerId,
        storage: storageKind(),
        nextAction: "Open comdirect edu in the browser or call seed_demo_portfolio.",
        marketContext: {
          liveNewsAvailable: false,
          honestyNotice: lang === "de" ? HONESTY_NOTICE_DE : HONESTY_NOTICE,
        },
      },
    };
  }

  const sim = save.sim;
  const u = universeOf(sim.universe);
  const simDate = dateOf(u, sim.day);
  const positions = buildPositions(save);
  const depVal = depotValue(sim);
  const basis = costBasis(sim);
  const tradingTotal = totalValue(sim);
  const totalNetWorth = round2(save.giro + tradingTotal);
  const unrealizedPnlEur = round2(depVal - basis);
  const unrealizedPnlPct = basis > 0 ? round2((unrealizedPnlEur / basis) * 100) : 0;
  const totalFeesPaid = round2(sim.acct.trades.reduce((s, t) => s + t.fee, 0));
  const prev = await loadCheckpoint(playerId);
  const curr = buildCheckpoint(save);

  let changesSinceLastCheck: {
    hasPreviousCheck: boolean;
    previousCheckedAt?: string;
    previousDay?: number;
    previousSimDate?: string;
    daysElapsed?: number;
    totalValueChangeEur?: number;
    totalValueChangePct?: number;
    depotValueChangeEur?: number;
    depotValueChangePct?: number;
    positionChanges?: PositionChange[];
    newTradesCount?: number;
    newTrades?: Save["sim"]["acct"]["trades"];
    note?: string;
  };

  if (prev) {
    const daysElapsed = sim.day - prev.day;
    const totalValueChangeEur = round2(curr.totalValue - prev.totalValue);
    const totalValueChangePct =
      prev.totalValue > 0 ? round2((totalValueChangeEur / prev.totalValue) * 100) : 0;
    const depotValueChangeEur = round2(curr.depotValue - prev.depotValue);
    const depotValueChangePct =
      prev.depotValue > 0 ? round2((depotValueChangeEur / prev.depotValue) * 100) : 0;

    const allSyms = new Set([...Object.keys(prev.positions), ...Object.keys(curr.positions)]);
    const positionChanges: PositionChange[] = [];

    for (const sym of allSyms) {
      const pBefore = prev.positions[sym];
      const pNow = curr.positions[sym];
      const c = companyOf(sym);
      const currentPrice = pNow?.price ?? priceNow(sim, sym);
      const previousPrice = pBefore?.price ?? null;
      const priceChangePct =
        previousPrice && previousPrice > 0
          ? round2(((currentPrice - previousPrice) / previousPrice) * 100)
          : null;

      let status: PositionChange["status"];
      let pnlDeltaEur: number;
      if (!pBefore && pNow) {
        status = "opened";
        pnlDeltaEur = pNow.unrealizedPnl;
      } else if (pBefore && !pNow) {
        status = "closed";
        pnlDeltaEur = round2(-pBefore.unrealizedPnl);
      } else {
        pnlDeltaEur = round2((pNow?.unrealizedPnl ?? 0) - (pBefore?.unrealizedPnl ?? 0));
        status = pnlDeltaEur > 0.01 ? "gained" : pnlDeltaEur < -0.01 ? "lost" : "flat";
      }

      positionChanges.push({
        sym,
        short: c.short,
        status,
        previousQty: pBefore?.qty ?? 0,
        currentQty: pNow?.qty ?? 0,
        previousPrice,
        currentPrice,
        priceChangePct,
        previousValue: pBefore?.marketValue ?? 0,
        currentValue: pNow?.marketValue ?? 0,
        valueDeltaEur: round2((pNow?.marketValue ?? 0) - (pBefore?.marketValue ?? 0)),
        pnlDeltaEur,
      });
    }

    positionChanges.sort((a, b) => Math.abs(b.pnlDeltaEur) - Math.abs(a.pnlDeltaEur));
    const newTrades = sim.acct.trades.slice(Math.max(0, prev.tradeCount));

    changesSinceLastCheck = {
      hasPreviousCheck: true,
      previousCheckedAt: prev.checkedAt,
      previousDay: prev.day,
      previousSimDate: prev.simDate,
      daysElapsed,
      totalValueChangeEur,
      totalValueChangePct,
      depotValueChangeEur,
      depotValueChangePct,
      positionChanges,
      newTradesCount: newTrades.length,
      newTrades,
    };
  } else {
    changesSinceLastCheck = {
      hasPreviousCheck: false,
      note:
        lang === "de"
          ? "Erster Agenten-Check gespeichert. Beim nächsten Abruf werden exakte Veränderungen seit heute berechnet."
          : "First agent check saved as baseline. The next check will report exact EUR and % deltas since this snapshot.",
    };
  }

  if (opts.markSeen !== false) {
    await writeCheckpoint(playerId, curr);
  }

  const events = simulatedMacroEvents(save, 20, lang);
  const insights = portfolioInsights(save, positions, lang);
  const rank = rankOf(save.xp);
  const persona = save.persona ? PERSONAS[save.persona] : null;

  // Build concise, factual briefing text ready for an AI agent or human viewer
  const lines: string[] = [];
  if (lang === "de") {
    lines.push(`## comdirect edu Konto-Update (Spielgeld-Sandbox)`);
    lines.push(`Stand: Handelstag ${sim.day} (${dateDE(simDate)}) · Gesamtvermögen: **${eur(totalNetWorth)}** (Giro: ${eur(save.giro)} · Verrechnung: ${eur(sim.acct.cash)} · Depot: ${eur(depVal)})`);
    if (positions.length > 0) {
      lines.push(`Offener Depot-G/V (inkl. Gebühren): **${signed(unrealizedPnlEur)} € (${pct(unrealizedPnlPct)})** auf Einstandswert ${eur(basis)}.`);
    } else {
      lines.push(`Aktuell keine offenen Positionen im Depot.`);
    }
    if (changesSinceLastCheck.hasPreviousCheck) {
      lines.push(
        `\n### Veränderung seit dem letzten Check (${changesSinceLastCheck.daysElapsed} Handelstage)`,
      );
      lines.push(
        `Depot-Veränderung: **${signed(changesSinceLastCheck.depotValueChangeEur ?? 0)} € (${pct(changesSinceLastCheck.depotValueChangePct ?? 0)})** · Gesamtvermögen: ${signed(changesSinceLastCheck.totalValueChangeEur ?? 0)} € (${pct(changesSinceLastCheck.totalValueChangePct ?? 0)})`,
      );
      for (const ch of changesSinceLastCheck.positionChanges ?? []) {
        const priceMove = ch.priceChangePct !== null ? ` (Kurs ${pct(ch.priceChangePct)})` : "";
        lines.push(
          `- **${ch.short} (${ch.sym})**: ${ch.status === "opened" ? "Neu eröffnet" : ch.status === "closed" ? "Geschlossen" : `Delta ${signed(ch.pnlDeltaEur)} €`}${priceMove} · Wert jetzt ${eur(ch.currentValue)}`,
        );
      }
    } else {
      lines.push(`\n_${changesSinceLastCheck.note}_`);
    }
    if (positions.length > 0) {
      lines.push(`\n### Positionen im Detail`);
      for (const p of positions) {
        lines.push(
          `- **${p.short} (${p.sym}, WKN ${p.wkn})**: ${p.qty} Stk. · Kurs ${eur(p.currentPrice)} (Ø Kauf inkl. Kosten ${eur(p.avgCostPerShare)}) · Wert ${eur(p.marketValue)} (${p.weightPct.toFixed(1)} %) · G/V **${signed(p.unrealizedPnlEur)} € (${pct(p.unrealizedPnlPct)})** · 1T ${pct(p.recentMoves.d1Pct)} / 5T ${pct(p.recentMoves.d5Pct)} / 30T ${pct(p.recentMoves.d30Pct)}`,
        );
      }
    }
    if (insights.length > 0) {
      lines.push(`\n### Kennzahlen & Hinweise`);
      for (const i of insights) lines.push(`- ${i}`);
    }
    lines.push(`\n> Hinweis: ${HONESTY_NOTICE_DE}`);
  } else {
    lines.push(`## comdirect edu Account Update (Play-Money Sandbox)`);
    lines.push(
      `As of Trading Day ${sim.day} (${isoDate(simDate)}) · Total net worth: **${eur(totalNetWorth)}** (Current account: ${eur(save.giro)} · Trading cash: ${eur(sim.acct.cash)} · Depot: ${eur(depVal)})`,
    );
    if (positions.length > 0) {
      lines.push(
        `Total unrealized P/L (incl. fees): **${signed(unrealizedPnlEur)} € (${pct(unrealizedPnlPct)})** on cost basis ${eur(basis)}.`,
      );
    } else {
      lines.push(`No open positions in the portfolio yet.`);
    }
    if (changesSinceLastCheck.hasPreviousCheck) {
      lines.push(
        `\n### Changes Since Last Check (${changesSinceLastCheck.daysElapsed} trading day(s))`,
      );
      lines.push(
        `Depot change: **${signed(changesSinceLastCheck.depotValueChangeEur ?? 0)} € (${pct(changesSinceLastCheck.depotValueChangePct ?? 0)})** · Net worth change: ${signed(changesSinceLastCheck.totalValueChangeEur ?? 0)} € (${pct(changesSinceLastCheck.totalValueChangePct ?? 0)})`,
      );
      for (const ch of changesSinceLastCheck.positionChanges ?? []) {
        const priceMove = ch.priceChangePct !== null ? ` (price ${pct(ch.priceChangePct)})` : "";
        lines.push(
          `- **${ch.short} (${ch.sym})**: ${ch.status === "opened" ? "Newly opened" : ch.status === "closed" ? "Closed" : `P/L delta ${signed(ch.pnlDeltaEur)} €`}${priceMove} · now ${eur(ch.currentValue)}`,
        );
      }
    } else {
      lines.push(`\n_${changesSinceLastCheck.note}_`);
    }
    if (positions.length > 0) {
      lines.push(`\n### Current Positions`);
      for (const p of positions) {
        lines.push(
          `- **${p.short} (${p.sym}, WKN ${p.wkn})**: ${p.qty} sh · Price ${eur(p.currentPrice)} (avg entry incl. fees ${eur(p.avgCostPerShare)}) · Value ${eur(p.marketValue)} (${p.weightPct.toFixed(1)}% weight) · P/L **${signed(p.unrealizedPnlEur)} € (${pct(p.unrealizedPnlPct)})** · 1d ${pct(p.recentMoves.d1Pct)} / 5d ${pct(p.recentMoves.d5Pct)} / 30d ${pct(p.recentMoves.d30Pct)}`,
        );
      }
    }
    if (insights.length > 0) {
      lines.push(`\n### Portfolio Checks`);
      for (const i of insights) lines.push(`- ${i}`);
    }
    lines.push(`\n> Market context note: ${HONESTY_NOTICE}`);
  }

  return {
    text: lines.join("\n"),
    data: {
      hasAccount: true,
      sandbox: true,
      currency: "EUR",
      playerId,
      storage: storageKind(),
      simDay: sim.day,
      simDate: isoDate(simDate),
      persona: persona ? { id: persona.id, label: tr(persona.label, lang), horizon: tr(persona.horizon, lang) } : null,
      rank: { level: rank.level, name: tr(rank.name, lang), xp: save.xp },
      accounts: {
        giroEur: round2(save.giro),
        tradingCashEur: round2(sim.acct.cash),
        depotValueEur: depVal,
        tradingTotalEur: tradingTotal,
        totalNetWorthEur: totalNetWorth,
        costBasisEur: basis,
        unrealizedPnlEur,
        unrealizedPnlPct,
        totalFeesPaidEur: totalFeesPaid,
      },
      changesSinceLastCheck,
      positions,
      openOrders: sim.acct.orders,
      savingsPlans: sim.acct.plans,
      recentTrades: sim.acct.trades.slice(-5).reverse(),
      portfolioInsights: insights,
      marketContext: {
        liveNewsAvailable: false,
        honestyNotice: lang === "de" ? HONESTY_NOTICE_DE : HONESTY_NOTICE,
        simulatedMacroAndSectorEvents: events,
      },
    },
  };
}

// ── Tool 2: get_portfolio ──────────────────────────────────────────────────

export async function getPortfolioDiagnostics(playerId: string, lang: Lang = "en") {
  const save = await loadSave(playerId);
  if (!save) {
    return {
      text:
        lang === "de"
          ? "Kein Sandbox-Konto gefunden. Starte in der Web-App oder nutze `seed_demo_portfolio`."
          : "No sandbox account found yet. Start in the web app or call `seed_demo_portfolio`.",
      data: { hasAccount: false, playerId },
    };
  }

  const sim = save.sim;
  const positions = buildPositions(save);
  const dep = depotValue(sim);
  const basis = costBasis(sim);
  const totalFees = round2(sim.acct.trades.reduce((s, t) => s + t.fee, 0));
  const sectorWeights: Record<string, number> = {};
  let etfWeightPct = 0;
  let stockWeightPct = 0;

  for (const p of positions) {
    sectorWeights[p.sector] = round2((sectorWeights[p.sector] ?? 0) + p.weightPct);
    if (p.type === "ETF") etfWeightPct = round2(etfWeightPct + p.weightPct);
    else stockWeightPct = round2(stockWeightPct + p.weightPct);
  }

  const largestSingleStock = positions.find((p) => p.type !== "ETF") ?? null;
  const series = growth(sim.acct.values, sim.acct.deposits);
  const perf =
    series.length > 1
      ? {
          timeWeightedReturnPct: returnPct(series),
          maxDrawdownPct: round2(maxDrawdown(series) * 100),
          riskAdjustedScorePct: riskScore(series),
        }
      : { timeWeightedReturnPct: 0, maxDrawdownPct: 0, riskAdjustedScorePct: 0 };

  const insights = portfolioInsights(save, positions, lang);
  const lines = [
    lang === "de"
      ? `## Depot-Diagnose (Tag ${sim.day}) — Depotwert ${eur(dep)} · Cash ${eur(sim.acct.cash)} · Giro ${eur(save.giro)}`
      : `## Portfolio Diagnostics (Day ${sim.day}) — Depot ${eur(dep)} · Trading cash ${eur(sim.acct.cash)} · Giro ${eur(save.giro)}`,
    lang === "de"
      ? `Aufteilung: Aktien ${stockWeightPct.toFixed(1)} % · ETF ${etfWeightPct.toFixed(1)} % · Branchen: ${Object.entries(sectorWeights).map(([k, v]) => `${tr(k, lang)} ${v.toFixed(1)} %`).join(", ") || "—"}`
      : `Allocation: Stocks ${stockWeightPct.toFixed(1)}% · ETFs ${etfWeightPct.toFixed(1)}% · Sectors: ${Object.entries(sectorWeights).map(([k, v]) => `${k} ${v.toFixed(1)}%`).join(", ") || "—"}`,
    lang === "de"
      ? `Bezahlte Gebühren gesamt: ${eur(totalFees)} über ${sim.acct.trades.length} Trades · Max. Drawdown: ${perf.maxDrawdownPct.toFixed(2)} %`
      : `Total fees paid: ${eur(totalFees)} across ${sim.acct.trades.length} trade(s) · Max drawdown: ${perf.maxDrawdownPct.toFixed(2)}%`,
    ...insights.map((x) => `- ${x}`),
  ];

  return {
    text: lines.join("\n"),
    data: {
      hasAccount: true,
      simDay: sim.day,
      giroEur: round2(save.giro),
      tradingCashEur: round2(sim.acct.cash),
      depotValueEur: dep,
      costBasisEur: basis,
      unrealizedPnlEur: round2(dep - basis),
      unrealizedPnlPct: basis > 0 ? round2(((dep - basis) / basis) * 100) : 0,
      allocation: {
        stockWeightPct,
        etfWeightPct,
        sectorWeights,
        largestSingleStock: largestSingleStock
          ? { sym: largestSingleStock.sym, short: largestSingleStock.short, weightPct: largestSingleStock.weightPct }
          : null,
        diversifiedRuleUnder30Pct: !positions.some((p) => p.type !== "ETF" && p.weightPct > 30),
      },
      performance: perf,
      totalFeesPaidEur: totalFees,
      positions,
      openOrders: sim.acct.orders,
      savingsPlans: sim.acct.plans,
      insights,
    },
  };
}

// ── Tool 3: list_market_instruments ────────────────────────────────────────

export async function listMarketInstruments(
  playerId: string,
  filter: { query?: string; sector?: string; type?: "Aktie" | "ETF"; lang?: Lang } = {},
) {
  const lang = resolveLang(filter.lang);
  const save = await loadSave(playerId);
  const day = save?.sim.day ?? 0;
  const holdings = save?.sim.acct.holdings ?? {};
  const q = filter.query?.trim().toLowerCase() ?? "";
  const sector = filter.sector?.trim().toLowerCase() ?? "";

  const items = COMPANIES.filter((c) => {
    if (filter.type && c.type !== filter.type) return false;
    if (sector && c.sector.toLowerCase() !== sector && tr(c.sector, "de").toLowerCase() !== sector) return false;
    if (q) {
      const hay = `${c.sym} ${c.short} ${c.name} ${c.wkn} ${c.isin} ${c.sector}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }).map((c) => {
    const mid = priceAt(MAIN, c.sym, day);
    const held = holdings[c.sym]?.qty ?? 0;
    const volatilityTier = c.type === "ETF" || c.vol <= 0.013 ? "low" : c.vol <= 0.02 ? "medium" : "high";
    return {
      sym: c.sym,
      short: c.short,
      name: c.name,
      wkn: c.wkn,
      isin: c.isin,
      type: c.type,
      sector: c.sector,
      sectorLocalized: tr(c.sector, lang),
      midPriceEur: mid,
      askPriceEur: ask(mid),
      bidPriceEur: bid(mid),
      spreadPct: round2(SPREAD * 2 * 100),
      d1Pct: movePct(MAIN, c.sym, day, 1),
      d5Pct: movePct(MAIN, c.sym, day, 5),
      d30Pct: movePct(MAIN, c.sym, day, 30),
      volatilityTier,
      ownedQty: held,
    };
  });

  const lines = [
    lang === "de"
      ? `## Handelbare Wertpapiere (Sandbox Tag ${day}, ${items.length} Treffer)`
      : `## Tradable Instruments (Sandbox Day ${day}, ${items.length} match(es))`,
    ...items.map(
      (i) =>
        `- **${i.short}** (${i.sym} · WKN ${i.wkn} · ${i.type}/${i.sectorLocalized}): ${eur(i.midPriceEur)} · 1d ${pct(i.d1Pct)} · 30d ${pct(i.d30Pct)}${i.ownedQty > 0 ? ` · [Owned: ${i.ownedQty}]` : ""}`,
    ),
  ];

  return {
    text: lines.join("\n"),
    data: {
      sandbox: true,
      simDay: day,
      simDate: isoDate(dateOf(MAIN, day)),
      feeModel: { fixedEur: FEE_FIXED, variableRatePct: round2(FEE_RATE * 100), halfSpreadPct: round2(SPREAD * 100) },
      instruments: items,
    },
  };
}

// ── Tool 4: get_stock_overview ─────────────────────────────────────────────

export async function getStockOverview(playerId: string, query: string, lang: Lang = "en") {
  const company = resolveCompany(query);
  if (!company) {
    return {
      isError: true,
      text: `Instrument "${query}" not found. Available tickers: ${COMPANIES.map((c) => c.sym).join(", ")}.`,
      data: { found: false, query, available: COMPANIES.map((c) => ({ sym: c.sym, short: c.short, wkn: c.wkn })) },
    };
  }

  const save = await loadSave(playerId);
  const day = save?.sim.day ?? 0;
  const inMain = MAIN.syms.includes(company.sym);
  if (!inMain) {
    return {
      text: `${company.short} (${company.sym}, WKN ${company.wkn}) is a historical-replay-only instrument, not tradable in the main sandbox.`,
      data: { found: true, tradableInMain: false, company },
    };
  }

  const mid = priceAt(MAIN, company.sym, day);
  let low52 = mid;
  let high52 = mid;
  for (let d = day - 252; d <= day; d++) {
    const p = priceAt(MAIN, company.sym, d);
    if (p < low52) low52 = p;
    if (p > high52) high52 = p;
  }

  const holding = save ? buildPositions(save).find((p) => p.sym === company.sym) ?? null : null;
  const returns = {
    d1Pct: movePct(MAIN, company.sym, day, 1),
    d5Pct: movePct(MAIN, company.sym, day, 5),
    d30Pct: movePct(MAIN, company.sym, day, 30),
    d90Pct: movePct(MAIN, company.sym, day, 90),
    y1Pct: movePct(MAIN, company.sym, day, 252),
  };

  const feeExamples = [100, 500, 1000].map((vol) => {
    const f = fee(vol);
    return { orderVolumeEur: vol, feeEur: f, feePctOfOrder: round2((f / vol) * 100) };
  });

  const lines = [
    `## ${company.name} (${company.sym})`,
    `WKN: ${company.wkn} · ISIN: ${company.isin} · ${company.type} · ${tr(company.sector, lang)}`,
    `Mid: **${eur(mid)}** · Ask (Buy): ${eur(ask(mid))} · Bid (Sell): ${eur(bid(mid))} · 52W range: ${eur(low52)} – ${eur(high52)}`,
    `Returns: 1d ${pct(returns.d1Pct)} · 5d ${pct(returns.d5Pct)} · 30d ${pct(returns.d30Pct)} · 90d ${pct(returns.d90Pct)} · 1Y ${pct(returns.y1Pct)}`,
    holding
      ? `Your position: **${holding.qty} sh** worth ${eur(holding.marketValue)} (avg entry ${eur(holding.avgCostPerShare)}, P/L ${signed(holding.unrealizedPnlEur)} € / ${pct(holding.unrealizedPnlPct)}, weight ${holding.weightPct.toFixed(1)}%)`
      : `Your position: Not currently held.`,
    `Order fee model: ${eur(FEE_FIXED)} + ${(FEE_RATE * 100).toFixed(2)}% (100 € order ≈ ${feeExamples[0].feePctOfOrder}%, 1.000 € order ≈ ${feeExamples[2].feePctOfOrder}%).`,
    `> ${lang === "de" ? HONESTY_NOTICE_DE : HONESTY_NOTICE}`,
  ];

  return {
    text: lines.join("\n"),
    data: {
      found: true,
      tradableInMain: true,
      simDay: day,
      simDate: isoDate(dateOf(MAIN, day)),
      instrument: {
        ...company,
        sectorLocalized: tr(company.sector, lang),
        midPriceEur: mid,
        askPriceEur: ask(mid),
        bidPriceEur: bid(mid),
        range52Week: { lowEur: low52, highEur: high52 },
        returns,
      },
      userHolding: holding,
      feeExamples,
      marketContext: {
        liveNewsAvailable: false,
        honestyNotice: lang === "de" ? HONESTY_NOTICE_DE : HONESTY_NOTICE,
      },
    },
  };
}

// ── Tool 5: get_learning_progress ──────────────────────────────────────────

export async function getLearningProgress(playerId: string, lang: Lang = "en") {
  const save = await loadSave(playerId);
  const s = save ?? freshSave();
  const rank = rankOf(s.xp);
  const next = nextChapter(s);
  const persona = s.persona ? PERSONAS[s.persona] : null;
  const totalStars = Object.values(s.stars).reduce((a, b) => a + b, 0);

  const modules = WORLDS.map((w) => {
    const chs = CHAPTERS.filter((c) => c.world === w.n);
    const done = chs.filter((c) => s.done.includes(c.id));
    return {
      module: w.n,
      title: tr(w.title, lang),
      surface: tr(w.surface, lang),
      blurb: tr(w.blurb, lang),
      unlocked: worldOpen(s, w.n),
      completedCount: done.length,
      totalCount: chs.length,
      chapters: chs.map((c) => ({
        id: c.id,
        kind: c.kind,
        title: tr(c.title, lang),
        done: s.done.includes(c.id),
        open: isOpen(s, c),
        stars: s.stars[c.id] ?? 0,
      })),
    };
  });

  const collectedCards = CARDS.filter((c) => s.cards.includes(c.id)).map((c) => ({
    id: c.id,
    world: c.world,
    title: tr(c.title, lang),
  }));
  const remainingCards = CARDS.filter((c) => !s.cards.includes(c.id)).map((c) => ({
    id: c.id,
    world: c.world,
    title: tr(c.title, lang),
  }));

  const lines = [
    lang === "de"
      ? `## Lernfortschritt · Rang ${rank.level} (${tr(rank.name, lang)}) · ${s.xp} XP`
      : `## Learning Progress · Rank ${rank.level} (${rank.name}) · ${s.xp} XP`,
    persona
      ? `Persona: **${tr(persona.label, lang)}** (${tr(persona.who, lang)}) · Goal: ${tr(persona.goal, lang)} · Horizon: ${tr(persona.horizon, lang)}`
      : lang === "de"
        ? "Noch keine Persona gewählt (Onboarding unter /start)."
        : "No persona chosen yet (complete onboarding at /start).",
    `Stars: ${totalStars}/21 · Concept cards: ${collectedCards.length}/${CARDS.length} · Completed chapters: ${s.done.length}/${CHAPTERS.length}`,
    next
      ? `Recommended next lesson: **Module ${next.world} — ${tr(next.title, lang)}** (${next.id}): ${tr(next.blurb, lang)}`
      : `All learning path modules completed! Ready for real (/ready).`,
  ];

  return {
    text: lines.join("\n"),
    data: {
      hasAccount: !!save,
      persona: persona
        ? {
            id: persona.id,
            label: tr(persona.label, lang),
            who: tr(persona.who, lang),
            goal: tr(persona.goal, lang),
            horizon: tr(persona.horizon, lang),
            focus: persona.focus,
          }
        : null,
      xp: s.xp,
      rank: {
        level: rank.level,
        totalRanks: RANKS.length,
        name: tr(rank.name, lang),
        nextRank: rank.next ? tr(rank.next, lang) : null,
        nextRankAtXp: rank.nextAt ?? null,
        progressPct: round2(rank.progress * 100),
      },
      stars: totalStars,
      maxStars: 21,
      understandingCorrect: s.understanding,
      proTraderUnlocked: s.proUnlocked,
      proTraderActive: s.proTrader,
      nextRecommendedChapter: next
        ? { id: next.id, module: next.world, kind: next.kind, title: tr(next.title, lang), blurb: tr(next.blurb, lang) }
        : null,
      collectedCards,
      remainingCards,
      modules,
      investorSimulatorBest: s.invBest,
    },
  };
}

// ── Tool 6 & 7: list_concepts & explain_concept ────────────────────────────

const CONCEPT_ALIASES: Record<string, string[]> = {
  stock: ["share", "aktie", "акция", "акции", "equity"],
  "order-types": ["limit", "market", "order", "лимит", "лимитная", "рыночная", "ордер"],
  "limit-order": ["limit", "лимит", "лимитная", "лимитный"],
  "market-order": ["market order", "рыночная", "маркет"],
  fees: ["fee", "cost", "ter", "gebühren", "комиссия", "комиссии", "сборы"],
  spread: ["bid", "ask", "спред", "бид", "аск"],
  pnl: ["profit", "loss", "gewinn", "verlust", "прибыль", "убыток", "пнл", "p/l"],
  "signal-noise": ["signal", "noise", "rauschen", "сигнал", "шум", "новости"],
  "priced-in": ["priced", "eingepreist", "в цене", "уже в цене"],
  rumor: ["rumor", "gerücht", "слух", "слухи", "fomo", "хайп"],
  volatility: ["vol", "swing", "volatilität", "волатильность", "колебания"],
  drawdown: ["drop", "crash", "просадка", "дродаун"],
  diversification: ["diversify", "eggs", "basket", "streuung", "диверсификация", "корзина"],
  etf: ["msci", "world", "index", "етф", "этф", "индексный"],
  compound: ["compound", "snowball", "zinseszins", "сложный процент", "компаундинг"],
  "savings-plan": ["sparplan", "dca", "cost average", "регулярное инвестирование", "накопительный"],
  "stop-loss": ["stop", "стоп", "стоп-лосс"],
  dividend: ["dividende", "дивиденд", "дивиденды"],
  inflation: ["инфляция"],
  rebalancing: ["ребалансировка"],
  taxes: ["steuer", "freistellungsauftrag", "налоги", "налог"],
};

type UnifiedConcept = {
  id: string;
  world: number;
  isCoreCard: boolean;
  title: string;
  summary: string;
  example: string;
  quiz: { q: string; options: string[]; answer: number };
};

function allUnifiedConcepts(lang: Lang): UnifiedConcept[] {
  const byId = new Map<string, UnifiedConcept>();
  for (const c of CARDS) {
    byId.set(c.id, {
      id: c.id,
      world: c.world,
      isCoreCard: true,
      title: tr(c.title, lang),
      summary: tr(c.front, lang),
      example: tr(c.example, lang),
      quiz: {
        q: tr(c.quiz.q, lang),
        options: c.quiz.options.map((o) => tr(o, lang)),
        answer: c.quiz.answer,
      },
    });
  }
  for (const c of CONCEPTS) {
    if (byId.has(c.id)) continue;
    byId.set(c.id, {
      id: c.id,
      world: c.world,
      isCoreCard: false,
      title: tr(c.title, lang),
      summary: c.sentence,
      example: c.example,
      quiz: c.quiz,
    });
  }
  return Array.from(byId.values()).sort((a, b) => a.world - b.world || Number(b.isCoreCard) - Number(a.isCoreCard));
}

export async function listConcepts(playerId: string, opts: { module?: number; lang?: Lang } = {}) {
  const lang = resolveLang(opts.lang);
  const save = await loadSave(playerId);
  const collected = new Set(save?.cards ?? []);
  const items = allUnifiedConcepts(lang)
    .filter((c) => (!opts.module ? true : c.world === opts.module))
    .map((c) => ({
      id: c.id,
      module: c.world,
      isCoreCard: c.isCoreCard,
      collected: collected.has(c.id),
      title: c.title,
      summary: c.summary,
    }));

  const lines = [
    lang === "de"
      ? `## Lernkonzepte (${items.length} Themen)`
      : `## Investing Concepts (${items.length} topics)`,
    ...items.map(
      (i) =>
        `- **${i.title}** (\`${i.id}\`, Module ${i.module}${i.isCoreCard ? (i.collected ? ", collected card" : ", core card") : ""}): ${i.summary}`,
    ),
  ];

  return {
    text: lines.join("\n"),
    data: {
      total: items.length,
      worlds: CONCEPT_WORLDS,
      concepts: items,
    },
  };
}

export async function explainConcept(playerId: string, topic: string, lang: Lang = "en") {
  const q = topic.trim().toLowerCase();
  const all = allUnifiedConcepts(lang);

  let match =
    all.find((c) => c.id.toLowerCase() === q) ??
    all.find((c) => c.title.toLowerCase() === q) ??
    all.find((c) => c.id.toLowerCase().includes(q) || c.title.toLowerCase().includes(q));

  if (!match) {
    for (const [id, aliases] of Object.entries(CONCEPT_ALIASES)) {
      if (aliases.some((a) => q.includes(a) || a.includes(q))) {
        match = all.find((c) => c.id === id);
        if (match) break;
      }
    }
  }

  if (!match) {
    return {
      isError: true,
      text: `Concept "${topic}" not found. Try one of: ${CARDS.map((c) => c.id).join(", ")}.`,
      data: { found: false, topic, availableIds: all.map((c) => c.id) },
    };
  }

  const save = await loadSave(playerId);
  const positions = save ? buildPositions(save) : [];
  const collected = save ? save.cards.includes(match.id) : false;

  // Build personalized tie-in using the user's real sandbox state!
  let personalTieIn: string | null = null;
  if (save) {
    const dep = depotValue(save.sim);
    const basis = costBasis(save.sim);
    const totalFees = round2(save.sim.acct.trades.reduce((s, t) => s + t.fee, 0));
    if (match.id === "diversification" && positions.length > 0) {
      const top = positions[0];
      personalTieIn = `In your current sandbox portfolio (${positions.length} position(s)), your largest holding is ${top.short} at ${top.weightPct.toFixed(1)}% (${eur(top.marketValue)}).`;
    } else if ((match.id === "fees" || match.id === "spread") && save.sim.acct.trades.length > 0) {
      const buyVol = save.sim.acct.trades.filter((t) => t.side === "buy").reduce((s, t) => s + t.qty * t.price, 0);
      const pctFee = buyVol > 0 ? round2((totalFees / buyVol) * 100) : 0;
      personalTieIn = `Across your ${save.sim.acct.trades.length} sandbox trade(s), you have paid ${eur(totalFees)} in fees (${pctFee.toFixed(2)}% of buy volume).`;
    } else if (match.id === "pnl" && positions.length > 0) {
      const pnl = round2(dep - basis);
      const pnlPct = basis > 0 ? round2((pnl / basis) * 100) : 0;
      personalTieIn = `Your current sandbox portfolio has an unrealized P/L of ${signed(pnl)} € (${pct(pnlPct)}) on a cost basis of ${eur(basis)}.`;
    } else if (match.id === "etf") {
      const etfPos = positions.find((p) => p.type === "ETF");
      personalTieIn = etfPos
        ? `You currently hold ${etfPos.qty} share(s) of ${etfPos.short} (${etfPos.weightPct.toFixed(1)}% of your portfolio).`
        : `You do not hold an ETF in your sandbox yet — the MSCI World ETF (WKN A0RPWH) is available in the trading screen.`;
    } else if (match.id === "order-types" || match.id === "limit-order" || match.id === "market-order") {
      const limCount = save.sim.acct.trades.filter((t) => t.type === "limit").length;
      const mktCount = save.sim.acct.trades.filter((t) => t.type === "market").length;
      personalTieIn = `So far in your sandbox you placed ${limCount} limit trade(s) and ${mktCount} market trade(s), with ${save.sim.acct.orders.length} open order(s).`;
    } else if (match.id === "savings-plan" || match.id === "cost-average") {
      personalTieIn =
        save.sim.acct.plans.length > 0
          ? `You have ${save.sim.acct.plans.length} active savings plan(s): ${save.sim.acct.plans.map((p) => `${companyOf(p.sym).short} ${eur(p.amount)}/month`).join(", ")}.`
          : `You have no active savings plan yet; Module 4 lets you run one over 10 simulated years.`;
    }
  }

  const relatedChapters = CHAPTERS.filter((ch) => ch.card?.includes(match.id)).map((ch) => ({
    id: ch.id,
    module: ch.world,
    title: tr(ch.title, lang),
    done: save ? save.done.includes(ch.id) : false,
  }));

  const lines = [
    `## ${match.title} (\`${match.id}\` · Module ${match.world})`,
    match.summary,
    `\n**Example:** ${match.example}`,
    personalTieIn ? `\n**In your portfolio:** ${personalTieIn}` : "",
    `\n**Quick check question:** ${match.quiz.q}`,
    ...match.quiz.options.map((o, idx) => `${idx + 1}. ${o}`),
  ].filter(Boolean);

  return {
    text: lines.join("\n"),
    data: {
      found: true,
      id: match.id,
      module: match.world,
      isCoreCard: match.isCoreCard,
      collectedByUser: collected,
      title: match.title,
      summary: match.summary,
      example: match.example,
      personalPortfolioContext: personalTieIn,
      quiz: {
        question: match.quiz.q,
        options: match.quiz.options,
        correctIndex: match.quiz.answer,
        correctOption: match.quiz.options[match.quiz.answer],
      },
      relatedChapters,
      coreCardReference: !!cardById(match.id),
      extendedConceptReference: !!conceptById(match.id),
    },
  };
}

// ── Tool 8: review_trades ──────────────────────────────────────────────────

export async function reviewTrades(playerId: string, opts: { limit?: number; lang?: Lang } = {}) {
  const lang = resolveLang(opts.lang);
  const save = await loadSave(playerId);
  if (!save || save.sim.acct.trades.length === 0) {
    return {
      text:
        lang === "de"
          ? "Noch keine ausgeführten Trades im Sandbox-Depot."
          : "No executed trades in the sandbox account yet.",
      data: { hasTrades: false, trades: [] },
    };
  }

  const u = universeOf(save.sim.universe);
  const limit = Math.max(1, Math.min(50, Math.floor(opts.limit ?? 15)));
  const allTrades = save.sim.acct.trades;
  const totalFees = round2(allTrades.reduce((s, t) => s + t.fee, 0));
  const totalVolume = round2(allTrades.reduce((s, t) => s + t.qty * t.price, 0));
  const limitOrders = allTrades.filter((t) => t.type === "limit").length;
  const marketOrders = allTrades.filter((t) => t.type === "market").length;
  const stopOrders = allTrades.filter((t) => t.type === "stop").length;

  const highFeeTrades = allTrades.filter((t) => {
    const vol = t.qty * t.price;
    return vol > 0 && t.fee / vol > 0.025 && t.exchange !== "Sparplan";
  });

  const recent = allTrades
    .slice(-limit)
    .reverse()
    .map((t) => {
      const vol = round2(t.qty * t.price);
      const feePct = vol > 0 ? round2((t.fee / vol) * 100) : 0;
      const c = companyOf(t.sym);
      return {
        day: t.day,
        date: isoDate(dateOf(u, t.day)),
        side: t.side,
        sym: t.sym,
        short: c.short,
        qty: t.qty,
        priceEur: t.price,
        volumeEur: vol,
        feeEur: t.fee,
        feePctOfVolume: feePct,
        orderType: t.type,
        exchange: t.exchange,
      };
    });

  const coachingNotes: string[] = [];
  if (highFeeTrades.length > 0) {
    coachingNotes.push(
      lang === "de"
        ? `${highFeeTrades.length} Einzelorder(s) hatten eine Gebührenquote über 2,5 % — bei kleinen Beträgen frisst die 4,90 € Grundgebühr einen großen Teil der Rendite.`
        : `${highFeeTrades.length} order(s) had fees above 2.5% of order volume — on small orders the 4.90 € fixed fee eats deeply into returns.`,
    );
  }
  if (limitOrders === 0 && marketOrders > 0) {
    coachingNotes.push(
      lang === "de"
        ? "Bisher wurden nur Market-Orders genutzt. Probiere eine Limit-Order aus, um deinen maximalen Kaufpreis festzulegen."
        : "Only market orders used so far. Try placing a limit order to control your exact entry price.",
    );
  } else if (limitOrders > 0) {
    coachingNotes.push(
      lang === "de"
        ? `Gute Disziplin: ${limitOrders} von ${allTrades.length} Orders wurden mit Limit platziert.`
        : `Good execution discipline: ${limitOrders} of ${allTrades.length} trade(s) used a limit order.`,
    );
  }

  const lines = [
    `## Trade Review (${allTrades.length} total trade(s), ${eur(totalFees)} total fees / ${totalVolume > 0 ? round2((totalFees / totalVolume) * 100) : 0}% of volume)`,
    `Order types: ${limitOrders} limit · ${marketOrders} market · ${stopOrders} stop`,
    ...coachingNotes.map((n) => `- ${n}`),
    `\nRecent trades:`,
    ...recent.map(
      (t) =>
        `- Day ${t.day} (${t.date}): ${t.side.toUpperCase()} ${t.qty} ${t.short} @ ${eur(t.priceEur)} (vol ${eur(t.volumeEur)}, fee ${eur(t.feeEur)} / ${t.feePctOfVolume}%, ${t.orderType})`,
    ),
  ];

  return {
    text: lines.join("\n"),
    data: {
      hasTrades: true,
      summary: {
        totalTrades: allTrades.length,
        totalVolumeEur: totalVolume,
        totalFeesEur: totalFees,
        avgFeePctOfVolume: totalVolume > 0 ? round2((totalFees / totalVolume) * 100) : 0,
        orderTypeBreakdown: { limit: limitOrders, market: marketOrders, stop: stopOrders },
        highFeeTradeCount: highFeeTrades.length,
      },
      coachingNotes,
      trades: recent,
    },
  };
}

// ── Tool 9: get_historical_replays ─────────────────────────────────────────

export async function getHistoricalReplays(
  playerId: string,
  opts: { includeReveal?: boolean; lang?: Lang } = {},
) {
  const lang = resolveLang(opts.lang);
  const save = await loadSave(playerId);

  const items = HISTORY.map((ch) => {
    const r = ch.replay ? REPLAYS[ch.replay] : undefined;
    const done = save ? save.done.includes(ch.id) : false;
    const stars = save?.stars[ch.id] ?? 0;
    const showReveal = !!opts.includeReveal || done;
    return {
      chapterId: ch.id,
      replayId: ch.replay ?? null,
      title: tr(ch.title, lang),
      blurb: tr(ch.blurb, lang),
      coverName: r ? tr(r.cover, lang) : null,
      concept: r?.concept ?? ch.card?.[0] ?? null,
      tradingDays: r?.universe.days ?? 0,
      startingBudgetEur: r?.budget ?? 1000,
      winCondition: r?.win ? tr(r.win, lang) : null,
      completed: done,
      stars,
      reveal: showReveal && r ? tr(r.reveal, lang) : null,
      aftermath: showReveal && r ? tr(r.after, lang) : null,
    };
  });

  const lines = [
    `## History Mode Replays (${items.length} real-market scenarios)`,
    ...items.map(
      (i) =>
        `- **${i.title}** (\`${i.replayId}\`, ${i.tradingDays} trading days, concept: \`${i.concept}\`)${i.completed ? ` [Completed, ${i.stars}★]` : ""}: ${i.coverName}${i.reveal ? ` — Reveal: ${i.reveal}` : " (identity hidden until completed)"}`,
    ),
  ];

  return {
    text: lines.join("\n"),
    data: { replays: items },
  };
}

// ── Tool 10: place_paper_order ─────────────────────────────────────────────

export async function placePaperOrder(
  playerId: string,
  args: {
    symbol: string;
    side: Side;
    qty: number;
    type?: OrderType;
    limit?: number;
    validity?: Validity;
    transferFromGiro?: boolean;
    lang?: Lang;
  },
) {
  const lang = resolveLang(args.lang);
  const company = resolveCompany(args.symbol);
  if (!company || !MAIN.syms.includes(company.sym)) {
    return {
      isError: true,
      text: `Unknown or non-tradable symbol "${args.symbol}". Use one of: ${COMPANIES.map((c) => c.sym).join(", ")}.`,
      data: { ok: false, error: "unknown_symbol" },
    };
  }
  if (args.side !== "buy" && args.side !== "sell") {
    return { isError: true, text: `Side must be "buy" or "sell".`, data: { ok: false, error: "invalid_side" } };
  }
  const qty = Number(args.qty);
  const type: OrderType = args.type ?? "market";
  if (!["market", "limit", "stop"].includes(type)) {
    return { isError: true, text: `Order type must be "market", "limit", or "stop".`, data: { ok: false, error: "invalid_type" } };
  }

  let save = await loadSave(playerId);
  if (!save) {
    return {
      isError: true,
      text: `No sandbox account exists yet for this session (${playerId}). Complete onboarding in the browser or call \`seed_demo_portfolio\` first.`,
      data: { ok: false, error: "no_account" },
    };
  }

  let transferredFromGiroEur = 0;
  if (args.side === "buy" && args.transferFromGiro) {
    const mid = priceNow(save.sim, company.sym);
    const estPrice = type === "limit" && args.limit ? args.limit : ask(mid);
    const estCost = round2(qty * estPrice + fee(qty * estPrice));
    const shortfall = round2(estCost - save.sim.acct.cash);
    if (shortfall > 0 && save.giro >= shortfall) {
      const simWithDeposit = deposit(save.sim, shortfall);
      save = {
        ...save,
        giro: round2(save.giro - shortfall),
        sim: simWithDeposit,
      };
      save = addTx(save, { day: save.sim.day, account: "giro", text: "Transfer to trading account", amount: -shortfall });
      save = addTx(save, { day: save.sim.day, account: "verrechnung", text: "Transfer from current account", amount: shortfall });
      transferredFromGiroEur = shortfall;
    }
  }

  const res = placeOrder(save.sim, {
    sym: company.sym,
    side: args.side,
    qty,
    type,
    limit: args.limit,
    validity: args.validity ?? "day",
  });

  if (res.error) {
    return {
      isError: true,
      text: `Order rejected: ${tr(res.error, lang)}${args.side === "buy" && save.giro > 0 && !args.transferFromGiro ? ` (Tip: you have ${eur(save.giro)} on your current account; pass transferFromGiro: true to move funds automatically.)` : ""}`,
      data: {
        ok: false,
        error: res.error,
        tradingCashEur: save.sim.acct.cash,
        giroEur: save.giro,
      },
    };
  }

  let updated: Save = { ...save, sim: res.sim };
  if (res.filled) {
    const t = res.filled;
    const vol = round2(t.qty * t.price);
    updated = addTx(updated, {
      day: t.day,
      account: "depot",
      text: `${t.side === "buy" ? "Buy" : "Sell"} ${company.short}`,
      amount: t.side === "buy" ? -round2(vol + t.fee) : round2(vol - t.fee),
      qty: t.qty,
      sym: t.sym,
      price: t.price,
    });
  }

  await writeSave(playerId, updated);

  const filled = res.filled;
  const text = filled
    ? `Paper order FILLED: ${filled.side.toUpperCase()} ${filled.qty} ${company.short} (${company.sym}) @ ${eur(filled.price)} · Fee ${eur(filled.fee)} · Remaining trading cash: ${eur(updated.sim.acct.cash)}.${transferredFromGiroEur > 0 ? ` (Transferred ${eur(transferredFromGiroEur)} from current account.)` : ""}`
    : `Paper order PLACED in order book: ${args.side.toUpperCase()} ${qty} ${company.short} (${company.sym}) ${type} @ ${eur(args.limit ?? 0)} (${args.validity ?? "day"}). It will execute when the simulated market reaches your price.`;

  return {
    text,
    data: {
      ok: true,
      status: filled ? "filled" : "open",
      transferredFromGiroEur,
      trade: filled,
      openOrder: filled ? null : updated.sim.acct.orders.at(-1) ?? null,
      tradingCashEur: updated.sim.acct.cash,
      giroEur: updated.giro,
      depotValueEur: depotValue(updated.sim),
      simDay: updated.sim.day,
    },
  };
}

// ── Tool 11: advance_market ────────────────────────────────────────────────

export async function advanceMarket(
  playerId: string,
  args: { days?: number; stopAtMajor?: boolean; lang?: Lang } = {},
) {
  const lang = resolveLang(args.lang);
  const days = Math.max(1, Math.min(252, Math.floor(args.days ?? 5)));
  const save = await loadSave(playerId);
  if (!save) {
    return {
      isError: true,
      text: `No sandbox account found for ${playerId}. Call \`seed_demo_portfolio\` or open the web app first.`,
      data: { ok: false, error: "no_account" },
    };
  }

  const prevDepot = depotValue(save.sim);
  const prevDay = save.sim.day;
  const { sim, events } = advance(save.sim, days, { stopAtMajor: !!args.stopAtMajor });
  const updated = logSimEvents({ ...save, sim }, events);
  await writeSave(playerId, updated);

  const newDepot = depotValue(updated.sim);
  const deltaEur = round2(newDepot - prevDepot);
  const deltaPct = prevDepot > 0 ? round2((deltaEur / prevDepot) * 100) : 0;
  const u = universeOf(updated.sim.universe);
  const positions = buildPositions(updated);

  const filledOrders = events.filter((e) => e.kind === "fill").map((e) => e.trade);
  const expiredOrders = events.filter((e) => e.kind === "expired").map((e) => e.order);
  const planRuns = events.filter((e) => e.kind === "plan");
  const simulatedEvents = events
    .filter((e) => e.kind === "news")
    .map((e) => ({
      simulated: true as const,
      day: e.day,
      scope: e.news.kind,
      headline: tr(e.news.headline, lang),
    }));

  const lines = [
    `## Sandbox Market Advanced: Day ${prevDay} → Day ${updated.sim.day} (${isoDate(dateOf(u, updated.sim.day))})`,
    `Depot value: **${eur(newDepot)}** (${signed(deltaEur)} € / ${pct(deltaPct)} over these ${updated.sim.day - prevDay} trading day(s)).`,
    filledOrders.length > 0 ? `Orders filled: ${filledOrders.length}` : "",
    expiredOrders.length > 0 ? `Orders expired: ${expiredOrders.length}` : "",
    planRuns.length > 0 ? `Savings plan runs: ${planRuns.length}` : "",
    simulatedEvents.length > 0
      ? `Simulated macro/sector headlines during window:\n${simulatedEvents.map((n) => `- [Simulated · Day ${n.day}] ${n.headline}`).join("\n")}`
      : `No major simulated macro/sector headlines during this window.`,
    `Tip: Call \`get_account_update\` to get the full position-by-position P/L delta briefing.`,
  ].filter(Boolean);

  return {
    text: lines.join("\n"),
    data: {
      ok: true,
      previousDay: prevDay,
      currentDay: updated.sim.day,
      daysAdvanced: updated.sim.day - prevDay,
      simDate: isoDate(dateOf(u, updated.sim.day)),
      previousDepotValueEur: prevDepot,
      currentDepotValueEur: newDepot,
      depotDeltaEur: deltaEur,
      depotDeltaPct: deltaPct,
      filledOrders,
      expiredOrders,
      savingsPlanExecutions: planRuns,
      simulatedMacroAndSectorEvents: simulatedEvents,
      positions,
    },
  };
}

// ── Tool 12: seed_demo_portfolio ───────────────────────────────────────────

export async function seedDemoPortfolio(
  playerId: string,
  args: { persona?: PersonaId; advanceDays?: number; force?: boolean; lang?: Lang } = {},
) {
  const lang = resolveLang(args.lang);
  const existing = await loadSave(playerId);
  if (
    existing &&
    !args.force &&
    (Object.keys(existing.sim.acct.holdings).length > 0 || existing.sim.acct.trades.length > 0)
  ) {
    return {
      text:
        lang === "de"
          ? `Es existiert bereits ein aktives Sandbox-Depot (${Object.keys(existing.sim.acct.holdings).length} Positionen). Übergib \`force: true\`, wenn du es durch das Demo-Depot ersetzen möchtest.`
          : `An active sandbox portfolio already exists (${Object.keys(existing.sim.acct.holdings).length} position(s)). Pass \`force: true\` to overwrite it with the demo portfolio.`,
      data: { ok: false, skipped: true, reason: "already_has_portfolio" },
    };
  }

  const personaId: PersonaId = args.persona && PERSONAS[args.persona] ? args.persona : "builder";
  const advanceDays = Math.max(0, Math.min(252, Math.floor(args.advanceDays ?? 15)));

  // Create a realistic, well-diversified sandbox account with 2.000 € play money
  let save: Save = {
    ...freshSave(personaId),
    xp: 220,
    cards: ["stock", "order-types", "fees", "pnl"],
    done: ["1.1", "1.2", "1.3", "1.4", "1.5", "w1"],
    stars: { w1: 3 },
    proUnlocked: true,
    proCelebrated: true,
    giro: 400,
    sim: newSim("main", 0),
  };

  // Fund trading account with 1.600 €
  save = { ...save, sim: deposit(save.sim, 1600) };
  save = addTx(save, { day: 0, account: "giro", text: "Play money added (sandbox)", amount: 2000 });
  save = addTx(save, { day: 0, account: "giro", text: "Transfer to trading account", amount: -1600 });
  save = addTx(save, { day: 0, account: "verrechnung", text: "Transfer from current account", amount: 1600 });

  // Open 4 balanced positions across Telecom, Tech, Finance & World ETF
  const demoOrders: Array<{ sym: string; qty: number; type: OrderType }> = [
    { sym: ETF_SYM, qty: 6, type: "limit" }, // ~591 € MSCI World ETF
    { sym: "DTE", qty: 12, type: "limit" }, // ~358 € Deutsche Telekom
    { sym: "SAP", qty: 1, type: "limit" }, // ~229 € SAP
    { sym: "ALV", qty: 1, type: "market" }, // ~302 € Allianz
  ];

  for (const o of demoOrders) {
    const mid = priceNow(save.sim, o.sym);
    const res = placeOrder(save.sim, {
      sym: o.sym,
      side: "buy",
      qty: o.qty,
      type: o.type,
      limit: o.type === "limit" ? round2(ask(mid) + 0.05) : undefined,
    });
    if (!res.error && res.filled) {
      const t = res.filled;
      const vol = round2(t.qty * t.price);
      save = { ...save, sim: res.sim };
      save = addTx(save, {
        day: t.day,
        account: "depot",
        text: `Buy ${companyOf(t.sym).short}`,
        amount: -round2(vol + t.fee),
        qty: t.qty,
        sym: t.sym,
        price: t.price,
      });
    }
  }

  // Save the day-0 checkpoint BEFORE advancing the market so the very next `get_account_update`
  // immediately reports exact position-by-position P/L deltas since entry!
  await clearCheckpoint(playerId);
  const baselineCheckpoint = buildCheckpoint(save);

  if (advanceDays > 0) {
    const { sim, events } = advance(save.sim, advanceDays);
    save = logSimEvents({ ...save, sim }, events);
  }

  await writeSave(playerId, save);
  await writeCheckpoint(playerId, baselineCheckpoint);

  const positions = buildPositions(save);
  const dep = depotValue(save.sim);
  const basis = costBasis(save.sim);
  const pnl = round2(dep - basis);
  const pnlPct = basis > 0 ? round2((pnl / basis) * 100) : 0;

  const lines = [
    lang === "de"
      ? `## Demo-Depot eingerichtet (${positions.length} Positionen, ${advanceDays} Handelstage vorgespult)`
      : `## Demo Portfolio Ready (${positions.length} positions, advanced ${advanceDays} trading day(s))`,
    `Depot: **${eur(dep)}** (Unrealized P/L: **${signed(pnl)} € / ${pct(pnlPct)}**) · Trading cash: ${eur(save.sim.acct.cash)} · Giro: ${eur(save.giro)}`,
    ...positions.map(
      (p) => `- **${p.short} (${p.sym})**: ${p.qty} sh · ${eur(p.marketValue)} · P/L ${signed(p.unrealizedPnlEur)} € (${pct(p.unrealizedPnlPct)})`,
    ),
    lang === "de"
      ? `Der Ausgangs-Snapshot von Tag 0 wurde gespeichert — rufe jetzt \`get_account_update\` auf, um das vollständige Update mit Veränderungen pro Position zu sehen.`
      : `A Day-0 baseline checkpoint was saved — call \`get_account_update\` now to get the full position-by-position change briefing.`,
  ];

  return {
    text: lines.join("\n"),
    data: {
      ok: true,
      playerId,
      persona: personaId,
      simDay: save.sim.day,
      baselineDay: baselineCheckpoint.day,
      depotValueEur: dep,
      unrealizedPnlEur: pnl,
      unrealizedPnlPct: pnlPct,
      positions,
    },
  };
}
