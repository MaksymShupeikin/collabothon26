# comdirect edu: Practice first, then invest

A training sandbox that looks like comdirect, runs on play money and walks you through it one game step at a time.
The full concept is in `idea.md`; this is phase 1 (the core build).

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run check      # self-check of the money math, the scripted markets and the bots
npm run build
```

## Demo path (≈5 min, idea.md §16)

1. `/` (first visit): the mocked comdirect start page with the yellow **"Practice first, then invest"** banner. It stays reachable at `/comdirect`.
2. `/start`: three questions pick a persona (Starter 100 €, Builder 500 €, Pre-retiree 1.000 €). "Not you?" switches persona.
3. `/` again, now the hub (layout from `main`). Dark hero with your rank, three modes (tour, Market Simulator, History Mode) and the learning material per world.
4. **Start the tour** → `/cabinet`: World 1 in the copied web cabinet. Spotlight tour → transfer with photoTAN → search → stock page → order form → **mission: your first stock** → ⏩ 1 week → P/L → **Pro mode unlocked**.
5. `/pro`: ProTrader-style workspace with the time machine. For the Wirecard moment, open the hub, tick **Demo tools → Unlock all worlds** and click the **👾 Boss: All-in Alex** chip in World 3.
6. The reveal shows the Mistake Cam and the risk-adjusted leaderboard.

Progress lives in `localStorage` (`cd-edu-v3`); "Reset progress" at the bottom of the hub starts over.

## Where things are

| Path | What |
|---|---|
| `src/lib/sim/engine.ts` | Deterministic market + account: orders, fees, savings plans, time jumps, risk score |
| `src/lib/sim/scenarios.ts` | The main sandbox, simulated lessons and the historical replays (with scripted bot moves) |
| `src/lib/sim/bots.ts` | Mock bots: depot curves computed from the scripted moves |
| `src/lib/game/` | Personas, chapters/missions/bosses, the game store (XP, cards, stars) and the tour UI bus |
| `src/components/cabinet/` | Web cabinet screens (references `1_web-kundenbereich`, `2_web-ordermaske`) |
| `src/components/pro/` | Pro mode widgets, chart, order window, replay pieces (references `02`–`42`) |
| `src/components/tour/` | Spotlight coach, missions, concept cards |
| `docs/replay-sources.md` | Fact-check notes and sources for the replays |
