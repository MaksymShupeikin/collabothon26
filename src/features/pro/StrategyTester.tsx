"use client";
import { useId, useState } from "react";
import { runBacktest, type TestBar } from "../market/backtest";

export default function StrategyTester({ getBars }: { getBars: () => TestBar[] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const result = open ? runBacktest(getBars()) : null;
  return <div className="bt-inline">
    <button className="btn btn-outline btn-sm" aria-expanded={open} aria-controls={id}
      title="SMA 5/20 · €10,000 · 0.1% fee and 0.05% slippage per fill"
      onClick={() => setOpen(!open)}>Backtest</button>
    <div id={id} hidden={!open} role="status">
      {open && (result ? <>
        <small className="muted">SMA 5/20</small>
        <dl>
          <div><dt>Return</dt><dd>{result.returnPct.toFixed(2)}%</dd></div>
          <div><dt>Max drawdown</dt><dd>{result.drawdown.toFixed(2)}%</dd></div>
          <div><dt>Closed trades</dt><dd>{result.closed}</dd></div>
        </dl>
      </> : <small>At least 21 bars are needed.</small>)}
    </div>
  </div>;
}
