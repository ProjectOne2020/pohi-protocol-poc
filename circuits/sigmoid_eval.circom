pragma circom 2.1.6;

include "./lib/fixed_point.circom";
include "circomlib/circuits/comparators.circom";

/**
 * @file sigmoid_eval.circom
 * @package circuits/
 *
 * Fixed-point polynomial sigmoidal normalizer implementing Equation 3.6.
 * Origin: Whitepaper Ch.3 Eq. 3.6 and Ch.5 Section 5.1.2, docs/CRYPTOGRAPHY.md Section 2.3,
 *         docs/BEHAVIORAL_MODEL.md Section 2.5.
 *
 * MATHEMATICAL CONTRACT
 * ---------------------
 * Equation 3.6 defines three normalizers that are the SAME logistic function composed with
 * different affine pre-transforms:
 *
 *     Phi(S_F)      = sigma(kappa_1 * (S_F    - S_ref))       kappa_1 = 2.00, S_ref      = 1.0
 *     Psi(R_cog)    = sigma(kappa_2 * (R_cog  - 1.0))         kappa_2 = 3.00
 *     Omega(sigma2) = sigma(kappa_3 * (sigma2 - sigma2_ref))  kappa_3 = 0.05, sigma2_ref = 50.0
 *
 * where sigma(z) = 1 / (1 + exp(-z)). The kappa and reference values are those fixed by the
 * reference implementation packages/core-math/src/index.ts.
 *
 * This template therefore takes (kappa, reference) as parameters, computes z in-circuit, and
 * approximates sigma(z) with the odd polynomial
 *
 *     P(z) = 0.5 + c1*z + c3*z^3 + c5*z^5
 *
 * The odd form guarantees P(0) = 0.5 EXACTLY, matching the reference-midpoint behaviour
 * asserted by packages/core-math/tests/equation-3.6.test.ts.
 *
 * COEFFICIENT PROVENANCE
 * ----------------------
 * The whitepaper specifies a 5th-degree polynomial approximation but does not state the
 * coefficients or the approximation interval. The constants below are DERIVED from the
 * sigmoid definition above by circuits/tools/derive_sigmoid_coefficients.mjs and are
 * reproducible by re-running that script. They are NOT free parameters.
 *
 *   Method:   Iteratively Reweighted Least Squares driven toward the L-infinity (minimax)
 *             criterion named in the whitepaper. The solution equioscillates at +/-0.011790,
 *             confirming convergence to the minimax optimum for this basis.
 *   Interval: |z| <= 5, selected to minimise the worst case of (approximation error inside
 *             the interval, saturation-clamping error outside it).
 *   Accuracy: max |P(z) - sigma(z)| = 0.0122 after fixed-point rounding of the coefficients.
 *             This is an inherent precision limit of the degree-5 approximation mandated by
 *             the whitepaper, and bounds the accuracy of S_PoHI to approximately +/-0.0122.
 *
 * Outside |z| <= 5 the output saturates by clamping, since a degree-5 polynomial cannot
 * represent the sigmoid tails; sigma(5) = 0.9933 is within 0.0067 of its asymptote.
 */

/**
 * Clamps a signed fixed-point value into the closed unit interval [0, SCALE].
 * Required because the polynomial approximation may overshoot [0, 1] near the interval
 * edges; Equation 3.7 requires each normalized component to lie in [0, 1] so that the
 * convex combination remains bounded.
 */
template ClampToUnitInterval(nBits, SCALE) {
    signal input in;   // signed
    signal output out; // 0 <= out <= SCALE

    var offset = 2 ** nBits;

    signal shifted;
    shifted <== in + offset;

    component isNeg = LessThan(nBits + 2);
    isNeg.in[0] <== shifted;
    isNeg.in[1] <== offset;

    component isAbove = GreaterThan(nBits + 2);
    isAbove.in[0] <== shifted;
    isAbove.in[1] <== SCALE + offset;

    signal afterLower;
    afterLower <== in + isNeg.out * (0 - in);

    out <== afterLower + isAbove.out * (SCALE - afterLower);
}

/**
 * Evaluates one Equation 3.6 normalizer in fixed-point arithmetic.
 *
 * @param SCALE        Fixed-point scaling factor (10^6).
 * @param INPUT_BITS   Range bound for |metric_scaled|; caller must guarantee it.
 * @param KAPPA_SCALED Steepness kappa * SCALE.
 * @param REF_SCALED   Reference midpoint * SCALE (signed).
 */
template SigmoidNormalizer(SCALE, INPUT_BITS, KAPPA_SCALED, REF_SCALED) {
    signal input metric_scaled;      // signed fixed-point metric
    signal output out_normalized;    // 0 <= out <= SCALE

    // Derived minimax coefficients (see file header and circuits/tools/).
    var C1 = 229351;
    var C3 = -10115;
    var C5 = 199;
    var Z_MAX = 5 * SCALE;

    // ---- Affine pre-transform: z = kappa * (metric - reference) ----------------------
    signal centered;
    centered <== metric_scaled - REF_SCALED;

    signal zNumerator;
    zNumerator <== KAPPA_SCALED * centered;

    component zDiv = SignedIntDiv(INPUT_BITS + 24);
    zDiv.numerator   <== zNumerator;
    zDiv.denominator <== SCALE;

    // ---- Saturation clamp to the fitted approximation interval ------------------------
    component zClamp = ClampSigned(INPUT_BITS + 24, Z_MAX);
    zClamp.in <== zDiv.quotient;

    signal z;
    z <== zClamp.out;   // |z| <= 5 * SCALE

    // ---- Fixed-point powers of z (each division is a proved integer division) ---------
    // |z| <= 5e6  =>  z^2 <= 2.5e13 (fits in 56 bits with margin)
    component z2Div = SignedIntDiv(56);
    z2Div.numerator   <== z * z;
    z2Div.denominator <== SCALE;
    signal z2;
    z2 <== z2Div.quotient;          // |z2| <= 2.5e7

    component z3Div = SignedIntDiv(56);
    z3Div.numerator   <== z2 * z;
    z3Div.denominator <== SCALE;
    signal z3;
    z3 <== z3Div.quotient;          // |z3| <= 1.25e8

    component z5Div = SignedIntDiv(56);
    z5Div.numerator   <== z3 * z2;
    z5Div.denominator <== SCALE;
    signal z5;
    z5 <== z5Div.quotient;          // |z5| <= 3.2e9

    // ---- Polynomial terms -------------------------------------------------------------
    component t1Div = SignedIntDiv(56);
    t1Div.numerator   <== C1 * z;
    t1Div.denominator <== SCALE;

    component t3Div = SignedIntDiv(56);
    t3Div.numerator   <== C3 * z3;
    t3Div.denominator <== SCALE;

    component t5Div = SignedIntDiv(56);
    t5Div.numerator   <== C5 * z5;
    t5Div.denominator <== SCALE;

    signal polynomial;
    polynomial <== SCALE / 2 + t1Div.quotient + t3Div.quotient + t5Div.quotient;

    // ---- Enforce the Equation 3.6 codomain [0, 1] -------------------------------------
    component unitClamp = ClampToUnitInterval(32, SCALE);
    unitClamp.in <== polynomial;

    out_normalized <== unitClamp.out;
}
