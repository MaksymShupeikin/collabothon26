<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-002E3C?style=flat-square" alt="Next.js 16">
  <img src="https://img.shields.io/badge/React-19-506C74?style=flat-square" alt="React 19">
  <img src="https://img.shields.io/badge/money-play_only-FFD700?style=flat-square&labelColor=002E3C" alt="Play money only">
  <img src="https://img.shields.io/badge/Collabothon-2026-83989F?style=flat-square" alt="Collabothon 2026">
</p>

# comdirect edu

A play-money training sandbox on the real comdirect screens that guides first-time investors, from 22 to 58, step by step to their first stock trade.

**No theory first: you act from the very first minute, and every concept sticks because you just did it yourself.**

[View the pitch presentation (PDF)](docs/finance-quest.pdf)

## Why

Germans save a lot but invest too little. The barrier is not information, it is fear of the first step: the trading screen is unfamiliar, the terms are unclear, and reacting to news feels risky.

comdirect already has the pieces, but they live apart:

| | Musterdepot | Akademie | **comdirect edu** |
|---|:---:|:---:|:---:|
| Play money | ✅ | — | ✅ |
| Real comdirect layout | partly | — | ✅ |
| Guidance on every element | — | — | ✅ |
| Learn by doing | — | — | ✅ |
| Consequences in seconds | — | — | ✅ |
| Fits your life stage | — | — | ✅ |
| Reason to come back | — | — | ✅ |

## What's inside

| Mode | What you do |
|---|---|
| **Guided tour** | A spotlight coach explains each element of the web cabinet in one or two sentences, then hands you a mission: top up, search, buy your first stock |
| **Market simulator** | One simple trading screen with a live news feed and time that moves |
| **ProTrader** | An exact replica of the comdirect ProTrader layout, so you are fluent in the real workspace before you buy your first stock |
| **History mode** | Replay real market moments and see how your decisions would have played out |
| **Investor simulator** | A life-long savings run: income, events and choices, decade by decade |
| **Learning map** | Tutorials, concept cards, mini games, quick-check quizzes and bosses |

### One path, three life stages

Three onboarding questions pick a persona, and everything is tailored to it: examples, amounts, missions and bosses all match your life stage.

| Persona | Example | Start money | Savings plan | Focus |
|---|---|---:|---:|---|
| **Starter** | Lena, 22 | 100 € | 25 €/month | Compound interest, not chasing hype |
| **Builder** | Kaya family, 34 | 500 € | 50 €/month | Diversification, staying calm in a crash |
| **Pre-retiree** | Helga, 58 | 1.000 € | 100 €/month | Horizon, drawdown, why "cheap" isn't "safe" |

## How the game works

**The rule: we reward understanding and good decisions, never trading volume or guessing prices.** That keeps the game on the safe side of what regulators (ESMA, BaFin) criticise in "gamified" retail trading.

| Element | How it works |
|---|---|
| **Missions** | The coach steps back and you do it alone. 1–3 stars: done, done without hints, done with the smart choice (for example a limit order at night) |
| **XP and ranks** | XP for tour steps, missions, right concept answers and good decisions. Ranks: Saver → Beginner → Investor → Strategist → Market Reader |
| **Concept cards** | 12 to collect. Front: one sentence. Back: an example and a quiz question |
| **Spot the habit** | When a bot trades you name the risk behind it, not whether the price will go up. XP for the right concept, whatever the outcome |
| **Mistake Cam** | After the outcome, a short replay of what the bot did, what really happened and the concept behind it |
| **Boss rounds** | Tutorials 2–4 each end against one bot: FOMO Max, All-in Alex, Panic Paula. In History mode the same bosses return on real events with the date hidden (GameStop 2021, Wirecard 2020, the COVID crash 2020), revealed at the end |
| **Leaderboard** | You vs. the bots by risk-adjusted score (return − ½ × worst drawdown), so all-in gambling rarely wins |

## Fit with the Finance Quest challenge

| The challenge card asks for | What comdirect edu does |
|---|---|
| Bridge the gap between financial knowledge and action | You buy your first stock yourself, on the real comdirect screens, before you ever risk real money |
| A demonstrable prototype with a complete learning mission | Tutorial 1 mission **"Your first stock"**: move your money to the trading account, buy with a limit order, jump one week ahead, find your profit and loss. Checked against the sandbox state, not a quiz |
| The target learner and learning objective | **Learner:** self-directed savers who have never bought a stock. **Objective:** place a first trade with confidence and understand market vs. limit orders, fees and profit & loss |
| How the experience supports understanding and engagement | Spotlight tour where you do every step, concept cards, missions, rival bots, boss rounds, and History mode replays of real events |
| Fit with "Innovations for all generations" | Three onboarding questions pick a persona (22, 34 or 58), which changes the amounts, examples, missions and bosses |

## Why it's good for Commerzbank

- **Savers become investors.** Commerzbank's own Anlagestudie 2026 found that Germans save a lot and invest too little. edu turns the fear of the first step into a first trade.
- **A path into the real depot.** Every journey ends at **"Ready for real?"**, one click from the sandbox to the real comdirect portfolio.
- **Lives inside comdirect.** One banner on the start page. No sign-up, no new app, built on comdirect's own screens.
- **Customers for every life stage.** From a 22-year-old with a 25 € savings plan to a 58-year-old preparing for retirement.

## What we copy and what we invent

**Copied 1:1 from comdirect:** start page, account table, depot overview, transactions, search, security detail page, order form, and the ProTrader workspace with its widgets. Layout, element positions, table columns, field order and the German number and date formats (`1.001,16 EUR`, `14.03.2024`) match the real screens. The app runs in English and German (EN/DE switch in the header).

**Invented by us:** the entry banner, onboarding and personas, the spotlight coach, missions, XP, ranks, cards and stars, the simple trading area between the web cabinet and ProTrader, the time machine, historical replays, rival bots, Spot the habit, Mistake Cam, boss rounds, the leaderboard and the clearly marked "Add play money" sandbox button.

## What works today

| | |
|---|---|
| ✅ **Working** | Onboarding with three personas · all four tutorials end to end, each with a mission and a boss · five History replays (Wirecard, GameStop, VW, NVIDIA, COVID crash) · investor simulator · learning map with XP, ranks, stars and cards · ProTrader replica with the time machine · English and German |
| 🟡 **Simulated on purpose** | Prices are scripted, not live · the photoTAN step is a mock · "Ready for real?" links to comdirect.de |

## Tech stack

| | |
|---|---|
| **Language** | TypeScript |
| **Framework** | Next.js 16 (App Router), React 19 |
| **Charts** | TradingView lightweight-charts (candles, volume) |
| **Data** | The market engine runs in the browser; progress is saved in Postgres through one API route (see [Saving progress](#saving-progress)) |
| **Deploy** | Docker behind Caddy on a VPS |
| **Quality** | ESLint, `node:assert` self-checks run with plain `node` |

No paid APIs, cloud services or hardware.

## Behind the build

**How the pieces fit.** One deterministic engine ([`engine.ts`](src/features/market/engine.ts)) holds the account, fees (4,90 € + 0,25 %), orders and scripted prices. Every screen reads from it: the web cabinet, the simple trading area, ProTrader and the replays. The tour and missions check the sandbox state ("does the depot hold the stock, bought with a limit order?"), not a quiz answer.

**Key decisions.**
- **Deterministic markets.** Prices depend only on the scenario, never on the player, so every demo and every test plays the same way and only the account needs saving.
- **One step = one trading day.** Enough to show news, orders and compounding without an intraday engine.
- **A tiny backend.** One route saves progress to Postgres; there is still nothing to sign up for.
- **A mock account by default.** In the real product the learner is already signed in to comdirect, so their first name and surname would come from their Commerzbank account, not from a sign-up form of ours. We don't have access to that for the prototype, so every player sees the same placeholder account holder, "Max Mustermann" ([`user.ts`](src/shared/lib/user.ts)). We didn't build our own sign-up, because it would be thrown away once the bank login is connected.
- **Code by feature** (`src/features/*`), with thin routes in `src/app/`.

**Built on:** Next.js, React and lightweight-charts.
**Built by us during the hackathon (20–22 Nov 2026), about 50 commits:** everything else. The market engine, scenarios, replays and bots, the tour and missions, the game systems, the comdirect replica screens, the investor simulator and the German translation.

## Challenges and what we learned

- **The scoring rewarded luck.** In our first COVID replay FOMO Max bought at the record high and still won the round, which taught the wrong lesson. We rescripted it and score by risk-adjusted return (return − ½ × worst drawdown), so all-in play rarely wins.
- **We dropped "guess the price direction".** It rewarded guessing, exactly what regulators criticise in gamified trading. "Spot the habit" replaced it: you name the risk, not the next price.
- **Fake company news.** Our first news generator wrote headlines like "SAP opens office in Lisbon". We made "never invent news about a real company" a rule, and the self-check enforces it.
- **The Starter couldn't afford the replays.** With 100 €, one Wirecard share plus the fee is out of reach and diversifying is impossible. Replays now give everyone a 1.000 € budget and score in %.
- **A visible name spoils the replay.** Nobody makes a real decision on Wirecard if they know it's Wirecard, so replays hide the company name and date until the reveal.

## Results and next steps

**What we achieved.** A complete learning path from the comdirect start page to a first trade, three bosses and five replays of real market events, all on screens that match comdirect.

**How we validated it.** `npm run check` asserts the money math, order fills and expiry, 120 savings-plan executions over ten years, the replay prices, that every boss loses to the careful strategy, and that no simulated news is about a real company. We played all four tutorials end to end.

**What we're most proud of.** The first-stock mission: you move money, buy with a limit order and find your profit, on a 1:1 comdirect replica, with nobody holding your hand.

**Current limitations.**
- One price per trading day with a fixed spread, and no dividends or tax.
- Rival bots only appear in the History replays, not in free play.
- Not tested with real first-time investors yet.

**Next.**
- Test with real first-time investors and measure who places a real first trade.
- Intraday prices with a wider night spread, plus dividends and tax on profits.
- Bring the rival bots into free play.

## Quick start

Live demo: **[comdirect.vokh.dev](https://comdirect.vokh.dev)**

```bash
npm install
npm run dev        # http://localhost:3000
```

```bash
npm run check      # self-check of the money math, scripted markets and bots
npm run build
```

Set `DATABASE_URL` (e.g. in `.env.local`) to save progress; without it the app runs but nothing is saved. "Reset progress" at the bottom of the hub starts over.

Real Market's intraday charts (5m to 4h) run `scripts/read-intraday.py` through [uv](https://docs.astral.sh/uv/) (`brew install uv`). Without it, `npm run dev` logs `[intraday] warm-up failed: spawn uv ENOENT` and those charts show "temporarily unavailable"; daily and weekly charts still work. The first run downloads about 20 MB of Python packages. Set `REAL_MARKET_UV` if uv is not on your `PATH`. The Docker image installs uv and the packages at build time.

### Saving progress

There are no user accounts. A player is a browser:

1. On the first visit the app calls `GET /api/save`. The server finds no `cd-edu-id` cookie, makes a random UUID and sets it (httpOnly, HTTPS only, 400 days).
2. Every later request sends the cookie, and the server uses it as the key of the player's row in the `saves` table (`id uuid`, `data jsonb`, `updated_at`). The table is created on first use.
3. The client loads the save once on startup and writes the whole save back about a second after each change, plus once when the tab closes ([`store.ts`](src/features/game/store.ts), [`route.ts`](src/app/api/save/route.ts)).

What that means:
- Same browser: progress is always there. Another browser, device or incognito window starts empty.
- Clearing cookies orphans the old save; nothing links two browsers to one person.
- If the server is unreachable, the app still runs but does not save, so it never overwrites real progress with an empty one.
- Progress from the old `localStorage` version is uploaded once on first load.
- The "Max Mustermann" in the header is a fixed mock user ([`user.ts`](src/shared/lib/user.ts)), not tied to the cookie. Real accounts would mean a login (e.g. comdirect SSO) and keying `saves` on that user id.

On the VPS, `DATABASE_URL` sits in `~/collabothon26/.env` (read by `docker-compose.yml`) and points at the shared Postgres container on the `db_default` network.

## Project structure

| Path | What |
|---|---|
| `src/app/` | Routes only: thin pages that render a feature screen |
| `src/features/market/` | Deterministic market and account (`engine.ts`), scripted lessons and historical replays, bots, news, companies. Runs under plain `node` for `npm run check` |
| `src/features/game/` | The save (XP, cards, stars, persona), personas and the tour UI bus |
| `src/features/tour/` | Chapters, missions, bosses, spotlight coach, plan comparison |
| `src/features/learn/` | Learning map, mini games, concept cards, history mode |
| `src/features/invsim/` | Investor simulator engine and events |
| `src/features/onboarding/` | Persona questions and the "ready" screen |
| `src/features/home/` | Mocked comdirect start page, entry banner, home switch |
| `src/features/cabinet/` | Web cabinet screens |
| `src/features/pro/` | Trading area, ProTrader widgets, chart, order window, replay |
| `src/features/shell/` | App header and sandbox bar |
| `src/shared/` | Shared `ui/`, `charts/` and `lib/` (format, rng) |
| `docs/finance-quest.pdf` | Finance Quest pitch presentation |

## Disclaimer

comdirect edu is a prototype built for Collabothon 2026. It is not an official comdirect or Commerzbank product. Everything runs on play money: no real accounts, orders or payments. Historical replays retell real events in short headlines of our own, and free play uses only simulated macro and sector news, labelled "Simulated". We never invent news about a real company.
