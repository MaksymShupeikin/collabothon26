/**
 * Tiny synthesized sound effects (Web Audio, no assets). Kept deliberately quiet.
 */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  return ctx;
}

/** A soft, rising two-note chime — barely-there glass "ting" for XP landing in the rank chip. */
export function playXpChime() {
  const ac = audio();
  if (!ac || ac.state !== "running") return;
  const now = ac.currentTime;

  const master = ac.createGain();
  master.gain.value = 0.05;
  const warm = ac.createBiquadFilter();
  warm.type = "lowpass";
  warm.frequency.value = 3200;
  master.connect(warm).connect(ac.destination);

  // C6 → G6, the second note slightly softer so it trails off rather than rings.
  [
    { f: 1046.5, t: 0, peak: 1 },
    { f: 1568.0, t: 0.075, peak: 0.7 },
  ].forEach(({ f, t, peak }) => {
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.value = f;
    const env = ac.createGain();
    const start = now + t;
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(peak, start + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);
    osc.connect(env).connect(master);
    osc.start(start);
    osc.stop(start + 0.5);
  });
}
