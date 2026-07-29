pragma circom 2.1.6;

include "circomlib/circuits/comparators.circom";

/**
 * @file comparators.circom
 * @package circuits/
 *
 * Threshold comparator for the Equation 3.7 validity assertion.
 * Origin: Whitepaper Ch.5 Section 5.1.3 ("bit-decomposition less-than operator LessThan(64)"),
 *         docs/CRYPTOGRAPHY.md Section 2.3.
 *
 * DESIGN NOTE (soundness)
 * -----------------------
 * The comparison MUST be performed by decomposing the operands into bits. A finite field has
 * no native order, so an expression such as
 *
 *     out <-- a > b ? 1 : 0;
 *
 * produces no constraint whatsoever relating `out` to `a` and `b`: the prover may choose any
 * boolean `out` regardless of the operands. Constraining `out` to be boolean does not help,
 * because booleanity says nothing about which of the two values is larger.
 *
 * This module therefore delegates to circomlib's LessThan/GreaterEqThan, which perform a real
 * Num2Bits decomposition of (a - b + 2^n) and read the sign bit. That construction genuinely
 * binds the output to the operands, at a cost of roughly n+2 constraints.
 *
 * Operands must be non-negative and strictly smaller than 2^64, which the caller guarantees:
 * both the composite score and the threshold are fixed-point values in [0, 10^6].
 */

/**
 * out = 1 if in[0] < in[1], else 0. 64-bit bit-decomposition comparison.
 */
template LessThan64() {
    signal input in[2];
    signal output out;

    component lt = LessThan(64);
    lt.in[0] <== in[0];
    lt.in[1] <== in[1];

    out <== lt.out;
}

/**
 * out = 1 if in[0] >= in[1], else 0. 64-bit bit-decomposition comparison.
 *
 * This is the direct encoding of the Equation 3.7 validity assertion
 *     b_valid = (S_PoHI >= theta)
 */
template GreaterEqThan64() {
    signal input in[2];
    signal output out;

    component ge = GreaterEqThan(64);
    ge.in[0] <== in[0];
    ge.in[1] <== in[1];

    out <== ge.out;
}
