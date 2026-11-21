/** A ProTrader widget: dark header bar with the yellow title, white body. */
export default function Widget({ id, title, sub, className, children, actionsSlot }: { id: string; title: string; sub?: string; className?: string; children: React.ReactNode; actionsSlot?: React.ReactNode }) {
  return (
    <section className={`pt-w ${className ?? ""}`} data-tour={id} aria-label={title}>
      <div className="pt-w-head">
        <strong>{title}</strong>{sub && <span className="pt-w-sub">{sub}</span>}
        <span className="pt-w-tools">{actionsSlot}<span aria-hidden>⤢</span><span aria-hidden>✕</span></span>
      </div>
      <div className="pt-w-body">{children}</div>
    </section>
  );
}
