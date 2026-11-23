# token-radar-sol01

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/0xsolsepatu/token-radar-sol01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/0xsolsepatu/token-radar-sol01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar — a dashboard that ranks 198 pre-token protocols by expected value (the size-curve value times the peers' launch odds), priced on a size curve fitted to the sealed DefiLlama snapshot's own traded tokens, with a costed farm plan and a FARM / THIN / SKIP verdict for every row.

## Run it

```sh
node main.ts --input snapshot.json --output out
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=r4c0y56z&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>

## What changed in radar-9

- **Expected-value ranking.** The board now ranks by expected value: the curve value times the share of snapshot protocols in the row's age band that record a token (0–6 months 26%, 6–12 months 40%, 12–24 months 39%, 24+ months 68%; rows with no listing date use the no-date group's 79%). 189 of 198 rows moved rank; 6 of the top 10 changed; the curve value, the backtest and the farm verdicts are unchanged.
- **Self-verifying cover.** The integrity strip now recomputes every row's implied and expected value from the full-precision curve params at render time: recomputed 198/198. The proof can fail in the open.
- **Farm plan in $/hour + deposit threshold.** Every row shows its net cost per hour of work, and the largest deposit that still earns FARM.
- Dossier text 63,405 B (budget 64,000 B, site cap 65,536 B).

## The model (radar-9)

Implied value comes from a size curve fitted on the snapshot's own traded tokens — not a hand-made multiple. An ordinary least squares fit of log10(market cap) on log10(TVL) over the 128 traded protocols with both figures gives:

```
log10(market cap) = 3.0247 + 0.5223 x log10(TVL)    (R² 0.1939, residual sd 0.91 dex)
implied = 10^(curve) x category factor
expected = round( implied x launch odds )
```

The category factor is a shrunken prior (n/(n+3), clamped to ±0.5 dex) from the traded protocols in the same category, applied only where at least 3 comparables exist; 14 categories qualify, the rest use the global curve only (factor 1.00). Growth and chain count are shown per row but are NOT multiplied into the curve value: backtesting showed they made the curve worse (see below). Age is not a curve multiplier either (tested and rejected: time-split miss 9.11x) — it enters only as the expected-value weight above, the share of peers in the row's age band that record a token. That is an expected-value weighting, not a claim that odds improve the curve's prediction of market cap; the backtest below is unchanged.

Blind validation, computed at run time by the entry's own code:

| test | curve only | curve + category | flat multiple |
|---|---|---|---|
| leave-one-out, median miss | 3.40x | 3.63x | 5.07x |
| leave-one-out, within 3x | 42% | 44% | 35% |
| time split (fit 63 older, test 32 newer), median miss | 2.88x | 3.33x | 5.38x |
| time split, within 3x | 50% | 44% | 34% |

The curve beats a flat multiple on every line, but a median miss near 3x is a rough anchor, not a price — the dashboard says so on every row.

Every farm plan is costed for a $1,000 slice over 90 days: 1-2 transactions at stated per-chain gas prices (hold-only positions cost no weekly transactions) plus the opportunity cost of the capital at a 4.2% T-bill yield ($10.36), netted into a verdict — FARM if the net cost is ≤ $13 and the quality signal is strong, THIN if ≤ $16, otherwise SKIP. Verdicts across the board: FARM 70, THIN 91, SKIP 37. The 40 watchlist rows carry protocol-specific steps researched from public sources (10 with a live points program, 6 with a token already trading, 24 yield-only — each row cites its page); the 158 early rows use the template plan. Six rows are SKIP by access, not by cost: Lightning Network, Valos, Galaxy Curation, OpenTrade, b14g and Curvance.

The board covers all 40 watchlist protocols plus every other rankable pre-token protocol (158 early rows) under the house rule in RULES.txt line 206, and shows the 416 live-token protocols and the 144 set aside by that rule on their own tabs. Wrapped, staked and bridged products of tokens that already trade (WBTC, Binance staked ETH, USDT0 and the like) are never ranked: they are not protocols waiting on a launch. Nothing here predicts whether or when a token is issued, and "records no token" is never written as "has no token".

## Enrichment (build time only)

The graded run is deterministic and offline — it reads only the snapshot and the static files in this repo. At build time (2026-11-15) extra public sources were fetched and baked into `data/enrichment.json` (148,574 bytes, 758 entries — minified JSON, same content), and the 40 watchlist farm plans were researched from public sources (see REPORT.md):

- **DefiLlama Fees API** — fees for 444 of 758 protocols (112 of 198 board rows, 26 of 40 watchlist). A second fundamentals signal beside TVL; shown per row as fees 30d / 7d / all-time.
- **CoinGecko public API** — 42 protocols checked (40 watchlist + 2); a round-2 re-check verified **6 native tokens live: MEZO, TAO, PLUME, XDP, B2, USDD** (stablecoin product token only). INFI not verified — TGE targeted Q4 2026.
- **CryptoRank public pages + Firecrawl deep research (radar-6)** — fundraising pages for 5 of 40 watchlist (Gauntlet: $169.63M total raised, verified against DefiLlama; **Saturn: $2.80M, verified against the BTCC/PANews roundup**; Hyperithm: $11M Series B, verified) and funding totals for 19 of 40 (12 verified against a second source). Radar-6 counted 6 fundraising pages by conflating page types; radar-7 corrects it to 5 /ico/ pages (OpenTrade, Veda and infiniFi have funding data but no /ico/ page). Polymarket was **corrected in radar-6 to ~$2.245B verified** (Series B $45M + ~$200M 2025 + up to $2B ICE strategic) — the CryptoRank $3.87B figure was unreconcilable with public rounds. New totals in radar-6: Ember $5.3M, Firelight $8M, Keyrock $72M confirmed (+ Series C undisclosed), Lagoon $80M (single source), Lofty $5M. RootData was blocked by a bot wall; Token Terminal public vault-token pages cover 2 of 40 (Saturn satUSDC, Keyrock kUSDC); Artemis needs a login. Nothing was invented — missing data stays null, and no quest or points program is claimed without a public source.

A funding anchor is displayed where one exists but is never a model input: a radar-6 spot test found log total raised correlates r=0.66 with the curve residual on 9 traded tokens (p≈0.05) — suggestive, not significant, and untestable at full scale without funding data for all 128 traded tokens.

## Layout

- `main.ts` — entrypoint: reads the snapshot, loads `data/enrichment.json`, builds the board, writes `board.json` + `data.js`, copies `dashboard/` and `screenshots/`, writes `dossier.json`.
- `lib/model.ts` — the radar-9 model (curve fit, category adjustments, blind backtest, costed farm plans), the board checks, and the enrichment parser. Radar-4 added `FARM_PROGRAMS`: the 40 researched watchlist farm plans, each citing its public source. The model itself was stress-tested in radar-4 (fees, quadratic curves, shrinkage sweeps, k-NN, ensembles) and KEPT unchanged — no candidate beat the blind backtest; see REPORT.md. Radar-8 added the integrity strip and the launch-odds column; radar-9 ranks by expected value (curve × launch odds) and adds the in-browser recompute proof. Round 9 tested six more snapshot fields (7-day change, age, chains count and their pairs) as curve inputs; all lost the blind gates — age poisoned the time split at 8.66x — bringing the total tested to 37, none passed.
- `vendor/makefun-board.ts` — make.fun's dossier library, copied byte for byte from the kit.
- `data/enrichment.json` — build-time enrichment (see above), with per-slug values, source URLs and fetch date.
- `dashboard/` — the static page (index.html, app.css, app.js). No network, no framework. Four tabs: pre-token, live token, set aside, method (scatter chart + backtest tables + costing assumptions + sources).
- `screenshots/` — three screenshots of the dashboard: the board, a protocol's detail view, a filtered view.
