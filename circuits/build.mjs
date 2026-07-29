/**
 * @file build.mjs
 * @package circuits/
 *
 * Reproducible build pipeline for the PoHI Groth16 circuit:
 *   compile -> Powers of Tau -> circuit-specific setup -> verification key export.
 *
 * Run with:  npm run circuits:build
 *
 * SECURITY NOTICE
 * ---------------
 * The Powers of Tau and phase-2 contributions generated here are produced locally with
 * deterministic test entropy. They exist so the circuit can be compiled, proved and verified
 * reproducibly in development and CI. They are NOT a trusted setup: anyone who can run this
 * script knows the toxic waste and could forge proofs. A production deployment MUST replace
 * circuits/build/pohi_main_final.zkey with the output of a real multi-party ceremony.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CIRCUITS_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(CIRCUITS_DIR, '..');
const BUILD_DIR = join(CIRCUITS_DIR, 'build');

// 2^14 = 16384 constraints capacity, comfortably above the circuit's requirement.
const POT_POWER = 14;

function run(command, args, cwd) {
  process.stdout.write(`  $ ${command} ${args.join(' ')}\n`);
  execFileSync(command, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
}

function step(label) {
  process.stdout.write(`\n[build] ${label}\n`);
}

if (existsSync(BUILD_DIR)) {
  rmSync(BUILD_DIR, { recursive: true, force: true });
}
mkdirSync(BUILD_DIR, { recursive: true });

step('Compiling pohi_main.circom (R1CS + WASM witness generator + symbol map)');
run(
  'npx',
  [
    'circom2',
    'pohi_main.circom',
    '--r1cs',
    '--wasm',
    '--sym',
    '-l',
    join('..', 'node_modules'),
    '-o',
    'build',
  ],
  CIRCUITS_DIR
);

step('Compiling an unoptimized build for signal-level inspection by the test suite');
mkdirSync(join(BUILD_DIR, 'dbg'), { recursive: true });
run(
  'npx',
  [
    'circom2',
    'pohi_main.circom',
    '--r1cs',
    '--wasm',
    '--sym',
    '--O0',
    '-l',
    join('..', 'node_modules'),
    '-o',
    join('build', 'dbg'),
  ],
  CIRCUITS_DIR
);

step('Generating Powers of Tau (phase 1, development entropy)');
run('npx', ['snarkjs', 'powersoftau', 'new', 'bn128', String(POT_POWER), 'pot_0000.ptau', '-v'], BUILD_DIR);
run(
  'npx',
  [
    'snarkjs',
    'powersoftau',
    'contribute',
    'pot_0000.ptau',
    'pot_0001.ptau',
    '--name=pohi-dev-contribution',
    '-v',
    '-e=pohi-development-entropy-not-for-production',
  ],
  BUILD_DIR
);

step('Preparing phase 2');
run('npx', ['snarkjs', 'powersoftau', 'prepare', 'phase2', 'pot_0001.ptau', 'pot_final.ptau', '-v'], BUILD_DIR);

step('Groth16 circuit-specific setup');
run('npx', ['snarkjs', 'groth16', 'setup', 'pohi_main.r1cs', 'pot_final.ptau', 'pohi_main_0000.zkey'], BUILD_DIR);
run(
  'npx',
  [
    'snarkjs',
    'zkey',
    'contribute',
    'pohi_main_0000.zkey',
    'pohi_main_final.zkey',
    '--name=pohi-dev-phase2',
    '-v',
    '-e=pohi-development-phase2-entropy-not-for-production',
  ],
  BUILD_DIR
);

step('Exporting verification key');
run('npx', ['snarkjs', 'zkey', 'export', 'verificationkey', 'pohi_main_final.zkey', 'verification_key.json'], BUILD_DIR);

step('Printing circuit statistics');
run('npx', ['snarkjs', 'r1cs', 'info', 'pohi_main.r1cs'], BUILD_DIR);

process.stdout.write('\n[build] Complete. Artifacts in circuits/build/\n');
process.stdout.write('[build] REMINDER: pohi_main_final.zkey uses development entropy and is NOT production-safe.\n');
