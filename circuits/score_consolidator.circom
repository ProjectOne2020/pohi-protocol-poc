pragma circom 2.1.6;

include "./lib/fixed_point.circom";

/**
 * @file score_consolidator.circom
 * @package circuits/
 *
 * Consolidated PoHI score evaluator implementing Equation 3.7.
 * Origin: Whitepaper Ch.3 Eq. 3.7, docs/CRYPTOGRAPHY.md Section 2.3,
 *         docs/BEHAVIORAL_MODEL.md Section 2.5.
 *
 *     S_PoHI = alpha * Phi(S_F) + beta * Psi(R_cog) + gamma * Omega(sigma^2_err)
 *     subject to alpha + beta + gamma = 1.0,  alpha, beta, gamma >= 0
 *
 * The simplex constraint is enforced in-circuit. Without it the weights could be inflated
 * arbitrarily to push the composite score above any threshold, so it is a security
 * constraint and not merely a modelling convention.
 */
template PoHIScoreConsolidator(SCALE) {
    signal input phi;     // Phi(S_F)      * SCALE, in [0, SCALE]
    signal input psi;     // Psi(R_cog)    * SCALE, in [0, SCALE]
    signal input omega;   // Omega(sigma2) * SCALE, in [0, SCALE]

    signal input alpha;   // alpha * SCALE
    signal input beta;    // beta  * SCALE
    signal input gamma;   // gamma * SCALE

    signal output composite_score;  // S_PoHI * SCALE, in [0, SCALE]

    // ---- Equation 3.7 simplex constraint: alpha + beta + gamma = 1.0 -------------------
    alpha + beta + gamma === SCALE;

    // Non-negativity of each weight. Combined with the sum constraint above this also
    // bounds every weight by SCALE, confining them to the probability simplex.
    component alphaBits = Num2Bits(21);
    alphaBits.in <== alpha;
    component betaBits = Num2Bits(21);
    betaBits.in <== beta;
    component gammaBits = Num2Bits(21);
    gammaBits.in <== gamma;

    // ---- Weighted convex combination ---------------------------------------------------
    // Each product is at most SCALE^2 = 10^12, so the numerator is at most 3 * 10^12.
    // Each product gets its own signal: an R1CS constraint is quadratic, so three
    // signal-by-signal products cannot share a single constraint.
    signal termAlpha;
    signal termBeta;
    signal termGamma;
    termAlpha <== alpha * phi;
    termBeta  <== beta * psi;
    termGamma <== gamma * omega;

    signal weightedSum;
    weightedSum <== termAlpha + termBeta + termGamma;

    component rescale = IntDiv(48);
    rescale.numerator   <== weightedSum;
    rescale.denominator <== SCALE;

    composite_score <== rescale.quotient;
}
