"use client";
import { useMemo } from "react";
import { ETF_SYM } from "@/features/market/companies";
import { eur } from "@/shared/lib/format";
import { addPlan, advance, newSim, priceAt, universeOf } from "@/features/market/engine";
import LineChart from "@/shared/charts/LineChart";
import { useT } from "@/shared/lib/i18n";

/** Module 4: savings plan vs. one-time buy vs. cash under the mattress, over the same 10 years. */
export default function PlanCompare({ monthly }: { monthly: number }) {
  const t = useT();
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
      <p className="small">{t(`Ten years, ${eur(monthly)} a month: you paid in`, `Zehn Jahre, ${eur(monthly)} im Monat: Du hast eingezahlt:`)} <strong>{eur(paid)}</strong>.</p>
      <LineChart height={160} series={[
        { values: lump, color: "var(--color-border)", label: t("One-time buy", "Einmalkauf"), width: 1.5 },
        { values: cash, color: "var(--color-ink-2)", label: t("Cash under the mattress", "Bargeld unter der Matratze"), width: 1.5 },
        { values: plan, color: "var(--color-ink)", label: t("Your savings plan", "Dein Sparplan"), width: 3 },
      ]} />
      <div className="row xs legend-row">
        <span><span className="swatch" style={{ background: "var(--color-ink)" }} /> {t("Savings plan", "Sparplan")} {eur(last(plan))}</span>
        <span><span className="swatch" style={{ background: "var(--color-border)" }} /> {t(`One-time buy of ${eur(paid)} on day 1`, `Einmalkauf über ${eur(paid)} an Tag 1`)}: {eur(last(lump))}</span>
        <span><span className="swatch" style={{ background: "var(--color-ink-2)" }} /> {t("Cash", "Bargeld")}: {eur(last(cash))}</span>
      </div>
      <p className="xs muted">{t(`The one-time buy did best because prices rose, but it needs all the money on day one. The savings plan started with ${eur(monthly)} and kept buying through the bad year, when shares were cheap.`, `Der Einmalkauf lag vorn, weil die Kurse gestiegen sind, braucht aber das ganze Geld am ersten Tag. Der Sparplan startete mit ${eur(monthly)} und kaufte im schlechten Jahr weiter, als Anteile günstig waren.`)}</p>
    </div>
  );
}
