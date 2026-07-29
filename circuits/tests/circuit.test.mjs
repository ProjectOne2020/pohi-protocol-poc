/**
 * @file circuit.test.mjs
 * @package circuits/tests
 *
 * Verification & validation suite for the PoHI Groth16 circuit.
 *
 * Requires `npm run circuits:build` to have been executed first.
 *
 * The suite covers three independent concerns:
 *   1. FIDELITY  - the circuit reproduces packages/core-math within documented tolerances.
 *   2. BEHAVIOUR - human-like sessions are accepted and automated sessions are rejected.
 *   3. SOUNDNESS - regression tests proving that the constraint system actually binds every
 *                  security-critical signal. These are the tests that a circuit using `<--`
 *                  without a matching `===` would fail.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as snarkjs from 'snarkjs';

import {
  computeFisherPearsonSkewness,
  computeCognitiveAssimilationRatio,
  computeErrorRecalibrationVariance,
  computePoHIScore,
  PARAM_ESCROW_ALPHA,
  PARAM_ESCROW_BETA,
  PARAM_ESCROW_GAMMA,
  PARAM_ESCROW_THETA,
  FIXED_POINT_SCALING_FACTOR as SCALE,
} from '@pohi-protocol/core-math';

const CIRCUITS_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const BUILD = join(CIRCUITS_DIR, 'build');
const DBG = join(BUILD, 'dbg');

const WASM = join(BUILD, 'pohi_main_js', 'pohi_main.wasm');
const ZKEY = join(BUILD, 'pohi_main_final.zkey');
const VKEY = join(BUILD, 'verification_key.json');
const R1CS = join(BUILD, 'pohi_main.r1cs');

const DBG_WASM = join(DBG, 'pohi_main_js', 'pohi_main.wasm');
const DBG_SYM = join(DBG, 'pohi_main.sym');
const DBG_R1CS = join(DBG, 'pohi_main.r1cs');

const FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/**
 * Maximum absolute deviation between the circuit and the floating-point reference for any
 * sigmoid-derived quantity. Established by circuits/tools/derive_sigmoid_coefficients.mjs:
 * the degree-5 polynomial mandated by whitepaper Ch.5 Section 5.1 has a worst-case error of
 * 0.0122 against the exact logistic function.
 */
const SIGMOID_TOLERANCE = 0.0122;

/** Metric-level quantities are exact up to fixed-point truncation at 10^-6. */
const FIXED_POINT_TOLERANCE = 1e-4;

// ---------------------------------------------------------------------------------------
// Witness helpers
// ---------------------------------------------------------------------------------------

function loadSymbolMap() {
  const map = new Map();
  for (const line of readFileSync(DBG_SYM, 'utf8').split('\n')) {
    const parts = line.trim().split(',');
    // Format: signalIndex, witnessIndex, componentIndex, name
    if (parts.length < 4) continue;
    const witnessIndex = Number(parts[1]);
    if (witnessIndex >= 0) map.set(parts[3], witnessIndex);
  }
  return map;
}

/** Interprets a field element using the signed convention circom uses. */
function toSigned(value) {
  const v = BigInt(value);
  return v > FIELD / 2n ? v - FIELD : v;
}

async function calculateWitness(input, wasmPath, outPath) {
  await snarkjs.wtns.calculate(input, wasmPath, outPath);
  return snarkjs.wtns.exportJson(outPath);
}

/**
 * Rewrites a single value inside a binary .wtns file.
 * Used by the soundness tests to forge a witness the prover would like to submit.
 */
function tamperWitnessFile(sourcePath, targetPath, witnessIndex, newValue) {
  const buffer = readFileSync(sourcePath);
  assert.equal(buffer.toString('utf8', 0, 4), 'wtns', 'unexpected witness file magic');

  const sectionCount = buffer.readUInt32LE(8);
  let cursor = 12;
  let n8 = null;
  let dataOffset = null;

  for (let s = 0; s < sectionCount; s++) {
    const sectionId = buffer.readUInt32LE(cursor);
    const sectionSize = Number(buffer.readBigUInt64LE(cursor + 4));
    const bodyStart = cursor + 12;
    if (sectionId === 1) {
      n8 = buffer.readUInt32LE(bodyStart);
    } else if (sectionId === 2) {
      dataOffset = bodyStart;
    }
    cursor = bodyStart + sectionSize;
  }

  assert.ok(n8 !== null && dataOffset !== null, 'witness file missing required sections');

  const patched = Buffer.from(buffer);
  let remaining = BigInt(newValue);
  if (remaining < 0n) remaining += FIELD;
  for (let byte = 0; byte < n8; byte++) {
    patched[dataOffset + witnessIndex * n8 + byte] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  writeFileSync(targetPath, patched);
}

// ---------------------------------------------------------------------------------------
// Session fixtures
// ---------------------------------------------------------------------------------------

const ESCROW = {
  alpha: PARAM_ESCROW_ALPHA,
  beta: PARAM_ESCROW_BETA,
  gamma: PARAM_ESCROW_GAMMA,
  theta: PARAM_ESCROW_THETA,
};

/** Right-skewed flight times with cognitive pauses: characteristic of biological typing. */
const HUMAN_FLIGHT = [
  38, 42, 35, 40, 37, 120, 44, 39, 41, 36,
  210, 43, 38, 45, 37, 40, 165, 42, 36, 39,
  41, 38, 340, 44, 37, 40, 42, 39, 95,
];
const HUMAN_DWELL = Array.from({ length: 30 }, (_, i) => 78 + ((i * 7) % 25));
const HUMAN_BACKSPACE = [5, 16, 22];

/** Isochronous flight times and an instant response: characteristic of macro automation. */
const BOT_FLIGHT = new Array(29).fill(50);
const BOT_DWELL = new Array(30).fill(60);
const BOT_BACKSPACE = [];

const MAX_EVENTS = 30;
const MAX_FLIGHT = MAX_EVENTS - 1;

/** Pads a vector to the circuit's fixed capacity with the given filler value. */
function pad(values, capacity, filler = 0) {
  return [...values, ...new Array(capacity - values.length).fill(filler)];
}

function buildInput({
  flight,
  dwell,
  backspaceIndices,
  contextLength,
  tauReal,
  calibration = ESCROW,
  sessionHash = '77713371337',
  timestamp = 1753000000,
  flightPadding = 0,
  dwellPadding = 0,
}) {
  const eventCount = flight.length + 1;
  return {
    threshold_theta: Math.round(calibration.theta * SCALE),
    context_length: contextLength,
    session_hash: sessionHash,
    timestamp,
    alpha: Math.round(calibration.alpha * SCALE),
    beta: Math.round(calibration.beta * SCALE),
    gamma: Math.round(calibration.gamma * SCALE),
    flight_times: pad(flight, MAX_FLIGHT, flightPadding),
    dwell_times: pad(dwell, MAX_EVENTS, dwellPadding),
    tau_real: tauReal,
    backspace_selector: pad(
      flight.map((_, i) => (backspaceIndices.includes(i) ? 1 : 0)),
      MAX_FLIGHT,
      0
    ),
    event_count: eventCount,
  };
}

function referenceScore({ flight, backspaceIndices, contextLength, tauReal, calibration = ESCROW }) {
  const metrics = {
    fisherPearsonSkewness: computeFisherPearsonSkewness(flight),
    cognitiveAssimilationRatio: computeCognitiveAssimilationRatio(tauReal, contextLength),
    errorRecalibrationVariance: computeErrorRecalibrationVariance(flight, backspaceIndices),
  };
  return { metrics, result: computePoHIScore(metrics, calibration) };
}

const HUMAN_SESSION = {
  flight: HUMAN_FLIGHT,
  dwell: HUMAN_DWELL,
  backspaceIndices: HUMAN_BACKSPACE,
  contextLength: 220,
  tauReal: 12000,
};

const BOT_SESSION = {
  flight: BOT_FLIGHT,
  dwell: BOT_DWELL,
  backspaceIndices: BOT_BACKSPACE,
  contextLength: 220,
  tauReal: 90,
};

let symbols;

before(() => {
  for (const artifact of [WASM, ZKEY, VKEY, R1CS, DBG_WASM, DBG_SYM]) {
    if (!existsSync(artifact)) {
      throw new Error(`Missing build artifact ${artifact}. Run "npm run circuits:build" first.`);
    }
  }
  symbols = loadSymbolMap();
});

after(async () => {
  // snarkjs spawns persistent worker threads for BN254 arithmetic and does not tear them
  // down on its own; without this the test process completes its assertions but never exits.
  if (globalThis.curve_bn128) {
    await globalThis.curve_bn128.terminate();
  }
});

// ---------------------------------------------------------------------------------------
// 1. Fidelity to the reference mathematical engine
// ---------------------------------------------------------------------------------------

describe('Circuit fidelity against @pohi-protocol/core-math', () => {
  it('reproduces Equation 3.2 (Fisher-Pearson skewness)', async () => {
    const witness = await calculateWitness(buildInput(HUMAN_SESSION), DBG_WASM, join(DBG, 't1.wtns'));
    const circuitValue =
      Number(toSigned(witness[symbols.get('main.skewness.skewness_scaled')])) / SCALE;
    const expected = referenceScore(HUMAN_SESSION).metrics.fisherPearsonSkewness;

    assert.ok(
      Math.abs(circuitValue - expected) < FIXED_POINT_TOLERANCE,
      `S_F: circuit ${circuitValue} vs reference ${expected}`
    );
  });

  it('reproduces Equations 3.3/3.4 (cognitive assimilation ratio)', async () => {
    const witness = await calculateWitness(buildInput(HUMAN_SESSION), DBG_WASM, join(DBG, 't2.wtns'));
    const circuitValue =
      Number(toSigned(witness[symbols.get('main.assimilation.ratio_scaled')])) / SCALE;
    const expected = referenceScore(HUMAN_SESSION).metrics.cognitiveAssimilationRatio;

    assert.ok(
      Math.abs(circuitValue - expected) < FIXED_POINT_TOLERANCE,
      `R_cog: circuit ${circuitValue} vs reference ${expected}`
    );
  });

  it('reproduces Equation 3.5 (error recalibration variance)', async () => {
    const witness = await calculateWitness(buildInput(HUMAN_SESSION), DBG_WASM, join(DBG, 't3.wtns'));
    const circuitValue =
      Number(toSigned(witness[symbols.get('main.errorVariance.variance_scaled')])) / SCALE;
    const expected = referenceScore(HUMAN_SESSION).metrics.errorRecalibrationVariance;

    assert.ok(
      Math.abs(circuitValue - expected) / expected < FIXED_POINT_TOLERANCE,
      `sigma^2_err: circuit ${circuitValue} vs reference ${expected}`
    );
  });

  it('reproduces Equation 3.7 (composite score) within the degree-5 polynomial bound', async () => {
    const witness = await calculateWitness(buildInput(HUMAN_SESSION), DBG_WASM, join(DBG, 't4.wtns'));
    const circuitValue =
      Number(toSigned(witness[symbols.get('main.consolidator.composite_score')])) / SCALE;
    const expected = referenceScore(HUMAN_SESSION).result.compositeScore;

    assert.ok(
      Math.abs(circuitValue - expected) <= SIGMOID_TOLERANCE,
      `S_PoHI: circuit ${circuitValue} vs reference ${expected}`
    );
  });

  it('returns skewness 0 for degenerate variance, matching the NUMERICAL_EPSILON guard', async () => {
    const witness = await calculateWitness(buildInput(BOT_SESSION), DBG_WASM, join(DBG, 't5.wtns'));
    const circuitValue = toSigned(witness[symbols.get('main.skewness.skewness_scaled')]);
    const expected = computeFisherPearsonSkewness(BOT_FLIGHT);

    assert.equal(circuitValue, 0n);
    assert.equal(expected, 0);
  });
});

// ---------------------------------------------------------------------------------------
// 1b. Variable session length (Equation 3.1 defines n as a variable of the model)
// ---------------------------------------------------------------------------------------

describe('Variable session length', () => {
  /** A shorter human-like session: 15 events, therefore 14 flight samples. */
  const SHORT_SESSION = {
    flight: HUMAN_FLIGHT.slice(0, 14),
    dwell: HUMAN_DWELL.slice(0, 15),
    backspaceIndices: [5],
    contextLength: 120,
    tauReal: 5200,
  };

  /** Below the Eq. 3.2 minimum of 10 flight samples: 8 events, 7 flights. */
  const UNDERSIZED_SESSION = {
    flight: HUMAN_FLIGHT.slice(0, 7),
    dwell: HUMAN_DWELL.slice(0, 8),
    backspaceIndices: [3],
    contextLength: 60,
    tauReal: 2400,
  };

  it('reproduces the reference skewness for a partially filled session', async () => {
    const witness = await calculateWitness(buildInput(SHORT_SESSION), DBG_WASM, join(DBG, 'v1.wtns'));
    const circuitValue =
      Number(toSigned(witness[symbols.get('main.skewness.skewness_scaled')])) / SCALE;
    const expected = referenceScore(SHORT_SESSION).metrics.fisherPearsonSkewness;

    assert.ok(
      Math.abs(circuitValue - expected) < FIXED_POINT_TOLERANCE,
      `S_F at n=14: circuit ${circuitValue} vs reference ${expected}`
    );
  });

  it('reproduces the reference composite score for a partially filled session', async () => {
    const witness = await calculateWitness(buildInput(SHORT_SESSION), DBG_WASM, join(DBG, 'v2.wtns'));
    const circuitValue =
      Number(toSigned(witness[symbols.get('main.consolidator.composite_score')])) / SCALE;
    const expected = referenceScore(SHORT_SESSION).result.compositeScore;

    assert.ok(
      Math.abs(circuitValue - expected) <= SIGMOID_TOLERANCE,
      `S_PoHI at n=14: circuit ${circuitValue} vs reference ${expected}`
    );
  });

  it('suppresses skewness below the Equation 3.2 minimum of 10 flight samples', async () => {
    const witness = await calculateWitness(
      buildInput(UNDERSIZED_SESSION),
      DBG_WASM,
      join(DBG, 'v3.wtns')
    );
    const circuitValue = toSigned(witness[symbols.get('main.skewness.skewness_scaled')]);
    const expected = computeFisherPearsonSkewness(UNDERSIZED_SESSION.flight);

    assert.equal(circuitValue, 0n, 'circuit must suppress an undersized third-moment estimate');
    assert.equal(expected, 0, 'reference engine suppresses it too (MIN_SAMPLE_SIZE_SKEWNESS)');
  });

  it('ignores padding entirely: arbitrary filler cannot influence the score', async () => {
    const clean = await calculateWitness(
      buildInput({ ...SHORT_SESSION, flightPadding: 0, dwellPadding: 0 }),
      DBG_WASM,
      join(DBG, 'v4.wtns')
    );
    const polluted = await calculateWitness(
      buildInput({ ...SHORT_SESSION, flightPadding: 999999, dwellPadding: 123456 }),
      DBG_WASM,
      join(DBG, 'v5.wtns')
    );

    const index = symbols.get('main.consolidator.composite_score');
    assert.equal(
      BigInt(clean[index]),
      BigInt(polluted[index]),
      'padding beyond event_count must be masked out of every accumulator'
    );
  });

  it('rejects a session length above the compiled capacity', async () => {
    const input = buildInput(SHORT_SESSION);
    input.event_count = MAX_EVENTS + 1;

    await assert.rejects(
      () => snarkjs.wtns.calculate(input, DBG_WASM, join(DBG, 'v6.wtns')),
      'event_count beyond MAX_EVENTS must be unprovable'
    );
  });

  it('rejects a zero-length session', async () => {
    const input = buildInput(SHORT_SESSION);
    input.event_count = 0;

    await assert.rejects(
      () => snarkjs.wtns.calculate(input, DBG_WASM, join(DBG, 'v7.wtns')),
      'event_count = 0 must be unprovable'
    );
  });
});

// ---------------------------------------------------------------------------------------
// 2. Protocol behaviour
// ---------------------------------------------------------------------------------------

describe('Circuit protocol behaviour', () => {
  it('accepts a human-like session and agrees with the reference verdict', async () => {
    const witness = await calculateWitness(buildInput(HUMAN_SESSION), DBG_WASM, join(DBG, 't6.wtns'));
    const isHuman = witness[symbols.get('main.is_human')];
    const reference = referenceScore(HUMAN_SESSION).result;

    assert.equal(BigInt(isHuman), 1n, 'circuit should accept the human-like session');
    assert.equal(reference.isValid, true, 'reference should also accept it');
  });

  it('rejects an isochronous automated session and agrees with the reference verdict', async () => {
    const witness = await calculateWitness(buildInput(BOT_SESSION), DBG_WASM, join(DBG, 't7.wtns'));
    const isHuman = witness[symbols.get('main.is_human')];
    const reference = referenceScore(BOT_SESSION).result;

    assert.equal(BigInt(isHuman), 0n, 'circuit should reject the automated session');
    assert.equal(reference.isValid, false, 'reference should also reject it');
  });

  it('generates and verifies a Groth16 proof end to end', async () => {
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      buildInput(HUMAN_SESSION),
      WASM,
      ZKEY
    );

    const vkey = JSON.parse(readFileSync(VKEY, 'utf8'));
    const verified = await snarkjs.groth16.verify(vkey, publicSignals, proof);

    assert.equal(verified, true, 'a well-formed proof must verify');
    assert.equal(proof.protocol, 'groth16');
    assert.equal(proof.curve, 'bn128');
    // publicSignals[0] is the circuit output is_human, followed by the 7 public inputs.
    assert.equal(publicSignals[0], '1');
    assert.equal(publicSignals.length, 8);
  });

  it('rejects a proof whose public signals have been altered in transit', async () => {
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      buildInput(BOT_SESSION),
      WASM,
      ZKEY
    );
    assert.equal(publicSignals[0], '0', 'automated session must produce is_human = 0');

    // A man-in-the-middle flipping the verdict (threat vector 15).
    const forged = [...publicSignals];
    forged[0] = '1';

    const vkey = JSON.parse(readFileSync(VKEY, 'utf8'));
    const verified = await snarkjs.groth16.verify(vkey, forged, proof);

    assert.equal(verified, false, 'tampered public signals must not verify');
  });
});

// ---------------------------------------------------------------------------------------
// 3. Soundness regressions
// ---------------------------------------------------------------------------------------

describe('Circuit soundness regressions', () => {
  it('binds is_human to the inputs: a forged verdict violates the constraint system', async () => {
    const witnessPath = join(DBG, 'sound1.wtns');
    const forgedPath = join(DBG, 'sound1_forged.wtns');

    await snarkjs.wtns.calculate(buildInput(BOT_SESSION), DBG_WASM, witnessPath);
    const original = await snarkjs.wtns.exportJson(witnessPath);
    const index = symbols.get('main.is_human');
    assert.equal(BigInt(original[index]), 0n);

    // The prover flips the verdict it wants the verifier to accept.
    tamperWitnessFile(witnessPath, forgedPath, index, 1n);

    let accepted;
    try {
      accepted = await snarkjs.wtns.check(DBG_R1CS, forgedPath);
    } catch {
      accepted = false;
    }

    assert.equal(
      accepted,
      false,
      'a witness with a forged is_human must be rejected by the R1CS (regression for the ' +
        'unconstrained comparator defect)'
    );
  });

  it('binds the sigmoid output: a forged normalizer value violates the constraint system', async () => {
    const witnessPath = join(DBG, 'sound2.wtns');
    const forgedPath = join(DBG, 'sound2_forged.wtns');

    await snarkjs.wtns.calculate(buildInput(BOT_SESSION), DBG_WASM, witnessPath);
    const index = symbols.get('main.phi_normalizer.out_normalized');
    assert.ok(index !== undefined, 'phi normalizer output must be present in the witness');

    // The prover claims a perfect motor-skewness confidence of 1.0.
    tamperWitnessFile(witnessPath, forgedPath, index, BigInt(SCALE));

    let accepted;
    try {
      accepted = await snarkjs.wtns.check(DBG_R1CS, forgedPath);
    } catch {
      accepted = false;
    }

    assert.equal(
      accepted,
      false,
      'a witness with a forged Phi(S_F) must be rejected by the R1CS (regression for the ' +
        'unconstrained sigmoid defect)'
    );
  });

  it('enforces the Equation 3.7 simplex constraint alpha + beta + gamma = 1', async () => {
    const input = buildInput(HUMAN_SESSION);
    input.alpha = 900000;
    input.beta = 900000;
    input.gamma = 900000; // sums to 2.7, far above 1.0

    await assert.rejects(
      () => snarkjs.wtns.calculate(input, DBG_WASM, join(DBG, 'simplex.wtns')),
      'weights outside the probability simplex must be rejected'
    );
  });

  it('range-checks flight times so oversized values cannot wrap the field', async () => {
    const input = buildInput(HUMAN_SESSION);
    input.flight_times = [...HUMAN_FLIGHT];
    input.flight_times[0] = 2 ** 21; // exceeds the 20-bit bound

    await assert.rejects(
      () => snarkjs.wtns.calculate(input, DBG_WASM, join(DBG, 'range.wtns')),
      'out-of-range flight times must be rejected'
    );
  });

  it('enforces booleanity of the backspace selector mask', async () => {
    const input = buildInput(HUMAN_SESSION);
    input.backspace_selector = [...input.backspace_selector];
    input.backspace_selector[0] = 5; // not a boolean

    await assert.rejects(
      () => snarkjs.wtns.calculate(input, DBG_WASM, join(DBG, 'bool.wtns')),
      'a non-boolean selector entry must be rejected'
    );
  });

  it('binds the session commitment, so a proof cannot be replayed under another session', async () => {
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      buildInput({ ...HUMAN_SESSION, sessionHash: '111111' }),
      WASM,
      ZKEY
    );

    const vkey = JSON.parse(readFileSync(VKEY, 'utf8'));
    assert.equal(await snarkjs.groth16.verify(vkey, publicSignals, proof), true);

    // Replaying the same proof while claiming a different session (threat vector 8).
    const replayed = [...publicSignals];
    const sessionHashPosition = replayed.indexOf('111111');
    assert.ok(sessionHashPosition > 0, 'session_hash must appear among the public signals');
    replayed[sessionHashPosition] = '222222';

    assert.equal(
      await snarkjs.groth16.verify(vkey, replayed, proof),
      false,
      'the proof must not verify against a different session commitment'
    );
  });
});
