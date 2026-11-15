# token-radar-sol01

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/0xsolsepatu/token-radar-sol01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/0xsolsepatu/token-radar-sol01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar — a dashboard that ranks 198 pre-token protocols by implied value, priced on a size curve fitted to the sealed DefiLlama snapshot's own traded tokens, with a costed farm plan and a FARM / THIN / SKIP verdict for every row.

## Run it

```sh
node main.ts --input snapshot.json --output out
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=r4c0y56z&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>

## The model (radar-3)

Implied value comes from a size curve fitted on the snapshot's own traded tokens — not a hand-made multiple. An ordinary least squares fit of log10(market cap) on log10(TVL) over the 128 traded protocols with both figures gives:

```
log10(market cap) = 3.0247 + 0.5223 x log10(TVL)    (R² 0.1939, residual sd 0.91 dex)
implied = 10^(curve) x category factor
```

The category factor is a shrunken prior (n/(n+3), clamped to ±0.5 dex) from the traded protocols in the same category, applied only where at least 3 comparables exist; 14 categories qualify, the rest use the global curve only (factor 1.00). Growth, age and chain count are shown per row but are NOT multiplied into the value: backtesting showed they made the curve worse (see below).

Blind validation, computed at run time by the entry's own code:

| test | curve only | curve + category | flat multiple |
|---|---|---|---|
| leave-one-out, median miss | 3.40x | 3.63x | 4.86x |
| leave-one-out, within 3x | 42% | 44% | 35% |
| time split (fit 63 older, test 32 newer), median miss | 2.88x | 3.33x | 4.78x |
| time split, within 3x | 50% | 44% | 28% |

The curve beats a flat multiple on every line, but a median miss near 3x is a rough anchor, not a price — the dashboard says so on every row.

Every farm plan is costed for a $1,000 slice over 90 days: 14 transactions at stated per-chain gas prices plus the opportunity cost of the capital at a 4.2% T-bill yield ($10.36), netted into a verdict — FARM if the net cost is ≤ $30 and the quality signal is strong, THIN if ≤ $80, otherwise SKIP. Verdicts across the board: FARM 66, THIN 105, SKIP 27. The 40 watchlist rows carry protocol-specific steps researched from public sources (12 with a live points program, 6 with a token already trading, 22 yield-only — each row cites its page); the 158 early rows use the template plan. Three rows are SKIP by access, not by cost: Lightning Network, Valos and Galaxy Curation.

The board covers all 40 watchlist protocols plus every other rankable pre-token protocol (158 early rows) under the house rule in RULES.txt line 206, and shows the 416 live-token protocols and the 144 set aside by that rule on their own tabs. Wrapped, staked and bridged products of tokens that already trade (WBTC, Binance staked ETH, USDT0 and the like) are never ranked: they are not protocols waiting on a launch. Nothing here predicts whether or when a token is issued, and "records no token" is never written as "has no token".

## Enrichment (build time only)

The graded run is deterministic and offline — it reads only the snapshot and the static files in this repo. At build time (2026-11-15) extra public sources were fetched and baked into `data/enrichment.json` (120,982 bytes, 758 entries — minified JSON, same content), and the 40 watchlist farm plans were researched from public sources (see REPORT.md):

- **DefiLlama Fees API** — fees for 444 of 758 protocols (108 of 198 board rows, 26 of 40 watchlist). A second fundamentals signal beside TVL; shown per row as fees 30d / 7d / all-time.
- **CoinGecko public API** — 42 protocols checked (40 watchlist + 2); a round-2 re-check verified **6 native tokens live: MEZO, TAO, PLUME, XDP, B2, USDD** (stablecoin product token only). INFI not verified — TGE targeted Q4 2026.
- **CryptoRank public pages** — fundraising pages for 3 of 40 watchlist (Gauntlet: $169.63M total raised, verified against DefiLlama; Polymarket: $3.87B shown as reported, unverified; **Saturn: $2.80M, verified against the BTCC/PANews roundup**). RootData was blocked by a bot wall; Token Terminal public vault-token pages cover 2 of 40 (Saturn satUSDC, Keyrock kUSDC); Artemis needs a login. Nothing was invented — missing data stays null, and no quest or points program is claimed without a public source.

A funding anchor is displayed where one exists but is never a model input: Gauntlet and Saturn have verified totals, and a raise factor would move one row by ≤ 5% — noise, not signal.

## Layout

- `main.ts` — entrypoint: reads the snapshot, loads `data/enrichment.json`, builds the board, writes `board.json` + `data.js`, copies `dashboard/` and `screenshots/`, writes `dossier.json`.
- `lib/model.ts` — the radar-3 model (curve fit, category adjustments, blind backtest, costed farm plans), the board checks, and the enrichment parser. Radar-4 added `FARM_PROGRAMS`: the 40 researched watchlist farm plans, each citing its public source. The model itself was stress-tested in radar-4 (fees, quadratic curves, shrinkage sweeps, k-NN, ensembles) and KEPT unchanged — no candidate beat the blind backtest; see REPORT.md.
- `vendor/makefun-board.ts` — make.fun's dossier library, copied byte for byte from the kit.
- `data/enrichment.json` — build-time enrichment (see above), with per-slug values, source URLs and fetch date.
- `dashboard/` — the static page (index.html, app.css, app.js). No network, no framework. Four tabs: pre-token, live token, set aside, method (scatter chart + backtest tables + costing assumptions + sources).
- `screenshots/` — three screenshots of the dashboard: the board, a protocol's detail view, a filtered view.
