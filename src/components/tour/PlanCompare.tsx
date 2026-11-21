"use client";
import { useMemo } from "react";
import { ETF_SYM } from "@/lib/data/companies";
import { eur } from "@/lib/format";
import { addPlan, advance, newSim, priceAt, universeOf } from "@/lib/sim/engine";
import LineChart from "../LineChart";

/** World 4: savings plan vs. one-time buy vs. cash under the mattress, over the same 10 years. */
export default function PlanCompare({ monthly }: { monthly: number }) {
  const { plan, lump, cash, paid } = useMemo(() => {
    const u = universeOf("w4-plan");
    const s = advance(addPlan(newSim("w4-plan", 0), { sym: ETF_SYM, amount: monthly }), 2520).sim;
    const step = 21;
    const days = Array.from({ length: Math.floor(2520 / step) + 1 }, (_, i) => i * step);
    const paidAt = (d: number) => s.acct.deposits[d] ?? 0;
    const total = paidAt(2520);
    const p0 = priceAt(u, ETF_SYM, 0);
    return {
      plan: days.map((d) => s.acct.values[d] ?? 0),
      lump: days.map((d) => (total / p0) * priceAt(u, ETF_SYM, d)),
      cash: days.map((d) => paidAt(d)),
      paid: total,
    };
  }, [monthly]);
  const last = (a: number[]) => a[a.length - 1];
  return (
    <div className="stack-sm">
      <p className="small">Ten years, {eur(monthly)} a month: you paid in <strong>{eur(paid)}</strong>.</p>
      <LineChart height={160} series={[
        { values: lump, color: "var(--color-border)", label: "One-time buy", width: 1.5 },
        { values: cash, color: "var(--color-ink-2)", label: "Cash under the mattress", width: 1.5 },
        { values: plan, color: "var(--color-ink)", label: "Your savings plan", width: 3 },
      ]} />
      <div className="row xs legend-row">
        <span><span className="swatch" style={{ background: "var(--color-ink)" }} /> Savings plan {eur(last(plan))}</span>
        <span><span className="swatch" style={{ background: "var(--color-border)" }} /> One-time buy of {eur(paid)} on day 1: {eur(last(lump))}</span>
        <span><span className="swatch" style={{ background: "var(--color-ink-2)" }} /> Cash: {eur(last(cash))}</span>
      </div>
      <p className="xs muted">The one-time buy did best because prices rose, but it needs all the money on day one. The savings plan started with {eur(monthly)} and kept buying through the bad year, when shares were cheap.</p>
    </div>
  );
}
