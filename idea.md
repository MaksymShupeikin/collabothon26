# comdirect edu: Practice first, then invest

> A training sandbox inside comdirect. It looks like the real comdirect screens, runs on play money and walks you through them one game step at a time, so that buying your first stock feels like something you have already done.

Collabothon 2026 · Theme: *Innovations for all generations*

---

## 1. The problem

Commerzbank's own *Anlagestudie 2026* found that Germans save a lot but invest too little.

The barrier is not a lack of information. It is **fear of the first step**:

- people don't understand the trading screen,
- they don't know what the terms mean,
- they don't trust themselves to react to news.

The way people learn has changed too. Short, hands-on content works; long text chapters feel slow and far from real decisions.

comdirect already has the pieces, but they live apart:

| Piece | What it does | What's missing |
|---|---|---|
| **Musterdepot** | Virtual money | Real time, no guidance, no feedback |
| **Akademie** | Teaches theory | Text chapters, no practice |
| **ProTrader** | Powerful real trading screen | Built for experts, overwhelming for a first-timer |

**Nothing connects learning → practice → real action.** That gap is what we close.

### 1.1 Why it's a new product, not a better Musterdepot

| | Musterdepot | Akademie | **comdirect edu** |
|---|---|---|---|
| Play money | ✅ | — | ✅ |
| Looks like the real comdirect screens | partly | — | ✅ 1:1 layout |
| Guidance on every element | — | — | ✅ spotlight tour |
| Learns by doing, not reading | — | — | ✅ missions |
| Shows consequences fast | — (real time only) | — | ✅ time machine |
| Learn from mistakes without making them | — | — | ✅ rival bots + Mistake Cam |
| Fits your life stage | — | — | ✅ personas |
| Motivation to come back | — | — | ✅ XP, ranks, cards, bosses |

## 2. The solution in one breath

One click on comdirect opens the **training sandbox**. It looks like the real comdirect screens and uses play money. An **interactive tour** explains each element in one or two sentences and has the player do the action themselves. After a few steps the coach steps back and gives a **mission**: *top up your account and buy your first stock, on your own.* After that the player unlocks the **trading area**: one simple trading screen with a **live news feed**, **rival bots** that make typical mistakes, and time that moves. Once World 2 is done, the player confirms the switch to **ProTrader**: the full comdirect-style workspace with a **time machine** that fast-forwards days, months or years so the consequences show up in seconds.

**Learn → do it guided → do it alone → live with the consequences → real comdirect.**

## 3. Fit with the theme: "Innovations for all generations"

Financial learning has to match the life stage: different goals, horizons, budgets and levels of experience.

The onboarding asks **three questions** and picks a **persona**. All personas walk the same path, but the **examples, amounts, missions and boss scenarios change**.

| Persona | Example | Goal | Horizon | Start money on Girokonto | Savings plan | Focus |
|---|---|---|---|---|---|---|
| **Starter** | Lena, 22, student | First steps with small amounts | 10+ years | 100 € | 25 €/month | Small savings plan, compound interest, not chasing hype |
| **Builder** | Kaya family, 34 | Save for the kids / a home | ~15 years | 500 € | 50 €/month | Diversification, ETFs, staying calm in a crash |
| **Pre-retiree** | Helga, 58 | Make savings work before retirement | ~7 years | 1.000 € | 100 €/month | Horizon and risk, drawdown, why "cheap" isn't "safe" |

**The start money grows with life stage: 100 € → 500 € → 1.000 €.**
- **Young players start with just 100 €** on purpose. The message is: *investing isn't only for grown-ups with big savings; you can start with what you have.*
- The older the persona, the bigger the investment reserve, as in real life.
- Small, realistic amounts are less intimidating than a fantasy 10.000 €, and they make a real lesson visible: a fixed order fee of 4,90 € is almost 5 % of a 100 € order, but only 0,5 % of a 1.000 € one. For the Starter this leads straight to the savings plan in World 4.

**There's no upper limit after that.** The player can add as much play money as they want at any time with an **"Add play money"** button on the Girokonto. It's clearly marked as a sandbox control, so it isn't confused with a real comdirect function.

**Scores stay fair across personas**: the risk-adjusted score is in % (see §11), and in every round the bots start with the same amount as the player.

The play money starts on the **Girokonto**; the trading account (Verrechnungskonto) starts **empty**. So the top-up isn't an extra step, it's the first thing anyone really has to do before a trade.

The same mission reads differently per persona. For example: *"Buy your first stock"* → Lena: one share of a stock under 100 €; Helga: a first ETF position of 300 €.

> 🆕 **Invented** (not in comdirect): personas and onboarding questions. Persona names and numbers are placeholders.

## 4. User journey

```
comdirect start page ──banner "Practice first, then invest"──▶ Onboarding (≈60 s, 3 questions)
        ▶ Learning map (menu)
            ▶ World 1: First steps ............ web-cabinet sandbox
                 guided chapters ─▶ Mission ─▶ ⏩ 1 week later ─▶ "Trading area unlocked"
            ▶ World 2 .......................... simple trading area (one screen)
                 guided chapters ─▶ Mission ─▶ "ProTrader unlocked" ─▶ player confirms the switch
            ▶ World 3–4 ........................ ProTrader sandbox (widget workspace)
                 guided chapters ─▶ Mission ─▶ Boss round vs. a bot ─▶ Debrief
            ▶ Free play (simple trading area until the switch, ProTrader after it)
        ▶ "Ready for real?" ─▶ real comdirect depot
```

### 4.1 Entry: one click
A banner on the (mocked) comdirect start page: **"Practice first, then invest"**. The Probedepot opens immediately, with no sign-up and no forms.

### 4.2 Onboarding: short
Maximum 4 screens, about 60 seconds:
1. Welcome: "This is a copy of comdirect with play money. Nothing you do here costs real money."
2. *What are you saving for?* (first steps / a big goal / retirement)
3. *When do you need the money?* (< 5 years / 5–15 / 15+)
4. *Have you bought a stock before?* (no / once or twice / regularly). Players who answer "regularly" get a 3-question check and can skip World 1.

→ Persona chosen → learning map.

### 4.3 Learning map: the menu
- Worlds as a path. Each world contains **chapters** (subtopics) and ends with a **mission** (and from World 2 on, a **boss**).
- A world unlocks when the previous world's mission is done.
- Always visible: rank ring + XP, concept-card collection (x / 12), "Continue" button on the next chapter.
- The current code already has a version of this (`/learn`), which needs to be restructured around the worlds below.

## 5. Three sandbox surfaces

We copy **two real comdirect interfaces** and put a **simple trading area** between them, so the player never jumps straight from the calm web cabinet into the dense ProTrader:

| | **Web-cabinet sandbox** (World 1) | **Trading area** (World 2) | **ProTrader** (World 3+) |
|---|---|---|---|
| Copies | comdirect web customer area | 🆕 our simple trading screen (the `main` branch design), in comdirect colours | comdirect ProTrader |
| Why | This is where real customers make their first trade. Calm, light, little on screen. | First contact with a living market: one screen, three columns (time + news/rivals · search + chart · account + order ticket + positions) | Dense, real-time, with charts and news: the full workspace |
| References | `references/01_startseite_…`, `ui-fotos-internet/1_web-kundenbereich/*`, `ui-fotos-internet/2_web-ordermaske/*`, `ui-fotos-internet/3_app-screens/04_wertpapier-details.jpg` | `main`: `src/components/Simulator.tsx` | `references/02`–`42` (workspaces, widgets, Ordermaske, Orderbuch, News, Chart) |
| Time | Paused, with a single ⏩ "1 week later" jump after the mission | ▶ Play / ⏸ Pause at 1 day/s or 1 week/s; big news and bot moves pause it | Full time machine (see §8) |
| News | News block on the stock detail page | News list next to the chart, plus a Rivals tab in replays | News widget, as in ProTrader |

Trading area and ProTrader are two layouts on **the same market, depot, orders and replays**: switching never resets the player's money or positions.

**Both switches are moments in the demo:**
- After the first trade (World 1 mission): *"You just did what most people never dare to do. Trading area unlocked."*
- After the World 2 mission: a full-screen **"Ready for the full trading desk?"** card explains what changes (widgets, order window, time machine, more detail) and that the depot comes along. The player has to **confirm** ("Switch to ProTrader →"); "Not yet" keeps the simple view in free play, or goes back to the map when a World 3 chapter was opened. World 2 chapters always run on the trading area, World 3+ always on ProTrader. The confirmation is saved (`proTrader` in the save).

**What we copy exactly:** layout, element positions, table columns, field order in the order form, number and date formats (`1.001,16 EUR`, `14.03.2024`, `15:45:06`).
**What we translate:** all text is in **English** for now. Because the layout stays German, a German version later only means swapping text.

### 5.1 Web-cabinet screens we rebuild
| Screen | Reference | Used in |
|---|---|---|
| Persönlicher Bereich: account table (Girokonto, Verrechnungskonto, Depot, Gesamt) with "Kauf/Verkauf" and "Überweisung" actions | `01_startseite_persoenlicher-bereich.jpg`, `1_web-kundenbereich/01_startseite_guten-tag.png` | 1.1 |
| Top-up: transfer Girokonto → Verrechnungskonto + photoTAN confirmation | 🆕 no direct screenshot; photoTAN from `4_app-store/photoTAN-app_*` | 1.2 |
| Search (WKN, ISIN, Name) + Aktien-Finder | header search in `01`, `1_web-kundenbereich/05_aktien-finder.png` | 1.3 |
| Security detail page (price, daily change, chart, key numbers, news) | `3_app-screens/04_wertpapier-details.jpg` (app; we adapt it to the web layout) | 1.4 |
| Order form: Kauf/Verkauf, Stück, Handelsplatz, Ausführung, Gültigkeit, Limit, order costs, "Buy (with costs)" | `2_web-ordermaske/*`, `19`–`28` | 1.5 |
| Depot overview: Depotwert, Kaufwert, Diff. seit Kauf, positions table with K/V buttons | `1_web-kundenbereich/02_depot-uebersicht.png` | 1.6 |
| Transactions (Umsätze) | `1_web-kundenbereich/04_umsaetze.png` | after top-up and trade |

### 5.2 Pro mode (ProTrader) widgets we rebuild
Header bar (Depotwert · Verfügbar · yellow **Order** and **Widgets** buttons · workspace switcher), plus the widgets **Depot**, **Watchlist**, **Chart**, **Orderbuch**, **News** and the floating **Order** window. These come from `02`, `10`, `17`, `27`, `42`. Market depth, Time & Sales and "Alle Handelsplätze" can be shown, but we don't teach them in the MVP.

## 6. How a chapter works: the guided tour

1. **The screen dims and one element lights up.**
2. **A coach bubble explains it**: at most 2 sentences and about 20 words. No jargon without a concept card behind it.
3. **The player does the action themselves**: *"Search for SAP."* · *"Enter 3 shares."* · *"Find the order costs."* The tour continues only once the action is done; we don't use a "Next" button for things the player can do.
4. **Every step earns XP**, and a **progress ring** shows how far through the chapter they are.
5. At the end of a chapter, one **concept card** drops into the collection (front: one sentence; back: example + 1 quiz question).

Tone of the bubbles: short, friendly, never patronising.
✅ "This is your cash for trading. It's separate from your current account."
❌ "The Verrechnungskonto is a settlement account which serves the purpose of…"

## 7. Missions: do it yourself

After a few chapters the coach steps back. A **mission card** appears with one concrete goal; there's no spotlight, the player does it alone.

- A **hint** appears after ~20 s of inactivity or on request (costs no XP, but the mission gives fewer stars).
- **1–3 stars** based on: done / done without hints / done with the "smart" choice (e.g. limit order instead of market order at night).
- The mission is checked against the sandbox state, not with a quiz.

| World | Mission (Starter persona; amounts scale per persona) |
|---|---|
| 1 | **"Your first stock."** Move your 100 € from the Girokonto to your trading account and buy 2 shares of Deutsche Telekom (~30 €) with a limit order. → ⏩ 1 week later: find your position and your profit/loss in the depot. |
| 2 | **"Read before you click."** Three headlines come in over one simulated week. Decide for each one: act or ignore. |
| 3 | **"Don't put all eggs in one basket."** Spread your money so that no single stock is above 30 % of the depot (an ETF counts as diversified). Watch the fees: with 100 €, four separate orders cost 4 × 4,90 € ≈ 20 % of your money. The smart answer is one ETF. |
| 4 | **"Set and forget."** Set up a 25 €/month savings plan on an ETF, then fast-forward 10 years. |

## 8. Time machine (fast-forward)

Time is the hidden teacher: consequences that take months in real life become visible in seconds.

**Controls** (ProTrader, next to the clock; the World 2 trading area only has ▶/⏸ with 1 day/s or 1 week/s):
`⏸ Pause` · `▶ 1×` · `⏩ 5×` · `⏭ Next event` · jump `+1 day` `+1 week` `+1 month` · `+1 year` / `+10 years` (unlocked in World 4)

**Rules**
- The clock shows the **simulated date and time** in German format. Exchange hours matter: outside them the spread widens (this sets up the *Night-owl* lesson later).
- **Major news auto-pauses** the game and highlights the headline, so the player always gets a decision moment.
- Pending limit and stop orders execute during fast-forward, and the player sees a notification ("Your limit order was executed at 228,50 €").
- **Mock data only**: deterministic, seeded price paths with **scripted events per lesson**, so the demo is reproducible. The existing `src/lib/market.ts` + `rng.ts` + `news.ts` already do this.
- **Real companies, real history, no invented drama.** Everything uses real, well-known companies, because that's what makes it feel real. The rule: **we never invent company-specific news about a real company.** We get the drama two ways:

  | Mode | Companies | Where the drama comes from |
  |---|---|---|
  | **World 1** (first trade) | SAP, Deutsche Telekom, adidas… | None: neutral mock prices |
  | **Historical replays** (boss rounds, news chapters) | The real company from the real event | **Things that really happened**, retold as short factual headlines we write ourselves |
  | **Free play** (simulated future) | Real companies | Only **macro and sector** news (ECB rate decision, oil price, chip export limits). It moves prices without making claims about one company. The news panel shows a permanent **"Simulated"** label. |

- **Historical replays: how they play.**
  1. The player sees the real company and ticker, but the **date is hidden** ("Day 1 · Tuesday").
  2. Headlines arrive one by one while the time machine plays the event forward. The player decides in the moment, and the bots make their mistakes next to them.
  3. **The reveal** at the end: *"This was Wirecard, June 2020."* Then what happened next, plus the concept card. This is a strong demo moment, because the audience knows these stories.
  - Prices are mock data shaped like the **real price curve**. Headlines are our own short factual sentences, never copied from press articles.
  - The existing `/history` page (headlines, hidden date) is the prototype. It moves into Pro mode with chart, bots and time machine. Its "guess the direction ↑/↓ with confidence" mechanic is **dropped**: in a replay the player makes depot decisions, and we score the quality of those decisions (diversified? limit order? stayed calm?), not whether the price went their way.

- **Replay catalogue (MVP)**: the figures are approximate and **must be fact-checked** before we write the scenarios.

  | Event | What really happened | Used in |
  |---|---|---|
  | **GameStop, Jan 2021** | Social-media hype sends the stock up many times over, then it collapses | World 2 boss: **FOMO Max** |
  | **VW Dieselgate, Sep 2015** | Emissions scandal; the share loses roughly a third within days | World 2: signal vs. noise |
  | **Wirecard, Jun 2020** | DAX member; ~1,9 bn € turn out to be missing; insolvency, share close to zero | World 3 boss: **All-in Alex** |
  | **NVIDIA, 2023** | AI boom; the share multiplies | World 3: "luck or skill?" (Alex wins) |
  | **COVID crash, Feb–Mar 2020** | The DAX falls by roughly a third in weeks, then recovers by the end of the year | World 4 boss: **Panic Paula** |

**Where it's used in learning**
| Moment | Jump | What the player sees |
|---|---|---|
| End of World 1 | ⏩ 1 week | First trade shows up as profit or loss in the depot |
| World 2 | ▶ play (auto-pauses on the next big headline) | News → price reaction → was it signal, noise or priced in? |
| World 3 boss | ⏩ 1 month | The Wirecard collapse; concentrated vs. diversified depot side by side |
| World 4 | ⏩ 10 years | Savings plan vs. one-time buy vs. cash under the mattress, compound interest as a growing curve |

> 🆕 **Invented**: the time machine has no counterpart in comdirect; it's ours. It lives as a slim control bar so it doesn't break the comdirect look.

## 9. News panel

Copied from the ProTrader **News** widget (`42`, `10`): list with `Date, time | Headline`, search by WKN/ISIN/name, and the selected item opens below with source + time + body text. In the web cabinet, news appears as a block on the security detail page.

Educational layer on top:
- **Two kinds of news:** in historical replays, real events retold as short factual headlines we write ourselves; in free play, simulated macro and sector news only, with a permanent **"Simulated"** label (see §8).
- Each news item has a hidden **type**: *signal · noise · priced in · rumor · sector · macro* (already modelled in `src/features/market/news.ts`).
- **The type is revealed only after the price reaction.** Showing it before would give away the answer.
- After the reveal: one line on *why*, plus a link to the concept card.

## 10. Charts

**Layout = comdirect. Look = ours.**

- **Pro mode chart widget** (`10`, `14`, `42`): widget header with period (`3 days back`) and interval (`5 minutes`) dropdowns, a toolbar row with *Chart type · Indicator · Drawing*, instrument chip, price axis on the right with a **Last price** tag, a separate **volume** pane at the bottom, date/time axis `Dec 01 · 12:00`. Candles by default; Bollinger band optional.
- **Web-cabinet / detail-page chart** (`3_app-screens/04`): clean line chart with period tabs (1D · 1W · 1M · 6M · 1Y · 5Y).
- **Our additions on the chart:** player trades as markers in the accent colour; **bot trades as the bot's avatar** with a speech bubble; major news as small flags on the time axis.
- **Colours from our tokens** (see §13), not ProTrader's dark theme.
- Library: `lightweight-charts` (already installed).

## 11. Rival bots: learn from other people's mistakes

AI traders play **the same market, on the same news, at the same time** as the player. Each bot has one clear habit. The player watches them make mistakes, and sometimes get lucky, and learns without paying for those mistakes.

> **Build status: mock first.** The bots come **after the core** (see §18, phase 2). Until then they're a **scripted mock**:
> - Each replay scenario has a hand-written list of bot actions: day, bot, buy/sell, speech bubble, outcome.
> - The bots' depot curves and final scores are **precomputed** per scenario, not simulated.
> - The UI is real: avatars on the chart, speech bubbles, "Spot the habit" questions, Mistake Cam card, leaderboard.
>
> So the demo shows the full experience, while a real bot engine that reacts to any market comes later.

**MVP: 4 bots**

| Bot | Habit | ✗ When it goes wrong | ✓ When it gets lucky | 📚 Concept |
|---|---|---|---|---|
| **FOMO Max** | Buys every rumor and hype | Rumor is denied, price crashes | A takeover really happens | Rumor vs. signal, buy the rumor / sell the news |
| **Panic Paula** | Sells on every drop | Sells at the bottom, misses the recovery | Sells early in a real collapse | Drawdown, horizon, emotions |
| **All-in Alex** | Puts everything in one stock | One scandal wipes him out | His one stock triples | Diversification, concentration risk |
| **Steady Sam** | Monthly ETF savings plan, never sells | Looks boring in a hype phase | Steady over long periods | Savings plan, compound interest, cost averaging |

**How it works**
- **Trades show live on the chart** as the bot's avatar plus a speech bubble with its reason: *"Everyone on Reddit is buying! All in!"*
- **Spot the habit** (🆕): when a bot trades, the player is **not** asked to guess whether the trade will work. That would be a bet on price moves, the kind of "gamified" prediction regulators (ESMA, BaFin) criticise in retail investing. Instead the player names **the habit or risk** behind the trade:

  > FOMO Max: *"Everyone on Reddit is buying! All in!"*
  > **What's the risk here?**
  > ○ Buying on hype, not on facts ✓
  > ○ The fees are too high
  > ○ Nothing, it's a popular stock

  XP is given for the right concept, **no matter how the trade ends**. We judge the decision, not the outcome.
- **Mistake Cam**: after the outcome, a short replay shows what the bot did, what really happened and the concept behind it, and ends with a concept card. In historical replays the Mistake Cam is also where the real event is revealed.
- **Luck or skill?** When a bot wins with a bad habit, the replay says so: *"It worked in spite of the strategy, not because of it."* The player who spotted the habit was still right. The most important lesson here is that a bad habit can win in the short run.
- **Risk-adjusted score**: at the end of a round the player sees their result next to the bots'. Score = **return − ½ × worst drawdown** (already in the code), so all-in gambling rarely tops the table.

**Bots as world bosses**: each world ends with a boss round against the bot whose mistake fits the world. To win, the player has to avoid that bot's mistake *and* beat it on the risk-adjusted score.

Every boss round is a **historical replay** (see §8): real company, hidden date, reveal at the end.

| World | Boss | Replay |
|---|---|---|
| 2: Reading the news | FOMO Max | **GameStop 2021**: hype → buy everything → collapse |
| 3: Risk | All-in Alex | **Wirecard 2020**: all-in on one DAX star → insolvency |
| 4: Time | Panic Paula | **COVID crash 2020**: sells at the bottom → misses the recovery (fast-forwarded) |

Steady Sam is never a boss. He's the **benchmark** that's always in the table, and the quiet hero of World 4.

> ⚠️ **Change vs. the original concept:** the original mapped bosses as World 2 → Day-trader Dan, 3 → All-in Alex, 4 → Panic Paula, 5 → Headline Hanna. With 4 bots and 4 worlds, I re-mapped them as above. Dan, Hanna, Nick and Vera move to the roadmap.

## 12. Worlds, chapters and concept cards (MVP: 12 cards)

### World 1: First steps · *web cabinet*
| # | Chapter | What the player does | Card |
|---|---|---|---|
| 1.1 | **Your cabinet** | Finds Girokonto, trading account (Verrechnungskonto) and depot, and what each is for | — |
| 1.2 | **Top up** | Transfers money Girokonto → Verrechnungskonto, confirms with (simulated) photoTAN, sees it in transactions | — |
| 1.3 | **Find a stock** | Searches by name / WKN / ISIN, tries the Aktien-Finder | **Stock** |
| 1.4 | **Read a stock page** | Price, daily change, chart periods, key numbers, news block | — |
| 1.5 | **Place an order** | Buy/sell, quantity, exchange, market vs. limit, validity, shows costs | **Market vs. limit order**, **Fees & spread** |
| ★ | **Mission: your first stock** | Top up + buy alone → ⏩ 1 week → finds P/L in the depot | **Profit & loss** |
| 🔓 | **Trading area unlocked** | | |

### World 2: Reading the news · *trading area*
| # | Chapter | Card |
|---|---|---|
| 2.1 | **Your trading area**: guided tour of the simple trading screen (account, search, chart, order ticket, positions, news, play) | — |
| 2.2 | **Not every headline matters** | **Signal vs. noise** |
| 2.3 | **The market was faster** | **Priced in** |
| 2.4 | **Rumors** | **Buy the rumor, sell the news** |
| ★ | Mission: "Read before you click" · 👾 **Boss: FOMO Max** | |
| 🔓 | **ProTrader unlocked**: the player confirms the switch | | |

### World 3: Risk · *ProTrader*
| # | Chapter | Card |
|---|---|---|
| 3.1 | **Ups and downs** | **Volatility & drawdown** |
| 3.2 | **One basket** | **Diversification** |
| 3.3 | **Hundreds of companies in one click** | **ETF** |
| ★ | Mission: "Don't put all eggs in one basket" · 👾 **Boss: All-in Alex** | |

### World 4: Time · *ProTrader + ⏩ years*
| # | Chapter | Card |
|---|---|---|
| 4.1 | **Money that grows on its own** | **Compound interest** |
| 4.2 | **Same amount, every month** | **Savings plan & cost averaging** |
| ★ | Mission: "Set and forget" · 👾 **Boss: Panic Paula** | |

After World 4: **Free play** (open ProTrader market with all 4 bots) and a **"Ready for real?"** screen that links to the real comdirect depot / savings-plan page.

> The current `src/features/learn/concepts.ts` has 30 cards in 5 worlds. For the MVP we cut it down to the 12 above. The other cards stay in the file for the roadmap.

## 13. Gamification

**Principle: we reward understanding and good decisions, not the number of trades.** This is gamification a regulator would still sign off on.

| Element | MVP | How |
|---|---|---|
| **XP** | ✅ | Tour steps, missions, right "Spot the habit" answers, good decisions (limit at night, diversified depot). Never for predicting prices or for profit. |
| **Ranks** | ✅ | Saver → Beginner → Investor → Strategist → Market Reader (already in `progress.ts`) |
| **Progress ring** | ✅ | Per chapter and in the header |
| **Concept cards** | ✅ | 12 cards; collection view on the learning map |
| **Mission stars** | ✅ | 1–3 per mission |
| **Boss rounds** | ✅ | One per world from World 2 on |
| **Leaderboard** | ✅ (bots mocked) | **You vs. the 4 bots**, ranked by risk-adjusted score + **understanding score** (concept answers, mission stars). Never by trading volume, never by prediction accuracy. Bot scores are precomputed per scenario until the bot engine exists. |
| Badges | ⏳ roadmap | "Survived a crash", "Spotted the rumor", "Never paid night spread", "Diversified" |
| Daily news challenge | ⏳ roadmap | One headline a day: **what kind of news is this?** (signal / noise / priced in / rumor). Classifying, not predicting. Builds a streak. |

## 14. Design

The source of truth is **`DESIGN.md`** (Commerzbank tokens), applied through `src/app/globals.css`, with two documented exceptions below.

- **Colours:** petrol text and dark surfaces, a yellow accent for primary actions and the player's own markers, and grey-blue for borders and backgrounds.
  - **Exception 1: comdirect petrol and yellow.** We use the colours sampled from comdirect.de (`#0b1f26` petrol, `#fff500` yellow) instead of the Commerzbank values in `DESIGN.md` (`#002E3C`, `#FFD700`). The sandbox has to look like comdirect, not commerzbank.de. All other palette tokens stay as in `DESIGN.md`.
  - **Exception 2: gain/loss.** Two semantic tokens outside the palette, `--color-gain` (green) and `--color-loss` (red), used **only** for price changes, profit/loss and buy/sell. A trading screen can't work without them.
- **Type:** Gotham with fallbacks; scale 13 / 15 / 17 / 22 / 42 / 54 px; weights 400 / 500 / 700.
- **Spacing:** the scale from `DESIGN.md` (2 · 4 · 6 · 12 · 16 · 24 · 28 · 32 · 55 · 84 …); no arbitrary values.
- **Radius:** only `0 0 8px 8px` / `16px` / `32px`.
- **States:** every interactive element has hover, focus-visible, active and disabled states.
- **Comdirect look vs. our look:** structure and positions follow comdirect 1:1. Colours, radius and type follow `DESIGN.md`. Exception: the "real" comdirect parts (logo block, yellow order buttons) stay recognisable.
- Sentence case everywhere; ALL CAPS only for acronyms.

## 15. What we copy vs. what we invent

| Feature | Source |
|---|---|
| Start page, account table, depot overview, transactions | ✅ comdirect web (references) |
| Search, Aktien-Finder, security detail page | ✅ comdirect web / app (references) |
| Order form with all fields and order confirmation | ✅ comdirect web + ProTrader (references) |
| ProTrader workspace, widgets, news widget, chart widget, Orderbuch | ✅ ProTrader (references) |
| Top-up transfer form (Girokonto → Verrechnungskonto) | 🆕 Invented layout, modelled on the comdirect form style; real flow |
| photoTAN confirmation | 🟡 Modelled on the photoTAN app screenshots, simulated (no real TAN) |
| Entry banner "Practice first, then invest" | 🆕 Invented |
| Onboarding + personas | 🆕 Invented |
| Coach marks, missions, XP, ranks, cards, stars | 🆕 Invented (education layer on top) |
| Time machine | 🆕 Invented |
| Historical replays (real events, hidden date, reveal) | 🆕 Invented format; the events themselves are real history |
| "Add play money" button on the Girokonto | 🆕 Invented (sandbox control, marked as such) |
| Rival bots, Spot the habit, Mistake Cam, boss rounds, leaderboard | 🆕 Invented |
| Simple trading area between web cabinet and ProTrader | 🆕 Invented (our own `main` design) |
| "Trading area unlocked" and "Switch to ProTrader" transitions | 🆕 Invented |

The rule for building: **anything marked 🆕 that isn't described in this file gets proposed to the team before it's built.**

## 16. Demo script (≈5 min)

1. **Hook (30 s):** "Germans save a lot and invest too little. Not because they don't know, but because they're afraid of this screen." Show the real ProTrader screenshot.
2. **Entry (20 s):** comdirect start page → banner → one click → no sign-up.
3. **Two generations (40 s):** onboarding as Lena (22) and as Helga (58). Same path, different examples and amounts.
4. **Guided first trade (60 s):** spotlight tour in the web cabinet → top-up with photoTAN → order form → **the player buys their first stock** → ⏩ 1 week → it's in the depot, with profit.
5. **Trading area → ProTrader (90 s):** one quick look at the simple trading area (World 2, a headline pauses the market) → World 2 done → **"Ready for the full trading desk?"** → the player confirms → ProTrader look, same depot → historical replay with a hidden date: a celebrated DAX payments company, the first doubts in the press → All-in Alex puts everything in, *"They're a DAX star, what could go wrong?"* → **Spot the habit**: the player picks "Everything in one stock" and keeps a diversified depot → ⏭ next event → the share collapses → **Reveal: "This was Wirecard, June 2020."** → **Mistake Cam** → concept card *Diversification*.
6. **Result (30 s):** leaderboard. The diversified player is far above All-in Alex. "We reward understanding, not trading."
7. **Why this is new (20 s):** one comparison slide, comdirect edu vs. Musterdepot vs. Akademie (see §1.1).
8. **Close (30 s):** "Learn → practice → act. Inside comdirect, for every generation."

## 17. Decisions log

| # | Question | Decision |
|---|---|---|
| 1 | Colours: Commerzbank (`DESIGN.md`) or comdirect-sampled? | **comdirect-sampled** (`#0b1f26` / `#fff500`), documented exception in §14 |
| 2 | Green/red outside the palette? | **Yes**, as semantic `gain` / `loss` tokens, documented exception in §14 |
| 3 | Real or fictional companies? | **Always real.** We never invent company-specific news about a real company. The drama comes from **historical replays** of real events (Wirecard, GameStop, Dieselgate, COVID crash…). Free play has only macro/sector news, labelled "Simulated" (§8). Fictional and parody names ("Gvidia") were rejected: they feel unreal, and parody names still point at the real brand. |
| 4 | Musterdepot: extension or new product? | **New product.** The pitch shows a comparison and makes clear how much more it does (§1.1) |
| 5 | Play money per persona | **Start money grows with life stage**: Starter 100 € ("investing isn't only for grown-ups"), Builder 500 €, Pre-retiree 1.000 €. After that the player can add any amount via "Add play money". The trading account starts empty; scores are in %, and bots start with the player's amount (§3) |
| 6 | Bots in the first build? | **Scripted mock** in the core build; real bot engine in phase 2 (§11, §18) |
| 7 | Reward predictions ("Will this trade work?")? | **No.** Rewarding price predictions is betting-like gamification that regulators criticise. Replaced by **Spot the habit** (§11): XP for naming the risk, independent of the outcome. No prediction accuracy in the leaderboard; the daily challenge classifies news instead of predicting it. |
| 8 | Jump from web cabinet straight into ProTrader? | **No.** World 2 runs on a simple one-screen trading area (the `main` design); ProTrader opens from World 3, after the World 2 mission, and only once the player **confirms** the switch. Same depot in both. |

## 18. Build order and roadmap

**Phase 1: core** (build first)
- Mocked comdirect start page with entry banner, onboarding and personas, learning map
- Web-cabinet sandbox: account overview, top-up + photoTAN, search, stock page, order form, depot, transactions
- Guided tour (spotlight + coach), missions with stars, XP, ranks, 12 concept cards
- Trading area (World 2, simple one-screen layout) and ProTrader (World 3+): widget layout, chart, news panel, time machine; confirmed switch between them
- Historical replays with **scripted mock bots** (avatars, bubbles, Spot the habit, Mistake Cam, precomputed leaderboard)

**Phase 2: real bots**
- Bot engine: each habit as a strategy that reacts to any market and news, not just scripts
- Bots in free play; live risk-adjusted leaderboard

**After the hackathon**

- Remaining bots: **Day-trader Dan** (fees, overtrading), **Night-owl Nick** (trading hours, limit vs. market), **Headline Hanna** (signal vs. noise, priced in), **Value Vera** (P/E, value traps). Each one gets its own world/boss.
- Full set of 30+ concept cards, including rare cards for hard concepts.
- Badges and the daily news challenge with streaks.
- German UI (text swap only).
- Hand-off into real products: "Open a real savings plan with the same settings".
- Progress saved in the comdirect profile instead of `localStorage`.

## 19. Relation to the current code

| Exists | Keep / change |
|---|---|
| `Simulator.tsx` (`main`): one broker-style trading screen with tour, bots, news, speed control, debrief | Its layout is kept 1:1 as the **World 2 trading area** (`src/features/pro/Simple.tsx`), now running on the shared sim engine and save; ProTrader (`Pro.tsx`) takes over from World 3 after the confirmed switch |
| `CoachMark.tsx`: spotlight + bubble | Keep; reuse in both surfaces |
| `market.ts`, `news.ts`, `rng.ts`: seeded market, news types, bots, risk score | Keep; add scripted per-lesson scenarios and jump-in-time; the existing bot logic stays as a starting point for phase 2, but phase 1 uses scripted bot actions; `START_CASH` goes from 10.000 € to the persona start amount (≤ 1.000 €); `topUp` allows any amount afterwards |
| `companies.ts`: only real companies | Keep; add the companies from the replay catalogue (Wirecard, GameStop, VW…) |
| `news.ts`: generates company-specific news (rumors, misses) for real companies | Change: company-specific events only come from scripted historical replays; free-play generation is limited to macro/sector news |
| `concepts.ts`: 30 cards, 5 worlds | Cut to 12 cards / 4 worlds for the MVP |
| `progress.ts`: XP, ranks, localStorage | Keep; add persona, stars, unlocked surfaces |
| `/learn`, `/tour`, `/history` | `/learn` → learning map; `/tour` → folded into chapters; `/history` → prototype for **historical replays** in Pro mode |
| — | **New:** web-cabinet sandbox screens, onboarding, top-up + photoTAN, missions, time machine controls |
