pragma circom 2.1.6;

include "./lib/fixed_point.circom";
include "circomlib/circuits/comparators.circom";

/**
 * @file moments.circom
 * @package circuits/
 *
 * In-circuit statistical moment accumulators implementing Equations 3.1, 3.2 and 3.5.
 * Origin: Whitepaper Ch.3 Eq. 3.1/3.2/3.5 and Ch.5 Section 5.1 ("Moment Accumulator
 *         Constraints: computes m_2 and m_3 over flight_times"),
 *         docs/CRYPTOGRAPHY.md Section 2.3, docs/BEHAVIORAL_MODEL.md Sections 2.2 and 2.4.
 *
 * VARIABLE SESSION LENGTH
 * -----------------------
 * Whitepaper Eq. 3.1 defines D in R^n and F in R^(n-1) for a session of n characters, and
 * Eq. 3.2 states the assumption "n >= 10 flight events to ensure statistical validity of
 * third-moment estimations". Session length is therefore a variable of the model, not a
 * constant: the N = 30 figure in Ch.5 Section 5.1 is a constraint-count sizing example.
 *
 * These templates accept a maximum capacity MAX_N together with a runtime `count`, and derive
 * a prefix activity mask in-circuit. Every accumulator is masked so that padding entries
 * beyond `count` contribute exactly zero and cannot influence any moment.
 *
 * SCALING STRATEGY
 * ----------------
 * Flight times arrive as integer milliseconds and are internally rescaled by MOMENT_SCALE so
 * that the mean, and therefore every deviation, carries sub-millisecond precision.
 *
 * Writing F_i = f_i * MOMENT_SCALE and d_i = F_i - mean, the accumulators
 *     m2_acc = sum(d_i^2)/n     [units MOMENT_SCALE^2]
 *     m3_acc = sum(d_i^3)/n     [units MOMENT_SCALE^3]
 * yield the Eq. 3.2 skewness with the scale factors cancelling exactly:
 *
 *     S_F = m3_real / (m2_real)^(3/2)
 *         = (m3_acc / MOMENT_SCALE^3) / ((m2_acc / MOMENT_SCALE^2)^(3/2))
 *         = m3_acc / (m2_acc)^(3/2)
 *
 * so the circuit reports S_F in protocol fixed-point as
 *     S_F_scaled = m3_acc * SCALE / (m2_acc * floor(sqrt(m2_acc)))
 *
 * MOMENT_SCALE is 1000 rather than 10^6 to keep sum(d_i^3) far below the BN254 modulus.
 */

/**
 * Derives the prefix activity mask active[i] = (i < count).
 *
 * The mask is computed from `count` rather than supplied as a witness, so a prover cannot
 * present an inconsistent activity pattern (for example activating a high-variance padding
 * slot while reporting a short session).
 */
template PrefixMask(MAX_N, COUNT_BITS) {
    signal input count;
    signal output active[MAX_N];

    component isActive[MAX_N];
    for (var i = 0; i < MAX_N; i++) {
        isActive[i] = LessThan(COUNT_BITS);
        isActive[i].in[0] <== i;
        isActive[i].in[1] <== count;
        active[i] <== isActive[i].out;
    }
}

/**
 * Equations 3.1 + 3.2: Fisher-Pearson standardized skewness over the flight time vector.
 *
 * @param MAX_N        Capacity of the flight vector (MAX_EVENTS - 1).
 * @param SCALE        Protocol fixed-point factor (10^6).
 * @param MOMENT_SCALE Internal precision factor for the mean and deviations (1000).
 * @param TIME_BITS    Range bound on each raw flight time in milliseconds.
 * @param MIN_SAMPLES  Minimum flight count for a valid third-moment estimate (Eq. 3.2: 10).
 */
template FlightSkewness(MAX_N, SCALE, MOMENT_SCALE, TIME_BITS, MIN_SAMPLES) {
    signal input flight_times[MAX_N];   // raw milliseconds, non-negative
    signal input count;                 // number of populated entries, 0 <= count <= MAX_N
    signal output skewness_scaled;      // S_F * SCALE, signed

    var COUNT_BITS = 16;

    // ---- Range-check every input ------------------------------------------------------
    // Mandatory for soundness: unbounded inputs would allow field wrap-around in the squaring
    // and cubing steps below, breaking the uniqueness of every later division.
    component timeBits[MAX_N];
    for (var i = 0; i < MAX_N; i++) {
        timeBits[i] = Num2Bits(TIME_BITS);
        timeBits[i].in <== flight_times[i];
    }

    component mask = PrefixMask(MAX_N, COUNT_BITS);
    mask.count <== count;

    // ---- Masked scaled sum and mean ----------------------------------------------------
    signal scaled[MAX_N];
    signal masked[MAX_N];
    var accumulator = 0;
    for (var i = 0; i < MAX_N; i++) {
        scaled[i] <== flight_times[i] * MOMENT_SCALE;
        masked[i] <== mask.active[i] * scaled[i];
        accumulator += masked[i];
    }

    signal total;
    total <== accumulator;

    // An empty session would divide by zero; substitute 1 and let the MIN_SAMPLES guard
    // below discard the result.
    component countIsZero = IsZero();
    countIsZero.in <== count;

    signal safeCount;
    safeCount <== count + countIsZero.out;

    component meanDiv = IntDiv(TIME_BITS + 32);
    meanDiv.numerator   <== total;
    meanDiv.denominator <== safeCount;

    signal mean;
    mean <== meanDiv.quotient;

    // ---- Masked central deviations, second and third moments ---------------------------
    // Deviations are masked so that padding entries contribute exactly zero rather than
    // (0 - mean), which would otherwise inject a spurious deviation for every unused slot.
    signal rawDeviation[MAX_N];
    signal deviation[MAX_N];
    signal squared[MAX_N];
    signal cubed[MAX_N];

    var sumSquares = 0;
    var sumCubes = 0;
    for (var i = 0; i < MAX_N; i++) {
        rawDeviation[i] <== scaled[i] - mean;
        deviation[i]    <== mask.active[i] * rawDeviation[i];
        squared[i]      <== deviation[i] * deviation[i];
        cubed[i]        <== squared[i] * deviation[i];
        sumSquares += squared[i];
        sumCubes   += cubed[i];
    }

    signal m2Total;
    signal m3Total;
    m2Total <== sumSquares;
    m3Total <== sumCubes;

    component m2Div = IntDiv(TIME_BITS + 64);
    m2Div.numerator   <== m2Total;
    m2Div.denominator <== safeCount;
    signal m2;
    m2 <== m2Div.quotient;

    component m3Div = SignedIntDiv(TIME_BITS + 96);
    m3Div.numerator   <== m3Total;
    m3Div.denominator <== safeCount;
    signal m3;
    m3 <== m3Div.quotient;

    // ---- Degenerate-variance guard -----------------------------------------------------
    // packages/core-math/src/index.ts returns 0.0 when the variance falls below
    // NUMERICAL_EPSILON (10^-6). At MOMENT_SCALE = 1000 the representable variance quantum is
    // exactly 10^-6, so that condition is equivalent to m2 == 0 here.
    component m2IsZero = IsZero();
    m2IsZero.in <== m2;

    // ---- Minimum-sample guard (Eq. 3.2 assumption n >= 10) ------------------------------
    // Mirrors MIN_SAMPLE_SIZE_SKEWNESS in packages/core-math/src/constants.ts, which returns
    // 0.0 for undersized samples rather than reporting an unstable third moment.
    component tooFewSamples = LessThan(COUNT_BITS);
    tooFewSamples.in[0] <== count;
    tooFewSamples.in[1] <== MIN_SAMPLES;

    // ---- S_F = m3 * SCALE / (m2 * sqrt(m2)) ---------------------------------------------
    component m2Sqrt = IntSqrt(TIME_BITS + 64);
    m2Sqrt.in <== m2;

    signal denominatorRaw;
    denominatorRaw <== m2 * m2Sqrt.out;

    signal denominator;
    denominator <== denominatorRaw + m2IsZero.out;

    component sfDiv = SignedIntDiv(TIME_BITS + 100);
    sfDiv.numerator   <== m3 * SCALE;
    sfDiv.denominator <== denominator;

    // Discard the quotient when either guard fires.
    signal validVariance;
    signal validSampleSize;
    validVariance   <== (1 - m2IsZero.out) * sfDiv.quotient;
    validSampleSize <== (1 - tooFewSamples.out) * validVariance;

    skewness_scaled <== validSampleSize;
}

/**
 * Equation 3.5: error recalibration variance over the flight times adjacent to Backspace
 * deletion events.
 *
 * The index set I_back is supplied as a private boolean selector mask, which is the R1CS
 * encoding of the mathematical set membership i in I_back. The selector is intersected with
 * the session activity mask so that a padding slot can never be marked as a correction event.
 *
 * Returns the variance already expressed in protocol fixed-point (x 10^6): the accumulator
 * carries units of MOMENT_SCALE^2 = 10^6, so no rescaling is needed.
 *
 * Matches packages/core-math/src/index.ts, which returns 0.0 for an empty index set.
 */
template SelectedVariance(MAX_N, SCALE, MOMENT_SCALE, TIME_BITS) {
    signal input flight_times[MAX_N];    // raw milliseconds, non-negative
    signal input selector[MAX_N];        // boolean: 1 when i is in I_back
    signal input count;                  // populated flight entries
    signal output variance_scaled;       // sigma^2_err * SCALE

    var COUNT_BITS = 16;

    component timeBits[MAX_N];
    for (var i = 0; i < MAX_N; i++) {
        timeBits[i] = Num2Bits(TIME_BITS);
        timeBits[i].in <== flight_times[i];
    }

    component mask = PrefixMask(MAX_N, COUNT_BITS);
    mask.count <== count;

    // Each masked product needs its own signal: a single R1CS constraint is quadratic, so a
    // sum of several signal-by-signal products cannot be written as one constraint.
    var counter = 0;
    var selectedSum = 0;
    signal scaled[MAX_N];
    signal effective[MAX_N];
    signal selected[MAX_N];
    for (var i = 0; i < MAX_N; i++) {
        selector[i] * (1 - selector[i]) === 0;
        scaled[i]    <== flight_times[i] * MOMENT_SCALE;
        effective[i] <== selector[i] * mask.active[i];
        selected[i]  <== effective[i] * scaled[i];
        counter += effective[i];
        selectedSum += selected[i];
    }

    signal count_back;
    signal selectedTotal;
    count_back    <== counter;
    selectedTotal <== selectedSum;

    component countIsZero = IsZero();
    countIsZero.in <== count_back;

    // Guard the empty-set case so the divisions stay well defined.
    signal safeCount;
    safeCount <== count_back + countIsZero.out;

    component meanDiv = IntDiv(TIME_BITS + 32);
    meanDiv.numerator   <== selectedTotal;
    meanDiv.denominator <== safeCount;

    signal mean;
    mean <== meanDiv.quotient;

    // Deviations are masked so that unselected indices contribute exactly zero.
    signal rawDeviation[MAX_N];
    signal deviation[MAX_N];
    signal squared[MAX_N];
    var sumSquares = 0;
    for (var i = 0; i < MAX_N; i++) {
        rawDeviation[i] <== scaled[i] - mean;
        deviation[i]    <== effective[i] * rawDeviation[i];
        squared[i]      <== deviation[i] * deviation[i];
        sumSquares += squared[i];
    }

    signal total;
    total <== sumSquares;

    component varDiv = IntDiv(TIME_BITS + 64);
    varDiv.numerator   <== total;
    varDiv.denominator <== safeCount;

    variance_scaled <== (1 - countIsZero.out) * varDiv.quotient;
}

/**
 * Equations 3.3 + 3.4: cognitive assimilation ratio.
 *
 *     tau_expected = (L_in / lambda_bio) * 1000 + delta_cognitive     [milliseconds]
 *     R_cog        = tau_real / tau_expected
 *
 * With lambda_bio = 40 characters/second and delta_cognitive = 350 ms (whitepaper Eq. 3.3,
 * packages/core-math/src/constants.ts), the expected latency is exactly
 *
 *     tau_expected = 25 * L_in + 350
 *
 * an exact integer, so no precision is lost forming it. packages/core-math/src/index.ts
 * returns the bare delta_cognitive baseline for non-positive context lengths; context_length
 * is an unsigned public input here, so the L_in = 0 case reduces to the same 350 ms baseline.
 */
template CognitiveAssimilationRatio(SCALE, TIME_BITS, CONTEXT_BITS) {
    signal input tau_real;          // milliseconds
    signal input context_length;    // characters L_in
    signal output ratio_scaled;     // R_cog * SCALE

    component tauBits = Num2Bits(TIME_BITS);
    tauBits.in <== tau_real;

    component ctxBits = Num2Bits(CONTEXT_BITS);
    ctxBits.in <== context_length;

    // lambda_bio = 40 chars/s  =>  1000/40 = 25 ms per character.
    signal tauExpected;
    tauExpected <== 25 * context_length + 350;

    component ratioDiv = IntDiv(TIME_BITS + 32);
    ratioDiv.numerator   <== tau_real * SCALE;
    ratioDiv.denominator <== tauExpected;

    ratio_scaled <== ratioDiv.quotient;
}
