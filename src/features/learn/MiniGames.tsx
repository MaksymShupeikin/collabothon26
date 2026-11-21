import { useState } from "react";
import type { MiniGame } from "@/features/learn/concepts";
import Icon from "@/shared/ui/Icon";

const eur = (n: number) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: n < 10 ? 2 : 0 });

/** Monthly savings → final value at a yearly rate (compounded monthly). */
export const futureValue = (monthly: number, yearlyRate: number, years: number) => {
  const r = yearlyRate / 12, n = years * 12;
  return r === 0 ? monthly * n : monthly * ((Math.pow(1 + r, n) - 1) / r);
};

// Approximate top MSCI World weights (mock, for illustration only).
const TOP = [["Apple", 4.9], ["NVIDIA", 4.6], ["Microsoft", 4.3], ["Amazon", 2.7], ["Meta", 1.8], ["Alphabet", 2.4], ["Broadcom", 1.3], ["Tesla", 1.1], ["JPMorgan", 0.9], ["SAP", 0.4]] as const;

function Basket() {
  const [amount, setAmount] = useState(100);
  const topShare = TOP.reduce((s, [, w]) => s + w, 0);
  return (
    <div className="stack">
      <label className="field">Amount: <strong>{eur(amount)}</strong>
        <input className="range" type="range" min={10} max={1000} step={10} value={amount} onChange={(e) => { setAmount(Number(e.target.value)) }} />
      </label>
      {TOP.map(([name, w]) => (
        <div key={name} className="bar-row"><span>{name}</span><div className="bar" style={{ width: `${w * 15}%` }} /><span className="num">{eur((amount * w) / 100)}</span></div>
      ))}
      <div className="bar-row"><span>+ ~1,400 more</span><div className="bar accent" style={{ width: "100%" }} /><span className="num">{eur((amount * (100 - topShare)) / 100)}</span></div>
          </div>
  );
}

function Eggs() {
  const [drops, setDrops] = useState<{ crash: boolean; hit: boolean }[]>([]);
  // Each year: 50% chance one of the 10 companies collapses (−90%); everything else grows 7%.
  const allIn = drops.reduce((v, d) => v * (d.hit ? 0.1 : 1.07), 10_000);
  const spread = drops.reduce((v, d) => v * (d.crash ? 0.9 * 1.07 + 0.1 * 0.1 : 1.07), 10_000);
  return (
    <div className="stack">
      <p className="small">10,000 € in one company vs. ten. Some years one company collapses (−90%).</p>
      <div className="row">
        <button className="btn btn-primary" onClick={() => { const crash = Math.random() < 0.5; setDrops([...drops, { crash, hit: crash && Math.random() < 0.1 }]) }}><Icon name="egg" size={24} /> Drop a year</button>
        <button className="btn btn-ghost btn-sm" onClick={() => setDrops([])}>Reset</button>
        <span className="xs muted">{drops.length} years</span>
      </div>
      <div className="bar-row"><span><Icon name="basket" size={24} /> All in one</span><div className="bar" style={{ width: `${Math.min(100, allIn / 200)}%` }} /><span className="num">{eur(allIn)}</span></div>
      <div className="bar-row"><span><Icon name="basket" size={24} />×10 Spread</span><div className="bar accent" style={{ width: `${Math.min(100, spread / 200)}%` }} /><span className="num">{eur(spread)}</span></div>
          </div>
  );
}

function Bucket() {
  const [ter, setTer] = useState(1.8);
  const cheap = futureValue(100, 0.07 - 0.002, 30), costly = futureValue(100, 0.07 - ter / 100, 30);
  return (
    <div className="stack">
      <p className="small">100 € a month, 30 years, 7% a year.</p>
      <label className="field">Yearly fund fee (TER): <strong>{ter.toFixed(1)} %</strong>
        <input className="range" type="range" min={0.1} max={2.5} step={0.1} value={ter} onChange={(e) => { setTer(Number(e.target.value)) }} />
      </label>
      <div className="bar-row"><span>ETF, TER 0.2%</span><div className="bar accent" style={{ width: "100%" }} /><span className="num">{eur(cheap)}</span></div>
      <div className="bar-row"><span>Your fund</span><div className="bar" style={{ width: `${(costly / cheap) * 100}%` }} /><span className="num">{eur(costly)}</span></div>
      <p className="small"><Icon name="bucket" size={24} /> Leaked to fees: <strong className="down">{eur(Math.max(0, cheap - costly))}</strong></p>
    </div>
  );
}

function Snowball() {
  const [years, setYears] = useState(10);
  const paid = 50 * 12 * years, fv = futureValue(50, 0.07, years);
  return (
    <div className="stack">
      <p className="small">50 € a month at 7% a year.</p>
      <label className="field">Years: <strong>{years}</strong>
        <input className="range" type="range" min={1} max={40} value={years} onChange={(e) => { setYears(Number(e.target.value)) }} />
      </label>
      <div style={{ display: "grid", placeItems: "center", height: 140 }} aria-hidden>
        <div style={{ width: 20 + years * 3, height: 20 + years * 3, borderRadius: "50%", background: "var(--color-bg-light)", border: "2px solid var(--color-border)", transition: "all var(--ease)" }} />
      </div>
      <div className="bar-row"><span>You paid in</span><div className="bar light" style={{ width: `${(paid / fv) * 100}%` }} /><span className="num">{eur(paid)}</span></div>
      <div className="bar-row"><span>Snowball</span><div className="bar accent" style={{ width: "100%" }} /><span className="num">{eur(fv)}</span></div>
      <p className="small">Growth on top of your money: <strong className="up">{eur(fv - paid)}</strong></p>
    </div>
  );
}

const GAMES: Record<MiniGame, () => React.ReactNode> = { basket: Basket, eggs: Eggs, bucket: Bucket, snowball: Snowball };

export default function MiniGameView({ game }: { game: MiniGame }) {
  const G = GAMES[game];
  return <G />;
}
