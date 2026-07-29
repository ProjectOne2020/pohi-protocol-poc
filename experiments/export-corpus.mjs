/**
 * @file export-corpus.mjs
 * @package experiments/
 *
 * Exports collected sessions from the study database into the corpus format consumed by
 * run-evaluation.mjs. The transformation itself lives in src/export.mjs so it can be unit
 * tested; this file is the network and CLI layer.
 *
 * Reading the corpus requires the service role key, which bypasses Row Level Security. That
 * key must never appear in the collection page, in this repository, or in any published
 * artifact: possession of it grants full read and write access to the study database.
 *
 * Usage (PowerShell):
 *   $env:POHI_SUPABASE_URL = "https://<ref>.supabase.co"
 *   $env:POHI_SERVICE_KEY  = "<service role key>"
 *   node experiments/export-corpus.mjs --out data/human-corpus.json
 *
 * Usage (bash):
 *   POHI_SUPABASE_URL=... POHI_SERVICE_KEY=... node experiments/export-corpus.mjs --out corpus.json
 *
 * Options:
 *   --out <path>      Destination file (required).
 *   --batch <name>    Only export one study batch (default: every batch).
 *   --min-events <n>  Drop sessions with fewer than n keystrokes (default: 11, the Equation 3.2
 *                     minimum of 10 flight samples).
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { rowsToCorpus, summarise, DEFAULT_MIN_EVENTS } from './src/export.mjs';

const options = { out: null, batch: null, minEvents: DEFAULT_MIN_EVENTS };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--out') options.out = argv[++i];
  else if (argv[i] === '--batch') options.batch = argv[++i];
  else if (argv[i] === '--min-events') options.minEvents = Number(argv[++i]);
}

const url = process.env.POHI_SUPABASE_URL;
const serviceKey = process.env.POHI_SERVICE_KEY;

if (!url || !serviceKey) {
  process.stderr.write(
    'Set POHI_SUPABASE_URL and POHI_SERVICE_KEY in the environment.\n' +
      'The service key is in the Supabase dashboard under Project Settings > API.\n' +
      'Never commit it or place it in the collection page.\n'
  );
  process.exit(2);
}
if (!options.out) {
  process.stderr.write('Specify a destination with --out <path>.\n');
  process.exit(2);
}

const SELECT_COLUMNS = [
  'session_id',
  'participant_token',
  'device',
  'context_length',
  'render_time',
  'events',
  'event_count',
  'client_collected_at',
  'study_batch',
  'received_at',
].join(',');

/** Pages through PostgREST so the export is not capped by the default row limit. */
async function fetchAllRows() {
  const rows = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const query = new URLSearchParams({
      select: SELECT_COLUMNS,
      order: 'received_at.asc',
      limit: String(pageSize),
      offset: String(offset),
    });
    if (options.batch) query.set('study_batch', `eq.${options.batch}`);

    const response = await fetch(`${url}/rest/v1/keystroke_sessions?${query}`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (!response.ok) {
      throw new Error(`Export failed: ${response.status} ${await response.text()}`);
    }
    const page = await response.json();
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

const rows = await fetchAllRows();

if (rows.length === 0) {
  process.stderr.write(
    'The study database returned no sessions.\n' +
      (options.batch ? `Check that the batch "${options.batch}" is spelled correctly.\n` : '')
  );
  process.exit(1);
}

const { corpus, dropped } = rowsToCorpus(rows, {
  minEvents: options.minEvents,
  batch: options.batch,
});

mkdirSync(dirname(options.out), { recursive: true });
writeFileSync(options.out, `${JSON.stringify(corpus, null, 2)}\n`);

// ---------------------------------------------------------------------------------------

const stats = summarise(corpus);

process.stdout.write(`\nExported ${stats.sessions} sessions from ${stats.participants} participants.\n`);
process.stdout.write(`  Keystrokes: ${stats.keystrokes}\n`);
process.stdout.write(`  Dropped (below ${options.minEvents} keystrokes): ${dropped.tooShort}\n`);
process.stdout.write('  Device breakdown:\n');
for (const [device, count] of Object.entries(stats.byDevice).sort((a, b) => b[1] - a[1])) {
  process.stdout.write(`    ${device.padEnd(20)} ${count}\n`);
}
process.stdout.write(`\n  Written to ${options.out}\n`);

if (stats.participants < 20) {
  process.stdout.write(
    `\n  NOTE: ${stats.participants} participants is below the 20-40 recommended in ` +
      'experiments/README.md section 2.\n  Confidence intervals will be wide; collect more before reporting.\n'
  );
}
process.stdout.write('\n');
