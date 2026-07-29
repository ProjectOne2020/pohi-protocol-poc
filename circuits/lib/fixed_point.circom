pragma circom 2.1.6;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";

/**
 * @file lib/fixed_point.circom
 * @package circuits/
 *
 * Sound fixed-point integer arithmetic primitives for the PoHI R1CS circuit.
 * Origin: Whitepaper Ch.5 Section 5.1 ("fixed-point integer arithmetic, scaling factor 10^6"),
 *         docs/CRYPTOGRAPHY.md Section 2.3.
 *
 * DESIGN NOTE (soundness)
 * -----------------------
 * Circom's `/` operator is FIELD division (multiplication by the modular inverse), not
 * integer division. A constraint of the form
 *
 *     q <-- a / SCALE;   q * SCALE === a;
 *
 * is tautological: field division always yields the unique q satisfying q*SCALE == a, so
 * the `===` verifies nothing and q is NOT the intended truncated integer quotient whenever
 * a is not an exact multiple of SCALE.
 *
 * Every division in this circuit therefore uses IntDiv below, which proves
 *
 *     numerator === quotient * denominator + remainder   AND   0 <= remainder < denominator
 *
 * with both quotient and remainder range-checked via bit decomposition. This pair of
 * constraints determines quotient and remainder UNIQUELY, which is what makes it sound.
 */

/**
 * Integer square root computed by Newton's method.
 * Executed by the witness calculator only; the result is constrained by IntSqrt below.
 */
function intSqrtFn(x) {
    if (x == 0) {
        return 0;
    }
    var r = x;
    var next = (r + 1) \ 2;
    while (next < r) {
        r = next;
        next = (r + x \ r) \ 2;
    }
    return r;
}

/**
 * Unsigned integer division with remainder.
 *
 * Enforces:  numerator === quotient * denominator + remainder
 *            0 <= remainder < denominator
 *            quotient, remainder both < 2^nBits
 *
 * Requires denominator > 0 (guaranteed by the remainder < denominator constraint, since
 * remainder >= 0 forces denominator >= 1).
 */
template IntDiv(nBits) {
    signal input numerator;
    signal input denominator;
    signal output quotient;
    signal output remainder;

    quotient  <-- numerator \ denominator;
    remainder <-- numerator % denominator;

    // Bind the witness hints to the inputs with a real R1CS constraint.
    numerator === quotient * denominator + remainder;

    // remainder < denominator (this also forces denominator >= 1).
    component rLtD = LessThan(nBits);
    rLtD.in[0] <== remainder;
    rLtD.in[1] <== denominator;
    rLtD.out === 1;

    // Range-check both outputs to prevent field wrap-around forging a different pair.
    component qBits = Num2Bits(nBits);
    qBits.in <== quotient;
    component rBits = Num2Bits(nBits);
    rBits.in <== remainder;
}

/**
 * Decomposes a field-encoded signed integer into sign and magnitude.
 *
 * Enforces:  in === (1 - 2*isNegative) * magnitude
 *            isNegative in {0, 1}
 *            magnitude < 2^nBits
 *
 * Soundness: for a fixed `in`, at most one of (isNegative=0, magnitude=in) and
 * (isNegative=1, magnitude=p-in) can satisfy magnitude < 2^nBits provided 2^nBits < p/2.
 * The pair is therefore unique except at in = 0, where both encodings yield magnitude = 0
 * and are observationally identical downstream.
 */
template SignedAbs(nBits) {
    signal input in;
    signal output isNegative;
    signal output magnitude;

    // Circom evaluates comparison operators using the SIGNED interpretation of field
    // elements (representatives above half the modulus are read as negative), so the
    // negativity test is written directly as `in < 0`. Comparing against the half-modulus
    // instead would always yield 0 and silently misclassify every negative value.
    isNegative <-- in < 0 ? 1 : 0;
    isNegative * (1 - isNegative) === 0;

    magnitude <== (1 - 2 * isNegative) * in;

    component mBits = Num2Bits(nBits);
    mBits.in <== magnitude;
}

/**
 * Signed integer division truncating toward zero.
 * Delegates magnitude division to IntDiv and reapplies the numerator's sign.
 */
template SignedIntDiv(nBits) {
    signal input numerator;    // signed, |numerator| < 2^nBits
    signal input denominator;  // strictly positive, < 2^nBits
    signal output quotient;    // signed

    component absNum = SignedAbs(nBits);
    absNum.in <== numerator;

    component div = IntDiv(nBits);
    div.numerator   <== absNum.magnitude;
    div.denominator <== denominator;

    quotient <== (1 - 2 * absNum.isNegative) * div.quotient;
}

/**
 * Integer square root: out = floor(sqrt(in)).
 *
 * Enforces:  out * out <= in < (out + 1) * (out + 1)
 * which uniquely determines out for any non-negative in.
 */
template IntSqrt(nBits) {
    signal input in;    // < 2^nBits
    signal output out;  // < 2^(ceil(nBits/2) + 1)

    out <-- intSqrtFn(in);

    signal sq;
    signal sqNext;
    sq     <== out * out;
    sqNext <== (out + 1) * (out + 1);

    // out^2 <= in
    component lowerBound = LessEqThan(nBits + 2);
    lowerBound.in[0] <== sq;
    lowerBound.in[1] <== in;
    lowerBound.out === 1;

    // in < (out+1)^2
    component upperBound = LessThan(nBits + 2);
    upperBound.in[0] <== in;
    upperBound.in[1] <== sqNext;
    upperBound.out === 1;

    component oBits = Num2Bits((nBits \ 2) + 2);
    oBits.in <== out;
}

/**
 * Clamps a signed value to the closed interval [-bound, bound].
 *
 * Implemented with two circomlib comparators over an offset representation so that all
 * compared quantities are non-negative, which is what LessThan requires.
 */
template ClampSigned(nBits, bound) {
    signal input in;      // signed, |in| < 2^nBits
    signal output out;    // signed, |out| <= bound

    // Shift into non-negative territory: offset = 2^nBits so that in + offset > 0.
    var offset = 2 ** nBits;

    signal shifted;
    shifted <== in + offset;

    // aboveUpper = 1 when in > bound
    component gtUpper = GreaterThan(nBits + 2);
    gtUpper.in[0] <== shifted;
    gtUpper.in[1] <== bound + offset;

    // belowLower = 1 when in < -bound
    component ltLower = LessThan(nBits + 2);
    ltLower.in[0] <== shifted;
    ltLower.in[1] <== offset - bound;

    // Select: if aboveUpper -> bound; else if belowLower -> -bound; else in.
    signal afterUpper;
    afterUpper <== in + gtUpper.out * (bound - in);

    out <== afterUpper + ltLower.out * (0 - bound - afterUpper);
}

/**
 * Range-proves a signed value: -2^nBits < in < 2^nBits.
 */
template AssertSignedInRange(nBits) {
    signal input in;
    component abs = SignedAbs(nBits);
    abs.in <== in;
}
