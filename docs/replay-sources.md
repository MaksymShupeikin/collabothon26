# Historical replays: fact-check notes

The replays in `src/lib/sim/scenarios.ts` use **real companies and real events**, retold as short headlines we wrote ourselves.
Prices are **mock data shaped like the real curve** (keypoints below, noise in between). Figures are approximate and
rounded; check them again before a public demo. EUR values for US stocks use a rough fixed rate.

| Replay | Keypoints we use | What the sources say |
|---|---|---|
| **Wirecard, June 2020** (World 3 boss) | ~104,50 € on the day before the auditor news → ~40 € → ~25 € → ~14 € → ~3 € on the insolvency day → ~1,30 € | Share at 104,50 € on 17 June; EY could not confirm 1,9 bn €; on 22 June the company said the money most likely did not exist; insolvency filing 25 June, share −75–80 % that day; week ended around 1,30 €. Sources disagree slightly on dates (one says 27 June for the filing). |
| **GameStop, Jan–Feb 2021** (World 2 boss) | closes ≈ 20 $ (12 Jan) → 31 $ → 65 $ (22 Jan) → 77 $ → 148 $ (26 Jan) → 347,51 $ (27 Jan) → 193 $ → 325 $ → 225 $ (1 Feb) → 90 $ (2 Feb) → ~50 $ | Record close 347,51 $ on 27 Jan; 147,98 $ on 26 Jan; 76,97 $ on 25 Jan; trading apps restricted buying on 28 Jan; ~225 $ on 1 Feb. The 2 Feb close (~90 $) is from memory and **not confirmed** by the search. |
| **VW "Dieselgate", Sep 2015** (chapter 2.2) | 162,20 € (Fri 18 Sep) → −18,6 % → −19,8 % → +5,2 % to 111,50 € on the CEO resignation day | Same daily moves and the 111,50 € close after Winterkorn resigned on 23 Sep; intraday low 95,51 €. |
| **NVIDIA, 2023** (chapter 3.1) | ~133 € in January → +24 % on the day after the 25 May guidance → ~450 € by December | Guidance ~11 bn $ vs ~7,15 bn $ expected; share +24 % on 25 May (sources say 24–27 %); +36 % in May; "more than tripled" over 2023 is our rounding. |
| **COVID crash, Feb–Dec 2020** (World 4 boss) | DAX ≈ 13.800 (19 Feb) → ≈ 8.400–8.700 (16–18 Mar) → record again late December; prices = DAX / 110 for a DAX-ETF share | Previous high 13.795 in February; intraday low 8.255 on 16 Mar (close-based low ~8.442 on 18 Mar); new record around 28 Dec (~13.790–13.819). Lufthansa, Allianz, Telekom and MSCI World paths are rough shapes, **not checked point by point**. |

## Sources (searched 21.11.2026)

- Wirecard: [Fortune](https://fortune.com/2020/06/25/wirecard-insolvency-accounting-scandal/), [Al Jazeera](https://www.aljazeera.com/economy/2020/6/25/in-swift-spectacular-implosion-wirecard-officially-goes-bust), [IG](https://ig.com/uk/news-and-trade-ideas/how-wirecard-erased-nearly-all-of-its-market-cap-in-one-week-200626), [FinTech Futures](https://www.fintechfutures.com/paytech/wirecard-shares-plummet-as-it-announces-1-9bn-of-missing-cash)
- GameStop: [CityNews / Reuters](https://www.citynews1130.com/2021/01/27/reddit-pushes-gamestop-to-10-billion-company-stock-market-soar/), [Good Morning America timeline](https://www.goodmorningamerica.com/video/75617315), [Coinspeaker](https://www.coinspeaker.com/reddit-rally-gamestop-gme-stock-drops-42-down-more-than-80-this-week)
- VW: [Fortune](https://fortune.com/2015/09/23/volkswagen-stock-drop/), [City Index](https://www.cityindex.co.uk/market-analysis/volkswagen-chief-executive-resigns/), [UPI](https://www.upi.com/Business_News/2015/09/23/Volkswagen-CEO-resigns-over-emissions-scandal/8451443022091/)
- NVIDIA: [Bloomberg](https://www.bloomberg.com/news/articles/2023-05-26/nvidia-nvda-share-price-jump-in-five-charts), [Fortune](https://fortune.com/2023/05/25/nvidia-guidance-4-billion-jaw-dropping-ai-artificial-intelligence-gold-rush/), [Motley Fool](https://www.fool.com/investing/2023/06/03/why-nvidia-corporation-surged-363-in-may)
- DAX 2020: [Bloomberg](https://www.bloomberg.com/news/articles/2020-12-28/germany-s-dax-hits-record-high-after-brexit-deal-u-s-stimulus), [Der Aktionär](https://www.deraktionaer.de/artikel/indizes/dax-auf-allzeithoch-dann-schnellster-crash-aller-zeiten-20224325.html), [convextrade](https://convextrade.com/metrics/dax40/history/2020)
