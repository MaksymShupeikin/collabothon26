import type { IRange, Time } from "lightweight-charts";

export function historyViewport(
  previous: { times: Time[]; range: IRange<number> } | undefined,
  times: Time[],
  span: number,
): IRange<number> {
  const end = Math.max(0, times.length - 1);
  if (previous) {
    const { range, times: oldTimes } = previous;
    const atLatest = range.to >= oldTimes.length - 1;
    const anchor = atLatest ? oldTimes.length - 1 : Math.max(0, Math.ceil(range.from));
    const position = times.indexOf(oldTimes[anchor]);
    if (position >= 0) {
      // Keep the first visible bar on prepend. Follow the last bar only if it was visible on append.
      const shift = atLatest ? end - anchor : position - anchor;
      return { from: range.from + shift, to: range.to + shift };
    }
  }
  return { from: Math.max(0, end - span), to: Math.max(1, end) };
}
