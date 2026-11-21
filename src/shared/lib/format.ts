// comdirect number and date formats: 1.001,16 EUR · 14.03.2024 · 15:45:06
export const num = (n: number, d = 2) => n.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });
export const eur = (n: number) => `${num(n)} €`;
export const EUR = (n: number) => `${num(n)} EUR`;
export const signed = (n: number, d = 2) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${num(Math.abs(n), d)}`;
export const pct = (n: number) => `${signed(n)} %`;
export const cls = (n: number) => (n > 0.0001 ? "up" : n < -0.0001 ? "down" : "");
export const qtyFmt = (q: number) => (Number.isInteger(q) ? q.toLocaleString("de-DE") : num(q, 4));
export const dateDE = (d: Date) => d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
export const weekday = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
export const shortDay = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
