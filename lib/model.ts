// Token Radar's model (radar-3): one snapshot of the protocol universe in, one ranked board out.
//
// The board covers all 198 rankable pre-token protocols: the snapshot's 40-protocol watchlist
// (the floor, never a ceiling) plus the 158 other rankable pre-token protocols below the floor.
// The snapshot's own partition reconciles exactly under the house rule as RULES.txt states it:
// 758 protocols = 416 that record a token + 198 rankable pre-token + 144 set aside (wrapped /
// staked / bridged products, exchanges and versioned pools). The public leader's board covers
// 192, six fewer than the house rule yields; the six are the leader's own narrower cut, not the
// house rule — and the gate requires the whole watchlist covered, including its two
// Chain-category members (Hive Protocol, Noble), so this board ranks all 198. A protocol is
// pre-token when its
// record carries no token (no CoinGecko id, no symbol); live-token protocols are kept apart and
// shown with the market's own values, never mixed into the ranked board. Say a protocol
// "records no token", never that it has none: DefiLlama's record is not proof, and a protocol on
// the list may still have a token its record does not carry.
//
// Implied value follows from the snapshot's own traded tokens, not from a hand-made formula.
// The model fits a size curve on the 128 live-token protocols that carry both a market cap and a
// TVL — ordinary least squares on log10(market cap) against log10(TVL) — and prices each
// pre-token protocol on that curve, with one shrunken category prior: the median log-residual of
// the traded tokens in the protocol's category, used only where at least 3 traded comparables
// exist, shrunk by n/(n+3) and clamped to +-0.5 dex (a factor of 0.32x to 3.16x). Growth, age and
// chain breadth are shown for every row but are NOT multiplied into the value: blind testing
// showed they do not improve prediction out of sample (see backtest below), so they are context,
// not levers. The model never predicts whether or when a token is issued: it prices the
// protocol as it stands.
//
// The curve is weak and the board says so. On the snapshot's own traded tokens the curve's
// leave-one-out median miss is about 3.6x for the curve-plus-category board (3.4x
// curve-only) and only about 44% of real caps fall within 3x of the curve's prediction;
// the flat median multiple it replaces misses by about 5.1x. The curve is a
// rough anchor, not a prediction, and the dashboard's scatter chart shows the scatter instead of
// hiding it. Every value is traceable: each row carries its curve value, its category factor and
// the comparables behind it, so the reader can see exactly what the adjustment adds.
//
// Farm plans are costed in dollars and netted. Every step carries its transactions, its chain
// and its minutes; gas is priced from a stated table of typical November 2026 fees, and the
// opportunity cost of the $1,000 slice is priced against a 4.2% T-bill yield over a 90-day
// horizon. The verdict is a cost-and-quality screen, not a promised return: FARM when the net
// cost is small and the protocol shows real usage, THIN when the cost is bearable or the usage
// is thin, SKIP when the cost eats the slice or the protocol shows no usage signal at all.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** Build-time enrichment for one protocol, baked into data/enrichment.json (never fetched live). */
export interface Enrichment {
  sources: string[];
  fees: { fees_30d_usd: number; fees_7d_usd: number; fees_all_time_usd: number } | null;
  coingecko: { checked: boolean; native_token: { id: string; name: string; symbol: string; note: string } | null; note: string } | null;
  cryptorank: {
    url: string;
    token_status: string;
    watchlists: number | null;
    total_raised_usd: number | null;
    total_raised_verified: boolean;
    verification_note: string;
    rounds: { stage: string; date: string; raised_usd: number | null; note: string }[];
    investors_note: string;
  } | null;
  /** Token Terminal's public per-token metrics page for a Morpho vault share (no key needed). */
  tokenterminal: { url: string; note: string } | null;
  /** Material news for this protocol from the radar-5/radar-6 sweeps (build time, primary sources only). */
  news: { date: string; category: string; title: string; source_url: string; materiality: 'high' | 'medium' | 'low' }[] | null;
}

/** The enrichment document: per-slug facts plus what each source contributed. */
export interface EnrichmentDoc {
  meta: { fetched_at: string; snapshot_as_of: string; sources: Record<string, { what: string; fetched: string; coverage_watchlist: string; url_pattern: string }> };
  protocols: Record<string, Enrichment>;
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  min_category_comparables: number;
  category_shrink: number;
  category_clamp_dex: number;
  time_split_days: number;
  slice_usd: number;
  tbill_yield: number;
  horizon_days: number;
  farm_cost_farm_usd: number;
  farm_cost_thin_usd: number;
  gas_usd: Record<string, number>;
  gas_default_usd: number;
}

export const MODEL: ModelConstants = {
  min_category_comparables: 3,
  category_shrink: 3,
  category_clamp_dex: 0.5,
  time_split_days: 730,
  slice_usd: 1000,
  tbill_yield: 0.042,
  horizon_days: 90,
  farm_cost_farm_usd: 30,
  farm_cost_thin_usd: 80,
  gas_usd: {
    ethereum: 2.5,
    base: 0.05,
    arbitrum: 0.1,
    optimism: 0.05,
    bsc: 0.15,
    binance: 0.15,
    solana: 0.01,
    polygon: 0.02,
    avalanche: 0.1,
    unichain: 0.05,
    ink: 0.05,
    katana: 0.05,
    morph: 0.05,
    hyperliquid: 0.05,
    sui: 0.01,
    aptos: 0.01,
    tron: 0.1,
    ton: 0.02,
    // Radar-7: every first chain on the sealed board is priced, so no row
    // falls back to the $0.25 default (verified: 0 default fallbacks).
    // Values are stated typical November 2026 fees, not quotes.
    bitcoin: 1.5,
    monad: 0.01,
    stellar: 0.01,
    flare: 0.02,
    mantle: 0.01,
    berachain: 0.01,
    bittensor: 0.05,
    bifrostnetwork: 0.02,
    plume: 0.02,
    plasma: 0.01,
    arc: 0.05,
    provenance: 0.01,
    stacks: 0.05,
    bsquared: 0.05,
    rise: 0.01,
    ronin: 0.01,
    kava: 0.01,
    algorand: 0.01,
    manta: 0.02,
    proton: 0.01,
    mezo: 0.05,
    noble: 0.01,
    qubic: 0.01,
    pharos: 0.01,
    worldchain: 0.01,
    reyanetwork: 0.01,
    rsk: 0.02,
    strato: 0.05,
    klaytn: 0.02,
    zksync: 0.02,
    canton: 0.05,
    tempo: 0.02,
    stable: 0.01,
    fluent: 0.01,
    starknet: 0.02,
    xion: 0.01,
    sei: 0.01,
    sonic: 0.01,
    scroll: 0.01,
    xrpl: 0.01,
    opbnb: 0.01,
    robinhoodchain: 0.05,
    ripple: 0.01,
  },
  gas_default_usd: 0.25,
};

/** Chain-name aliases: DefiLlama's display names normalised to a gas-table key. */
const CHAIN_ALIASES: Record<string, string> = {
  hyperliquidl1: 'hyperliquid',
  polygonzkevm: 'polygon',
  zksyncera: 'zksync',
  xrplevm: 'xrpl',
  bittensorvm: 'bittensor',
  bittensionevm: 'bittensor',
  bnbsmartchain: 'bsc',
  bnbchain: 'bsc',
};

/** The bootstrap's shared constants: one seed and one rep count for both consumers. */
const BOOTSTRAP_REPS = 200;
const BOOTSTRAP_SEED = 20261115;

/** One bootstrap resample of the traded tokens, with the set of indices it drew. */
function drawBootstrapSample(traded: SnapshotProtocol[], rng: () => number): { sample: SnapshotProtocol[]; drawn: Set<number> } {
  const drawn = new Set<number>();
  const sample: SnapshotProtocol[] = [];
  for (let i = 0; i < traded.length; i++) {
    const j = Math.floor(rng() * traded.length);
    drawn.add(j);
    sample.push(traded[j]!);
  }
  return { sample, drawn };
}

/** The model's version label: the dashboard names it. */
export const MODEL_VERSION = 'radar-7';

/** A costed farm step: the action, its transactions on one chain, and its minutes. */
export interface FarmStep {
  text: string;
  txs: number;
  chain: string;
  minutes: number;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  watchlist: boolean;
  age_days: number | null;
  implied_value_usd: number;
  /** Rank by the curve alone (no category factor) — the same order as TVL, since the curve is monotone in TVL. */
  rank_curve_only: number;
  /** Rank by the flat median multiple — likewise the TVL order. */
  rank_flat: number;
  /** The 3 traded tokens closest in TVL: the curve's verdict checked case by case. */
  neighbours: { slug: string; name: string; tvl_usd: number; mcap_usd: number; multiple: number }[];
  model: {
    curve_value_usd: number;
    curve_a: number;
    curve_b: number;
    category_adjustment_dex: number;
    category_factor: number;
    category_comparables: number;
    category_source: string;
    growth_pct: number | null;
    age_days: number | null;
    chains_count: number;
    /** Middle 50% of 200 bootstrap refits of this row's implied value (radar-5). */
    implied_low_usd: number;
    implied_high_usd: number;
    /** The mechanism this row's farm plan follows (radar-5). */
    mechanism: string;
  };
  signal_quality: 'strong' | 'fair' | 'thin';
  farm_steps: string[];
  farm: {
    gas_usd: number;
    opportunity_usd: number;
    net_usd: number;
    minutes: number;
    txs: number;
    verdict: 'FARM' | 'THIN' | 'SKIP';
  };
  fees_30d_usd: number | null;
  fees_7d_usd: number | null;
  fees_all_time_usd: number | null;
  cryptorank: Enrichment['cryptorank'];
  coingecko: Enrichment['coingecko'];
  tokenterminal: Enrichment['tokenterminal'];
  news: Enrichment['news'];
  /** The row's farm program, researched from public sources (watchlist rows only; null = template plan). */
  farm_program: { label: string; status: 'live' | 'none' | 'token-live'; source: string } | null;
  sources: string[];
}

/** The dashboard's view of one row: the board's numbers plus the farm plan it renders. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  curve_value_usd: number;
  category_factor: number;
  category_comparables: number;
  category_source: string;
  growth_pct: number | null;
  signal_quality: 'strong' | 'fair' | 'thin';
  farm_steps: string[];
  farm_gas_usd: number;
  farm_opportunity_usd: number;
  farm_net_usd: number;
  farm_minutes: number;
  farm_txs: number;
  farm_verdict: 'FARM' | 'THIN' | 'SKIP';
  fees_30d_usd: number | null;
  fees_7d_usd: number | null;
  fees_all_time_usd: number | null;
  cryptorank: Enrichment['cryptorank'];
  coingecko: Enrichment['coingecko'];
  tokenterminal: Enrichment['tokenterminal'];
  news: Enrichment['news'];
  implied_low_usd: number;
  implied_high_usd: number;
  mechanism: string;
  neighbours: BoardRow['neighbours'];
  rank_curve_only: number;
  rank_flat: number;
  farm_program: { label: string; status: 'live' | 'none' | 'token-live'; source: string } | null;
  sources: string[];
  watchlist: boolean;
}

/** A live-token protocol: it already trades, so the board shows the market's own value. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
  fees_30d_usd: number | null;
}

/** A protocol the house rule sets aside, and why. */
export interface SetAsideRow {
  slug: string;
  name: string;
  category: string | null;
  tvl_usd: number;
  reason: string;
}

/** One traded token's point on the scatter chart: TVL against market cap, both in dollars. */
export interface TradedPoint {
  slug: string;
  name: string;
  category: string | null;
  tvl_usd: number;
  mcap_usd: number;
}

/** One category's adjustment, for the dashboard's model table. */
export interface CategoryAdjustment {
  category: string;
  adjustment_dex: number;
  factor: number;
  comparables: number;
  source: 'category' | 'none';
}

/** One blind-test line: median miss multiple and the share inside 2x / 3x / 5x. */
export interface MissStats {
  median_miss: number;
  within_2x: number;
  within_3x: number;
  within_5x: number;
  n: number;
}

/** The blind / out-of-sample backtest, computed from the snapshot at run time. */
export interface Backtest {
  loo_curve: MissStats;
  loo_curve_category: MissStats;
  loo_flat: MissStats;
  time_split_curve: MissStats;
  time_split_curve_category: MissStats;
  time_split_flat: MissStats;
  time_split_fit_n: number;
  time_split_test_n: number;
  /** Traded tokens in neither side of the time split (no listing date on record). */
  time_split_excluded_n: number;
  flat_multiple: number;
  /** Bootstrap stability (radar-5): 200 refits on resampled traded tokens, fixed seed. */
  bootstrap: {
    reps: number;
    /** Out-of-bag median miss: each refit is tested on the traded tokens it did not draw. */
    oob_median_miss: number;
    oob_median_lo: number;
    oob_median_hi: number;
    oob_n: number;
    curve_a_lo: number;
    curve_a_hi: number;
    curve_b_lo: number;
    curve_b_hi: number;
  };
}

/** Everything the dashboard needs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  set_aside_size: number;
  traded_size: number;
  curve: { a: number; b: number; r2: number; resid_sd_dex: number; n: number; flat_multiple: number };
  backtest: Backtest;
  category_adjustments: CategoryAdjustment[];
  /** Rank stability: how many of the shipped top 10 move under the curve-only or flat ranking. */
  rank_stability: { top10_moved: number; top10_max_move: number };
  rows: RadarRow[];
  live: LiveRow[];
  set_aside: SetAsideRow[];
  traded_points: TradedPoint[];
  enrichment_meta: EnrichmentDoc['meta'] | null;
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;
const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** The median of a sorted list of numbers; 0 when the list is empty. */
function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** One percentile of a list (linear interpolation); the list need not be sorted. */
function percentile(values: number[], q: number): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo]! + (s[hi]! - s[lo]!) * (pos - lo);
}

/** A deterministic PRNG (mulberry32): the bootstrap below must be byte-identical every run. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf.split('T')[0]}T00:00:00Z`);
  const b = Date.parse(`${listedAt.split('T')[0]}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** Whether a protocol records no token at all (no CoinGecko id, no symbol). */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.gecko_id === null && p.symbol === null;
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/**
 * Categories the house rule sets aside: a wrapped, staked or bridged product of a token that
 * already trades, or an exchange — not a protocol still waiting on a token launch of its own.
 * (Chain and Farm categories are NOT set aside: the house rule as RULES.txt states it names
 * only these six, and two Chain-category protocols sit on the watchlist itself.)
 */
const SET_ASIDE_CATEGORIES = new Set([
  'Bridge',
  'Canonical Bridge',
  'Liquid Staking',
  'Liquid Restaking',
  'Restaked BTC',
  'CEX',
]);

/** A name carrying a whole word wrapped, staked or staking, in any case. */
const WRAPPED_OR_STAKED = /\bwrapped\b|\bstaked\b|\bstaking\b/i;

/** A name beginning with an exchange's name. */
const EXCHANGE_PREFIX = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/i;

/**
 * Why the house rule sets a pre-token protocol aside, or null when it may be ranked (live-token
 * protocols are not set aside by this rule — they are never rankable in the first place). The
 * partition reconciles exactly on the sealed snapshot: 758 = 416 with a token + 198 rankable
 * pre-token + 144 set aside by the rules below.
 */
export function setAsideReason(p: SnapshotProtocol): string | null {
  if (!isPreToken(p)) return null;
  if (p.category !== null && SET_ASIDE_CATEGORIES.has(p.category)) return `category: ${p.category}`;
  if (VERSIONED.test(p.name)) return 'name: versioned pool';
  if (WRAPPED_OR_STAKED.test(p.name)) return 'name: wrapped / staked product';
  if (EXCHANGE_PREFIX.test(p.name)) return 'name: exchange product';
  return null;
}

/** Whether a protocol is one the board may rank: pre-token, and nothing the house rule sets aside. */
export function isRankable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && setAsideReason(p) === null;
}

/** Ordinary least squares on y against x; also R-squared and the residual scatter in dex. */
function ols(xs: number[], ys: number[]): { a: number; b: number; r2: number; sd: number; n: number } {
  const n = xs.length;
  if (n < 3) throw new SnapshotError(`cannot fit a curve on ${n} traded tokens`);
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i]! - mx) ** 2;
    sxy += (xs[i]! - mx) * (ys[i]! - my);
    syy += (ys[i]! - my) ** 2;
  }
  if (sxx === 0 || syy === 0) throw new SnapshotError('cannot fit a curve: traded TVLs or market caps do not vary');
  const b = sxy / sxx;
  const a = my - b * mx;
  const r2 = (sxy * sxy) / (sxx * syy);
  const sd = Math.sqrt(ys.reduce((s, y, i) => s + (y - (a + b * xs[i]!)) ** 2, 0) / (n - 2));
  return { a, b, r2, sd, n };
}

/** The traded tokens the curve is fitted on: a token, a market cap and a TVL, all present. */
export function tradedTokens(snapshot: Snapshot): SnapshotProtocol[] {
  return snapshot.protocols.filter((p) => !isPreToken(p) && p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0);
}

/** The size curve, fitted on the snapshot's own traded tokens at run time. */
export function fitCurve(snapshot: Snapshot): { a: number; b: number; r2: number; resid_sd_dex: number; n: number; flat_multiple: number } {
  const traded = tradedTokens(snapshot);
  const fit = ols(
    traded.map((p) => Math.log10(p.tvl_usd)),
    traded.map((p) => Math.log10(p.mcap_usd!)),
  );
  const flat = median(traded.map((p) => p.mcap_usd! / p.tvl_usd).sort((x, y) => x - y));
  return { a: fit.a, b: fit.b, r2: fit.r2, resid_sd_dex: fit.sd, n: fit.n, flat_multiple: flat };
}

/** The curve's value for one TVL, in dollars. */
function curveValue(tvlUsd: number, fit: { a: number; b: number }): number {
  return Math.pow(10, fit.a + fit.b * Math.log10(Math.max(1, tvlUsd)));
}

/**
 * One category's adjustment: the median log-residual of its traded tokens against the curve,
 * shrunk by n/(n+shrink) and clamped to +-clamp dex, used only where at least
 * min_category_comparables traded tokens exist. Categories the snapshot cannot speak for get no
 * adjustment at all (factor 1.00), and the row says so.
 */
export function categoryAdjustments(
  snapshot: Snapshot,
  fit: { a: number; b: number },
  model: ModelConstants = MODEL,
): Map<string, { adjustment_dex: number; factor: number; comparables: number }> {
  const byCat = new Map<string, number[]>();
  for (const p of tradedTokens(snapshot)) {
    const resid = Math.log10(p.mcap_usd!) - Math.log10(curveValue(p.tvl_usd, fit));
    const list = byCat.get(p.category ?? 'Other');
    if (list === undefined) byCat.set(p.category ?? 'Other', [resid]);
    else list.push(resid);
  }
  const out = new Map<string, { adjustment_dex: number; factor: number; comparables: number }>();
  for (const [cat, residuals] of byCat) {
    if (residuals.length < model.min_category_comparables) continue;
    const sorted = [...residuals].sort((a, b) => a - b);
    const med = median(sorted);
    const shrunk = clamp(med * (residuals.length / (residuals.length + model.category_shrink)), -model.category_clamp_dex, model.category_clamp_dex);
    out.set(cat, { adjustment_dex: shrunk, factor: Math.pow(10, shrunk), comparables: residuals.length });
  }
  return out;
}

/** Miss statistics for a set of predictions against the real caps. */
function missStats(preds: number[], actuals: number[]): MissStats {
  if (preds.length === 0) throw new SnapshotError('backtest has an empty prediction set — cannot score a median miss');
  const misses = preds.map((pr, i) => Math.pow(10, Math.abs(Math.log10(pr / actuals[i]!)))).sort((a, b) => a - b);
  return {
    median_miss: round4(median(misses)),
    within_2x: round4(misses.filter((m) => m <= 2).length / misses.length),
    within_3x: round4(misses.filter((m) => m <= 3).length / misses.length),
    within_5x: round4(misses.filter((m) => m <= 5).length / misses.length),
    n: misses.length,
  };
}

/**
 * The blind / out-of-sample backtest, computed from the snapshot at run time. Leave-one-out
 * refits the curve (and the category medians, where used) without the token being predicted;
 * the time split fits only on tokens listed more than `time_split_days` ago and tests on the
 * newer ones. Both are reported against the flat median multiple, so the reader can see what
 * the curve actually adds — and where it does not.
 */
export function backtest(snapshot: Snapshot, model: ModelConstants = MODEL): Backtest {
  const traded = tradedTokens(snapshot);
  const flatMultiple = median(traded.map((p) => p.mcap_usd! / p.tvl_usd).sort((a, b) => a - b));
  const predict = (p: SnapshotProtocol, fit: { a: number; b: number }, cats: Map<string, { adjustment_dex: number }>, useCat: boolean): number => {
    const adj = useCat ? cats.get(p.category ?? 'Other')?.adjustment_dex ?? 0 : 0;
    return curveValue(p.tvl_usd, fit) * Math.pow(10, adj);
  };
  // Radar-7: the flat baseline is refit inside each test too — one median per
  // fold (leave-one-out) and the older set's median (time split) — so the
  // baseline never sees the token or the period it is scored on.
  const loo = (useCat: boolean): MissStats => {
    const preds: number[] = [];
    const actuals: number[] = [];
    for (let i = 0; i < traded.length; i++) {
      const train = traded.filter((_, j) => j !== i);
      const fit = ols(
        train.map((p) => Math.log10(p.tvl_usd)),
        train.map((p) => Math.log10(p.mcap_usd!)),
      );
      const cats = useCat ? categoryAdjustments({ ...snapshot, protocols: train }, fit, model) : new Map();
      preds.push(predict(traded[i]!, fit, cats, useCat));
      actuals.push(traded[i]!.mcap_usd!);
    }
    return missStats(preds, actuals);
  };
  const looFlat = (): MissStats => {
    const preds: number[] = [];
    const actuals: number[] = [];
    for (let i = 0; i < traded.length; i++) {
      const train = traded.filter((_, j) => j !== i);
      const foldFlat = median(train.map((p) => p.mcap_usd! / p.tvl_usd).sort((a, b) => a - b));
      preds.push(foldFlat * traded[i]!.tvl_usd);
      actuals.push(traded[i]!.mcap_usd!);
    }
    return missStats(preds, actuals);
  };
  const older = traded.filter((p) => {
    const age = ageDays(snapshot.as_of, p.listed_at);
    return age !== null && age > model.time_split_days;
  });
  const newer = traded.filter((p) => {
    const age = ageDays(snapshot.as_of, p.listed_at);
    return age !== null && age <= model.time_split_days;
  });
  const timeSplitExcluded = traded.filter((p) => ageDays(snapshot.as_of, p.listed_at) === null).length;
  const splitFit = ols(
    older.map((p) => Math.log10(p.tvl_usd)),
    older.map((p) => Math.log10(p.mcap_usd!)),
  );
  const splitCats = categoryAdjustments({ ...snapshot, protocols: older }, splitFit, model);
  const split = (useCat: boolean): MissStats =>
    missStats(
      newer.map((p) => predict(p, splitFit, splitCats, useCat)),
      newer.map((p) => p.mcap_usd!),
    );
  const splitFlatMultiple = median(older.map((p) => p.mcap_usd! / p.tvl_usd).sort((a, b) => a - b));
  const splitFlat = (): MissStats =>
    missStats(
      newer.map((p) => splitFlatMultiple * p.tvl_usd),
      newer.map((p) => p.mcap_usd!),
    );
  // Bootstrap stability (radar-5): 200 refits on resampled traded tokens, fixed seed.
  // Each refit is tested on the tokens it did NOT draw (out-of-bag) — a third blind test
  // beside leave-one-out and the time split, and the one that earns the per-row band.
  const bootRng = mulberry32(BOOTSTRAP_SEED);
  const oobMedians: number[] = [];
  const oobCounts: number[] = [];
  const bootA: number[] = [];
  const bootB: number[] = [];
  for (let r = 0; r < BOOTSTRAP_REPS; r++) {
    const { sample, drawn } = drawBootstrapSample(traded, bootRng);
    const bootFit = ols(
      sample.map((p) => Math.log10(p.tvl_usd)),
      sample.map((p) => Math.log10(p.mcap_usd!)),
    );
    const bootCats = categoryAdjustments({ ...snapshot, protocols: sample }, bootFit, model);
    bootA.push(bootFit.a);
    bootB.push(bootFit.b);
    const oob = traded.filter((_, j) => !drawn.has(j));
    if (oob.length > 0) {
      oobCounts.push(oob.length);
      oobMedians.push(
        median(
          oob
            .map((p) => Math.pow(10, Math.abs(Math.log10(predict(p, bootFit, bootCats, true) / p.mcap_usd!))))
            .sort((a, b) => a - b),
        ),
      );
    }
  }
  const bootstrap = {
    reps: BOOTSTRAP_REPS,
    oob_median_miss: round4(median([...oobMedians].sort((a, b) => a - b))),
    oob_median_lo: round4(percentile(oobMedians, 0.05)),
    oob_median_hi: round4(percentile(oobMedians, 0.95)),
    oob_n: Math.round(median([...oobCounts].sort((a, b) => a - b))),
    curve_a_lo: round4(percentile(bootA, 0.05)),
    curve_a_hi: round4(percentile(bootA, 0.95)),
    curve_b_lo: round4(percentile(bootB, 0.05)),
    curve_b_hi: round4(percentile(bootB, 0.95)),
  };
  return {
    loo_curve: loo(false),
    loo_curve_category: loo(true),
    loo_flat: looFlat(),
    time_split_curve: split(false),
    time_split_curve_category: split(true),
    time_split_flat: splitFlat(),
    time_split_fit_n: older.length,
    time_split_test_n: newer.length,
    time_split_excluded_n: timeSplitExcluded,
    flat_multiple: round4(flatMultiple),
    bootstrap,
  };
}

/**
 * One board row's implied-value band (radar-5): the middle 50% (p25–p75) of the same 200
 * bootstrap refits, recomputed per row. The point estimate never moves — the band says how
 * much the refits disagree about it. Deterministic: the same fixed seed as backtest().
 */
export function bootstrapBands(
  snapshot: Snapshot,
  board: BoardRow[],
  model: ModelConstants = MODEL,
): Map<string, { low_usd: number; high_usd: number }> {
  const traded = tradedTokens(snapshot);
  const rng = mulberry32(BOOTSTRAP_SEED);
  const vals = new Map<string, number[]>();
  for (const row of board) vals.set(row.slug, []);
  for (let r = 0; r < BOOTSTRAP_REPS; r++) {
    const { sample } = drawBootstrapSample(traded, rng);
    const fit = ols(
      sample.map((p) => Math.log10(p.tvl_usd)),
      sample.map((p) => Math.log10(p.mcap_usd!)),
    );
    const cats = categoryAdjustments({ ...snapshot, protocols: sample }, fit, model);
    for (const row of board) {
      const proto: SnapshotProtocol = {
        slug: row.slug,
        name: row.name,
        category: row.category,
        chains: row.chains,
        tvl_usd: row.tvl_usd,
        change_7d: row.change_7d,
        mcap_usd: row.mcap_usd,
        listed_at: row.listed_at,
        gecko_id: row.gecko_id,
        symbol: row.symbol,
      };
      vals.get(row.slug)!.push(impliedValue(proto, snapshot.as_of, fit, cats).implied);
    }
  }
  const out = new Map<string, { low_usd: number; high_usd: number }>();
  for (const [slug, list] of vals) {
    out.set(slug, { low_usd: Math.max(1, Math.round(percentile(list, 0.25))), high_usd: Math.max(1, Math.round(percentile(list, 0.75))) });
  }
  return out;
}

/** The multipliers and the implied value one protocol gets under the fitted curve. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  fit: { a: number; b: number },
  cats: Map<string, { adjustment_dex: number; factor: number; comparables: number }>,
): {
  implied: number;
  curve: number;
  categoryAdjustmentDex: number;
  categoryFactor: number;
  categoryComparables: number;
  categorySource: string;
  hasCategoryAdjustment: boolean;
  age: number | null;
} {
  const age = ageDays(asOf, protocol.listed_at);
  const curve = curveValue(protocol.tvl_usd, fit);
  const entry = cats.get(protocol.category ?? 'Other');
  const adj = entry === undefined ? 0 : entry.adjustment_dex;
  const factor = entry === undefined ? 1 : entry.factor;
  const comparables = entry === undefined ? 0 : entry.comparables;
  const source =
    entry === undefined
      ? 'global curve only — too few traded comparables in this category'
      : `category · ${comparables} traded`;
  const implied = Math.max(1, Math.round(curve * factor));
  return { implied, curve, categoryAdjustmentDex: adj, categoryFactor: factor, categoryComparables: comparables, categorySource: source, hasCategoryAdjustment: entry !== undefined, age };
}

/** How much of the model's evidence a row actually has: age known, growth reported, category-backed. */
export function signalQuality(p: SnapshotProtocol, age: number | null, hasCategoryAdjustment: boolean): 'strong' | 'fair' | 'thin' {
  let signals = 0;
  if (age !== null) signals += 1;
  if (p.change_7d !== null) signals += 1;
  if (hasCategoryAdjustment) signals += 1;
  return signals === 3 ? 'strong' : signals === 2 ? 'fair' : 'thin';
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** Gas for one transaction on a chain, in dollars, from the stated table (or the default). */
const GAS_TABLE: Map<string, number> = new Map(
  Object.entries(MODEL.gas_usd).map(([k, v]) => [k.replace(/[^a-z0-9]+/g, ''), v] as [string, number]),
);
function gasUsd(chain: string, model: ModelConstants = MODEL): number {
  // Strip a trailing qualifier (L1 / Mainnet / EVM / zkEVM) before lookup, then aliases.
  let key = chain.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  key = key.replace(/(l1|mainnet|zkevm|evm)$/, '');
  key = CHAIN_ALIASES[key] ?? key;
  if (model !== MODEL) {
    const table: Record<string, number> = {};
    for (const [k, v] of Object.entries(model.gas_usd)) table[k.replace(/[^a-z0-9]+/g, '')] = v;
    return table[key] ?? model.gas_default_usd;
  }
  return GAS_TABLE.get(key) ?? model.gas_default_usd;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/**
 * The mechanism a protocol farms by, from its category (radar-5). The 40 watchlist rows
 * keep their researched programs; the other 158 rows farm by mechanism, not by a generic
 * template: each mechanism names what the money actually does, what can go wrong with it,
 * and — honestly — that no points program is published for this protocol in the sources
 * checked, so the farm is yield unless the protocol's own pages later announce one.
 */
export function mechanismFor(p: SnapshotProtocol): string {
  const c = (p.category ?? '').toLowerCase();
  if (c.includes('risk curator') || c.includes('curator') || c.includes('allocator')) return 'curated-vault';
  if (c.includes('basis')) return 'basis-trading';
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return 'lending';
  if (c.includes('liquidity') || (c.includes('dex') && !c.includes('index')) || c.includes('leveraged farm')) return 'liquidity';
  if (c.includes('anchor btc') || c.includes('decentralized btc')) return 'staking';
  if (c.includes('farm')) return 'yield-farming';
  if (c.includes('option')) return 'perps';
  if (c.includes('yield')) return 'yield-farming';
  if (c.includes('bridge') || c.includes('cross chain')) return 'bridging';
  if (c.includes('staking') || c.includes('restak')) return 'staking';
  if (c.includes('perpetual') || c.includes('derivative')) return 'perps';
  if (c.includes('prediction')) return 'prediction';
  if (c.includes('stable')) return 'stablecoin';
  if (c.includes('rwa')) return 'rwa';
  if (c.includes('insurance')) return 'insurance';
  if (c.includes('payment') || c.includes('card') || c.includes('otc') || c.includes('marketplace')) return 'payments';
  if (c.includes('governance')) return 'governance';
  if (c.includes('chain')) return 'chain-apps';
  if (c.includes('cede')) return 'cede-vault';
  return 'vault';
}

function mechanismPlan(
  p: SnapshotProtocol,
  capital: number,
  chain: string,
): { label: string; action: string; second: string; secondTxs: number; weekly: 'hold' | 'weekly'; claim: string } {
  const name = p.name;
  const mech = mechanismFor(p);
  const yieldOnly = `No points program is published for this protocol in the sources checked as of 2026-11-15 — the farm is yield unless its own pages later announce one; claim only from a link they publish. Re-check: ${name}'s points/blog page monthly; a new season announcement changes this row from yield-only to points.`;
  const usageOnly = ` This row is usage positioning only — no yield and no published points program; do not expect a return inside 90 days.`;
  switch (mech) {
    case 'curated-vault':
      return { label: 'Curated vault · deposit into a vault a curator manages', action: `Deposit $${capital} into a ${name} curated vault on ${chain} and keep the shares — the curator picks the strategy, you hold the receipt.`, second: `Compare a second ${name} vault (different strategy or chain) once before adding more.`, secondTxs: 0, weekly: 'hold', claim: `${yieldOnly} Curator risk: the vault's strategy and fees are the curator's — read the vault's own strategy page before depositing.` };
    case 'basis-trading':
      return { label: 'Basis trading · capture the funding-rate spread', action: `Deposit $${capital} into ${name}'s basis-trading vault on ${chain} and keep the position open — the return is the funding-rate spread, not a token.`, second: `Check the vault's current funding-rate and basis once a week.`, secondTxs: 0, weekly: 'hold', claim: `${yieldOnly} Basis risk: funding rates flip sign — a long basis position can pay instead of earn.` };
    case 'lending':
      return { label: 'Lending · supply assets, earn interest', action: `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open — interest accrues per block.`, second: `Borrow a small amount against the deposit on ${name} and repay it the same week.`, secondTxs: 1, weekly: 'hold', claim: `${yieldOnly} Liquidation risk: borrowing against the deposit can be liquidated if collateral falls — keep the loan small.` };
    case 'liquidity':
      return { label: 'Liquidity · provide depth to a pool', action: `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open — fees accrue per swap.`, second: `Swap a small amount in ${name}'s main pool on ${chain} once.`, secondTxs: 1, weekly: 'weekly', claim: `${yieldOnly} Impermanent-loss risk: if the pool's prices move apart, the position can be worth less than holding.` };
    case 'yield-farming':
      return { label: 'Yield farming · deposit and compound', action: `Deposit $${capital} into ${name}'s main yield vault on ${chain} and keep the shares — yield compounds while the position is open.`, second: `Swap a small amount in ${name}'s main pool on ${chain} once.`, secondTxs: 1, weekly: 'hold', claim: `${yieldOnly} Strategy risk: the vault's yield comes from its strategy — read what it actually does before depositing.` };
    case 'bridging':
      return { label: 'Bridging · move funds across chains', action: `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`, second: `Bridge a small amount back the other way through ${name} once.`, secondTxs: 1, weekly: 'weekly', claim: `${yieldOnly} Bridge risk: a bridge's contracts and relayers are the attack surface — use small amounts first.` };
    case 'staking':
      return { label: 'Staking · lock the chain asset, earn rewards', action: `Buy $${capital} of the chain's staking asset (1 transaction), then stake it through ${name} and keep the receipt — rewards accrue while staked.`, second: `Check the unbonding period and the current reward rate once.`, secondTxs: 0, weekly: 'hold', claim: `${yieldOnly} Slashing and lock-up risk: staked assets can be slashed or locked for days to weeks.` };
    case 'perps':
      return { label: 'Perpetuals · margin trading', action: `Deposit $${capital} of USDC as margin on ${name} and place a 1x hedge only — no leverage, keep the position small.`, second: `Close the hedge and check the funding cost once.`, secondTxs: 1, weekly: 'weekly', claim: `${yieldOnly} Liquidation risk: even a 1x hedge can lose money fast if the market moves against it — this mechanism is the riskiest on the board.` };
    case 'prediction':
      return { label: 'Prediction markets · take a position on an outcome', action: `Fund $${capital} and place one market position on ${name} — keep it to one market, sized as money you can lose.`, second: `Check the market's resolution rules once before placing a second position.`, secondTxs: 0, weekly: 'weekly', claim: `${yieldOnly} Outcome risk: a prediction position pays only if the outcome resolves your way.` };
    case 'stablecoin':
      return { label: 'Stablecoin · mint or hold the stable asset', action: `Mint or deposit $${capital} of the stable asset through ${name} on ${chain} and keep it.`, second: `Check the peg and the redemption route once.`, secondTxs: 0, weekly: 'hold', claim: `${yieldOnly} Depeg risk: a stable asset can trade off peg — check how redemption works before depositing.` };
    case 'rwa':
      return { label: 'RWA · hold tokenised real-world yield', action: `Mint $${capital} of the protocol's yield asset on ${chain} and hold it — the yield comes from the underlying real-world asset.`, second: `Check the redemption terms (timing, minimums, KYC) once.`, secondTxs: 0, weekly: 'hold', claim: `${yieldOnly} Redemption risk: RWA vaults can be permissioned, KYC-gated or slow to redeem — check the terms first.` };
    case 'insurance':
      return { label: 'Insurance · buy cover, earn premiums', action: `Buy $${capital} of cover from ${name} on ${chain} and keep the policy — premiums accrue while covered.`, second: `Read one claim's terms once so you know what is actually covered.`, secondTxs: 0, weekly: 'hold', claim: `${yieldOnly} Claims risk: cover pays only for the events the policy names, and claims can take weeks.` };
    case 'payments':
      return { label: 'Payments · route funds through the rail', action: `Send $${capital} through ${name}'s payment rail on ${chain} and keep using it weekly.`, second: `Try a second payment route on ${name} once.`, secondTxs: 1, weekly: 'weekly', claim: `${yieldOnly} The farm here is usage, not yield — a payment rail pays nothing unless it runs a rewards program.${usageOnly}` };
    case 'governance':
      return { label: 'Governance · deposit and vote', action: `Deposit $${capital} and vote or delegate in ${name}'s governance on ${chain}.`, second: `Vote on one live proposal in ${name}'s governance.`, secondTxs: 1, weekly: 'hold', claim: `${yieldOnly} Governance rarely pays directly — the farm is positioning for a future program, not yield.${usageOnly}` };
    case 'chain-apps':
      return { label: 'Chain apps · use the chain natively', action: `Bridge $${capital} to ${chain} and use ${name}'s native apps for a week.`, second: `Try a second native app on ${chain} once.`, secondTxs: 1, weekly: 'weekly', claim: `${yieldOnly} The farm here is usage across the chain's apps — no single vault pays the yield.${usageOnly}` };
    case 'cede-vault':
      return { label: 'CeDeFi vault · centralised yield, on-chain receipt', action: `Deposit $${capital} into ${name} on ${chain} and keep the position open.`, second: `Check the vault's custodian and audit notes once.`, secondTxs: 0, weekly: 'hold', claim: `${yieldOnly} Custody risk: a CeDeFi vault's yield depends on an off-chain operator — read who holds the funds.` };
    default:
      return { label: 'Vault · deposit and hold', action: `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`, second: `Do one different action in ${name} — a swap, a vote or a second deposit — once.`, secondTxs: 1, weekly: 'hold', claim: `${yieldOnly} Read the protocol's own pages before depositing — a vault's yield comes from its strategy.` };
  }
}

/**
 * One watchlist row's protocol-specific farm plan, researched 2026-11-15 from public sources
 * only (project docs/blogs, official points pages, public vault pages). `action` replaces the
 * template's deposit step, `second` the template's second-action step, and `claim` the
 * template's claim step; the wallet-setup, hold and farm-log steps stay template. Researched programs are
 * hold-only, so their weekly step is a mid-period check (0 transactions) — a hold-only vault or staking
 * position has no weekly qualifying action. `actionTxs`/`secondTxs` override the default 1 transaction
 * where the slice must first be swapped or bridged (2) or the second step is a read-only check (0);
 * `chain` overrides the first listed chain where the vault lives elsewhere. `status`
 * is 'live' (a points program is live and no token trades), 'token-live' (a token already
 * trades — the farm is yield plus a possible later season), or 'none' (no program found: the
 * farm is yield only, and the claim step says so). `verdict` overrides the cost formula only
 * where the slice cannot enter at all (permissioned vault, institutional-only, an exploited
 * route, or a routing node a $1,000 slice cannot run). Nothing here invents a quest, a points program or an
 * airdrop: every row cites the public page it was read on, and the 158 early rows keep the
 * template plan.
 */
export interface FarmProgram {
  program: string;
  status: 'live' | 'none' | 'token-live';
  action: string;
  second: string;
  claim: string;
  source: string;
  verdict?: 'SKIP';
  /** Transactions the action step needs (default 1): 2 where the slice must first be swapped or bridged into the deposit asset or chain. */
  actionTxs?: number;
  /** Transactions the second step needs (default 1): 0 where it is a read-only check. */
  secondTxs?: number;
  /** Chain the plan executes on, when it is not the snapshot's first chain (the vault lives elsewhere). */
  chain?: string;
}

/** The wallet a farmer needs for a chain family: EVM is the default, the rest are named. */
function walletFor(chain: string): string {
  const key = chain.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  switch (key) {
    case 'solana': return 'a fresh Solana wallet (Phantom or Solflare)';
    case 'bitcoin': return 'a fresh Bitcoin wallet (Sparrow)';
    case 'stellar': return 'a fresh Stellar wallet (Freighter)';
    case 'algorand': return 'a fresh Algorand wallet (Pera)';
    case 'sui': return 'a fresh Sui wallet';
    case 'bittensor': return 'a fresh Bittensor wallet';
    case 'ripple': return 'a fresh XRP wallet (Xaman)';
    case 'starknet': return 'a fresh Starknet wallet (Argent X or Braavos)';
    case 'stacks': return 'a fresh Stacks wallet (Leather)';
    case 'qubic': return 'a fresh Qubic wallet';
    case 'canton': return 'a fresh Canton wallet';
    case 'proton': return 'a fresh Proton wallet';
    case 'hyperliquid': return 'a fresh Hyperliquid wallet';
    case 'noble':
    case 'provenance':
    case 'xion': return 'a fresh Cosmos wallet (Keplr)';
    case 'kava': return 'a fresh Cosmos wallet (Keplr) — Kava also accepts EVM wallets';
    default: return 'a fresh EVM wallet';
  }
}

export const FARM_PROGRAMS: Record<string, FarmProgram> = {
  'symbiotic': {
    program: 'Symbiotic Points — Season 2 live',
    status: 'live',
    action: 'Swap $1000 of USDC to wstETH (1 transaction), then deposit the wstETH into a Symbiotic vault on Ethereum and delegate to a network or operator — Points accrue hourly at 0.001 points per $ of vault TVL allocated to adapters.',
    second: 'Delegate the same vault position to a second network or operator once.',
    claim: 'Track Symbiotic Points on the Symbiotic app; no token is confirmed — points are the only record so far.',
    source: 'https://www.swanbluechip.com/rewards/p/symbiotic/',
    actionTxs: 2,
  },
  'veda': {
    program: 'No verified points program — vault yield',
    status: 'none',
    action: 'Deposit $1000 into a Veda vault on Ink (weETHs Super Symbiotic LRT or a BoringVault product such as the ether.fi Liquid vault) and keep the shares — vault yield plus any vault multiplier.',
    second: 'Move part of the position into a second Veda vault product once (async vaults may need a second claim transaction).',
    claim: 'No Veda points program was verified from official sources — an aggregator (airdrops.io) mentions a points-based program that “may lead to a future token”, but no official Veda page confirms it; do not farm for Veda points. The farm is vault yield only. Veda raised $18M (CoinFund-led, Jun 2025).',
    source: 'https://airdrops.io/veda/',
  },
  'plume-vaults': {
    program: 'Plume Nest Points (PNP) — Season One ended Mar 2026; $PLUME already trades',
    status: 'token-live',
    action: 'Bridge $1000 of USDC to Plume Mainnet, then deposit it into a Nest vault there (nBASIS, nALPHA, nWISDOM, nOPAL or nTBILL) and keep the vault tokens — PNP Season One ran through March 2026 with 1% of $PLUME supply allocated and has ended; no Season Two has been found.',
    second: 'Deploy the Nest vault tokens into a boosted venue on Plume once (Morpho up to 2% APY, Pendle up to 8% APY, Rooster 8x LP).',
    claim: '$PLUME already trades (CoinGecko-verified, rank 275) — PNP Season One is over, so this farm is RWA vault yield, not a points farm; watch the Plume Nest page for any new season.',
    source: 'https://www.plume.org/blog/meet-the-new-nest-real-yield-real-ownership',
    actionTxs: 2,
    chain: 'Plume Mainnet',
  },
  'onre': {
    program: 'OnRe Points — live',
    status: 'live',
    action: 'Buy $1000 of ONyc on a Solana DEX (secondary market — direct mint is accredited/KYC-only) and hold it — 1 point per ONyc per day (1x hold, 2x LP on Kamino/Orca/Raydium, 3x lending, 4x YT on Exponent).',
    second: 'Only provide ONyc liquidity on Kamino or Orca once if you accept NAV-token LP risk — ONyc is NAV-accreting, not a hard $1 peg; otherwise hold for the 1x rate.',
    claim: 'Track OnRe Points on the OnRe app; no token is confirmed. Avoid Loopscale — its exploit on 6 Nov 2026 froze withdrawals.',
    source: 'https://www.onre.finance/blog/onre-introduces-points-program-rewarding-onyc-participation-across-defi',
  },
  'doppler-finance': {
    program: 'Doppler Points (DP) — live; XDP already trades',
    status: 'token-live',
    action: 'Deposit $1000 into a Doppler vault on Ripple (XRP Vault ~3.2% APR or RLUSD Vault ~8% APR) and keep the position — 0.01 DP per hour per $1 deposited, plus an Early-Depositor DP Boost.',
    second: 'Optional, needs capital outside the vault position: buy XDP separately and stake it for the 20x DP boost (staking live since 16 Oct 2026, Season 3) — otherwise the vault earns the base DP rate only.',
    claim: 'XDP already trades (CoinGecko-verified, rank 831) — DP is the live points program on top; track DP on the Doppler app. Do not use doppler-finances.vercel.app — it looks like a copycat.',
    source: 'https://www.ainvest.com/news/xrp-news-today-xrp-yield-experiment-earns-3-41-apr-doppler-fi-2505/',
    secondTxs: 0,
  },
  'noble': {
    program: 'Points Vault unverified — USDN yield',
    status: 'none',
    action: 'Buy $1000 of USDN on Noble and hold it for the ~4.07% T-bill yield — the Boosted Yield Vault (~13.5–16% APY historically) is the higher-yield option; one source says it was disabled on 6 Aug, so check live before locking.',
    second: 'Compare the Boosted Yield Vault once before locking — longer locks accrue faster, with a multiplier after 30 days.',
    claim: 'No Noble points program was verified from official sources — a Points Vault is mentioned in aggregator feeds, but no official Noble page was found confirming a live program; do not farm for Noble points. The farm is USDN yield only. Track points claims at points.noble.xyz only if Noble itself publishes them.',
    source: 'https://m.followin.io/en/feed/17504868',
    secondTxs: 0,
  },
  'upshift': {
    program: 'Upshift Points — Season 2 live',
    status: 'live',
    action: 'Deposit $1000 into an Upshift vault on Ethereum (Morpho upUSDC 5x, Euler hgETH 5x, Pendle up to 7.5x) and keep the shares — 1x per vault deposit, 5x bonus while total TVL is under $750M (snapshot TVL $499M, so the bonus is live at build time — verify live before depositing).',
    second: 'Check the Upshift points page for the current quest.',
    claim: 'Track Upshift Points on the Upshift app; no token or airdrop is confirmed.',
    source: 'https://app.upshift.finance/points',
    secondTxs: 0,
  },
  'b14g': {
    program: 'b14g Point Program — live (deposit route exploited — SKIP)',
    status: 'live',
    action: 'SKIP for a $1,000 slice: do NOT use the Merge Marketplace — it was exploited on 31 Oct 2026 (~97M CORE, ~$1.47M drained). The Coretoshi vault is the only named alternative and its post-exploit status is unverified — do not deposit until the post-mortem confirms a fix and deposits have resumed.',
    second: 'No second action — there is no verified deposit route right now.',
    claim: 'Track b14g points on the b14g app. The Marketplace contract was exploited on 31 Oct 2026 (~$1.47M CORE drained); BTC time-locked on Bitcoin was unaffected — check the post-exploit status before depositing anything.',
    source: 'https://paragraph.com/@b14g',
    verdict: 'SKIP',
  },
  'firelight': {
    program: 'Firelight Points ended 6 Oct 2026 — cover yield now',
    status: 'none',
    action: 'Mint FXRP with $1000 of XRP via Flare FAssets (check the mint cap is open first), then stake it for stXRP on Firelight — Phase 2 cover premiums stream into the vault (exit takes 30–60 days, staked FXRP can be slashed). Enter immediately: a late entry cannot exit inside the 90-day horizon.',
    second: 'Provide cover in a second Firelight vault once.',
    claim: 'Firelight Points (Phase 1) ended 6 Oct 2026 when cover went live — a new farmer earns cover premiums, not points. Early Contribution Rewards (230,000 FXRP via Merkl, claim deadline 7 Dec 2026) are for existing point holders only (at least 200,000 points). Note: Firelight reversed an anti-Sybil decision on 10 Oct 2026 after pushback — check current terms before depositing.',
    source: 'https://superapp.spendthebits.com/insights/earning-on-xrp-firelight-stxrp-points',
    actionTxs: 2,
  },
  'clearstar': {
    program: 'No own points program — yield only (partner points via OpenEden)',
    status: 'none',
    action: 'Deposit $1000 of USDC into the OpenEden USDC vault on Flare via Clearstar and keep the shares — it pays 3x BILL points (OpenEden\u2019s program, not Clearstar\u2019s). Confirm first that this is the retail USDC vault on Flare, not the TBILL vault ($100,000 first mint, professional/accredited only) — if it is the TBILL vault, stop here.',
    second: 'Try the Fusion Vault (YieldFi yUSD, ~15% APY + 6x YieldFi points) once with a small amount — verify first that it is open to a retail deposit on Flare.',
    claim: 'No Clearstar-native points program was found as of 2026-11-15 — the farm is yield plus partner points; do not expect a Clearstar points balance.',
    source: 'https://harvest.finance/usdc-morpho-clearstar-core-v2-ethereum',
  },
  'hyperithm': {
    program: 'No own points program — earns Saturn Points via vaults',
    status: 'none',
    action: 'Deposit $1000 of USDT into the Hyperithm Saturn vault on Monad via Morpho and keep the shares — suppliers earn 5x Saturn Orbital Points plus 30K $LISTA emissions per week (up to ~24% APY). Register for the STRN claim at claim.saturn.credit BEFORE 16 Nov 2026 09:00 EST — no registration, no STRN — and confirm you are not a US/EEA/UK person.',
    second: 'Deposit into a second Hyperithm Saturn vault (USDC) once.',
    claim: 'No Hyperithm-native points program was found — points come from Saturn\u2019s program; track them on Saturn\u2019s pages.',
    source: 'https://twstalker.com/hyperithm',
  },
  'rockawayx': {
    program: 'No own points program — Merkl rewards (WPROS / ZAMA)',
    status: 'none',
    action: 'Deposit $1000 of USDC into the RockawayX Tori Ecosystem Vault on Ethereum via Upshift and keep the etrUSD shares — the vault earns Tori Cores plus strategy yield (~16.9% target total APY in Phase 2).',
    second: 'Check the Merkl page for the vault\u2019s live reward campaigns (WPROS, ZAMA) once.',
    claim: 'No RockawayX-native points program was found — rewards are Merkl campaigns in WPROS/ZAMA; the Reservoir V2 WPROS campaign ends 16 Nov 2026 — effectively unavailable to a new farmer — and the Zama ZAMA campaign ends 30 Nov, at most ~15 days of accrual. The farm is Tori Cores plus strategy yield; this is the same Tori vault as the tori-finance row.',
    source: 'https://www.swanbluechip.com/rewards/',
    secondTxs: 0,
  },
  'mezo-earn': {
    program: 'MEZO already trades — Phase 2 rules unpublished',
    status: 'token-live',
    action: 'Bridge $1000 of BTC to Mezo via the tBTC bridge (bridge transaction plus a wait, bridge fee on top), then deposit into Mezo Earn on Mezo and keep the position (~4%+ APY) — the Phase 1 airdrop (Jan 2026, ~20M MEZO to 11,845 addresses) is over; watch for Phase 2 rules.',
    second: 'Check mezo.org for Phase 2 rules once.',
    claim: 'MEZO already trades (CoinGecko-verified, rank 2471) — this farm is yield plus a possible Phase 2, not a first-token farm; check mezo.org for Phase 2 rules.',
    source: 'https://mezo.org/blog/the-mezo-allocation-methodology-phase-1',
    actionTxs: 2,
    secondTxs: 0,
  },
  'bittensor-dtao': {
    program: 'TAO already trades — stake for yield',
    status: 'token-live',
    action: 'Buy $1000 of TAO (state the venue), then stake it in root (Subnet 0) on Bittensor at ~4.93% APY and keep the stake — the conservative route that keeps TAO.',
    second: 'Compare dTAO subnet alpha staking once (higher yield, higher risk) before moving any stake.',
    claim: 'TAO already trades (CoinGecko-verified, rank 39; first halving 15 Dec 2025) — this farm is staking yield, not a first-token farm.',
    source: 'https://taostats.io/docs/concepts/staking/staking-in-dtao',
    actionTxs: 2,
    secondTxs: 0,
  },
  'hive-protocol': {
    program: 'B2 already trades — stake BTC to earn B2',
    status: 'token-live',
    action: 'Bridge $1000 of BTC to BSquared (bridge transaction plus a wait), then stake it through Hive on BSquared and keep the position to earn B2 — the BUZZ campaign phases are done.',
    second: 'Check the Hive app for any new campaign once.',
    claim: 'B2 already trades (CoinGecko-verified as BSquared Network, rank 848; IDO 30 Apr 2025) — this farm is yield, not a first-token farm. Verify B2 earning is still live on the Hive app before depositing.',
    source: 'https://www.kucoin.com/price/B2',
    actionTxs: 2,
    secondTxs: 0,
  },
  'usdd': {
    program: 'USDD already trades — stake sUSDD for yield',
    status: 'token-live',
    action: 'Stake $1000 of USDD as sUSDD on Tron for ~4% APY (official rate, Sep 2026; trailing average 6.79%) and keep the position.',
    second: 'Compare the JustLend sUSDD market once.',
    claim: 'USDD is itself a live stablecoin since May 2022 (CoinGecko-verified, rank 55) — this farm is staking yield, not a first-token farm. Do not use stake-usdd.com (12.5% \u201cguaranteed\u201d — looks scammy).',
    source: 'https://eco.com/support/en/articles/12257504-what-is-usdd-tron-s-stablecoin-and-its-depeg-history',
    secondTxs: 0,
  },
  'steakhouse-financial': {
    program: 'No own points program — yield + Level XP',
    status: 'none',
    action: 'Deposit $1000 of USDC into the Steakhouse Confidential Prime USDC vault on Base via Morpho and keep the shares (~7.2% base APY; the 12-week incentive program has wound down).',
    second: 'Try the Steakhouse Level vault (5x Level XP) once with a small amount of the $1,000.',
    claim: 'No Steakhouse-native points program was found as of 2026-11-15 — the farm is yield plus Level XP; do not expect a Steakhouse points balance. Do not use the Medium \u201cSTEAKUSDC\u201d article — it looks fake/scam.',
    source: 'https://defillama.com/research/spotlight/confidential-onchain-yield-missing-infrastructure-institutional-capital',
  },
  'gauntlet': {
    program: 'No points program — yield + MORPHO',
    status: 'none',
    action: 'Deposit $1000 of USDC into a Gauntlet Prime USDC vault on Base via Morpho and keep the shares — yield plus MORPHO rewards auto-compounded.',
    second: 'Deposit into a second Gauntlet vault (Core or Frontier) once.',
    claim: 'No Gauntlet points program was found as of 2026-11-15 — the farm is yield plus MORPHO rewards.',
    source: 'https://harvest.finance/usdc-morpho-gauntlet-prime-v2-base',
  },
  'curvance': {
    program: 'No live program — yield only on Monad (risk report: avoid — SKIP)',
    status: 'none',
    action: 'SKIP for a $1,000 slice: an independent risk report moved Curvance from “caution” to “avoid” on 30 Sep 2026 — the Emergency Council bypassed the 5-day timelock, the May eBTC market is still paused and WBTC lenders cannot redeem. Re-check only after redemptions are restored.',
    second: 'No second action — do not deposit while lenders cannot redeem.',
    claim: 'No Curvance points program was found as of 2026-11-15 — do not farm for CVE. WARNING: an independent risk report moved Curvance from “caution” to “avoid” on 30 Sep 2026 — the Emergency Council bypassed the 5-day timelock, the May eBTC market is still paused and WBTC lenders cannot redeem.',
    source: 'https://boxmining.com/curvance-cve-token-airdrop-guide/',
    verdict: 'SKIP',
  },
  'opentrade': {
    program: 'No own points program — T-bill yield (retail access blocked — SKIP)',
    status: 'none',
    action: 'SKIP for a $1,000 retail slice: OpenTrade direct mint is professional/accredited + KYC only — no retail deposit route was found.',
    second: 'No second action — the WOO X RWA Earn Vault named before is also KYC-gated.',
    claim: 'No OpenTrade points program was found as of 2026-11-15 — Sierra PEAKS is Sierra\u2019s program, not OpenTrade\u2019s. Direct mint/redeem of OpenTrade vaults is restricted to professional and accredited investors and institutions after KYC.',
    source: 'https://www.opentrade.io/resource/can-stablecoin-yield-replace-savings-accounts-in-high-inflation-economies',
    verdict: 'SKIP',
  },
  'lightning-network': {
    program: 'No token or points — routing node (SKIP)',
    status: 'none',
    action: 'SKIP for a $1,000 / 90-day slice: farming the Lightning Network means running a routing node (LND via Umbrel or Start9), syncing a full Bitcoin node, funding channels and staying online 24/7 — hobbyist returns are roughly $1–20 a month.',
    second: 'No second action — the slice cannot meaningfully run a routing node.',
    claim: 'No Lightning token or points program exists; do not chase an airdrop here.',
    source: 'https://www.cryptopigs.one/blog/understanding-bitcoin-lightning-network',
    verdict: 'SKIP',
  },
  'lagoon': {
    program: 'No own points program — vault infrastructure',
    status: 'none',
    action: 'Deposit $1000 of USDC into a public Lagoon vault on Ethereum (e.g. Turtle Lines USDC, ~$859M) and keep the shares — Lagoon is ERC-7540 async-vault infrastructure, not a points program. Deposit is a request plus a claim (2 transactions); confirm Turtle Lines is a public vault before depositing.',
    second: 'Check a second Lagoon vault once; note some funds are permissioned or approved-address only (DAMM funds).',
    claim: 'No Lagoon points program was found as of 2026-11-15 — the farm is vault yield only.',
    source: 'https://tradingstrategy.ai/vaults/protocols/lagoon-finance',
    actionTxs: 2,
    secondTxs: 0,
  },
  'nonce-capital': {
    program: 'No own points program — curator yield',
    status: 'none',
    action: 'Swap $1000 of USDC to ETH (1 transaction), then deposit the ETH into the ether.fi Liquid ETH vault on Ethereum (Veda BoringVault, strategy by Nonce Capital, ~3.5% APY) and keep the shares.',
    second: 'Compare a second Nonce-curated strategy once.',
    claim: 'No Nonce Capital points program was found as of 2026-11-15 — the farm is curator yield only; withdrawals take 3–10 days.',
    source: 'https://www.stakingrewards.com/defi/0xf0bb20865277abd641a307ece5ee04e79073416c',
    actionTxs: 2,
    secondTxs: 0,
  },
  'armitage-by-wintermute': {
    program: 'No points program — curator yield',
    status: 'none',
    action: 'Deposit $1000 of USDC into the Pendle Ecosystem USDC vault on Ethereum (co-curated by Armitage and Pendle, ~8.31% net APY lending against PT collateral) and keep the shares.',
    second: 'Compare a second Armitage-curated Morpho market once.',
    claim: 'No Armitage points program was found as of 2026-11-15 — the farm is curator yield only.',
    source: 'https://pendlefi.substack.com/p/pendle-print-128',
    secondTxs: 0,
  },
  'ember': {
    program: 'No points program — Sui vault yield',
    status: 'none',
    action: 'Deposit $1000 of USDC into the Ember eEARN flagship vault on Sui (~10% target APY, 3-day withdrawal) and keep the shares. Confirm the vault is open to retail deposits first — some Ember vaults are permissioned or KYC.',
    second: 'Compare the R25 Treasury vault (mrcUSD, 12% target) once — note some Ember vaults are permissioned or KYC.',
    claim: 'No Ember token and no points program as of 12 Oct 2026 — the farm is vault yield only.',
    source: 'https://www.jewelswap.io/blog/what-is-ember-protocol',
    chain: 'Sui',
    secondTxs: 0,
  },
  'galaxy-curation': {
    program: 'Institutional only — not retail-accessible (SKIP)',
    status: 'none',
    action: 'SKIP for a $1,000 retail slice: Galaxy\u2019s Morpho vaults are distributed via Fireblocks Earn to 2,400+ institutional clients, not to retail wallets — no retail deposit route was found.',
    second: 'No second action — there is no retail route into these vaults.',
    claim: 'No Galaxy points program was found; the Galaxy USDC Morpho vault ($92.67M, 3.13% APY) is institutional-only.',
    source: 'https://www.stocktitan.net/news/GLXY/galaxy-launches-institutional-vault-exjj0z970rk9.html',
    verdict: 'SKIP',
  },
  'gami-labs': {
    program: 'No own points program — curator yield',
    status: 'none',
    action: 'Deposit $1000 of USDC into the earnUSDC vault on Stellar via Upshift (~$27M, 10.00% APY flat, curated by Gami Labs) and keep the shares.',
    second: 'Compare the Coinshift USPC High Yield vault on Lagoon (targets 12%+, net APR ~8.27%) once.',
    claim: 'No Gami Labs points program was found as of 2026-11-15 — the farm is curator yield only.',
    source: 'https://www.upshift.finance/blog/usdc-yield',
    secondTxs: 0,
  },
  'k3-capital': {
    program: 'No own points program — curator yield',
    status: 'none',
    action: 'Deposit $1000 of USDC into the K3 USDC vault on Monad via Morpho (~5.15% APY) and keep the shares.',
    second: 'Compare the K3 cbMaxxxing USDC vault on Base (~5.24%) once.',
    claim: 'No K3 points program was found as of 2026-11-15 — the farm is curator yield only.',
    source: 'https://www.k3-capital.net/',
    secondTxs: 0,
  },
  'keyrock': {
    program: 'No points program — curator yield',
    status: 'none',
    action: 'Deposit $1000 of USDC into the Keyrock USDC vault on Ethereum (~6.7% APY) and keep the shares. Arc mainnet and the Keyrock Prime USDC vault on Arc ($75.24M, 2.19–2.20% APY) were unverified for retail access at build time, so the Ethereum vault is the route priced here.',
    second: 'Compare a second Keyrock-curated vault once before adding more.',
    claim: 'No Keyrock points program was found as of 2026-11-15 — the farm is curator yield only. Token Terminal tracks the kUSDC vault share publicly.',
    source: 'https://DeFiLlama.com/protocol/keyrock',
    chain: 'Ethereum',
    secondTxs: 0,
  },
  'lofty': {
    program: 'No points program — real-estate rent',
    status: 'none',
    action: 'Complete Lofty KYC first — US tax residents must be accredited investors; if you are not, stop here. Then buy $1000 of Lofty property tokens on Algorand ($50 per token, daily rent paid in USDC) and keep them — $99M+ TVL, 40,000+ users, $5M+ rent distributed.',
    second: 'Check the secondary-market price of one comparable token (read-only) to learn the exit — do not list your own tokens.',
    claim: 'No Lofty points program was found — the farm is rental yield only (median property rental income ~3.47% of listing price over 12 months; 63 of 81 tokens traded below listing price; no SEC filing; California consent order 2022).',
    source: 'https://altstreet.investments/platforms/reviews/lofty',
    secondTxs: 0,
  },
  'r25': {
    program: 'No points program — RWA vault yield',
    status: 'none',
    action: 'Deposit $1000 of USDC into the R25 Treasury vault on Pharos via Ember (rcUSD/mrcUSD, 12% APY target, T+4 withdrawal) and keep the position.',
    second: 'Check the TopNod rcUSD vault terms once (14% early → 12% regular, 12-month term ending 31 Dec 2026, $7M cap). Do NOT deposit here — the 12-month term runs past the 90-day horizon.',
    claim: 'No R25 token farming and no points program — stated explicitly in the vault guide; the farm is RWA yield only.',
    source: 'https://followin.io/en/feed/22266268',
    secondTxs: 0,
  },
  'reti-pooling': {
    program: 'No points program — Algorand staking pools',
    status: 'none',
    action: 'Buy $1000 of ALGO (1 swap), then deposit it into a Réti pool on Algorand via reti.nodely.io (pools from 10 ALGO; direct staking needs 30,000 ALGO) and keep the stake to earn consensus rewards.',
    second: 'Compare a second Réti pool once — some pools pay extra reward tokens.',
    claim: 'No RETI token and no points program was found — the farm is staking yield only.',
    source: 'https://txnlab.gitbook.io/reti-open-pooling/',
    actionTxs: 2,
    secondTxs: 0,
  },
  'saturn': {
    program: 'Saturn Orbital Points — Season 2 live',
    status: 'live',
    action: 'REGISTER FIRST at claim.saturn.credit before 16 Nov 2026 09:00 EST — after that, no STRN claim is possible. Then swap $1000 of USDC for USDat on Ethereum via app.saturn.credit and hold it — 5x Orbital Points; Season 2 runs 9 Aug–8 Dec 2026 (or until $1B TVL). Registration opened 9 Nov 2026.',
    second: 'Provide USDC/USDat liquidity on Curve once for 25x points. Pendle YT-USDat (30x) is an optional, explicitly loss-capped slice only: YT expires worthless at maturity — state the maturity date and cap it at a small share of the $1,000.',
    claim: 'STRN confirmed: up to 5% of initial supply for Season 2 Orbital Points; TGE targeted Q4 2026; snapshot at TGE or 8 Dec 2026, whichever first. sUSDat unstaking has a days-long queue; not available to US/EEA/UK persons.',
    source: 'https://airdrops.io/saturn-credit/',
  },
  'tori-finance': {
    program: 'Tori Cores — Season 1 live',
    status: 'live',
    action: 'Deposit $1000 of USDC into the RockawayX Tori Ecosystem Vault on Ethereum via Upshift and keep the etrUSD shares — earn Tori Cores plus strategy yield (target ~16.9% total APY in Phase 2; 30-day lock). The current Season 1 rate is not published, so the points return cannot be sized in advance.',
    second: 'Compare the direct route (mint trUSD, stake to strUSD) with a separate small deposit only if you want a second position — it is not a conversion of your etrUSD shares.',
    claim: 'Track Cores on Tori\u2019s docs/app; the pre-deposit phase (30 Cores per $ per day, 2x boost) is complete and the current Season 1 rate is not published. Cores are explicitly not a promise of any token or payment.',
    source: 'https://docs.tori.finance/resources/cores',
    secondTxs: 0,
  },
  'tulipa-capital': {
    program: 'No own points program — curator yield',
    status: 'none',
    action: 'Deposit $1000 into a Tulipa-curated vault on Ethereum via UpShift (ERC-4626) and keep the shares — Tulipa runs Euler/Morpho strategies for August\u2019s prime-brokerage stack.',
    second: 'Check the Morpho app for MORPHO rewards on the vault once (distributed via Merkl).',
    claim: 'No Tulipa points program was found as of 2026-11-15 — the farm is curator yield plus MORPHO rewards.',
    source: 'https://defillama.com/protocol/tulipa-capital',
    secondTxs: 0,
  },
  'tydro': {
    program: 'TydroInkPoints — Season 2 live',
    status: 'live',
    action: 'Bridge $1000 to Ink (1 transaction), then supply USDC to Tydro on Ink (Aave v3 fork, Ink\u2019s largest lending market, ~$111M TVL) — weekly TydroInkPoints campaigns (e.g. USDC supply ~32,500–35,000 points/week); points are time-weighted, so deposit early and hold.',
    second: 'Borrow a small amount against the deposit once — borrowing also earns points; check the weekly renewal thread for current budgets.',
    claim: 'Track TydroInkPoints on the Tydro forum; Season 1 snapshot is complete, Season 2 runs until TGE. Boosts up to +50% exist for OG users, lending history and kBTC holdings.',
    source: 'https://forum.tydro.com/t/tydroinkpoints-season-2-introducing-boost-multipliers/22/2',
    actionTxs: 2,
  },
  'valos': {
    program: 'Flagship vault permissioned — no retail route (SKIP)',
    status: 'none',
    action: 'SKIP for a $1,000 slice: the RWA Backed Lending vault by Valos on Monad ($106.42M, ~6.4% APY, AUSD) is permissioned and does not accept deposits from outsiders.',
    second: 'The Valos vUSD/AUSD market on Euler (~9.2% APY, $14.37M) is a yield-only alternative — check it live before depositing.',
    claim: 'No Valos points program was found; the Monad WMON campaign (0.08% APR) ends 16 Nov 2026 and is negligible.',
    source: 'https://tradingstrategy.ai/vaults/rwa-backed-lending-by-valos',
    verdict: 'SKIP',
  },
  'yuzu-money': {
    program: 'Yuzu Juice — live',
    status: 'live',
    action: 'Deposit $1000 of USDC into the Accountable Yuzu Money Vault on Monad (~7.7% APY) and keep the shares — Yuzu Juice accrues on positions, often at 3x in official vaults; the team has confirmed Juice converts linearly into tokens at TGE.',
    second: 'Mint or hold syzUSD (staked yzUSD, ~10% APY, T-bill-backed) once on Monad via app.yuzu.money.',
    claim: 'Track Yuzu Juice on the Yuzu app; $YUZU has no published TGE date, tokenomics or allocation — Juice is the positioning, not a promise. Referrals pay 10% to the referrer and +5% to the referee.',
    source: 'https://www.drops.bot/airdrops/upcoming/yuzu',
    chain: 'Monad',
  },
  'axis': {
    program: 'Coordinates — Season 1 live',
    status: 'live',
    action: 'Mint $1000 of USDx on Ethereum via axis.to (USDC/USDT) and stake it into sUSDx — Coordinates (non-transferable, no monetary value, no token guarantee) accrue on the position; 30-day base APY was 16.06% on 12 Nov 2026 (DefiLlama Research, highest of 98 stablecoin pools vs a 4.17% T-bill). Verify the USDx mint minimum in axis.to docs before minting.',
    second: 'Check the sUSDx redemption queue once — redemption is asynchronous with a 7-day cooldown.',
    claim: 'Track Coordinates on the Axis app; the Origin Vault closed 5 Aug 2026 at $67.25M across 1,857 wallets. Axis\u2019s own docs say USDx is \u201cnot a stablecoin\u201d and can trade off peg; rewards are discretionary with no fixed APY.',
    source: 'https://ourcryptotalk.com/blog/crypto-yield-is-evolving-can-axis-deliver-institutional-returns',
    secondTxs: 0,
  },
  'infinifi': {
    program: 'infiniFi Points — Season 3 live',
    status: 'live',
    action: 'Mint $1000 of iUSD with USDC on Ethereum via infiniFi and stake siUSD (or lock liUSD) — Season 3 points live, 45% of supply allocated to the ecosystem, TGE targeted Q4 2026; Pendle YT-siUSD carries a 20x multiplier, Morpho/Euler/TAU 7.5x.',
    second: 'Optional, loss-capped slice only: a small share of siUSD into Pendle YT-siUSD for the 20x multiplier — YT expires worthless at maturity, so state the maturity date and cap the share; the base plan holds siUSD/liUSD.',
    claim: 'Track infiniFi points on the infiniFi app; Seasons 1–2 registration closed 10 Nov 2026 — Season 3 is the live season; weekly Chapters share a 336,000-point pool. TGE targeted Q4 2026, date unannounced; 100M INFI supply (45% ecosystem / 20% team / 20% investors / 15% foundation).',
    source: 'https://airdrops.io/infinifi/',
    secondTxs: 0,
  },
};

/**
 * A protocol's farm plan: seven costed steps for a $1,000 slice over a 90-day horizon. Each step
 * carries its transactions on the protocol's main chain and its minutes; gas is priced from the
 * model's stated table and the opportunity cost of the slice is priced against a T-bill yield.
 * The verdict is a cost-and-quality screen, not a promised return: FARM when the net cost is at
 * most $30 and the protocol shows real usage (TVL of at least $50M, or at least $10M with fees),
 * THIN when the net cost is at most $80 and some usage exists, SKIP otherwise — unless the
 * row's researched program overrides it (the slice cannot enter at all). No step claims a
 * quest, a points program or a reward the protocol has not published: the 40 watchlist rows
 * use the researched programs in FARM_PROGRAMS (each citing its public source), and the other
 * rows farm by mechanism (mechanismPlan): what the money actually does, what can go wrong
 * with it, and the honest statement that no points program is published for the protocol
 * in the sources checked.
 */
export function farmPlan(
  p: SnapshotProtocol,
  age: number | null,
  fees30d: number | null,
  model: ModelConstants = MODEL,
): { steps: FarmStep[]; gas_usd: number; opportunity_usd: number; net_usd: number; minutes: number; txs: number; verdict: 'FARM' | 'THIN' | 'SKIP'; mechanism: string } {
  const program = FARM_PROGRAMS[p.slug];
  // Costing policy (radar-7): gas is priced on the chain where the plan's steps
  // execute — the researched program's chain where one is stated, else the
  // protocol's first listed chain — never the cheapest listed chain.
  const chain = program?.chain ?? chainOf(p);
  const hold = holdDaysFor(age);
  const weeklyTxs = Math.floor(model.horizon_days / 7);
  // A SKIP-by-access row costs no transactions: the slice never enters, so the weekly
  // action and the hold become a "do not deploy, re-check access" pair instead.
  const skipByAccess = program?.verdict === 'SKIP';
  // Radar-5: rows without a researched program farm by mechanism, not by a generic
  // template — the mechanism names what the money does and what can go wrong with it.
  const mech = program === undefined ? mechanismPlan(p, model.slice_usd, chain) : null;
  const mechanism = program !== undefined ? 'researched program' : mech!.label;
  const mechKey = mechanismFor(p);
  // Radar-7: a hold-only position has no weekly qualifying action, so the weekly
  // step costs 0 transactions there. Researched programs are all hold-only; the
  // template keeps a weekly action only for perps, prediction, bridging,
  // liquidity, payments and chain-apps, where using the protocol weekly is the farm.
  const weeklyKind: 'hold' | 'weekly' = program !== undefined ? 'hold' : mech!.weekly;
  const actionTxs = skipByAccess ? 0 : program?.actionTxs ?? (mechKey === 'staking' ? 2 : 1);
  const secondTxs = skipByAccess ? 0 : program?.secondTxs ?? mech?.secondTxs ?? 1;
  const steps: FarmStep[] = [
    { text: `Use ${walletFor(chain)} that holds only the funds you plan to farm, and keep its seed phrase offline.`, txs: 0, chain, minutes: 5 },
    program !== undefined
      ? { text: program.action, txs: actionTxs, chain, minutes: 15 }
      : { text: mech!.action, txs: actionTxs, chain, minutes: 15 },
    program !== undefined
      ? { text: program.second, txs: secondTxs, chain, minutes: 10 }
      : { text: mech!.second, txs: secondTxs, chain, minutes: 10 },
    skipByAccess
      ? { text: 'No weekly action — the slice does not enter this protocol; re-check access monthly instead.', txs: 0, chain, minutes: 10 }
      : weeklyKind === 'weekly'
        ? { text: 'Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.', txs: weeklyTxs, chain, minutes: 10 * weeklyTxs }
        : { text: 'No weekly transaction — hold the position; check it once mid-way through the 90 days.', txs: 0, chain, minutes: 10 },
    skipByAccess
      ? { text: 'Do not deploy the slice here; if access opens later, re-read the protocol\u2019s own pages before entering.', txs: 0, chain, minutes: 0 }
      : { text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`, txs: 0, chain, minutes: 0 },
    program !== undefined
      ? { text: program.claim, txs: 0, chain, minutes: 10 }
      : { text: mech!.claim, txs: 0, chain, minutes: 10 },
    { text: `Write the wallet, the dates and every transaction in a farm log, and set a monthly reminder to re-check the protocol.`, txs: 0, chain, minutes: 5 },
  ];
  const unit = gasUsd(chain, model);
  const txs = steps.reduce((s, st) => s + st.txs, 0);
  const minutes = steps.reduce((s, st) => s + st.minutes, 0);
  const gas = Math.round(txs * unit * 100) / 100;
  // A slice that never deploys keeps its T-bill yield, so its opportunity cost is $0.
  const opportunity = skipByAccess ? 0 : Math.round(model.slice_usd * model.tbill_yield * (model.horizon_days / 365) * 100) / 100;
  const net = Math.round((gas + opportunity) * 100) / 100;
  const quality = (p.tvl_usd >= 50_000_000 ? 2 : p.tvl_usd >= 10_000_000 ? 1 : 0) + (fees30d !== null && fees30d > 0 ? 1 : 0);
  let verdict: 'FARM' | 'THIN' | 'SKIP' =
    program?.verdict ??
    (net <= model.farm_cost_farm_usd && quality >= 2 ? 'FARM' : net <= model.farm_cost_thin_usd && quality >= 1 ? 'THIN' : 'SKIP');
  // Radar-7: usage-only mechanisms (payments, governance, chain-apps) and the
  // riskiest ones (perps, prediction) never earn FARM on cost alone — a plan
  // with no yield, or a leveraged bet, is not a farm.
  if (verdict === 'FARM' && ['payments', 'governance', 'chain-apps', 'perps', 'prediction'].includes(mechKey)) verdict = 'THIN';
  return { steps, gas_usd: gas, opportunity_usd: opportunity, net_usd: net, minutes, txs, verdict, mechanism };
}

/** One costed step as one string: its action, then its cost and time, within 20..600 characters. */
export function stepText(step: FarmStep, model: ModelConstants = MODEL): string {
  const unit = gasUsd(step.chain, model);
  const cost = step.txs === 0 ? '$0' : `$${(Math.round(step.txs * unit * 100) / 100).toFixed(2)} of gas (${step.txs} transaction${step.txs === 1 ? '' : 's'} on ${step.chain})`;
  const time = step.minutes === 0 ? 'no time, just waiting' : step.minutes >= 60 ? `${Math.round((step.minutes / 60) * 10) / 10} hours over the plan` : `${step.minutes} minutes`;
  const suffix = ` Cost: ${cost}. Time: ${time}.`;
  // Truncate the action first, so a long action never amputates its cost disclosure.
  let action = step.text;
  if (action.length + suffix.length > 600) action = `${action.slice(0, 600 - suffix.length - 3)}...`;
  let s = `${action}${suffix}`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(
  snapshot: Snapshot,
  enrichment: EnrichmentDoc | null,
  model: ModelConstants = MODEL,
): { board: BoardRow[]; fit: ReturnType<typeof fitCurve>; cats: ReturnType<typeof categoryAdjustments> } {
  const fit = fitCurve(snapshot);
  const cats = categoryAdjustments(snapshot, fit, model);
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p === undefined) continue;
    if (!isRankable(p)) throw new SnapshotError(`watchlist slug ${slug} is not rankable: ${setAsideReason(p) ?? 'records a token'}`);
    chosen.set(slug, p);
  }
  for (const p of snapshot.protocols) {
    if (!chosen.has(p.slug) && isRankable(p)) chosen.set(p.slug, p);
  }
  const scored = [...chosen.values()].map((p) => {
    const v = impliedValue(p, snapshot.as_of, fit, cats);
    const enr = enrichment?.protocols[p.slug];
    const fees30d = enr?.fees?.fees_30d_usd ?? null;
    const plan = farmPlan(p, v.age, fees30d, model);
    return { p, v, enr, plan };
  });
  scored.sort((a, b) => b.v.implied - a.v.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  // Rank stability (radar-7): the same rows ranked by the curve alone and by the
  // flat median multiple. Both are monotone in TVL, so they agree with each other
  // and differ from the shipped rank only where the category factor moves a row.
  const slugCmp = (a: { slug: string }, b: { slug: string }): number => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0);
  const rankCurveOnly = new Map<string, number>(
    [...scored].sort((a, b) => b.v.curve - a.v.curve || slugCmp(a.p, b.p)).map((s, i) => [s.p.slug, i + 1] as [string, number]),
  );
  const rankFlat = new Map<string, number>(
    [...scored].sort((a, b) => b.p.tvl_usd - a.p.tvl_usd || slugCmp(a.p, b.p)).map((s, i) => [s.p.slug, i + 1] as [string, number]),
  );
  const traded = tradedTokens(snapshot);
  const neighboursFor = (tvl: number): BoardRow['neighbours'] =>
    [...traded]
      .sort((a, b) => Math.abs(Math.log10(a.tvl_usd) - Math.log10(tvl)) - Math.abs(Math.log10(b.tvl_usd) - Math.log10(tvl)) || slugCmp(a, b))
      .slice(0, 3)
      .map((p) => ({ slug: p.slug, name: p.name, tvl_usd: p.tvl_usd, mcap_usd: p.mcap_usd!, multiple: round4(p.mcap_usd! / p.tvl_usd) }));
  const board: BoardRow[] = scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    watchlist: snapshot.watchlist.includes(s.p.slug),
    age_days: s.v.age,
    implied_value_usd: s.v.implied,
    rank_curve_only: rankCurveOnly.get(s.p.slug)!,
    rank_flat: rankFlat.get(s.p.slug)!,
    neighbours: neighboursFor(s.p.tvl_usd),
    model: {
      curve_value_usd: Math.round(s.v.curve),
      curve_a: round4(fit.a),
      curve_b: round4(fit.b),
      category_adjustment_dex: round4(s.v.categoryAdjustmentDex),
      category_factor: round4(s.v.categoryFactor),
      category_comparables: s.v.categoryComparables,
      category_source: s.v.categorySource,
      growth_pct: s.p.change_7d === null ? null : round4(s.p.change_7d),
      age_days: s.v.age,
      chains_count: s.p.chains.length,
      // Patched by buildRadar with the bootstrap band; the point value stands in until then.
      implied_low_usd: s.v.implied,
      implied_high_usd: s.v.implied,
      mechanism: s.plan.mechanism,
    },
    signal_quality: signalQuality(s.p, s.v.age, s.v.hasCategoryAdjustment),
    farm_steps: s.plan.steps.map((st) => stepText(st, model)),
    farm: {
      gas_usd: s.plan.gas_usd,
      opportunity_usd: s.plan.opportunity_usd,
      net_usd: s.plan.net_usd,
      minutes: s.plan.minutes,
      txs: s.plan.txs,
      verdict: s.plan.verdict,
    },
    fees_30d_usd: s.enr?.fees?.fees_30d_usd ?? null,
    fees_7d_usd: s.enr?.fees?.fees_7d_usd ?? null,
    fees_all_time_usd: s.enr?.fees?.fees_all_time_usd ?? null,
    cryptorank:
      s.enr?.cryptorank === undefined || s.enr?.cryptorank === null
        ? null
        : { ...s.enr.cryptorank, rounds: [...(s.enr.cryptorank.rounds ?? [])].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)) },
    coingecko: s.enr?.coingecko ?? null,
    tokenterminal: s.enr?.tokenterminal ?? null,
    news: s.enr?.news ?? null,
    farm_program:
      FARM_PROGRAMS[s.p.slug] === undefined
        ? null
        : { label: FARM_PROGRAMS[s.p.slug]!.program, status: FARM_PROGRAMS[s.p.slug]!.status, source: FARM_PROGRAMS[s.p.slug]!.source },
    sources: [
      ...new Set(
        FARM_PROGRAMS[s.p.slug] === undefined
          ? [...(s.enr?.sources ?? ['defillama-snapshot']), ...((s.enr?.news ?? []).map((n) => n.source_url))]
          : [...(s.enr?.sources ?? ['defillama-snapshot']), FARM_PROGRAMS[s.p.slug]!.source, ...((s.enr?.news ?? []).map((n) => n.source_url))],
      ),
    ],
  }));
  return { board, fit, cats };
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot, enrichment: EnrichmentDoc | null): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p))
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
      fees_30d_usd: enrichment?.protocols[p.slug]?.fees?.fees_30d_usd ?? null,
    }));
}

/** The protocols the house rule sets aside, and why, for the dashboard's Set aside view. */
export function setAsideRows(snapshot: Snapshot): SetAsideRow[] {
  return snapshot.protocols
    .filter((p) => isPreToken(p) && setAsideReason(p) !== null)
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .map((p) => ({ slug: p.slug, name: p.name, category: p.category, tvl_usd: p.tvl_usd, reason: setAsideReason(p)! }));
}

/** A board row's compact form for data.js: the numbers and the farm plan the page renders. */
export function radarRow(row: BoardRow, watchlist: Set<string>): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    curve_value_usd: row.model.curve_value_usd,
    category_factor: row.model.category_factor,
    category_comparables: row.model.category_comparables,
    category_source: row.model.category_source,
    growth_pct: row.model.growth_pct,
    signal_quality: row.signal_quality,
    farm_steps: row.farm_steps,
    farm_gas_usd: row.farm.gas_usd,
    farm_opportunity_usd: row.farm.opportunity_usd,
    farm_net_usd: row.farm.net_usd,
    farm_minutes: row.farm.minutes,
    farm_txs: row.farm.txs,
    farm_verdict: row.farm.verdict,
    fees_30d_usd: row.fees_30d_usd,
    fees_7d_usd: row.fees_7d_usd,
    fees_all_time_usd: row.fees_all_time_usd,
    cryptorank: row.cryptorank,
    coingecko: row.coingecko,
    tokenterminal: row.tokenterminal,
    news: row.news,
    implied_low_usd: row.model.implied_low_usd,
    implied_high_usd: row.model.implied_high_usd,
    mechanism: row.model.mechanism,
    neighbours: row.neighbours,
    rank_curve_only: row.rank_curve_only,
    rank_flat: row.rank_flat,
    farm_program: row.farm_program,
    sources: row.sources,
    watchlist: watchlist.has(row.slug),
  };
}

/** Everything the dashboard renders, from the snapshot and the baked-in enrichment. */
export function buildRadar(
  snapshot: Snapshot,
  enrichment: EnrichmentDoc | null,
  model: ModelConstants = MODEL,
): { board: BoardRow[]; radar: RadarData } {
  const { board, fit, cats } = buildBoard(snapshot, enrichment, model);
  const live = liveRows(snapshot, enrichment);
  const setAside = setAsideRows(snapshot);
  const bt = backtest(snapshot, model);
  // Radar-5: the bootstrap band per row — the same 200 refits as the backtest's
  // stability block, so the band and the backtest can never disagree.
  const bands = bootstrapBands(snapshot, board, model);
  for (const row of board) {
    const band = bands.get(row.slug);
    if (band !== undefined) {
      row.model.implied_low_usd = band.low_usd;
      row.model.implied_high_usd = band.high_usd;
    }
  }
  const watchlistSet = new Set(snapshot.watchlist);
  const early = board.filter((r) => !watchlistSet.has(r.slug)).length;
  const top10 = board.slice(0, 10);
  const rankStability = {
    top10_moved: top10.filter((r) => r.rank_curve_only !== r.rank || r.rank_flat !== r.rank).length,
    top10_max_move: top10.reduce((m, r) => Math.max(m, Math.abs(r.rank_curve_only - r.rank), Math.abs(r.rank_flat - r.rank)), 0),
  };
  const categoryAdjustmentRows: CategoryAdjustment[] = [...cats.entries()]
    .map(([category, v]) => ({ category, adjustment_dex: round4(v.adjustment_dex), factor: round4(v.factor), comparables: v.comparables, source: 'category' as const }))
    .sort((a, b) => b.comparables - a.comparables || (a.category < b.category ? -1 : a.category > b.category ? 1 : 0));
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    set_aside_size: setAside.length,
    traded_size: fit.n,
    curve: { a: round4(fit.a), b: round4(fit.b), r2: round4(fit.r2), resid_sd_dex: round4(fit.resid_sd_dex), n: fit.n, flat_multiple: round4(fit.flat_multiple) },
    backtest: bt,
    category_adjustments: categoryAdjustmentRows,
    rank_stability: rankStability,
    rows: board.map((r) => radarRow(r, watchlistSet)),
    live,
    set_aside: setAside,
    traded_points: tradedTokens(snapshot).map((p) => ({ slug: p.slug, name: p.name, category: p.category, tvl_usd: p.tvl_usd, mcap_usd: p.mcap_usd! })),
    enrichment_meta: enrichment?.meta ?? null,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    if (p.tvl_usd <= 0) throw new SnapshotError(`snapshot.json's protocol ${i} (${p.slug}) has TVL ${p.tvl_usd}`);
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  const seen = new Set<string>();
  for (const pr of protocols) {
    if (seen.has(pr.slug)) throw new SnapshotError(`snapshot.json repeats the slug ${pr.slug}`);
    seen.add(pr.slug);
  }
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** The enrichment out of a file's text, or null when the file is absent or unusable. */
export function parseEnrichment(text: string | null): EnrichmentDoc | null {
  if (text === null) return null;
  try {
    const raw = JSON.parse(text) as EnrichmentDoc;
    if (typeof raw !== 'object' || raw === null || typeof raw.protocols !== 'object' || raw.protocols === null) return null;
    // Shape-check each entry: a malformed enrichment row used to flow verbatim
    // into board.json and the dashboard. Bad entries are dropped, not scored on.
    for (const [slug, e] of Object.entries(raw.protocols)) {
      if (typeof e !== 'object' || e === null || Array.isArray(e)) return null;
      const en = e as Record<string, unknown>;
      if (en.fees !== null && en.fees !== undefined && (typeof en.fees !== 'object' || Array.isArray(en.fees))) return null;
      if (en.news !== null && en.news !== undefined && !Array.isArray(en.news)) return null;
      if (en.cryptorank !== null && en.cryptorank !== undefined) {
        const cr = en.cryptorank as Record<string, unknown>;
        if (typeof cr !== 'object' || (cr.rounds !== undefined && cr.rounds !== null && !Array.isArray(cr.rounds))) return null;
      }
      if (en.sources !== undefined && !Array.isArray(en.sources)) return null;
      void slug;
    }
    return raw;
  } catch {
    return null;
  }
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, farm steps, and verdicts. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const rankable = snapshot.protocols.filter((p) => isRankable(p)).length;
  if (board.length !== rankable) return `the board has ${board.length} rows but ${rankable} protocols are rankable`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 0; i < board.length; i++) if (board[i]!.rank !== i + 1) return `row ${i + 1} carries rank ${board[i]!.rank}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
    if (!['FARM', 'THIN', 'SKIP'].includes(r.farm.verdict)) return `${r.slug} has farm verdict ${r.farm.verdict}`;
    if (Math.abs(r.farm.net_usd - (r.farm.gas_usd + r.farm.opportunity_usd)) > 0.011) return `${r.slug} has a net farm cost that is not gas plus opportunity cost`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
