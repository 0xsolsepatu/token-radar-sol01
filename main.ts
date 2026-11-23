// Token Radar's entry program (Node 22, standard library only).
//
// Reads the sealed snapshot from /input/snapshot.json (or --input <file|dir>), scores every
// rankable pre-token protocol with the radar-3 model in lib/model.ts, merges the build-time
// enrichment baked into data/enrichment.json (CryptoRank, CoinGecko, DefiLlama Fees — fetched
// when the entry was built, never at grade time), writes the ranked board to /output/board.json
// and the dashboard's data beside it as data.js, copies this repository's dashboard/ and
// screenshots/ to /output, and writes /output/dossier.json with the vendored make.fun library —
// the summary the judge reads.
//
// The dashboard is a static page, no framework and no network: dashboard/index.html,
// dashboard/app.css and dashboard/app.js read /output/data.js. The board carries the farm plan
// for every row, so the page renders exactly what board.json holds.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardIssue, buildRadar, dataScript, parseEnrichment, parseSnapshot } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

const here = fileURLToPath(new URL('.', import.meta.url));

/** The scorer's own caps: the text cap shapes the bytes, the rest refuse. */
const TEXT_MAX_BYTES = 65_536;
const SCREENSHOT_CAPS = { max: 4, max_bytes: 524_288 };
const IMAGE_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

/** --name <value> out of the arguments, or the fallback. */
function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  if (at >= 0 && at + 1 < process.argv.length) return process.argv[at + 1]!;
  const withEquals = process.argv.find((a) => a.startsWith(`--${name}=`));
  return withEquals === undefined ? fallback : withEquals.slice(name.length + 3);
}

const inputArg = arg('input', '/input');
const inputFile = inputArg.endsWith('.json') ? inputArg : join(inputArg, 'snapshot.json');
if (!existsSync(inputFile)) {
  process.stderr.write(`token radar: no snapshot at ${inputFile}: pass --input <snapshot.json|directory> or mount the sealed /input\n`);
  process.exit(2);
}
const out = arg('output', process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

const snapshot = parseSnapshot(readFileSync(inputFile, 'utf8'));
const enrichmentPath = join(here, 'data', 'enrichment.json');
const enrichment = parseEnrichment(existsSync(enrichmentPath) ? readFileSync(enrichmentPath, 'utf8') : null);
if (enrichment === null) {
  process.stderr.write('token radar: no usable data/enrichment.json: continuing with snapshot-only rows\n');
}
const { board, radar } = buildRadar(snapshot, enrichment);
const issue = boardIssue(board, snapshot);
if (issue !== null) {
  process.stderr.write(`token radar: the model wrote a board the gate refuses: ${issue}\n`);
  process.exit(1);
}

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'board.json'), `${JSON.stringify({ rows: board })}\n`);
writeFileSync(join(out, 'data.js'), dataScript(radar));

/** Copy one directory's regular files into `to`, skipping names that start with a dot. */
function copyFiles(from: string, to: string): string[] {
  if (!existsSync(from)) return [];
  mkdirSync(to, { recursive: true });
  const copied: string[] = [];
  for (const name of readdirSync(from)) {
    if (name.startsWith('.')) continue;
    const path = join(from, name);
    if (!statSync(path).isFile()) continue;
    copyFileSync(path, join(to, name));
    copied.push(name);
  }
  return copied;
}

const dashboardFiles = copyFiles(join(here, 'dashboard'), join(out, 'dashboard'));
const shots = copyFiles(join(here, 'screenshots'), join(out, 'screenshots'));
if (shots.length < 3) {
  process.stderr.write(`token radar: screenshots/ holds ${shots.length} image${shots.length === 1 ? '' : 's'}: hand in 3, the board, a detail view and a filtered view\n`);
  process.exit(1);
}
for (const name of shots) {
  if (!IMAGE_NAME.test(name)) {
    process.stderr.write(`token radar: screenshots/${name}: a name is letters, digits and . _ -, 1 to 128 characters\n`);
    process.exit(1);
  }
}

// The dossier is written last: the scorer rebuilds it from this /output and compares bytes.
// Round 3 (Track 1): the dossier text must fit whole under the 65,536-byte cap
// with room to spare — refuse to build when it passes the budget,
// so a truncated dossier (openDetail / index.html cut off, as in radar-7) can
// never ship again. The 65,536 cap still applies inside buildDossier.
// Round 8 raised the internal budget from 60,000 to 62,000 to hold the integrity
// strip + launch-odds column (measured 62,423 B before trimming ~500 B of prose);
// 62,000 still leaves a 3,536 B margin to the cap.
// Round 9 raises it to 64,000: the expected-value display, the self-verifying
// strip (recompute proof) and the farm $/hour + deposit threshold add ~2,970 B,
// and ~1,400 B of low-loss prose was cut first (comments, table notes, redundant
// sentences); cutting the remaining 1,405 B would mean deleting the Why-$13/$16,
// Risks and Corrections sections whole. 64,000 still leaves a 1,536 B margin
// to the cap, and the dossier is deterministic — its bytes are known at build time.
const dossierBytes = buildDossier(out, { text_max_bytes: TEXT_MAX_BYTES, screenshots: SCREENSHOT_CAPS, dashboard: { max_files: 400, max_bytes: 4_194_304 } });
const dossierTextBytes = Buffer.byteLength(JSON.parse(Buffer.from(dossierBytes).toString('utf8')).text, 'utf8');
if (dossierTextBytes > 64_000) {
  process.stderr.write(`token radar: dossier text is ${dossierTextBytes} bytes, over the 64,000-byte round-9 budget (cap 65,536): cut dashboard prose before submitting\n`);
  process.exit(1);
}
writeFileSync(join(out, 'dossier.json'), dossierBytes);

process.stdout.write(
  `token radar: ${snapshot.protocols.length} protocols, ${snapshot.watchlist.length} on the watchlist, ${board.length} rows scored (${radar.early_size} early, ${radar.live_size} live, ${radar.set_aside_size} set aside, ${radar.traded_size} traded in the curve)\n` +
    `token radar: curve log10(mcap) = ${radar.curve.a} + ${radar.curve.b} * log10(tvl), R2 ${radar.curve.r2}; LOO curve+category ${radar.backtest.loo_curve_category.median_miss}x (curve-only ${radar.backtest.loo_curve.median_miss}x; flat ${radar.backtest.loo_flat.median_miss}x), time-split curve+category ${radar.backtest.time_split_curve_category.median_miss}x (curve-only ${radar.backtest.time_split_curve.median_miss}x; flat ${radar.backtest.time_split_flat.median_miss}x)\n` +
    `token radar: wrote ${join(out, 'board.json')}, ${join(out, 'data.js')}, ${join(out, 'dashboard')} (${dashboardFiles.length} files), ${join(out, 'screenshots')} (${shots.length} images) and ${join(out, 'dossier.json')}\n`,
);
