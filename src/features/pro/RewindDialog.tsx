"use client";
import { useEffect, useId, useRef, useState } from "react";
import Glyph from "@/shared/ui/Glyph";

export type RewindUnit = "days" | "weeks";

/**
 * Centered "how far back?" dialog opened from the 1 day/s · 1 week/s buttons: restarts the market simulation earlier. Native <dialog> + showModal():
 * focus stays inside, Escape closes, the page behind is dimmed and blurred via ::backdrop.
 * The unit toggle is bound to the desk's pace (same state as the buttons in the time bar).
 */
export default function RewindDialog({ open, unit, onUnitChange, max, preview, note, onCancel, onContinue }: {
  open: boolean;
  unit: RewindUnit;
  onUnitChange: (unit: RewindUnit) => void;
  max: Record<RewindUnit, number>;
  preview: (n: number, unit: RewindUnit) => string;
  note?: string;
  onCancel: () => void;
  onContinue: (n: number, unit: RewindUnit) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("7");
  const id = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      inputRef.current?.select();
    } else if (!open && d.open) d.close();
  }, [open]);

  const n = Number(value);
  const limit = max[unit];
  const valid = Number.isInteger(n) && n >= 1 && n <= limit;
  const word = unit === "days" ? (n === 1 ? "day" : "days") : n === 1 ? "week" : "weeks";
  const error = value === "" ? "Enter a number." : !Number.isInteger(n) || n < 1 ? "Use a whole number, 1 or more." : n > limit ? `Only ${limit} ${unit} of history are available.` : "";

  return (
    <dialog ref={ref} className="rewind-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-desc`}
      onClose={onCancel} onClick={(e) => { if (e.target === ref.current) onCancel(); }}>
      <form method="dialog" className="rewind-form" onSubmit={(e) => { e.preventDefault(); if (valid) onContinue(n, unit); }}>
        <div className="rewind-head">
          <span className="rewind-icon" aria-hidden><Glyph name="rewind" size={18} /></span>
          <div>
            <h2 id={`${id}-title`}>Go back in time</h2>
            <p id={`${id}-desc`} className="small muted">How many sessions do you want to go back? The market restarts there and runs forward. You can trade as it goes.</p>
          </div>
        </div>

        <div className="rewind-seg" role="group" aria-label="Rewind unit">
          <button type="button" aria-pressed={unit === "days"} onClick={() => onUnitChange("days")}>1 day</button>
          <button type="button" aria-pressed={unit === "weeks"} onClick={() => onUnitChange("weeks")}>1 week</button>
        </div>

        <label className="rewind-field" htmlFor={`${id}-n`}>
          <span className="xs muted">{unit === "days" ? "Days back" : "Weeks back"}</span>
          <span className="rewind-input">
            <input ref={inputRef} id={`${id}-n`} type="number" inputMode="numeric" min={1} max={limit} step={1} value={value}
              onChange={(e) => setValue(e.target.value)} aria-invalid={!valid || undefined} aria-describedby={`${id}-help`} />
            <span className="rewind-unit">{word}</span>
          </span>
        </label>
        <p id={`${id}-help`} className={valid ? "xs muted rewind-help" : "xs rewind-help rewind-error"} aria-live="polite">
          {valid ? `Opens on ${preview(n, unit)} · up to ${limit} ${unit}` : error}
        </p>

        {note && <p className="xs muted rewind-note">{note}</p>}

        <div className="rewind-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={!valid}>Continue</button>
        </div>
      </form>
    </dialog>
  );
}
