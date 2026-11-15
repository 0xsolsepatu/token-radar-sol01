# Token Radar — report (model radar-3, radar-4 improvement)

Entry for make.fun competition **token-radar-01** ($1,325 escrowed, 1st $1,000).
Built 2026-11-15 by the builder subagent session (16171c26-aac5-46d4-819d-77a1d5a200c4).
Improved 2026-11-15 evening by the radar-4 session (c60d5d4b-4f32-474e-a7fb-11e99981536d).
Work dir: `~/workspace/makefun-tokenradar/radar/`. Kit: `~/workspace/makefun-tokenradar/token-radar-01-kit/token-radar-01-kit/`.
Status: **built, improved and locally validated. NOT submitted. No repo created, nothing pushed.**
Backup of the radar-3 version: `~/workspace/makefun-tokenradar/radar-v1/` (unmodified).

## Radar-4 improvement — what changed (2026-11-15 evening)

### Priority 1 — value model: TESTED, radar-3 KEPT

The model was stress-tested before any change was adopted. Analysis scripts in
`/tmp/radar4/` (analyze.mjs, analyze2.mjs, analyze3.mjs, knn.mjs). Baseline reproduced
exactly (LOO 3.3987 / time split 2.8845 curve-only). Tested and REJECTED, each on the
blind backtest (both LOO and time split must not regress):

- **fees as a second regressor** — fees_30d: LOO 3.483 (worse) / TS 2.7948 (better) —
  fails the gate. fees_all_time: LOO 3.1979 (better) / TS 3.8985 (badly worse) — fails.
  fees/TVL ratio is the same span as fees_30d.
- **quadratic log-log curve** — LOO 3.376 / TS 2.5602, passes the raw gate, but paired
  Wilcoxon says noise: LOO 64 wins / 64 losses p=0.09, TS 17/15 p=0.911. The quadratic
  shape is sane (β [4.3668, 0.1893, 0.0204], R² 0.1942 vs 0.1939; predictions within
  0.96–1.03x of base across the board's TVL range) but the gain is not real.
- **age / growth / chain-count transforms** (log, capped) — all worse or time-split
  disasters (age TS 9.11x). Size-band dummies: LOO 3.752 (worse). Huber/trimmed robust
  fits: worse. k-NN k=3–30: best LOO 3.9091 (worse).
- **category-shrink sweeps** — shrink=10/minN=5 looked best on the two metrics
  (LOO+cat 3.3192 / TS+cat 2.6952) but repeated 80/20 random splits (25 reps, fixed
  seed) contradict it: shrink=10 is worse than shrink=3 on random splits, and
  QUAD vs BASE is a tie there too. 3-model geometric-mean ensemble: LOO 3.3729 /
  TS 2.6776 — still within noise. Paired tests QUAD+cat(s10) vs BASE+cat(s3): LOO
  p=0.968, TS p=0.601. Age-weighted fits: worse.

**Decision: keep the radar-3 OLS curve + category shrink=3/minN=3 unchanged.** The
backtest is therefore UNCHANGED from radar-3 (table below). The model version stays
`radar-3`; no curve code changed. This is a negative result, recorded honestly rather
than forced.

| test | radar-3 (before) | radar-4 (after) | flat multiple |
|---|---|---|---|
| leave-one-out, median miss, curve only | 3.3987x | 3.3987x (unchanged) | 4.8628x |
| leave-one-out, median miss, curve + category | 3.6253x | 3.6253x (unchanged) | 4.8628x |
| time split, median miss, curve only | 2.8845x | 2.8845x (unchanged) | 4.7764x |
| time split, median miss, curve + category | 3.3275x | 3.3275x (unchanged) | 4.7764x |

### Priority 2 — per-protocol farm plans: 40/40 WATCHLIST ROWS DONE

All 40 watchlist rows were researched from public sources only (project docs/blogs,
official points pages, public vault pages) and now carry protocol-specific steps in
`lib/model.ts` (`FARM_PROGRAMS`, one entry per slug, each citing its source URL). The
deposit / second-action / claim steps are replaced where real info exists; the
wallet-setup, weekly-action, hold and farm-log steps stay template, and the transaction
counts stay 1 / 1 / 12 so the costing is unchanged. The 158 early rows keep the
template plan (disclosed in the dashboard's Method tab).

- **14 rows have a LIVE points program** (12 with status `live` + Plume and
  Doppler, which are `token-live` because their token also trades): Symbiotic
  (Points S2), Veda (Points), Plume Nest (PNP S1), OnRe (Points), Doppler (DP),
  Noble (Points Vault), Upshift (Points S2), b14g (Point Program), Firelight
  (Points Phase 2), Saturn (Orbital Points S2), Tori (Cores S1), Tydro
  (TydroInkPoints S2), Yuzu (Juice), infiniFi (Points S3).
- **6 rows with a TOKEN ALREADY TRADING (CoinGecko-verified 2026-11-15, see below):**
  Mezo (MEZO, rank 2495), Bittensor (TAO, rank 39), Hive (B2 as BSquared Network,
  rank 843), Plume (PLUME, rank 274), Doppler (XDP, rank 827), USDD (stablecoin,
  rank 55). These rows stay on the board — the snapshot records no token for them,
  and the model prices the protocol, not the token — but their plans say so plainly:
  the farm is yield plus a possible later season, not a first-token farm.
- **22 rows yield-only (no points program found):** Steakhouse, Gauntlet, Curvance,
  OpenTrade, Lightning, Lagoon, Nonce, Armitage, Ember, Galaxy, Gami Labs, K3,
  Keyrock, Lofty, R25, Reti, Clearstar, Hyperithm, RockawayX, Tulipa, Axis, Valos.
  Their claim step says "no points program was found as of 2026-11-15" instead of
  implying one exists.
- **3 rows are SKIP by access, not by cost** (verdict override in `FARM_PROGRAMS`):
  Lightning Network (a routing node a $1,000 slice cannot run — hobbyist $1–20/month),
  Valos (flagship RWA vault permissioned, no outside deposits), Galaxy Curation
  (institutional-only via Fireblocks Earn). Their plans cost 0 transactions (gas $0,
  net $10.36 = opportunity cost only) and say so. Verdicts moved **FARM 69 → 66,
  THIN 105 (unchanged), SKIP 24 → 27**. No other row's net cost changed.
- **Safety flags baked into plans:** b14g (Marketplace exploit 31 Oct 2026, ~$1.47M
  CORE drained), OnRe (Loopscale exploit 6 Nov 2026 froze withdrawals), Doppler
  (copycat domain warning), USDD (stake-usdd.com warning), Steakhouse (fake Medium
  article warning), Axis (USDx "not a stablecoin", 7-day redemption cooldown),
  Firelight (Phase 2 exit 30–60 days, slashing), Saturn (geo-restricted, sUSDD queue).
- **Axis resolved:** the watchlist "Axis" is axis.to (USDx synthetic dollar, sUSDx
  vault, $70.11M TVL, Basis Trading) — NOT Axis Robotics (different project, AXIS
  token on Base). No conflation in the plan.
- Nothing was invented: no quest, points program or airdrop is claimed without a
  public source; where nothing was found the plan says so.

### Priority 3 — enrichment round 2

- **CryptoRank: 2/40 → 3/40.** Saturn has a fundraising page
  (cryptorank.io/ico/saturn-protocol): **$2.80M total raised**, verified against the
  BTCC/PANews roundup ($800K + $2M seed, Spartan Group led); latest round Strategic,
  13 Aug 2026 (Ondo Finance). Steakhouse re-checked: still no fundraising page.
- **Token Terminal: 0/40 → 2/40.** Public per-token metrics pages DO work via search
  (no key): Saturn USDC (Monad) satUSDC (Morpho vault token, $9.3M mcap, 9.3% APY)
  and Keyrock USDC (Ethereum) kUSDC (vault share, launched 2025-10-03). Recorded
  honestly as vault-token pages, not protocol pages. Artemis still behind login.
- **CoinGecko round-2 correction: 5 native tokens verified live** (public search API,
  2026-11-15), correcting radar-3's "not verified" calls: MEZO (id `mezo`, rank 2495),
  TAO (`bittensor`, 39), B2 (`bsquared-network`, 843), PLUME (`plume`, 274), XDP
  (`doppler-finance`, 827). USDD was already recorded. INFI was NOT verified — TGE
  targeted Q4 2026, not yet trading. Notes are scope-honest (e.g. TAO is the
  Bittensor network token; the row is the dTAO subsystem).
- **RootData: still blocked** (bot-wall "Safety check" page). Do not repeat the failed
  fetch; no account created, no key.
- Enrichment file grew 159,043 → **162,210 bytes**, then minified to **120,982 bytes** (same content, compact form) for the submission. `meta.sources` now also records
  the farm-plans research (40/40, per-row URLs in the board).

### Priority 4 — dashboard polish

- Detail dialog now shows a **"Farm program" line** (label + status + clickable
  source link) above the steps for the 40 watchlist rows.
- Funding-anchor section now shows the **Token Terminal note + link** where one
  exists, and the CryptoRank verification line now renders the row's own
  `verification_note` (Saturn: BTCC/PANews cross-check) instead of a generic
  "cross-checks DefiLlama" sentence.
- Method tab gains a paragraph: 40 watchlist rows protocol-specific (12 live
  points + 6 token-live, 2 of which also run a live points program, + 22
  yield-only), 158 early rows template, 3 SKIP-by-access rows named.
- Screenshots re-taken (board, Saturn detail, Monad-filtered) and visually verified;
  no layout issues. The detail dialog is taller than the 900px viewport for long
  rows (scrollable, as designed — the v3 overflow fix still holds: no horizontal
  overflow).

## The model (radar-3)

Implied value comes from a size curve fitted on the snapshot's own traded tokens — not a
hand-made multiple. An ordinary least squares fit of log10(market cap) on log10(TVL) over
the 128 traded protocols that have both figures gives:

```
log10(market cap) = 3.0247 + 0.5223 x log10(TVL)    R² 0.1939, residual sd 0.9092 dex (~8.1x), n = 128
implied = 10^(curve) x category factor
```

The category factor is a shrunken prior (n/(n+3), clamped to ±0.5 dex) from the traded
protocols in the same category, applied only where at least 3 comparables exist. 14
categories qualify; the rest use the global curve only (factor 1.00). The two largest
board categories have too few traded comparables to adjust at all: Risk Curators (34 rows,
n=1) and Onchain Capital Allocator (18 rows, n=2).

Category factors actually used: Lending 0.63x (n=15), Dexs 1.11x (11), CEX 2.24x (9),
Liquid Staking 0.47x (9), RWA 1.38x (9), Yield 0.84x (9), Canonical Bridge 2.32x (8),
Basis Trading 1.53x (7), Bridge 1.36x (6), Cross Chain Bridge 1.71x (4),
Yield Aggregator 0.62x (4), CDP 0.87x (3), Indexes 0.56x (3), Privacy 2.51x (3).

### Why the curve, and why growth / maturity / breadth were dropped

Growth, age and chain count were TESTED as value multipliers and DROPPED: the full model
(curve + category + growth + maturity + breadth) scored a leave-one-out median miss of
3.56x and a time-split miss of 3.83x, worse than curve-only (3.40x / 3.08x in the analysis
script's median definition). They are now DISPLAYED per row (7d growth, age, chain count)
but not multiplied into the value. The dashboard and the detail view say so on every row.

The category adjustment was KEPT as a shrunken prior despite mixed evidence: it lifts the
leave-one-out within-3x share from 42% to 44% but worsens the time-split median miss
(2.88x → 3.33x). Each row carries its curve-only value beside its category factor so the
reader can see what the adjustment adds.

A Theil-Sen fit was also tested (a=2.7805, b=0.5561; LOO 3.52x) — slightly worse than OLS,
so OLS is used.

### Blind backtest (computed at run time by the entry's own code)

| test | curve only | curve + category | flat multiple |
|---|---|---|---|
| leave-one-out, median miss | 3.3987x | 3.6253x | 4.8628x |
| leave-one-out, within 2x | 32.03% | 32.03% | 29.69% |
| leave-one-out, within 3x | 42.19% | 43.75% | 35.16% |
| leave-one-out, within 5x | 58.59% | 58.59% | 51.56% |
| time split (fit 63 older, test 32 newer), median miss | 2.8845x | 3.3275x | 4.7764x |
| time split, within 2x | 28.13% | 25.00% | 25.00% |
| time split, within 3x | 50.00% | 43.75% | 28.13% |
| time split, within 5x | 65.63% | 62.50% | 56.25% |

The curve beats a flat multiple (median mcap/TVL 0.2138x over the same 128) on every line.
A median miss near 3x is a rough anchor, not a price — the dashboard says so on the board,
on every detail view, and on the Method tab.

## Farm plans: costed, netted, with a verdict

Every farm plan is costed for a **$1,000 slice over 90 days**: 7 steps, 14 transactions
(1 deposit + 1 second action + 12 weekly actions), ~165 minutes total. Gas per transaction
is a stated assumption per chain (typical Nov 2026): Ethereum $2.50, Base $0.05, Arbitrum
$0.10, Optimism $0.05, BSC $0.15, Solana $0.01, Polygon $0.02, Avalanche $0.10,
Unichain/Ink/Katana/Morph/Hyperliquid $0.05, Sui/Aptos $0.01, Tron $0.10, Ton $0.02,
default $0.25. Opportunity cost = $1,000 x 4.2% T-bill x 90/365 = **$10.36**.
Net cost = gas + opportunity.

Verdict: **FARM** if net ≤ $30 AND quality ≥ 2 (TVL ≥ $50M = 2 pts, TVL ≥ $10M = 1 pt,
fees30d > 0 = 1 pt); **THIN** if net ≤ $80 AND quality ≥ 1; else **SKIP**.
Verdicts across the board (radar-4): **FARM 66 / THIN 105 / SKIP 27** (radar-3 was
69 / 105 / 24 — the 3 moves are the access-based SKIP overrides: Lightning Network,
Valos, Galaxy Curation; no other row's net cost changed). Example nets: a Base row
$11.06 (FARM), an Ethereum row $45.36 (THIN), a SKIP-by-access row $10.36 with $0 gas
and 0 transactions.

The 40 watchlist rows carry protocol-specific steps (see the radar-4 section above);
the 158 early rows keep the 7-step template. Every row still has 7 farm steps, now
85–313 chars each.

## The board — top 10

198 rows, ranks 1–198 exact, implied non-increasing, all 198 values distinct,
watchlist 40/40. Every row: 7 farm steps, 114–174 chars each.

| rank | protocol | implied | curve only | factor | TVL | verdict (net) |
|---|---|---|---|---|---|---|
| 1 | Sentora Curator | $90,185,322 | $90,185,322 | 1.00x | $2,757,585,593 | THIN ($45.36) |
| 2 | Steakhouse Financial | $90,123,744 | $90,123,744 | 1.00x | $2,752,000,000 | FARM ($11.06) |
| 3 | Gauntlet | $67,372,395 | $67,372,395 | 1.00x | $1,583,000,000 | FARM ($11.06) |
| 4 | Veda | $67,053,449 | $67,053,449 | 1.00x | $1,556,000,000 | FARM ($11.06) |
| 5 | USDD | $47,597,694 | $54,623,215 | CDP 0.87x | $1,060,000,000 | FARM ($11.76) |
| 6 | OnRe | $39,779,816 | $28,747,445 | RWA 1.38x | $308,900,000 | FARM ($10.50) |
| 7 | Nonce Capital | $37,498,445 | $37,498,445 | 1.00x | $855,000,000 | THIN ($45.36) |
| 8 | Upshift | $36,934,236 | $36,934,236 | 1.00x | $838,000,000 | THIN ($45.36) |
| 9 | BitFi Basis | $36,390,669 | $23,787,517 | Basis 1.53x | $538,000,000 | FARM ($12.46) |
| 10 | Bittensor dTAO | $35,445,667 | $31,857,657 | Dexs 1.11x | $710,000,000 | FARM ($13.86) |

Bottom 3: Granite $2,364,389 SKIP, Flying Tulip ftUSD $2,209,536 THIN ($45.36),
Nucleus $2,066,013 SKIP. (TVL figures above are rounded from the snapshot; the board
carries exact dollars.)

## 192 vs 198 — settled

Snapshot partition (verified in code): 758 protocols = **416 with a token**
(gecko_id or symbol present) + **342 pre-token** (neither). Of the 342 pre-token, the
house rule (RULES.txt line 206, exactly as written) ranks **198** (40 watchlist + 158
below the floor) and sets aside **144**. The starter's "200 rows (40 + 160)" is loose —
only 158 rankable exist below the floor.

The public leaderboard's #1 entry boards 192 rows. That is the leader's own narrower cut,
not the house rule: a Chain+Farm exclusion was considered and REJECTED as the explanation,
because Hive Protocol and Noble are Chain-category members OF THE WATCHLIST, so excluding
Chain would drop 2 watchlist rows and break the gate's watchlist-coverage check. Three
versioned-name regex variants all give exactly 198. **Decision: rank all 198 under the
house rule.** The 6-row difference is documented in model.ts and here.

Also verified: 0 protocols have mcap_usd set but no gecko_id/symbol, so the two
definitions of "pre-token" agree. Age comes from `listed_at` (no `age_days` field exists);
7 of the 198 rankable rows have `listed_at` null; 2 have `change_7d` null
(estate-protocol, swan-dao). Traded fit set: 128 with mcap>0 and TVL>0. Time split: 63
older (>730 days) for fitting, 32 newer (≤730 days) for testing; 33 traded tokens have no
`listed_at` and sit outside the split.

## Sources (build time only — the graded run is offline)

The DefiLlama snapshot is the backbone. At build time (2026-11-15) extra public sources
were fetched and baked into `data/enrichment.json` (120,982 bytes, 758 per-slug entries
with `sources`, `fees`, `coingecko`, `cryptorank`, `tokenterminal` + `meta.sources`). main.ts reads it from
the repo dir and continues snapshot-only if it is absent/unusable. Nothing is fetched at
grade time.

| source | what it contributed | coverage | fetch date | result |
|---|---|---|---|---|
| DefiLlama snapshot (sealed) | TVL, category, chains, 7d change, age, token record | 758/758 (40/40 watchlist) | 2026-11-14 (sealed) | backbone |
| DefiLlama Fees API (api.llama.fi/overview/fees, public, no key) | fees 30d/7d/all-time per protocol | 444/758; 108/198 board rows; 26/40 watchlist | 2026-11-15 | used as second fundamentals signal + quality point in farm verdicts |
| CoinGecko public API (api.coingecko.com/api/v3, free, no key) | search per watchlist name; any native token / listing | 42 checked (40 watchlist + Sentora Curator + Polymarket International) at build; **round 2 (2026-11-15) verified 6 native tokens live: MEZO, TAO, PLUME, XDP, B2, USDD (stablecoin product token only)** | 2026-11-15 | radar-3 found only USDD's stablecoin and recorded the rest as unverified; round 2 re-ran the live search API and verified the 5 others by id (mezo, bittensor, bsquared-network, plume, doppler-finance) with scope-honest notes (e.g. TAO is the network token, the row is the dTAO subsystem). INFI not verified — TGE targeted Q4 2026 |
| CryptoRank public pages (cryptorank.io/ico/<slug>, no key) | total raised, round stages/dates, token status, watchlists | **3/40 watchlist with a fundraising page (Gauntlet, Polymarket, Saturn)**; Steakhouse checked — fund/price pages only, no fundraising page | 2026-11-15 | Gauntlet $169.63M total raised, verified against DefiLlama ($169.49M) → `total_raised_verified: true`. Polymarket $3.87B shown as reported, `total_raised_verified: false` (per-round amounts gated, cannot reconcile). **Saturn $2.80M, verified against the BTCC/PANews roundup** → `total_raised_verified: true`; latest round Strategic 13 Aug 2026 (Ondo Finance). Per-round amounts and investor lists gated behind a free account — NOT fetched. API v3 needs a key; fundraising data is on paid Pro $475/mo+ — no account created, no key |
| RootData (rootdata.com) | fundraising database | 0/40 | 2026-11-15 | **BLOCKED** — bot-wall "Safety check" page; curl returns a 1,447-byte JS-challenge stub; API needs a key. No account created |
| Token Terminal / Artemis | revenue/fees/fundamentals | **Token Terminal 2/40** (Saturn satUSDC, Keyrock kUSDC vault-token pages, found via search, no key); Artemis 0/40 | 2026-11-15 | Token Terminal's public per-token metrics pages work without login — but they track Morpho vault shares, not the protocols themselves, so they are recorded as vault-token pages, never as protocol fundamentals. Artemis project data behind login. DefiLlama Fees API remains the fundamentals source |
| Farm plans (project docs/blogs, official points pages, public vault pages) | per-protocol farm steps for the watchlist | **40/40 watchlist with a protocol-specific plan** (12 live points + 6 token-live + 22 yield-only; per-row source URL in the board) | 2026-11-15 | researched in radar-4; nothing invented — no quest/points program/airdrop claimed without a public source; the 158 early rows keep the template plan |

A funding anchor is DISPLAYED where one exists but is never a model input: Gauntlet
($169.63M) and Saturn ($2.80M) have verified totals, and a raise factor would move
one row by ≤ 5% — noise, not signal. Polymarket's $3.87B is shown as reported, never
used as an input.

## How each RULES requirement is met

- **Entrypoint** `main.ts` at repo root, Node 22 stdlib only (+ the kit's vendor file).
  Reads `/input/snapshot.json`, writes `/output/board.json`, writes the dashboard's data
  into `/output` (data.js beside the page), copies `dashboard/` and `screenshots/` to
  `/output`, writes `/output/dossier.json` with `buildDossier` from
  `vendor/makefun-board.ts`. No network at grade time; no API keys/secrets in the repo.
- **Board** (`board.json`, 397,925 bytes, cap 8 MiB): 198 rows (100–4,000), ranks 1..198
  exact, implied non-increasing, all distinct, every slug a snapshot protocol, every row
  a non-empty name, a positive whole implied value ≤ 10^14, 7 farm steps of 85–313 chars
  (3–12 steps of 20–600 chars required). Watchlist 40/40 covered. Implied values and
  ranks are byte-identical to radar-3 (regenerated from the `radar-v1/` backup for the
  comparison); only farm steps, verdicts (3 rows), enrichment and the new
  `farm_program` / `tokenterminal` fields changed.
- **Dashboard** (`dashboard/`, 3 files, 53,227 bytes, cap 400 files / 4 MiB): index.html
  (448 B), app.css (11,523 B), app.js (41,256 B). No `http://`/`https://` anywhere in the
  dashboard source. Four tabs: Pre-token (198 rows), Live token (416 rows), Set aside
  (144 rows with reason), Method (formula, SVG scatter chart, backtest tables,
  category-adjustment table, farm-costing assumptions + gas table, enrichment sources).
  Search + category + chain filters, watchlist-only toggle, sortable columns, per-protocol
  detail dialog (model breakdown, funding anchor, fees, CoinGecko note, Token Terminal
  note, per-row sources, farm program label + source link, costed farm plan),
  deep-linking via URL hash (`#p=<slug>`, `#category=RWA`, `#q=...`, `#w=1`, `#tab=...`).
- **Dossier** (`dossier.json`, 843,988 bytes, cap 1.5 MiB): written by `buildDossier` from
  the output dir. Text 53,493 bytes (cap 65,536) — the dashboard source fits whole,
  nothing cut. 3 images.
- **Screenshots** (`screenshots/`, 3 PNGs, 1440x900, each ≤ 512 KiB): 1-board.png
  (173,646 B), 2-detail.png (245,272 B, Saturn detail), 3-filtered.png
  (177,719 B, #chain=Monad, 27 rows). Re-taken with Playwright Chromium on this VM
  against the final radar-4 dashboard; visually verified; no console/page errors
  (one benign favicon 404 from the local test server).
- **Determinism**: two runs on the same snapshot produce byte-identical output
  (verified twice for radar-3 and twice for radar-4 — `/tmp/radar4/final` vs `final2`,
  `cmp` clean on board.json, data.js and dossier.json).
- **Honesty**: "records no token" everywhere, never "has no token"; no prediction of
  whether/when a token is issued; missing enrichment data shown as null/unknown, never
  invented; the model's limits (median miss ~3x, R² 0.19) are stated on the board, in
  every detail view, and on the Method tab.

## Local check results

- `main.ts` runs clean: exit 0; prints curve + backtest numbers; writes board.json,
  data.js, dashboard (3 files), screenshots (3 images), dossier.json.
- Board validation (entry's own `boardIssue` + hand checks): 198 rows, ranks exact,
  monotonic, all distinct, watchlist 40/40, farm-step violations 0.
- **jsdom render test** (`/tmp/radar4/verify/render4.mjs`): **39/39 pass** — data level
  (198 rows, 40 watchlist, 40 farm programs with statuses 12/6/22, curve unchanged,
  backtest numbers, Saturn CryptoRank $2.8M, Token Terminal on Saturn + Keyrock, 6
  CoinGecko native tokens, verdicts 66/105/27) and DOM level (board 198 rows, top row
  Sentora Curator, search "saturn" → 1 row, chain Monad filter, category Risk
  Curators filter, watchlist-only → 40 rows, empty search panel, Saturn detail:
  program label + source link + 7 steps + 5x Orbital Points + Token Terminal note +
  $2.8M raised + BTCC cross-check note, Mezo detail: token-live program + CoinGecko
  MEZO line, Valos detail: SKIP + $0.00 gas + permissioned note, Method tab with
  backtest + farm paragraph, live tab, set-aside tab, sort by name, zero JS errors).
  Two first-run failures were test bugs, not app bugs (a row's chain list shows only
  its first 2 chains, so the Monad assertion now compares counts; fmtUsd renders
  $2.8M, not $2.80M) — fixed in the test, re-run clean.
- **Playwright screenshots** (`/tmp/radar4/verify/shots4.mjs`): 3 distinct PNGs, no
  console/page errors; board, Saturn detail and Monad-filtered views visually
  verified. (First attempt took 3 identical shots: same-document hash navigation
  does not reload the page, so the app never re-read the hash — fixed by loading
  each shot under a distinct query string.)
- **Radar-4 model re-verification**: the radar-3 board was regenerated from the
  untouched `radar-v1/` backup (`/tmp/radar4/radar3regen/`) — same curve, same
  backtest — and the radar-4 board was diffed against it: all 198 implied values and
  all ranks identical; net costs changed only on the 3 SKIP-by-access rows.
- **Bug found and fixed during final verification**: the detail dialog's first equation
  block was 630px wide inside a 560px dialog (scrollW 654 vs clientW 556) — the long
  category-source string ("1.00x (global curve only — too few traded comparables in this
  category)") as a nowrap value forced the whole grid wide and pushed every value in
  that block off-screen. Fixed by showing the factor number only in the equation and the
  source as a wrapping sub-line; re-measured with Playwright: scrollW 556 = clientW, all
  values at valRight 1253 (inside the dialog). Screenshots re-taken after the fix.
- **Two bugs found and fixed during the radar-3 build**: (1) `isRankable` returned true
  for live-token protocols because `setAsideReason` returns null for them — first run
  produced 610 rows; fixed to `isRankable(p) = isPreToken(p) && setAsideReason(p) === null`.
  (2) Enrichment builder bugs (CoinGecko slug/name key mix-up, a block inserted before
  its dependencies, CryptoRank attached to the non-existent slug `polymarket` instead of
  `polymarket-international`) — all fixed; final enrichment: CoinGecko 42 checked, fees
  444/758, CryptoRank totals 2.
- No kit `grade-local` exists for this competition (the git-forge kit had one; this kit's
  harness is the gate scorer + judge, run server-side). Local verification is the run +
  render + determinism checks above.
- Repo tree: 13 files, ~0.8 MB total (enrichment.json 159,043 B + screenshots 489,640 B
  dominate). The radar caps are the ones listed above and all are met.

## Known weaknesses

1. **The curve is weak.** R² 0.1939, residual sd 0.91 dex — TVL explains little of market
   cap. The median miss near 3x means most implied values are wrong by a factor of 3.
   This is disclosed everywhere, but it caps how useful the ranking is.
2. **Category adjustment is evidence-mixed.** It helps leave-one-out within-3x (42% →
   44%) but hurts the time-split median miss (2.88x → 3.33x). Kept as a shrunken prior
   with full disclosure; a purist would drop it.
3. **The two biggest board categories have no adjustment.** Risk Curators (34 rows) and
   Onchain Capital Allocator (18 rows) have <3 traded comparables, so their rows are
   curve-only — including ranks 1–4.
4. **Farm plans are protocol-specific for the watchlist, template for the early
   rows.** All 40 watchlist rows were researched from public sources; the 158 early
   rows still use the category template. That is disclosed in the Method tab, but the
   early rows are the long tail a judge may still read.
5. **Enrichment is still thin.** CryptoRank covers 3/40, Token Terminal 2/40
   (vault-token pages only), RootData blocked, CoinGecko now adds 6 verified native
   tokens. The multi-source angle is real but narrow; the fees data (108/198 rows)
   and the two verified raises remain the only fundamentals beyond the snapshot.
6. **Gas prices and the T-bill yield are stated assumptions**, not live data (the graded
   run must be offline). If real gas moves, the FARM/THIN/SKIP boundaries shift.
7. **No local grade exists.** The judge is pairwise and server-side; there is no way to
   know our win rate before submitting. The field is 3,911 entries, median 87.64%,
   p90 93.48%, #1 at 96.21%.

## What still needs doing before submit

1. Create the repo **0xsolsepatu/token-radar-sol01** (public, created after the
   2026-11-14T06:30:00Z opening — the owner must create it; the Muse GitHub App cannot
   create repos, 403, established on the chess and git-forge repos).
2. Push the tree in `radar/` (13 files) in one snapshot commit; read back the commit sha.
3. Set GitHub About: description + homepage `https://make.fun/bounty/token-radar-01` +
   topics `makefun, ai-agents, bounties, trading`.
4. Add `.makefun/owner.json` with wallet `4DgwSpyqN5V1Uh2LZPu1SYhR2DqfN9eoa1BY4jWLBkQ7`
   if the account is not GitHub-linked (the git-forge submit needed it after a repo_owner
   refusal).
5. Bundle transcripts with the kit CLI from the top-level agent after this session ends
   (`node cli/makefun.mjs bundle` in the kit dir), with `--redact` for personal details
   and `--muse-usage` for Muse usage rows (see the git-forge bundle experience:
   `~/workspace/makefun-gitforge/` — prompt.txt, muse-usage.jsonl, transcripts.tar.gz).
   Transcript-gate notes: `lib/model.ts` was written once and edited in several later
   messages in the builder session, and again in the radar-4 session (c60d5d4b), and
   `main.ts` was edited 3 times in the builder session, so `thinking_revised` should
   pass for both; the kit's `init` anchor was NOT quoted in either session, so
   `thinking_fresh` will skip as a note (RULES.txt: not a rejection, reward paid as
   any other). The bundle must include the builder session
   (16171c26-aac5-46d4-819d-77a1d5a200c4) AND the radar-4 session
   (c60d5d4b-4f32-474e-a7fb-11e99981536d) — both wrote entry code.
6. `makefun check` on the repo + bundle, then submit before **2026-12-14T10:00:00Z**.
   Escrowed bounty: the submit needs `--keypair` (entry signature required) — the
   sign-in arrangement used for git forge (`makefun login`, CLI key in
   `~/.makefun/credentials`) is already in place, but confirm the escrowed-submit path
   before the deadline. Quota: max 5/day, 10 total.
7. After submit, monitor `makefun status` — the final run is 14 Dec, results due
   28 Dec 2026.

## Files

- `~/workspace/makefun-tokenradar/radar/main.ts` (5,532 B) — entrypoint
- `~/workspace/makefun-tokenradar/radar/lib/model.ts` (82,961 B) — radar-3 model +
  radar-4 `FARM_PROGRAMS` (40 researched watchlist plans) + radar-5 bootstrap bands
  and mechanism-aware farm plans
- `~/workspace/makefun-tokenradar/radar/dashboard/index.html` (448 B),
  `dashboard/app.css` (11,523 B), `dashboard/app.js` (48,175 B)
- `~/workspace/makefun-tokenradar/radar/vendor/makefun-board.ts` (19,788 B, kit file,
  copied byte for byte — sanctioned)
- `~/workspace/makefun-tokenradar/radar/data/enrichment.json` (135,211 B, minified)
- `~/workspace/makefun-tokenradar/radar/screenshots/` — 1-board.png (171,700 B),
  2-detail.png (236,256 B), 3-filtered.png (172,219 B) (radar-5 shots, retaken
  2026-11-15 ~18:59 WIB)
- `~/workspace/makefun-tokenradar/radar/README.md`, `LICENSE` (MIT), `REPORT.md` (this file)
- `~/workspace/makefun-tokenradar/radar-v1/` — byte-identical backup of the radar-3 entry
- Test outputs: `/tmp/radar4/final/` (final build), `/tmp/radar4/final2/` (determinism
  comparison), `/tmp/radar4/radar3regen/` (radar-3 board regenerated from `radar-v1/`
  for the before/after diff), `/tmp/radar4/verify/render4.mjs` (39-check jsdom render
  test), `/tmp/radar4/verify/shots4.mjs` (Playwright screenshot script),
  `/tmp/radar4/analyze.mjs`, `analyze2.mjs`, `analyze3.mjs`, `knn.mjs` (model test
  battery), `/tmp/radar4/enrich2.mjs` (enrichment round-2 script), `/tmp/fees.json`
  (DefiLlama Fees API, 31 MB), `/tmp/fees30d.json`, `/tmp/coingecko-rest.json`

## Submission

- **Submitted:** 2026-11-15 18:28 WIB (server time 2026-11-15T11:28:41.828Z), accepted HTTP 202.
- **Submission:** `01a1def7-75fa-76fd-a3b4-45c79086030c` — token-radar-01, round 1, title `token-radar-sol01`.
- **Commit:** `627ba9b830ff798d15b11987cf8fde1fd4434011` on `0xsolsepatu/token-radar-sol01` (HEAD; 14 files incl. `.makefun/owner.json` and the 3 screenshots).
- **Claim code:** `AF-5AM20-ABFNW-T8K0T-NTREF` (only visible again on the entry's status page while signed in: `makefun status --submission 01a1def7-75fa-76fd-a3b4-45c79086030c`).
- **Signed by:** wallet `4ytnkRAdSTtF4jJfETcc95efktzKDZABoEMLXSJxNAPP` (CLI keypair, the entry's payout wallet).
- **Bundle:** `~/workspace/makefun-tokenradar/transcripts.tar.gz` (5,059,675 B, sha256 `cc46dda8342e5ad64261054c2b6bed316a910e97eda5d3cf7126e4cb9f07693e`; 17 sessions).
- **Kit check (final tree, --worktree):** 13 passed, 0 failed, 6 skipped, 5 at submission; thinking_reproduces 66.2%, thinking_priced 38 records.
- **Server checks at submit:** all pass (account_wallet, competition_open, quota, form, entry_signature, repo_owner, repo_public, license_osi, repo_created_after_open, commit_in_repo, repo_readme, repo_about).
- **Status right after submit:** submitted, being taken in; validity checks follow. Not yet on the public leaderboard (4,191 entries at check time) — pairwise judging takes a while. Final run 14 Dec, result due 28 Dec 2026.
- Quota used: 1st attempt for token-radar-01 (max 5/day, 20 total).

Note: this section is local-only, added after the submit. The submitted commit stays `627ba9b8`.

## Radar-5 (improvement round, 2026-11-15, NOT submitted)

**Context.** Radar-4 was submitted 18:28 WIB and scored live: **rank 1721 of 4,220,
judge 88.91%** (field median 87.50%, rank 100 = 94.46%, rank 20 = 95.31%,
rank 1 calm-owl-82 = 96.21%). The target for this round was top 20 (~95.3%+).
Radar-5 is built and verified locally only — no push, no submit, no repo created.
The submitted radar-4 tree is backed up untouched at `~/workspace/makefun-tokenradar/radar-v2/`.

**Skills applied (LightVela import).** `firecrawl-deep-research` +
`firecrawl-market-research`: **BLOCKED — no `FIRECRAWL_API_KEY` in the environment**
(verified: not set; the earlier env grep hit was only JARVIS_TRACE_CONTEXT text).
No key was invented, guessed or fetched; record this as the missing lever.
`content-research-writer`: its workflow (outline, research with citations, stronger
hook, section-by-section feedback, final review) was applied to the dossier/method
narrative — the Method tab is now a research note, not a method dump. The dossier
text is built by `buildDossier` from the dashboard source files, so the note lives
in `dashboard/app.js`. `competitor-news-monitor`: its METHOD (not its Hermes
cronjob tooling) was applied as a systematic material-news sweep over the 40
watchlist protocols — primary sources first, deduplicated by event, materiality
judged, every source URL cited. `stock-analysis`: read; `uv` is not installed, so
no `uv run`. Its Hot Scanner concept (CoinGecko trending + Google News headlines)
was tested as a "heat" signal under the blind-backtest gates (see rejections below).

### What changed

1. **Bootstrap stability + per-row bands (model).** `backtest()` now refits the curve
   200 times on resampled traded tokens (fixed seed mulberry32(20261115)) and reports
   an out-of-bag third blind test: **OOB median miss 3.5518x (90% CI 2.7054–5.0429x,
   oob_n 47)**; curve a 90% CI 1.8902–4.31, curve b 90% CI 0.3613–0.663. Every board
   row carries `implied_low_usd` / `implied_high_usd` — the middle 50% (p25–p75) of
   the same 200 refits. Rank 1 Sentora Curator $90,185,322 → band $75,182,315–
   $124,730,715; rank 198 Nucleus $2,066,013 → band $1,705,749–$3,037,793.
2. **Mechanism-aware farm plans for all 198 rows (model).** New `mechanismFor()` +
   `mechanismPlan()` with 17 mechanisms (curated-vault, basis-trading, lending,
   liquidity, yield-farming, bridging, staking, perps, prediction, stablecoin, rwa,
   insurance, payments, governance, chain-apps, cede-vault, vault). Each names what
   the money does, its specific risk, and the honest claim that no points program is
   published for the protocol in the sources checked — the farm is yield unless its
   own pages later announce one. The old template `actionFor`/`secondActionFor`
   were deleted. Watchlist rows keep their researched `FARM_PROGRAMS` (label
   "researched program"). Transaction counts unchanged, so costing is identical.
   Mechanism tally on the board: Curated vault 37, Lending 24, Liquidity 23, Yield
   farming 22, Perpetuals 14, Vault 11, RWA 9, Basis trading 6, Stablecoin 3,
   Staking 3, Prediction markets 2, Chain apps 2, Bridging 1, CeDeFi 1.
3. **Material-news sweep merged into enrichment.** Subagent sweep
   (`/tmp/radar5/news-sweep.json`, 44,625 B, 40/40 slugs): **33 material events
   across 21 rows (8 high)**. Merged by `/tmp/radar5/merge_news.py` into
   `data/enrichment.json` (120,982 → 135,211 B, still single-line minified UTF-8).
   Enrichment coverage before → after: CryptoRank fundraising pages **3/40 → 5/40**
   (Gauntlet, Saturn, OpenTrade, Veda, infiniFi) and a funding total for **13/40**
   watchlist rows (7 verified against a second source, 6 as reported from a single
   source; + Polymarket $3.87B as reported on the early row); CoinGecko native
   tokens still 6 live (ranks re-checked: XDP 831, MEZO 2471, PLUME 275, B2 848);
   Token Terminal still 2/40; RootData still blocked. New `meta.sources.news_sweep`
   entry. News items are sorted high → medium → low, then date desc; the detail
   view shows the top 2 with source links, and news source URLs are appended to
   each row's `sources`.
4. **Program corrections from the sweep (FARM_PROGRAMS).** The sweep corrected
   radar-4's live-program tally **12 live / 6 token-live / 22 yield-only → 10 live /
   6 token-live / 24 yield-only** (11 rows total run a live program, counting
   Doppler's DP Season 3):
   - **Veda: live → yield-only.** No official points program found; the claim came
     from an aggregator (airdrops.io) and is unverified. Funding anchor added
     ($18M, CoinFund-led, Jun 2025, verified).
   - **Firelight: live → yield-only.** Firelight Points ended 6 Oct 2026 when cover
     went live; new farmers earn cover premiums, not points. Claim deadline
     7 Dec 2026 for existing holders kept; anti-Sybil reversal (10 Oct 2026) noted.
   - **Noble: live → yield-only.** No official points program verified; the Points
     Vault claim is aggregator-only.
   - **Axis: yield-only → live.** Coordinates Season 1 confirmed live (Origin Vault
     closed 5 Aug 2026 at $67.25M / 1,857 wallets).
   - **Saturn: still live, now confirmed.** STRN confirmed, up to 5% of supply for
     Season 2; registration opened 9 Nov 2026 at claim.saturn.credit, **deadline
     16 Nov 2026 09:00 EST** — flagged in the plan steps.
   - **Plume PNP: Season One live → ended Mar 2026.** Farm is RWA vault yield now.
   - **infiniFi:** Season 3 live; claim now notes 100M INFI supply and tokenomics
     (45% ecosystem / 20% team / 20% investors / 15% foundation), TGE Q4 2026.
   - **Curvance:** risk-report warning added — independent report moved it from
     "caution" to "avoid" (30 Sep 2026): Emergency Council bypassed the 5-day
     timelock, May eBTC market still paused, WBTC lenders cannot redeem.
   - b14g exploit warning already present in radar-4; unchanged.
5. **Dashboard as a research note.** Method tab rewritten: hook + thesis, the
   formula and scatter unchanged, backtest table gains the **OOB row**, new
   **"Stability: what 200 bootstrap refits say"** and **"What could be wrong"**
   sections (curve weak R² 0.19; category prior mixed; family multiples tested and
   rejected at 4.8x LOO; heat tested and rejected; the competing 2.01x OOS claim
   addressed — not reproducible on this snapshot's house-rule time split, best
   tested 2.88x), and **"The audit: 342 pre-token protocols accounted for"**
   (198 ranked + 144 set aside, 416 live shown separately). Detail view gains the
   band row, the "Farm mechanism:" line, and the "Latest material news" section.
   Lede now cites the OOB figure. Funding-anchor labels are source-neutral now
   ("Total raised", "Token status") since totals come from CryptoRank, DefiLlama
   and press, with the verification note naming the source.

### Model test batteries — radar-5 (scripts in /tmp/radar5/)

- **Battery 1 (`analyze5.mjs`): baseline reproduced EXACTLY** (LOO curve 3.3987 /
  curve+cat 3.6253; TS 2.8845 / 3.3275; flat LOO 4.8628 / TS 4.7764 — harness
  validated). **Per-family median multiples FAIL decisively:** famMult3 LOO 4.82x /
  TS 4.82x, significantly worse (Wilcoxon vs baseCurveCat p≈0.001–0.003). Also
  rejected: famMult1 (4.92/4.49), famMult5 (4.98/5.03), famOls (3.52/3.33,
  p=0.93, wash), sizeNb5 (4.68/5.15), sizeNb10 (4.59/3.72), hybrid (4.59/4.60),
  blendCurveFam (3.61/3.31, p=0.36/0.33, noise). The slope-1.0 multiple
  assumption is bad because mcap grows sublinearly with TVL (fitted slope 0.5223).
  The leaders' "OOS x2.01" is NOT reproducible via family multiples on the
  house-rule backtest.
- **Battery 2 (`analyze5b.mjs`): all rejected.** L1 regression (LOO 3.72 worse /
  TS 3.21 better, p=0.43/0.089 — fails gate); piecewise linear with knot at median
  log TVL (LOO 3.80 worse, p=0.0091 significantly worse); hierarchical per-family
  OLS shrunk w=n/(n+5) (LOO 3.83 worse / TS 3.18 better — fails gate); 24h
  volume/mcap as 2nd regressor (LOO 3.94 / TS 3.50, both worse); fees/TVL ratio as
  2nd regressor (LOO 3.6352 vs 3.6253, TS 3.3169 vs 3.3275, Wilcoxon p=0.49/0.99 —
  noise). Clean fit excluding CEX + Stablecoin Wrapper (LOO 3.6325 vs 3.6253, TS
  3.0034 vs 3.3275, Wilcoxon TS p=0.94 — median gain driven by a few tokens, not
  significant — rejected). **Trending flag: 0/128 traded tokens are in CoinGecko's
  trending top 15 today → the Hot Scanner "heat" signal has zero coverage on the
  fit set; its regression beta is NaN (all-zero column) — decisively unusable as a
  model input.** CoinGecko data fetched 2026-11-15: `/tmp/radar5/cg_markets.json`
  (126/128 rows), `/tmp/radar5/cg_trending.json` (15 coins), `/tmp/radar5/gecko_ids.txt`.
- **Battery 3 (`analyze5c.mjs`): 25× repeated 80/20 random splits (seeded
  mulberry32).** All candidates within noise: baseCurve median-of-medians 3.5369x
  (wins 2/25), baseCurveCat 3.4525x (2/25), famMult3 4.4715x (2/25), hierOls
  3.3280x (5/25), cleanFit 3.2563x (5/25), volCat 3.8692x (3/25), feesRatioCat
  3.4008x (6/25). No candidate dominates.
- **Conclusion: NO model change passes the gates; the radar-3 curve + category
  prior stands.** The curve's R² 0.19 is a property of the data, not of the
  estimator choice.

### Verification (radar-5)

- main.ts exit 0; curve unchanged (3.0247/0.5223, R² 0.1939); LOO 3.6253 / TS
  2.8845 unchanged; OOB 3.5518x (90% CI 2.7054–5.0429x).
- **Determinism:** two runs (`/tmp/radar5/run3/`, `/tmp/radar5/run3b/`) byte-identical
  (board.json, data.js, dossier.json). Dossier text 60,412 B (cap 65,536);
  dossier.json 857,352 B (cap 1.5 MiB).
- **Board diff vs radar-4 (fresh radar-v2 run): 0 value/rank/verdict diffs.**
  Verdicts identical FARM 66 / THIN 105 / SKIP 27. All 198 rows keep their rank.
- **jsdom render test:** `/tmp/radar5/render5.mjs` — **62 passed, 0 failed** (new
  checks: OOB row, band on every row, mechanism on early rows, news 21 rows /
  33 items, program statuses 10/6/24, research-note headings, Saturn STRN +
  deadline, Veda corrected, no JS errors).
- **Screenshots:** `/tmp/radar5/shots5.mjs` retook the 3 shots into
  `radar/screenshots/`; all three visually verified (board with radar-5 lede,
  Saturn detail with band + news + funding anchor, Monad filter 27 rows).
  One console 404 is the missing favicon only.
- A syntax slip in the audit paragraph (extra `}`) was caught by `node --check`
  before the rebuild and fixed; the render test then passed clean.

### Honest assessment — expected judge movement vs the top-20 target

Radar-4 sits at 88.91% (rank 1721); top 20 needs ~95.3% — a ~6.4 point jump.
Radar-5 does **not** plausibly close that gap, and top 20 should not be claimed:

- The model is byte-identical in value: same curve, same ranks, same verdicts.
  The backtest did not improve (LOO 3.6253x, TS 2.8845x, OOB 3.5518x — all
  ~3–3.6x, far from the leaders' claimed OOS ~2x, which no estimator reproduces
  on this snapshot). If the judge weights the model's predictive claim heavily,
  radar-5 scores about the same as radar-4 on that axis.
- What radar-5 does add is exactly the surface the top-20 titles signal:
  mechanism-aware farm plans for all 198 rows (not just the 40), a cited
  research-note dossier with a third blind test and per-row uncertainty bands,
  33 sourced news events, 13 funding totals (was 3), and four corrected program
  statuses (Veda/Firelight/Noble were wrong in radar-4; Axis and STRN were
  missing). These are presentation, honesty and coverage improvements — the kind
  of thing that moves a pairwise judge a little, not 6 points.
- Realistic expectation: a modest upward move from 88.91% — plausibly into the
  low 90s if the judge rewards the research note, the bands and the corrected
  programs — but **nowhere near 95.3%** on the evidence available. The binding
  constraint is the curve itself (R² 0.19, median miss ~3.4x): no estimator
  tested beats it on this snapshot, and the enrichment that could sharpen it
  (RootData, fees beyond 108/198, per-round funding) is either blocked or thin.
- The missing lever is Firecrawl deep research (no API key). A key would unlock
  the one untested enrichment path: deep per-protocol research at scale (funding
  rounds, token plans, points programs from primary sources beyond what the
  sweep's search-based pass could reach). Even that is unlikely to fix a weak
  curve — it would sharpen the same presentation axes radar-5 already improved.
- Recommendation: submit radar-5 as a strictly-better-than-radar-4 entry (same
  values, better dossier, bands, news, corrected programs), but do **not** expect
  top 20. If the goal is truly top 20, the work needed is a different model
  family or a different snapshot feature set — neither of which the sealed data
  supports yet.

### Radar-5 files

- Scratch: `/tmp/radar5/` — `analyze5.mjs`, `analyze5b.mjs`, `analyze5c.mjs`
  (model batteries), `cg_markets.json`, `cg_trending.json`, `gecko_ids.txt`
  (CoinGecko fetch), `news-sweep.json` (44,625 B), `merge_news.py` (enrichment
  merge), `model-before-delete.ts` (pre-delete backup), `run1/`, `run2/`,
  `run2b/`, `run3/`, `run3b/` (build outputs), `render5.mjs` (62-check jsdom
  test), `shots5.mjs` (Playwright screenshots). Copy of the render/shots scripts
  also in `/tmp/radar4/verify/` (jsdom + Playwright live there).
- Radar-4 backup untouched: `~/workspace/makefun-tokenradar/radar-v2/` (the
  submitted tree; do not modify).
- Not submitted, not pushed, no repo created. Resubmit deadline (if approved):
  2026-12-14T10:00:00Z; quota left for token-radar-01: 4/day, 19 total.

## Radar-6 (Firecrawl deep-research pass, 2026-11-15, NOT submitted)

**Context.** Radar-5 was verified locally but not submitted (submit decision
pending; radar-4 live: rank 1721 of 4,220, judge 88.91%, top-20 bar ~95.3%).
Radar-6 is the deep-research pass the radar-5 plan named as its missing lever:
the Firecrawl API key is now connected (free tier, 1000 credits/month), so the
40 watchlist protocols got a cited funding / token / program / news pass with
the `firecrawl-deep-research` skill method (search first, targeted scrapes of
the best pages, primary sources preferred, every finding cited with a URL).
Radar-6 is built and verified locally only — no push, no submit, no repo
created. The submitted radar-4 tree is backed up untouched at
`~/workspace/makefun-tokenradar/radar-v2/`; the radar-5 tree is the base this
round started from (`/tmp/radar6/base/` holds its board output for diffing).

**Credits.** ~83 credits of the 1000/month free tier (34 searches x 2 + 15
scrapes x 1, counted from the call log; the helper does not always surface
`creditsUsed` on scrapes). The agent endpoint was never used — search +
scrape finished every task in a few calls. Pacing: 25 s between calls; the
free tier 429s otherwise. RootData was **not** retried (bot wall, as before).
Scratch: `/tmp/radar6/` (`fc.py` Firecrawl wrapper, `merge6.py`, `funding_test.mjs`,
`render6.mjs`, `shots6.mjs`).

### Coverage before / after

| Signal | Radar-5 | Radar-6 |
| --- | --- | --- |
| CryptoRank fundraising pages, watchlist | 5/40 | **6/40** |
| Funding totals, watchlist | 13/40 (9 verified) | **19/40 (12 verified)** |
| Rows with a funding total (all 198) | 14 | **20** |
| Material-news items | 33 across 21 rows | **36 across 23 rows** |
| `data/enrichment.json` (single-line minified) | 135,211 B | **148,284 B** |

CryptoRank objects now exist on **all 40 watchlist rows** (26 were null before;
the merge asserted the pre-existing non-null set was untouched). Every new
finding carries a per-row `source` URL in `data/enrichment.json`, same schema
as before.

### New verified funding totals (watchlist)

- **Ember — $5.3M Seed, verified** (31 Mar 2021; YC profile + Medium
  announcement agree; lead not named in either source).
- **Firelight — $8M seed, verified** (31 Aug 2026; official blog + GlobeNewswire
  agree; led by Bain Capital Crypto).
- **Hyperithm — $11M Series B, verified** (Crunchbase + Korea JoongAng Daily
  agree; Hashed + Wemade lead).
- **Keyrock — $72M confirmed, verified** (Series B, 31 Mar 2023; GlobeNewswire
  + FinExtra agree; Ripple led). Series C (31 Mar 2026) confirmed as a round
  with an undisclosed amount and a $1.1B valuation — it is **not** in the total.
- **Lagoon — $80M total, as reported, NOT verified** (single source: Decrypt
  newsletter, 1 Dec 2025; total_raised_verified=false).
- **Lofty — $5M+, verified** (YC-backed; S23 profile + official site agree;
  total is a floor, shown as $5M).

No-raise / not-applicable records were written for the rest of the watchlist
(parent-company totals recorded where the row is a product, e.g. Armitage =
Wintermute $56.8M, b14g = Babylon $70M, Plume Vaults parent Plume Network
$30M, Valos on Monad parent $244M; investment firms and pure protocols marked
as no VC raise). Two entity-mismatch traps were caught and excluded from the
feature test: the snapshot's Rain row is an Arbitrum prediction market, NOT
the $338M Rain card company; BiFi conflates three companies named Bifrost.

### Corrections

1. **Polymarket — funding total CORRECTED $3.87B -> ~$2.245B, verified.**
   The CryptoRank figure was unreconcilable with public rounds. Verified
   rebuild: Series B $45M (May 2024, Founders Fund) + ~$200M (Jun 2025,
   Reuters) + up to $2B ICE strategic investment (Oct 2025, ICE press release
   / Reuters / WSJ). Three rounds now listed with dates and leads; the
   $3.87B figure is gone from the board, dashboard and README.
2. **No program-status corrections.** The Firecrawl pass found no evidence
   contradicting any of the 40 program statuses radar-4/radar-5 set (live 10,
   token-live 6, yield-only 24). Saturn's STRN deadline (16 Nov 2026 09:00
   EST) and Plume PNP S1 end (Mar 2026) were re-confirmed, not changed.
3. **News added (3 items):** Polymarket ICE $2B (high), Keyrock Series C
   $1.1B valuation (high), Firelight $8M seed (medium).

### Model feature test — funding as a second regressor: REJECTED

Same blind gates as radar-4/radar-5 (LOO + time split + paired significance).
Spot test (`/tmp/radar6/funding_test.mjs`): n=9 traded tokens with a verified
funding total, Pearson r(log funding, curve residual) = **0.66**, t=2.31,
p≈0.054; slope 0.74 dex/dex; leave-one-out r stays 0.55–0.70. Suggestive but
**not significant**, and the full-set gate cannot be run without funding data
for all 128 fit-set tokens (~256 more credits + ~1 h of rate-limited pacing
for data that would still be mostly single-source). **Not adopted.** The
dashboard Method tab now says this in one sentence (r=0.66, p≈0.05,
untestable at full scale), and the README's old "raise factor would move one
row by ≤5% — noise, not signal" line is replaced with the same finding.

### What else changed

- **Dashboard text:** Method tab coverage line now reads 6/40 pages and
  19/40 totals, plus the funding spot-test sentence; the funding-anchor
  "no total" line reads 6/19; the latest-round line no longer renders a
  trailing "·" when a round has no date (Lagoon's Series A was the trigger).
- **README.md:** CryptoRank line updated to 6/40 + 19/40, Polymarket
  correction noted, funding-feature paragraph replaced with the spot-test
  result.
- **Model version:** `MODEL_VERSION` bumped `radar-5` -> `radar-6`
  (header now reads "Model radar-6"); the curve itself is unchanged.
- **No program, funding or news change touched a board value, rank or
  verdict** — funding is display-only, never a model input.

### Verification (all re-run after the final edit)

- `main.ts` exit 0; curve `log10(mcap) = 3.0247 + 0.5223 * log10(TVL)`,
  R² 0.1939; LOO median miss **3.6253x** (flat 4.8628x), time-split
  **2.8845x** (flat 4.7764x) — identical to radar-5.
- **Determinism: two runs byte-identical** (board.json 482,642 B, data.js
  584,688 B, dossier.json 835,737 B, dossier text 60,637 B — under caps).
- **Board diff vs radar-5 base: 0 rows** with a changed implied value, rank
  or verdict (FARM 66 / THIN 105 / SKIP 27, unchanged).
- **jsdom render test `/tmp/radar6/render6.mjs`: 85 passed, 0 failed**
  (62 carried over from radar-5 + 23 new radar-6 checks: 19/40 totals,
  12 verified, Polymarket $2.245B + 3 rounds + ICE news, all six new totals,
  firecrawl/cryptorank meta, keyrock/lagoon/polymarket dialog renders
  including the no-trailing-dot case, Method tab 19/40 + r=0.66).
- **3 screenshots retaken and visually verified** (Playwright,
  `/tmp/radar6/shots6.mjs`): board (header "Model radar-6"), Saturn detail
  dialog, Monad-filtered board (27 rows). Hashes:
  1-board `835be8e0…`, 2-detail `b7ec53f9…`, 3-filtered `96f58329…`.
  One console 404 only (favicon, same as radar-5).
- Radar-4 backup `radar-v2/` untouched; radar-5 base output kept at
  `/tmp/radar6/base/` for diffing.

### Honest assessment vs the 95.3% top-20 bar

Radar-6 does not move the needle on the binding constraint. The curve is
unchanged (R² 0.19, LOO 3.63x) and no board value, rank or verdict moved, so
the judge has nothing new to score on the two things that dominate pairwise
judging — the model's accuracy and the board's ordering. What radar-6 does
add is real, citable depth where the leader's board is also deep: funding
totals on 19/40 watchlist rows (12 verified), a corrected Polymarket figure
that was previously wrong, and three material-news items — the kind of
research-note quality a judge can see in the Method tab and in per-row
dialogs. That is worth something in a pairwise comparison against a thin
entry, but against the top-12 pattern (own-curve + blind backtest + costed
plans + full-board coverage, all at 95.5–96.2%) it is a polish increment, not
a step change. **Realistic expectation: low 90s at best, still short of the
~95.3% top-20 bar.** The only lever that could plausibly close the gap is a
genuinely better value model — and every candidate tested so far (fees,
quadratic, age/growth/chain, heat, funding) has failed the blind gates. The
next round (radar-7, all-skills) should be judged on whether it finds one
that passes, not on more enrichment.

## Radar-7 (full-skills round, 2026-11-15, NOT submitted)

**Context.** Radar-6 was verified locally but not submitted (submit decision
pending; radar-4 live: rank 1721 of 4,220, judge 88.91%, top-20 bar ~95.3%).
Radar-7 is the full-skills round: all 12 phase-1 skill findings in
`/tmp/radar7/<skill>/FINDINGS.md` applied by a single integrator, plus the
five editing skills (humanizer, doc-coauthoring, seo-geo,
architecture-diagram, frontend-design). Built and verified locally only — no
push, no submit, no repo created. The submitted radar-4 tree is backed up
untouched at `~/workspace/makefun-tokenradar/radar-v2/` (verified: 0 files
modified). Scratch: `/tmp/radar7/integrator/`.

**Baseline discipline.** `/tmp/radar7/base-radar6/` is radar-5 output and
`/tmp/radar6/run1/` is stale (enrichment changed after it) — neither is a
valid baseline. STEP 0 ran main.ts twice from the current tree into
`/tmp/radar7/integrator/base-current/run1` and `run2`: byte-identical. All
radar-7 diffs below are against that run.

### Model changes (lib/model.ts, MODEL_VERSION radar-7)

The curve is **unchanged**: log10(mcap) = 3.0247 + 0.5223·log10(TVL), R²
0.1939, n = 128. Implied values: **0 diffs**. Ranks: **0 diffs**. What
changed is costing, correctness, and evidence — so verdicts moved, values
did not. Verdicts 66/105/27 (FARM/THIN/SKIP) → **83/85/30**: 49 flips
(33 THIN→FARM, 13 FARM→THIN, 3 →SKIP, 0 SKIP→other).

- **Gas table (debugging #1, code-review M1, finance M2):** 18 chains → 62,
  with alias normalisation (Hyperliquid L1→hyperliquid, zkSync Era→zksync,
  BNB Smart Chain→bsc, etc.) and suffix stripping (L1/Mainnet/zkEVM/EVM).
  **0 rows fall back to the $0.25 default** on the sealed snapshot (was 79).
  Bitcoin $1.50, Ethereum $2.50, cheap L2s $0.01–0.05.
- **Weekly transactions removed for hold-only mechanisms (farm-realism
  T1):** researched programs are all hold-only, and the template keeps a
  weekly action only for liquidity, perps, prediction, bridging, payments
  and chain-apps. This is the main THIN→FARM driver: the old plan charged
  $30 of Ethereum gas for weekly actions that do not exist. Read-only
  second steps cost 0 txs (T2); acquire steps added where the slice is not
  the deposit asset/chain (T3, `actionTxs: 2`); step 1 names the right
  wallet per chain family (T4, `walletFor`).
- **Costing policy (decided once, disclosed in Method):** gas is costed on
  the chain where the plan's steps execute (first/plan chain), NOT the
  cheapest listed chain. Finance M7's cheapest-chain flip is NOT applied.
  Sensitivity recomputed under radar-7 costing: only **3 rows** would flip
  THIN→FARM under cheapest-chain costing (circle-gateway, arrakis-modular,
  origami-finance); 3f and communityv3 are Ethereum-only; abstract is
  capped at THIN as chain-apps regardless of cost. (Radar-6 figure: 21.)
- **SKIP by access is now $0.00 opportunity cost (debugging #3, finance
  M1):** capital never deploys. Six rows: Lightning Network, Valos, Galaxy
  Curation (as before) plus OpenTrade, b14g, Curvance (new SKIPs, below).
- **Verdict caps (farm-realism T8/T9):** perps, prediction markets,
  payments, governance and chain-apps are capped at THIN — positioning,
  not a first-token farm. Perps actions rewritten to "1x hedge only — no
  leverage"; prediction actions add "sized as money you can lose".
- **Growth clamp removed (debugging #2):** `growth_pct` is now the raw
  7d change (shift-defi +4448.47%, nuva +160.80%, monolith-market
  +162.86%, anemoy-capital −72.71%) so board.json and the dashboard agree.
- **Duplicate sources deduped (debugging #4):** 0 rows with duplicate
  source entries (was 4: usdd, axis, saturn, firelight).
- **Mechanism taxonomy (debugging #7):** "Indexes" no longer maps to
  liquidity (dex check now excludes "index"); anchor/decentralized BTC →
  staking; farm → yield-farming; option → perps; card/OTC/marketplace →
  payments.
- **Flat-baseline leakage fixed (code-review S2):** the flat multiple is
  now refit per LOO fold and from the older set only in the time split.
  Recomputed: LOO flat **5.0696x** (was 4.8628x leaked), time-split flat
  **5.378x** (was 4.7764x). All quoted flat figures updated consistently
  (dashboard, model.ts header comment, this report). Shipped backtest:
  LOO curve+category 3.6253x (curve-only 3.3987x), time-split
  curve+category 3.3275x (curve-only 2.8845x), OOB 3.5518x (90% CI
  2.7054–5.0429x). Time-split coverage now disclosed: 95/128 traded
  tokens (33 lack `listed_at`; `time_split_excluded_n: 33` in data.js).
- **New per-row evidence (superpowers #1, #2):** 3 nearest traded
  neighbours per row (closest in log10 TVL, with TVL/mcap/multiple) and
  rank stability (`rank_curve_only`, `rank_flat` per row;
  `rank_stability` in data.js: **5 of the top 10 move** under the
  curve-only or flat ranking, max move 10 — bitfi-basis, 9th to 19th).
  Curve-only and flat give the same order (both monotone in TVL), so
  every move comes from the category factor alone.
- **Board schema:** rows now carry a `watchlist` flag (40 flagged).
  `boardIssue` now checks rank==position and the real invariant
  net === gas + opportunity. `parseSnapshot` rejects TVL ≤ 0 and
  duplicate slugs; `parseEnrichment` shape-validates each entry.
  `missStats`/`ols` throw on degenerate inputs; bootstrap constants
  hoisted (200 reps, seed 20261115); `signalQuality` takes a boolean
  instead of parsing a string; `main.ts` stdout now labels both backtest
  variants explicitly. S12 (screenshot gate before first write) skipped
  as low value — screenshots are static files under our control.
- **Top-row band (debugging #9, finance M5):** the stability paragraph
  now renders the real band from data.js: Sentora Curator
  $75,182,315–$124,730,715 on $90,185,322 = **−16.6%/+38.3%** (not
  "±30%"). Bands are refit disagreement only, not prediction intervals
  (finance M8) — stated in the Method tab.

### Farm-plan corrections (farm-realism, 33 corrections + 3 blocked → SKIP)

- **OpenTrade → SKIP:** accredited/KYC-only, no retail route.
- **b14g → SKIP:** Merge Marketplace contract exploited 31 Oct 2026
  (~97M CORE, ~$1.47M drained).
- **Curvance → SKIP:** independent risk report moved it from "caution" to
  "avoid" (30 Sep 2026); WBTC redemptions paused.
- **Saturn:** REGISTER FIRST at claim.saturn.credit before **16 Nov 2026
  09:00 EST** — after that, no STRN claim is possible; Pendle YT-USDat
  is an optional, explicitly loss-capped slice only.
- **Hyperithm:** STRN registration deadline and US/EEA/UK exclusion in
  the action. **Clearstar:** TBILL $100k/accredited gate. **OnRe:**
  secondary-market buy route + NAV LP warning. **Lofty:** KYC/accredited
  gate prepended; secondary step is a read-only price check.
- **Nine watchlist plans carry a dated safety flag** in their steps
  (b14g, OnRe, Doppler, USDD, Steakhouse, Axis, Firelight, Saturn,
  Curvance) — the positioning brief said eight; a direct grep of
  `FARM_PROGRAMS` counts nine, so the dashboard says nine.
- **Yield-only re-check trigger (T10):** every yield-only row now appends
  "Re-check: <name>'s points/blog page monthly; a new season
  announcement changes this row from yield-only to points."
- All 17 remaining per-row edits applied (lagoon, nonce-capital,
  armitage, ember, gami-labs, k3-capital, keyrock, lofty, r25,
  reti-pooling, saturn, tori-finance, tulipa, tydro, yuzu-money, axis,
  infinifi) — see the STEP-2 notes in `/tmp/radar7/integrator/` for the
  per-row detail. Gauntlet, lightning-network, valos, galaxy-curation
  needed no per-row change.

### Sentiment full test (STEP 1) — REJECTED (2026-11-15, second agent)

**Verdict: REJECT — do not adopt.** The follower signal improves
leave-one-out but fails the time split decisively, so it fails the
pre-registered gate (both LOO < 3.6253x and time-split < 2.8845x, both
paired Wilcoxon p<0.05). No model change, no enrichment change, no board
fetch run.

**Method.** X follower counts for the 128 traded tokens, handles audited
against DefiLlama `twitter` fields (128/128 present). Fetched with the
Firecrawl helper: search `"x.com/<handle> followers"`, limit 1–2, parsing
the `Followers: N` profile card, with a second parser pass for the bio
form (`68.6K Followers`, `2,490 Followers`); 2 credits per search. The
replication script (`/tmp/radar7b/sentiment_test.py`) first reproduces
`lib/model.ts backtest()` exactly — all six shipped medians matched to
4 decimals and the full fit (a=3.0247, b=0.5223, R²=0.1939) — then adds
the pre-registered sentiment term: log10(mcap) = a + b·log10(TVL) +
c·log10(followers), category prior recomputed on the new residuals (same
n≥3, shrink n/(n+3), clamp ±0.5 dex), LOO refitting everything per fold,
time split fitting on the older set only.

**Coverage: 118/128 (92.2%).** Missing 10 after two fetch passes:
cronos-zkevm-bridge, falcon-finance, gains-network, looped-hype, mexc,
renzo, sdai, tectonic, veno-finance, zyfai (no profile card surfaced, or
transient helper errors with empty stdout). 29 of the 118 values are
K/M-rounded from search snippets (log10 error <0.001 dex — negligible).
Baselines below are recomputed on the same 118-token subset for a fair
paired comparison; the full-128 shipped numbers are the gate thresholds.

**Results.**

- Pilot-style correlation, log10(followers) vs the shipped curve's
  log-residual: **r=0.24, p=0.0089 (n=118)** — far weaker than the
  pilot's r=0.59, p=0.007 (n=19). The pilot was a small-sample artifact.
- Full fit: a=2.5800, b=0.3728, **c=0.3377 (se 0.1127, t=3.00,
  p=0.0034)**, R² 0.1939 → 0.2324. Real in-sample, like the pilot.
- **LOO (n=118): sentiment curve+cat 3.3548x** vs 3.7766x baseline on
  the same subset (gate 3.6253x: passes); curve-only 3.5251x vs 3.6159x.
  Paired Wilcoxon vs curve+cat **p=0.0197** (passes); vs curve-only
  p=0.086.
- **Time split (fit 57 / test 29 / excluded 32): sentiment curve+cat
  4.7677x** vs 3.4026x baseline on the same subset; curve-only 3.4785x
  vs 3.1273x. Gate 2.8845x: **fails by a wide margin**. Paired Wilcoxon
  vs curve+cat **p=0.983**, vs curve-only p=0.654 — no improvement at
  all.
- **Exchange-account sensitivity (drop the CEX rows, n=110 — 8 fetched
  CEX rows dropped, mexc unfetched):** same pattern. LOO cat 3.4734x vs
  3.5651x baseline (improves); time-split curve 5.7935x / cat 4.6256x
  vs 3.2212x baseline (far worse). The failure is **not** an
  exchange-account artifact.
- **Exchange flags (audited):** okx = 5,559,983 followers is the
  exchange's account, not the protocol's; all 9 CEX traded rows
  (backpack, biconomy.com, bitkan, bitkub, gate, mexc, nexo, okx,
  swissborg) carry their exchange's account. sdai's DefiLlama handle
  (`gnosis_`) points at the Gnosis Chain account, not a product account.
  falcon-finance's DefiLlama handle (`falconstable`) is stale — the live
  account is @FalconStable (still unfetched after a retry under the
  corrected handle).

**Credits: 381 total** — 372 tracked in
`/tmp/radar7b/traded_followers.json` (128-token fetch + retry pass) + 7
pilot method tests (aave search 2 + aave scrape 5) + 2 for one duplicate
staderlabs check. No board-row fetch was run: the test rejected first,
and it would also have breached the budget (381 + 350 for the 175
not-yet-fetched board handles = 731 > ~600).

**Reading:** the follower count carries signal about *past* listings and
none about *future* ones — the coefficient fitted on tokens listed
>2 years ago does not price tokens listed since. That is exactly what
the time split is for, and it is why the pilot's LOO-only improvement
never licensed adoption. Follower count joins the graveyard: tested at
full scale, rejected on the time split.

### Dossier / dashboard content (positioning, report-structure, superpowers, arxiv)

- **Key-numbers table + revision table** (Method tab, computed from
  DATA at render time — no hard-coded figures).
- **Executive summary:** the lede now opens with the bottom line
  ("size predicts launch value only roughly…") and the facts column adds
  the verdict split (FARM 83 · THIN 85 · SKIP 30) and the curve line.
  "Watchlist covered" now counts actual watchlist rows (S7).
- **Graveyard:** all 21 rejected model candidates listed, with the five
  that have numbers in a table (per-family multiples 4.8–5.0x LOO
  p≈0.001–0.003; piecewise linear LOO p=0.0091; heat 0/128 covered;
  funding r=0.66 n=9 p≈0.054; shrink sweep contradicted on 25× repeated
  80/20 splits).
- **Corrections log:** Veda/Firelight/Noble live→yield-only, Axis
  yield-only→live, Plume PNP live→ended Mar 2026, Polymarket
  $3.87B→~$2.245B verified, Saturn STRN confirmed.
- **Entity disambiguation:** Rain = Arbitrum prediction market (not the
  $338M card company); Axis = axis.to (not Axis Robotics); BiFi
  conflates three Bifrost companies; Bittensor row is the dTAO subsystem;
  Hive row is B2/BSquared Network.
- **Sources table now has a Link column** (url_pattern rendered as a
  real link where it is a host) plus source lines under the scatter,
  backtest and category tables. Sealed snapshot listed with no public
  URL, as it should be.
- **Risks section:** model, category, smart-contract/incident, access,
  deadline and assumption risk, plus "what would change this board".
- **Arxiv grounding:** 5 Method sentences + contradictions (Cong, Li &
  Wang 2021; Wheatley et al. 2018; Luo et al. 2024; Saggese et al. 2025;
  Bailey et al. 2017; Gort et al. 2022; Wolfers & Zitzewitz 2004;
  Plazuelo Pascual et al. 2025; Brigida 2025, 2026 — TVL carries no
  incremental return signal, stated, not buried). Flat figures in the
  sentences updated to the recomputed 5.07x (beats flat by ~28%).
- **Finance disclosures:** M7 first-chain rule + 3-row sensitivity; M8
  bands are refit disagreement only; M9 category priors from n=3–4;
  M10 fit includes set-aside token types (slope 0.52→0.41, R² 0.19→0.10
  without them).
- **Pillar verdicts:** "What could be wrong" re-cut into three labelled
  pillars (curve: weak but real; category prior: mixed; enrichment as a
  second signal: not established) + the 2.01x rebuttal with its Bailey et
  al. 2017 citation.
- **Headline labelling fixed (finance M4):** lede and "Reading it
  honestly" now quote the shipped board — curve+category 3.6253x LOO /
  3.3275x time-split — with curve-only (3.3987x / 2.8845x) and flat
  (5.0696x / 5.378x) named beside them.
- **Coverage figures corrected:** fees 112/198 rows (107 with fees > 0),
  not 108; fundraising (/ico/) pages **5/40** (Gauntlet, Saturn,
  Hyperithm, Hive-protocol, Tori-finance), not 6 — radar-6 counted 6 by
  conflating page types (OpenTrade's price page, Veda's CoinTelegraph
  article, infiniFi's insights page are not /ico/ pages). Funding totals
  19/40 (12 verified, 7 as reported). News 36 items across 23 rows (10
  high, by materiality — the "8 high" in radar-5/6 meta was never
  re-verified and is now corrected).
- **Enrichment meta strings fixed** (farm_plans 10 live / 6 token-live /
  24 yield-only; news_sweep 36 across 23 rows, 10 high; cryptorank
  coverage 5/40 with the conflation noted; firecrawl entry corrected).
  File stays single-line minified: 148,574 B (was 148,284 B).
- **Dashboard bug fixes:** Farm-verdict sort inversion (FARM:2, THIN:1,
  SKIP:0 — first click now puts FARM first, verified by probes 6/6);
  scatter y-floor 5→4 with a 1e4 tick (4 traded points were hidden);
  bar max over the full board, not the first visible row (S8).
- **Pipeline diagram (architecture-diagram):** compact inline SVG in
  the Method tab (snapshot → OLS fit → category prior → board+bands →
  farm costing), enrichment marked display-only.
- **SEO/GEO:** meta description + Open Graph tags + JSON-LD Dataset in
  index.html. **Frontend-design:** no data changes; new sections reuse
  the existing `.mult-table` pattern; one CSS rule added (`.pipe`).
  **Humanizer:** new copy written plain, numbers and citations intact;
  **doc-coauthoring:** every new claim verified against the fresh build
  before writing (see the claims audit in the integrator notes).
- **Byte budget:** dossier text 60,745 B → **64,738 B** (cap 65,536 B;
  798 B headroom). Funded by trimming the "What could be wrong"
  duplication, the foot disclaimer, and code comments. Walk-forward
  time-split chart deferred (does not fit); verdict-distribution strip
  deferred; one-page memo deferred; LOO error bars deferred.

### Verification (STEP 3)

- Two fresh runs byte-identical (`diff -r` clean, board.json + data.js +
  dossier.json).
- Board diff vs STEP-0 baseline: **0 implied-value diffs, 0 rank diffs,
  49 verdict flips** (33 THIN→FARM, 13 FARM→THIN, 3 →SKIP).
- `/tmp/radar7/tdd/render7.mjs`: **166/166 PASS**.
- Playwright `/tmp/radar7/webapp-test/test-dashboard.mjs`: **48/48
  PASS** (one test expectation updated: Sentora Curator is FARM in
  radar-7, was THIN in radar-6 — the test hard-coded 'THIN'); probes
  `/tmp/radar7/webapp-test/test-probes.mjs`: **6/6 PASS** (incl. the
  sort fix).
- Dossier text 64,738 B < 65,536 B; dossier.json 884,894 B < 1.5 MiB.
- Screenshots retaken with `/tmp/radar7/integrator/shots7.mjs` and
  verified visually (board, Saturn detail with neighbours, Monad
  filter — 27 rows).
- radar-v2/ untouched (0 files modified); enrichment.json still
  single-line minified (0 newlines).

### Recovery note (STEP A re-verification, 2026-11-15, second agent)

The first radar-7 integrator died in a VM restart ("restart drain") which
also wiped `/tmp` entirely — its phase-1 findings, STEP-0 baseline and all
test scripts were lost; only the entry tree survived. This agent re-verified
the tree from scratch (scripts in `/tmp/radar7b/`, key numbers here because
evidence that matters must live in the tree, not `/tmp`):

- **Determinism:** two fresh runs from the current tree into
  `/tmp/radar7b/verify/run1` and `run2` — byte-identical (`diff -r` clean:
  board.json + data.js + dossier.json). Both runs print the same curve
  (3.0247 + 0.5223·log10(TVL), R² 0.1939) and backtest (LOO curve+category
  3.6253x, curve-only 3.3987x, flat 5.0696x; time-split 3.3275x / 2.8845x /
  5.378x).
- **Board:** 198 rows; verdicts FARM 83 / THIN 85 / SKIP 30; watchlist
  flagged 40; 0 duplicate slugs; rank == position on all rows; net ===
  gas + opportunity on all rows; 0 rows with duplicate sources.
- **Gas fallbacks:** 0 rows — verified by re-running `farmPlan` for every
  row with a poisoned model copy (`gas_default_usd: 999999`); no row's gas
  moved. `MODEL.gas_usd` holds 61 chains (the "62" in this report and the
  dashboard is the gas table's row count: 61 chains + the $0.25 default
  row). The poisoned-model check also reproduced every row's gas, net and
  verdict exactly.
- **Per-row evidence:** 198/198 rows carry 3 neighbours and
  `rank_curve_only`/`rank_flat`; top-10 stability 5 moved, max move 10
  (bitfi-basis 9th → 19th) — matches the shipped `rank_stability`.
- **SKIP by access:** exactly the 6 named rows (opentrade,
  lightning-network, valos, b14g, galaxy-curation, curvance) carry $0.00
  opportunity cost; the other 24 SKIP rows carry $10.36 (cost/quality
  SKIPs, correctly charged).
- **Dossier caps:** text 64,738 B < 65,536 B (798 B headroom); dossier.json
  884,894 B < 1.5 MiB. Enrichment 148,574 B, single-line minified
  (0 newlines). Dashboard files in the fresh run are identical to the
  tree's (`diff -r` clean).
- **Board/data.js consistency:** 198/198 board slugs present in data.js;
  implied values and verdicts identical; data.js backtest and
  `rank_stability` match the run output.
- **Render check (recreated, jsdom 31.0.1, `/tmp/radar7b/render/render7b.mjs`):**
  **40/40 PASS** — 4 tabs render (pre-token 198 rows, live 416, set-aside
  144, Method with key numbers / scatter / graveyard); every DATA row
  rendered and no extras; detail dialog opens on row click (Saturn, 3
  neighbours, 7 farm steps, band) and closes; Farm-verdict sort first
  click puts FARM first and last row SKIP, second click puts SKIP first;
  search "saturn" → 1 row; watchlist-only → 40 rows; Monad filter →
  27 rows; zero console errors. (Two first-run failures were test bugs,
  not dashboard bugs: jsdom 31 ships `showModal` but not `close()` —
  polyfilled in the test — and the row selector counted the dialog's
  neighbour rows until scoped to `.table-wrap`.)
- **Screenshots (visually inspected, not re-rendered — no headless
  browser on this VM):** 1-board matches the current dashboard (radar-7,
  40/40, 198 rows, FARM 83 · THIN 85 · SKIP 30, top 5 Sentora $90.2M /
  Steakhouse $90.1M / Gauntlet $67.4M / Veda $67.1M / USDD $47.6M);
  2-detail shows Saturn rank 32 of 198 with neighbours Stader / USD AI /
  cap and band $17.6M–$23.1M; 3-filtered shows the Monad chain filter with
  "27 rows shown", first row Steakhouse Financial rank 2 — all consistent
  with the fresh run and the jsdom render check.
- **radar-v2/ untouched:** all files still dated 2026-11-15 11:44;
  enrichment.json still 120,982 B with zero "radar-5" mentions; the only
  git diff vs its HEAD is the pre-existing uncommitted REPORT.md (+15
  lines, from backup time). This agent made no write to radar-v2/.
- **Not re-verified:** the STEP-0 board diff (49 verdict flips, 0
  implied-value / 0 rank diffs) cannot be recomputed — its baseline was in
  the wiped `/tmp`. The verdict counts (83/85/30) and the 0-diff claims
  about values/ranks are consistent with the fresh run (curve unchanged,
  0 implied-value movement possible), but the 49-flip count itself is
  taken on the dead integrator's record, not independently reproduced.

### Skills used — per-skill outcome

- **spike:** all 3 variants invalidated (isotonic, kernel local-linear,
  TVL×category interaction — all Wilcoxon p>0.05). No model change.
- **sentiment:** full-128 test — see STEP 1 above. **REJECTED:** LOO
  improves (3.3548x, Wilcoxon p=0.0197) but the time split fails
  decisively (4.7677x curve+cat, p=0.983); coverage 118/128, 381
  Firecrawl credits. No model change.
- **debugging:** 9 confirmed bugs — all fixed (gas table, growth clamp,
  SKIP opportunity, dup sources, scatter y-floor, stale Method prose,
  mechanism taxonomy, mixed backtest variants, top-row band).
- **code-review:** must-fix M1 + should-fix S1–S12 addressed except S12
  (screenshot gate before first write — skipped, low value).
- **finance:** M1–M11 addressed; M7 cheapest-chain flip explicitly NOT
  applied (costing policy decided once, disclosed); M7 sensitivity
  recomputed (21 → 3 rows).
- **farm-realism:** 33 corrections + 3 blocked → SKIP applied; T1–T10
  applied.
- **positioning:** 5 moves applied (graveyard, corrections log, entity
  disambiguation, safety-flag aggregation — corrected 8 → 9 on a direct
  grep, determinism claim). "Do not claim" list respected throughout.
- **report-structure:** §§1–3, 5 fixes, 6 (pillar re-cut), 7 (risks),
  8 (folded into risks), 9 (192-vs-198 sentence), 10 (sources with
  links). §11 walk-forward chart + verdict strip deferred on bytes.
- **superpowers:** #1 neighbours and #2 rank-stability built; #3
  walk-forward chart deferred on bytes; #4–#10 not built (toggle,
  funding column, cost bar, coverage strip, memo, LOO bars, rank
  sensitivity — out of byte budget / scope). Note: superpowers'
  "fundraising pages 2/40" was checked against the radar-5 baseline
  and is stale — the live tree has 5 /ico/ pages, verified directly
  from board.json.
- **arxiv:** 10 papers cited; 5 Method sentences pasted (flat figures
  updated to recomputed values) + 6 honest contradictions.
- **tdd:** render7.mjs 166/166.
- **webapp-test:** Playwright 48/48 + probes 6/6.
- **humanizer:** applied to new/rewritten copy; every number and
  citation preserved.
- **doc-coauthoring:** dossier structure/citations/claims audit applied;
  every new figure recomputed from the fresh build.
- **seo-geo:** meta + OG + JSON-LD in index.html.
- **architecture-diagram:** pipeline SVG in the Method tab.
- **frontend-design:** visual-only polish; no data changes.
- **Blocked:** okx-sentiment-tracker (needs OKX CLI + credentials);
  persona-researcher (needs gws CLI).
- **Skipped (one line each):** akshare-stock (A-shares irrelevant);
  weekly-review-planning (not a weekly review); product-price-monitor
  (no product prices to watch); enhance-prompt (Stitch UI only);
  binance-agentic-wallet (no wallet action in this round);
  bsc-contract-audit (no mint to audit); launch-curve-audit (no launch
  curve to audit); fastmint-fcfs (no mint to execute); documents /
  documents_editable_decks (no document deliverable);
  skill-creator (no new skill created); mcp-builder (no MCP server);
  internal-comms (no internal comms); crawl4ai (live crawling fails on
  this VM); yt-dlp (no video).

### Honest assessment vs the 95.3% top-20 bar

Radar-7 changes verdicts, not values: the curve is unchanged (R² 0.19,
LOO 3.63x) and no implied value or rank moved, so the judge has nothing
new to score on the two things that dominate pairwise judging — the
model's accuracy and the board's ordering. What radar-7 does add is
real and visible where a judge reads: a corrected, cheaper farm screen
(83 FARM vs 66, with the weekly-tx overcharge removed and three
genuinely unsafe rows now SKIP), per-row case evidence (nearest traded
neighbours), an auditable rank-stability number, the full 21-candidate
graveyard, a corrections log, and a Method note that now cites its
sources with links and states its limits before its results. Against the
top-12 pattern (own-curve + blind backtest + costed plans + full-board
coverage, all at 95.5–96.2%) that is still a polish increment, not a step
change — the gap is a better value model, and every candidate tested so
far has failed the blind gates. **Realistic expectation: low 90s at best,
still short of the ~95.3% top-20 bar — unless the sentiment full test
above adopts a follower input that passes both gates, which would be the
first model change since radar-3.**
