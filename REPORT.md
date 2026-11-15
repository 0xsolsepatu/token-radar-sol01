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
- `~/workspace/makefun-tokenradar/radar/lib/model.ts` (69,331 B) — radar-3 model +
  radar-4 `FARM_PROGRAMS` (40 researched watchlist plans)
- `~/workspace/makefun-tokenradar/radar/dashboard/index.html` (448 B),
  `dashboard/app.css` (11,523 B), `dashboard/app.js` (41,256 B)
- `~/workspace/makefun-tokenradar/radar/vendor/makefun-board.ts` (19,788 B, kit file,
  copied byte for byte — sanctioned)
- `~/workspace/makefun-tokenradar/radar/data/enrichment.json` (120,982 B)
- `~/workspace/makefun-tokenradar/radar/screenshots/` — 1-board.png (173,646 B),
  2-detail.png (245,272 B), 3-filtered.png (177,719 B) (final radar-4 shots)
- `~/workspace/makefun-tokenradar/radar/README.md`, `LICENSE` (MIT), `REPORT.md` (this file)
- `~/workspace/makefun-tokenradar/radar-v1/` — byte-identical backup of the radar-3 entry
- Test outputs: `/tmp/radar4/final/` (final build), `/tmp/radar4/final2/` (determinism
  comparison), `/tmp/radar4/radar3regen/` (radar-3 board regenerated from `radar-v1/`
  for the before/after diff), `/tmp/radar4/verify/render4.mjs` (39-check jsdom render
  test), `/tmp/radar4/verify/shots4.mjs` (Playwright screenshot script),
  `/tmp/radar4/analyze.mjs`, `analyze2.mjs`, `analyze3.mjs`, `knn.mjs` (model test
  battery), `/tmp/radar4/enrich2.mjs` (enrichment round-2 script), `/tmp/fees.json`
  (DefiLlama Fees API, 31 MB), `/tmp/fees30d.json`, `/tmp/coingecko-rest.json`
