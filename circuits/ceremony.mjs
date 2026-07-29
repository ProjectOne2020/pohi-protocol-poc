/**
 * @file ceremony.mjs
 * @package circuits/
 *
 * Multi-party Groth16 phase-2 trusted setup ceremony for the PoHI circuit.
 *
 * Groth16 requires a circuit-specific setup whose secret randomness ("toxic waste") must be
 * destroyed. The security property is 1-of-N: the resulting proving key is sound provided at
 * least ONE participant discarded their contribution honestly. A single-party setup therefore
 * offers no guarantee at all, which is why a production deployment cannot use the development
 * key produced by build.mjs.
 *
 * Usage:
 *   node circuits/ceremony.mjs init
 *   node circuits/ceremony.mjs contribute <participant-name>
 *   node circuits/ceremony.mjs finalize <beacon-hex> <iterations>
 *   node circuits/ceremony.mjs verify
 *
 * See docs/CEREMONY.md for the full operating procedure.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomBytes } from 'node:crypto';

const CIRCUITS_DIR = dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = join(CIRCUITS_DIR, 'build');
const CEREMONY_DIR = join(CIRCUITS_DIR, 'ceremony');
const PTAU_DIR = join(CIRCUITS_DIR, 'ptau');

const R1CS = join(BUILD_DIR, 'pohi_main.r1cs');
const TRANSCRIPT = join(CEREMONY_DIR, 'transcript.json');

/**
 * Phase 1 (Powers of Tau) is circuit-independent and should reuse a large existing ceremony
 * rather than being re-run locally. The Hermez "Perpetual Powers of Tau" is the customary
 * choice; place the file for 2^14 constraints at the path below.
 */
const EXTERNAL_PTAU = join(PTAU_DIR, 'powersOfTau28_hez_final_14.ptau');
const DEV_PTAU = join(BUILD_DIR, 'pot_final.ptau');

/**
 * Invokes the snarkjs CLI directly through the Node binary rather than through `npx` with a
 * shell. A shell would concatenate arguments without escaping them, so any participant name
 * containing a space would be split into separate arguments and the command would fail.
 */
const SNARKJS_CLI = join(CIRCUITS_DIR, '..', 'node_modules', 'snarkjs', 'build', 'cli.cjs');

function run(args) {
  process.stdout.write(`  $ snarkjs ${args.join(' ')}\n`);
  execFileSync(process.execPath, [SNARKJS_CLI, ...args], {
    cwd: CEREMONY_DIR,
    stdio: 'inherit',
  });
}

function resolvePtau() {
  if (existsSync(EXTERNAL_PTAU)) {
    return { path: EXTERNAL_PTAU, production: true };
  }
  if (existsSync(DEV_PTAU)) {
    return { path: DEV_PTAU, production: false };
  }
  throw new Error(
    `No Powers of Tau file found.\n` +
      `  For production, place a Perpetual Powers of Tau file at:\n    ${EXTERNAL_PTAU}\n` +
      `  For development, run "npm run circuits:build" first to generate one locally.`
  );
}

function loadTranscript() {
  if (!existsSync(TRANSCRIPT)) return { phase1: null, contributions: [], finalized: null };
  return JSON.parse(readFileSync(TRANSCRIPT, 'utf8'));
}

function saveTranscript(transcript) {
  writeFileSync(TRANSCRIPT, `${JSON.stringify(transcript, null, 2)}\n`);
}

function hashFile(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function zkeyName(index) {
  return `pohi_main_${String(index).padStart(4, '0')}.zkey`;
}

function latestIndex() {
  const files = readdirSync(CEREMONY_DIR).filter((f) => /^pohi_main_\d{4}\.zkey$/.test(f));
  if (files.length === 0) return -1;
  return Math.max(...files.map((f) => Number(f.match(/(\d{4})/)[1])));
}

// ---------------------------------------------------------------------------------------

const [command, ...args] = process.argv.slice(2);

mkdirSync(CEREMONY_DIR, { recursive: true });
mkdirSync(PTAU_DIR, { recursive: true });

if (!existsSync(R1CS)) {
  throw new Error(`Missing ${R1CS}. Run "npm run circuits:build" first.`);
}

switch (command) {
  case 'init': {
    const ptau = resolvePtau();
    if (!ptau.production) {
      process.stdout.write(
        '\n  WARNING: using the locally generated development Powers of Tau.\n' +
          '  A production ceremony must start from a large multi-party phase 1 file.\n\n'
      );
    }
    run(['groth16', 'setup', R1CS, ptau.path, zkeyName(0)]);
    saveTranscript({
      circuitR1csSha256: hashFile(R1CS),
      phase1: { path: ptau.path, sha256: hashFile(ptau.path), production: ptau.production },
      contributions: [],
      finalized: null,
    });
    process.stdout.write(`\n  Initialised ceremony at ${join(CEREMONY_DIR, zkeyName(0))}\n`);
    process.stdout.write('  Next: node circuits/ceremony.mjs contribute <participant-name>\n');
    break;
  }

  case 'contribute': {
    const participant = args[0];
    if (!participant) throw new Error('Usage: ceremony.mjs contribute <participant-name>');

    const index = latestIndex();
    if (index < 0) throw new Error('Run "ceremony.mjs init" first.');

    // Entropy is drawn from the OS CSPRNG and never written to disk. Each participant is
    // responsible for destroying the memory/machine state afterwards; the 1-of-N property
    // means the ceremony stays sound as long as any single participant does so.
    const entropy = randomBytes(64).toString('hex');

    run([
      'zkey',
      'contribute',
      zkeyName(index),
      zkeyName(index + 1),
      `--name=${participant}`,
      '-v',
      `-e=${entropy}`,
    ]);

    const transcript = loadTranscript();
    transcript.contributions.push({
      index: index + 1,
      participant,
      file: zkeyName(index + 1),
      sha256: hashFile(join(CEREMONY_DIR, zkeyName(index + 1))),
      contributedAt: new Date().toISOString(),
    });
    saveTranscript(transcript);

    process.stdout.write(
      `\n  Contribution ${index + 1} by "${participant}" recorded.\n` +
        '  Destroy this machine state or reboot before reusing it.\n'
    );
    break;
  }

  case 'finalize': {
    const [beacon, iterations] = args;
    if (!beacon || !iterations) {
      throw new Error('Usage: ceremony.mjs finalize <beacon-hex> <iterations>');
    }

    const index = latestIndex();
    const transcript = loadTranscript();
    if (transcript.contributions.length === 0) {
      throw new Error('Refusing to finalize a ceremony with zero contributions.');
    }

    // A public verifiable-delay beacon removes the last participant's ability to bias the
    // result; its input must be a value nobody could predict at contribution time.
    run(['zkey', 'beacon', zkeyName(index), 'pohi_main_final.zkey', beacon, iterations, '-n=Final beacon']);
    run(['zkey', 'export', 'verificationkey', 'pohi_main_final.zkey', 'verification_key.json']);

    transcript.finalized = {
      beacon,
      iterations: Number(iterations),
      finalZkeySha256: hashFile(join(CEREMONY_DIR, 'pohi_main_final.zkey')),
      verificationKeySha256: hashFile(join(CEREMONY_DIR, 'verification_key.json')),
      finalizedAt: new Date().toISOString(),
    };
    saveTranscript(transcript);

    process.stdout.write('\n  Ceremony finalized. Run "ceremony.mjs verify" and publish the transcript.\n');
    break;
  }

  case 'verify': {
    const ptau = resolvePtau();
    const transcript = loadTranscript();

    if (!existsSync(join(CEREMONY_DIR, 'pohi_main_final.zkey'))) {
      throw new Error('No finalized zkey found. Run "ceremony.mjs finalize" first.');
    }

    // Verifies the entire contribution chain against the circuit and phase-1 file.
    run(['zkey', 'verify', R1CS, ptau.path, 'pohi_main_final.zkey']);

    const currentR1cs = hashFile(R1CS);
    if (transcript.circuitR1csSha256 && transcript.circuitR1csSha256 !== currentR1cs) {
      throw new Error(
        'The circuit has changed since this ceremony was initialised.\n' +
          'A Groth16 setup is circuit-specific: the ceremony must be re-run.'
      );
    }

    process.stdout.write('\n  Ceremony verified.\n');
    process.stdout.write(`  Contributions: ${transcript.contributions.length}\n`);
    process.stdout.write(`  Phase 1 production-grade: ${transcript.phase1?.production ? 'yes' : 'NO'}\n`);
    if (!transcript.phase1?.production) {
      process.stdout.write('\n  This key is NOT production-safe: phase 1 used development entropy.\n');
    }
    break;
  }

  default:
    process.stdout.write(
      'PoHI Groth16 phase-2 ceremony\n\n' +
        '  node circuits/ceremony.mjs init\n' +
        '  node circuits/ceremony.mjs contribute <participant-name>\n' +
        '  node circuits/ceremony.mjs finalize <beacon-hex> <iterations>\n' +
        '  node circuits/ceremony.mjs verify\n\n' +
        'See docs/CEREMONY.md for the full procedure.\n'
    );
}
