/**
 * @file derive_sigmoid_coefficients.mjs
 * @package circuits/tools
 *
 * Derives the fixed-point polynomial coefficients used by circuits/sigmoid_eval.circom
 * to approximate the logistic sigmoid inside the R1CS circuit.
 *
 * TRACEABILITY
 * ------------
 * Target function (fully specified by the repository, NOT invented here):
 *
 *   Whitepaper Ch.3 Eq. 3.6 / docs/BEHAVIORAL_MODEL.md Section 2.5 define
 *      Phi(S_F)        = 1 / (1 + exp(-kappa_1 * (S_F   - S_ref)))
 *      Psi(R_cog)      = 1 / (1 + exp(-kappa_2 * (R_cog - 1.0)))
 *      Omega(sigma2)   = 1 / (1 + exp(-kappa_3 * (sigma2 - sigma2_ref)))
 *
 *   packages/core-math/src/index.ts (computeSigmoidalNormalizedComponents) fixes
 *      kappa_1 = 2.0,  S_ref      = 1.0
 *      kappa_2 = 3.0
 *      kappa_3 = 0.05, sigma2_ref = 50.0
 *
 * All three are the SAME logistic function sigma(z) = 1/(1+exp(-z)) composed with a
 * different affine pre-transform z = kappa * (metric - ref). The circuit therefore
 * applies the affine transform in-circuit and needs only ONE polynomial approximation
 * of sigma(z). This is why a single coefficient set is derived here.
 *
 * WHY THIS SCRIPT EXISTS
 * ----------------------
 * Whitepaper Ch.5 Section 5.1 and docs/CRYPTOGRAPHY.md Section 2.3 specify that the
 * circuit uses a 5th-degree polynomial approximation P_sig(x) ~ c0 + c1*x + ... + c5*x^5,
 * but the repository does NOT state the coefficient values nor the approximation
 * interval. Rather than inventing constants, this script DERIVES them numerically from
 * the sigmoid definition above, so that every constant committed to the circuit is
 * reproducible and auditable by re-running:
 *
 *     node circuits/tools/derive_sigmoid_coefficients.mjs
 *
 * ODD-SYMMETRIC FORM
 * ------------------
 * sigma(z) - 0.5 is an odd function. Constraining the approximation to the odd form
 *
 *     P(z) = 0.5 + c1*z + c3*z^3 + c5*z^5
 *
 * guarantees P(0) = 0.5 EXACTLY. This preserves the exact reference-midpoint behaviour
 * asserted by packages/core-math/tests/equation-3.6.test.ts ("should return exactly 0.5
 * for all components when metrics equal reference midpoint values") and eliminates the
 * even-order coefficients c0, c2, c4 (c0 is folded into the constant 0.5).
 *
 * METHOD
 * ------
 * Iteratively Reweighted Least Squares (IRLS) driving the L2 fit toward the L-infinity
 * (minimax) solution, which is the criterion named in the whitepaper. Equioscillation
 * quality of the final solution is reported so the approximation can be audited.
 *
 * Outside the fitted interval [-Z_MAX, Z_MAX] the circuit CLAMPS to 0 or 1: a degree-5
 * polynomial cannot represent the saturation tails of the sigmoid, and sigma(z) is within
 * 2.5e-3 of its asymptote at |z| = 6.
 */

const SCALE = 1000000; // Fixed-point scaling factor 10^6 (whitepaper Ch.5 Section 5.1)

const sigmoid = (z) => 1 / (1 + Math.exp(-z));

/** Solves a small dense linear system A x = b by Gaussian elimination with partial pivoting. */
function solve(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    }
    [M[col], M[piv]] = [M[piv], M[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
    }
  }
  return M.map((row, i) => row[n] / row[i][i] ?? 0).map((_, i) => M[i][n] / M[i][i]);
}

/**
 * Fits P(z) = 0.5 + c1*z + c3*z^3 + c5*z^5 to sigma(z) over [0, zMax].
 * Oddness means fitting on [0, zMax] fully determines [-zMax, 0].
 */
function fitOddSigmoid(zMax, samples = 4001, irlsIterations = 200) {
  const zs = [];
  const targets = [];
  for (let i = 0; i < samples; i++) {
    const z = (zMax * i) / (samples - 1);
    zs.push(z);
    targets.push(sigmoid(z) - 0.5); // odd part
  }

  const basis = (z) => [z, z ** 3, z ** 5];
  let weights = new Array(samples).fill(1);
  let coefficients = [0, 0, 0];

  for (let iter = 0; iter < irlsIterations; iter++) {
    // Weighted normal equations for the 3 odd coefficients.
    const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const b = [0, 0, 0];
    for (let s = 0; s < samples; s++) {
      const phi = basis(zs[s]);
      const w = weights[s];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) A[i][j] += w * phi[i] * phi[j];
        b[i] += w * phi[i] * targets[s];
      }
    }
    coefficients = solve(A, b);

    // Reweight proportionally to current error magnitude (drives L2 -> L-infinity).
    let maxErr = 0;
    const errs = zs.map((z, s) => {
      const phi = basis(z);
      const approx = phi[0] * coefficients[0] + phi[1] * coefficients[1] + phi[2] * coefficients[2];
      const e = Math.abs(approx - targets[s]);
      if (e > maxErr) maxErr = e;
      return e;
    });
    if (maxErr === 0) break;
    weights = weights.map((w, s) => w * (1 + errs[s] / maxErr));
    const wSum = weights.reduce((a, c) => a + c, 0) / samples;
    weights = weights.map((w) => w / wSum);
  }

  // Report accuracy over the FULL symmetric interval against the true sigmoid.
  let maxAbsError = 0;
  let worstZ = 0;
  const extrema = [];
  let prevSignedError = null;
  let prevDirection = 0;
  for (let i = 0; i <= 8000; i++) {
    const z = -zMax + (2 * zMax * i) / 8000;
    const approx =
      0.5 + coefficients[0] * z + coefficients[1] * z ** 3 + coefficients[2] * z ** 5;
    const signedError = approx - sigmoid(z);
    if (Math.abs(signedError) > maxAbsError) {
      maxAbsError = Math.abs(signedError);
      worstZ = z;
    }
    if (prevSignedError !== null) {
      const direction = Math.sign(signedError - prevSignedError);
      if (direction !== 0 && prevDirection !== 0 && direction !== prevDirection) {
        extrema.push(prevSignedError);
      }
      if (direction !== 0) prevDirection = direction;
    }
    prevSignedError = signedError;
  }

  return { coefficients, maxAbsError, worstZ, extrema };
}

console.log('PoHI sigmoid polynomial coefficient derivation');
console.log('Target: sigma(z) = 1/(1+exp(-z))   Model: P(z) = 0.5 + c1*z + c3*z^3 + c5*z^5');
console.log('='.repeat(78));

const candidates = [3, 4, 5, 6];
const results = candidates.map((zMax) => ({ zMax, ...fitOddSigmoid(zMax) }));

console.log('\nInterval selection (max |P(z) - sigma(z)| over the fitted interval):');
for (const r of results) {
  const tailError = Math.abs(sigmoid(r.zMax) - 1); // clamping error just outside interval
  console.log(
    `  Z_MAX = ${r.zMax}:  max in-interval error = ${r.maxAbsError.toFixed(6)}` +
      `   clamp error at |z|=Z_MAX = ${tailError.toFixed(6)}` +
      `   total worst case = ${Math.max(r.maxAbsError, tailError).toFixed(6)}`
  );
}

// Select the interval minimising the worst case of (approximation error, clamping error).
const chosen = results.reduce((best, r) => {
  const score = Math.max(r.maxAbsError, Math.abs(sigmoid(r.zMax) - 1));
  const bestScore = Math.max(best.maxAbsError, Math.abs(sigmoid(best.zMax) - 1));
  return score < bestScore ? r : best;
});

const [c1, c3, c5] = chosen.coefficients;
const toFixedPoint = (v) => Math.round(v * SCALE);

console.log('\n' + '='.repeat(78));
console.log(`SELECTED Z_MAX = ${chosen.zMax}`);
console.log(`Max absolute approximation error on [-${chosen.zMax}, ${chosen.zMax}]: ${chosen.maxAbsError.toFixed(8)}`);
console.log(`Worst-case z: ${chosen.worstZ.toFixed(4)}`);
console.log(`Interior error extrema (equioscillation check, want alternating & similar magnitude):`);
console.log(`  ${chosen.extrema.map((e) => e.toFixed(6)).join(', ')}`);
console.log('\nReal-valued coefficients:');
console.log(`  c1 = ${c1}`);
console.log(`  c3 = ${c3}`);
console.log(`  c5 = ${c5}`);
console.log(`\nFixed-point coefficients (x ${SCALE}), for circuits/sigmoid_eval.circom:`);
console.log(`  SIGMOID_C1 = ${toFixedPoint(c1)}`);
console.log(`  SIGMOID_C3 = ${toFixedPoint(c3)}`);
console.log(`  SIGMOID_C5 = ${toFixedPoint(c5)}`);
console.log(`  SIGMOID_Z_MAX = ${chosen.zMax * SCALE}`);

// Verify the fixed-point rounded coefficients do not materially degrade accuracy.
let fpMaxError = 0;
for (let i = 0; i <= 20000; i++) {
  const z = -chosen.zMax + (2 * chosen.zMax * i) / 20000;
  const approx =
    0.5 +
    (toFixedPoint(c1) / SCALE) * z +
    (toFixedPoint(c3) / SCALE) * z ** 3 +
    (toFixedPoint(c5) / SCALE) * z ** 5;
  fpMaxError = Math.max(fpMaxError, Math.abs(approx - sigmoid(z)));
}
console.log(`\nMax error after fixed-point rounding of coefficients: ${fpMaxError.toFixed(8)}`);
console.log('='.repeat(78));
