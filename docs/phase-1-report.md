# Phase 1: overnight build report (21.11.2026)

Branch `v2/phase-1-core`, four commits, nothing pushed. `npm run check`, `npm run lint` and `npm run build` pass.

## What's built (idea.md §18, phase 1)

- **Entry**: mocked comdirect start page with the "Practice first, then invest" banner → 4-screen onboarding → persona (Starter 100 € / Builder 500 € / Pre-retiree 1.000 €), with "Not you?" switch and the expert check that skips World 1.
- **Learning map**: 4 worlds as a path, chapters / mission / boss per world, rank ring + XP, 12-card collection, mission stars, "Continue", free play and "Ready for real?".
- **Web cabinet** (World 1): overview, transfer + simulated photoTAN, header search (WKN/ISIN/name), Aktien-Finder, stock page (line chart 1D–5Y, key numbers, simulated news), order form (buy/sell, qty, exchange, market/limit/stop, validity, costs, review), depot, transactions.
- **Guided tour**: spotlight + coach bubble, action steps continue by themselves, XP per step, progress ring, concept card drop with flip + quiz.
- **Missions**: no spotlight, hint on request or after 20 s idle, 1–3 stars, checked against the sandbox state. World 1 ends with ⏩ 1 week → P/L → "Pro mode unlocked".
- **Pro mode**: ProTrader header, two workspaces, widgets (watchlist, depot, chart with candles/volume/Bollinger, orderbook, news, rivals), floating order window with savings-plan tab, time machine (⏸ ▶1× ⏩5× ⏭, +1 day/week/month, +1/+10 years from World 4), auto-pause on major news, fill notifications, news type revealed after the price reaction.
- **Historical replays with scripted mock bots**: Wirecard, GameStop, VW, NVIDIA, COVID. Hidden date, bot avatars on the chart + speech bubble, Spot the habit, Mistake Cam, reveal, risk-adjusted leaderboard + understanding score, boss intro / verdict / stars.
- All 4 worlds are playable end to end, including the World 2 "act or ignore" mission, the World 3 diversification mission and the World 4 savings-plan mission (with a plan vs. one-time buy vs. cash chart).

## Plan points I argued with (decisions made without you)

1. **Replays hide the company name too, not only the date.** idea.md §8 says the player sees the real company and ticker; the demo script (§16) hides it ("a celebrated DAX payments company"). I followed the demo: a description ("DAX payments company", WKN shown as ●●●●●●) until the reveal. If the name is visible, nobody makes a real decision on Wirecard.
2. **Replays use a 1.000 € round budget for every persona** (you and the bots). With the Starter's 100 €, one Wirecard share (~100 €) plus a 4,90 € fee isn't affordable and diversifying is impossible. Scores are in %, so it stays fair (decision 5 is kept for the sandbox itself).
3. **Chapter 1.5 teaches the form but doesn't force a buy; the mission is the first real buy.** The mission resets the sandbox (money back on the Girokonto, empty depot) so it can be checked cleanly. Chapter 1.2 always transfers a fixed 20 €.
4. **Builder's World 1 mission is 5 Deutsche Telekom shares (200 € moved)**, not an ETF; Helga's is 3 MSCI World shares (~300 €) as in the idea. Placeholders like the rest of the persona numbers.
5. **Fees stay 4,90 € + 0,25 %** (from the existing code), not a flat 4,90 €. The "almost 5 % of 100 €" lesson still holds. Savings plans: 1,5 % per execution, fractional shares.
6. **Time resolution is one trading day.** The clock shows the day's close (17:35:00); there's no intraday clock and no wider spread at night yet (that's the Night-owl lesson on the roadmap).
7. **Free-play noise never names a company** (weather, football, "the DAX chart looks weak"). The old generator wrote things like "SAP opens office in Lisbon", which breaks the "never invent company news" rule.
8. **World 2 mission rule for "act or ignore"**: act = new information (signal, sector, macro surprise); ignore = noise, priced in, rumor.
9. **COVID replay: FOMO Max buys at the record high (day 12)**, not on the vaccine news. Scripted as in my first draft he won the round by luck and topped the boss leaderboard, which taught the wrong thing.
10. **Boss rules**: win = avoid the boss's mistake *and* beat its risk-adjusted score; stars = finished / won / won + all habits spotted. Wirecard's "≤ 30 % in one stock" is measured against your total money (cash + depot); the World 3 mission measures it against the depot, as written.
11. **New sandbox controls (🆕, not in idea.md)**: "+ Play money" in the Pro header (a Starter couldn't afford an ETF for the World 3 mission otherwise) and "Demo tools → Unlock all worlds / Reset" on the learning map (to jump to the Wirecard boss in a live demo). Both are visibly marked as sandbox controls.
12. **Concept card mapping**: VW replay → 2.2 *Signal vs. noise*; NVIDIA replay ("luck or skill?") → 3.1 *Volatility & drawdown*; COVID boss → *Volatility & drawdown*. The 30-card list stays in `concepts.ts` for the roadmap.
13. **Ranks re-spaced** (Saver 0, Beginner 150, Investor 400, Strategist 800, Market Reader 1.300) because the game now hands out more XP.
14. **ProTrader in light colours** as §10/§14 say, but widget headers stay dark petrol with yellow titles so it's still recognisably ProTrader.
15. Old routes removed: `/simulator`, `/tour`, `/history`, `/learn/[id]`; the "guess the direction" mechanic is gone (decision 7).

## Known gaps

- Reloading the page during a chapter restarts that chapter; reloading right after finishing one shows it again until you leave via a button.
- Replay figures are approximate; see `docs/replay-sources.md` (the GameStop 2 Feb close and the Lufthansa/Allianz/Telekom/MSCI shapes in the COVID replay are not checked point by point).
- Pro mode on a phone stacks the widgets; usable, but dense. Gotham isn't loaded (Helvetica/Arial fallback).
- Not built (optional per idea.md): market depth, Time & Sales, "all exchanges" widget, drawing tools.
- Phase 2 (real bot engine, bots in free play) untouched.
