pragma circom 2.1.6;

include "./sigmoid_eval.circom";
include "./score_consolidator.circom";
include "./comparators.circom";
include "./moments.circom";
include "./lib/fixed_point.circom";

/**
 * @file pohi_main.circom
 * @package circuits/
 *
 * Root Proof of Human Intent (PoHI) Groth16 zk-SNARK circuit entrypoint.
 * Origin: Whitepaper Ch.5, docs/CRYPTOGRAPHY.md Section 2, docs/PROTOCOL.md Section 3.
 *
 * The circuit proves, without revealing the telemetry, that a session's neuromuscular and
 * cognitive entropy satisfies the Equation 3.7 validity assertion b_valid = (S_PoHI >= theta).
 *
 * PIPELINE (whitepaper Ch.5 Section 5.1)
 * --------------------------------------
 *   flight_times ---> Eq 3.1/3.2 moments ---> S_F ------> Phi ---+
 *   tau_real, L_in -> Eq 3.3/3.4 ratio -----> R_cog ----> Psi ---+--> Eq 3.7 ---> LessThan --> is_human
 *   flight_times + I_back -> Eq 3.5 --------> sigma2 ---> Omega -+
 *
 * SIGNAL VISIBILITY
 * -----------------
 * Public : threshold_theta, context_length, session_hash, timestamp, alpha, beta, gamma
 * Private: flight_times, dwell_times, tau_real, backspace_selector
 *
 * The domain calibration weights alpha, beta and gamma are PUBLIC. They define the verifier's
 * security policy (docs/BEHAVIORAL_MODEL.md Section 3 calibration matrix); leaving them in the
 * private witness would let the prover choose its own weights and satisfy any threshold, which
 * would void the Equation 3.7 threshold semantics and the Chapter 9 economic argument.
 */
template PoHIMain(max_events) {
    // ---- Protocol constants -----------------------------------------------------------
    var SCALE        = 1000000;   // Whitepaper Ch.5 Section 5.1 fixed-point factor 10^6
    var MOMENT_SCALE = 1000;      // Internal precision factor, see moments.circom
    var TIME_BITS    = 20;        // Max representable event latency: 2^20 - 1 ms (~17.5 min)
    var CONTEXT_BITS = 32;        // Max representable prompt context length L_in
    var COUNT_BITS   = 16;        // Range bound for the session length counters
    var MIN_SAMPLES  = 10;        // Eq. 3.2 assumption: n >= 10 flight events

    var n_flight = max_events - 1;

    // ---- Public inputs (x_public) -----------------------------------------------------
    signal input threshold_theta;   // theta * SCALE
    signal input context_length;    // L_in
    signal input session_hash;      // H(Session_ID || User_Address)
    signal input timestamp;         // session completion epoch
    signal input alpha;             // alpha * SCALE
    signal input beta;              // beta  * SCALE
    signal input gamma;             // gamma * SCALE

    // ---- Private witness (w_private) --------------------------------------------------
    signal input flight_times[n_flight];         // Eq 3.1 flight vector F, milliseconds
    signal input dwell_times[max_events];        // Eq 3.1 dwell vector D, milliseconds
    signal input tau_real;                       // Eq 3.4 measured assimilation latency, ms
    signal input backspace_selector[n_flight];   // Eq 3.5 membership mask for I_back
    signal input event_count;                    // Eq 3.1 session length n, 1 <= n <= max_events

    // ---- Public output ----------------------------------------------------------------
    signal output is_human;

    // ---- Bind the session commitment into the constraint system ------------------------
    // Threat vector 8 (replay) depends on the proof being cryptographically bound to the
    // session commitment. A public input that appears in no constraint is not bound to the
    // proof, so these squaring constraints anchor both values into the R1CS.
    signal sessionHashBound;
    signal timestampBound;
    sessionHashBound <== session_hash * session_hash;
    timestampBound   <== timestamp * timestamp;

    // ---- Range-check the dwell vector --------------------------------------------------
    // The dwell vector is part of the documented private witness (Eq 3.1). It does not enter
    // S_PoHI, because Equation 3.7 is a function of S_F, R_cog and sigma^2_err only. It is
    // nevertheless range-checked so that no witness signal is left unconstrained.
    component dwellBits[max_events];
    for (var i = 0; i < max_events; i++) {
        dwellBits[i] = Num2Bits(TIME_BITS);
        dwellBits[i].in <== dwell_times[i];
    }

    // ---- Session length (Eq. 3.1) -------------------------------------------------------
    // The session length is private: the number of keystrokes reveals the length of the
    // message, which the privacy air-gap of docs/PRIVACY.md Section 1 exists to protect.
    // 1 <= event_count <= max_events is enforced below, and the flight vector holds
    // event_count - 1 populated entries per Eq. 3.1.
    component eventCountBits = Num2Bits(COUNT_BITS);
    eventCountBits.in <== event_count - 1;

    component eventCountInRange = LessEqThan(COUNT_BITS);
    eventCountInRange.in[0] <== event_count;
    eventCountInRange.in[1] <== max_events;
    eventCountInRange.out === 1;

    signal flight_count;
    flight_count <== event_count - 1;

    // ---- Equation 3.2: Fisher-Pearson flight skewness ----------------------------------
    component skewness = FlightSkewness(n_flight, SCALE, MOMENT_SCALE, TIME_BITS, MIN_SAMPLES);
    skewness.count <== flight_count;
    for (var i = 0; i < n_flight; i++) {
        skewness.flight_times[i] <== flight_times[i];
    }

    // ---- Equations 3.3 and 3.4: cognitive assimilation ratio ---------------------------
    component assimilation = CognitiveAssimilationRatio(SCALE, TIME_BITS, CONTEXT_BITS);
    assimilation.tau_real       <== tau_real;
    assimilation.context_length <== context_length;

    // ---- Equation 3.5: error recalibration variance ------------------------------------
    component errorVariance = SelectedVariance(n_flight, SCALE, MOMENT_SCALE, TIME_BITS);
    errorVariance.count <== flight_count;
    for (var i = 0; i < n_flight; i++) {
        errorVariance.flight_times[i] <== flight_times[i];
        errorVariance.selector[i]     <== backspace_selector[i];
    }

    // ---- Equation 3.6: sigmoidal normalization -----------------------------------------
    // kappa and reference values are those fixed by packages/core-math/src/index.ts.
    component phi_normalizer   = SigmoidNormalizer(SCALE, 120, 2 * SCALE,  1 * SCALE);
    component psi_normalizer   = SigmoidNormalizer(SCALE,  48, 3 * SCALE,  1 * SCALE);
    component omega_normalizer = SigmoidNormalizer(SCALE,  72, SCALE / 20, 50 * SCALE);

    phi_normalizer.metric_scaled   <== skewness.skewness_scaled;
    psi_normalizer.metric_scaled   <== assimilation.ratio_scaled;
    omega_normalizer.metric_scaled <== errorVariance.variance_scaled;

    // ---- Equation 3.7: composite score --------------------------------------------------
    component consolidator = PoHIScoreConsolidator(SCALE);
    consolidator.phi   <== phi_normalizer.out_normalized;
    consolidator.psi   <== psi_normalizer.out_normalized;
    consolidator.omega <== omega_normalizer.out_normalized;
    consolidator.alpha <== alpha;
    consolidator.beta  <== beta;
    consolidator.gamma <== gamma;

    // ---- Validity assertion: b_valid = (S_PoHI >= theta) --------------------------------
    component thetaBits = Num2Bits(21);
    thetaBits.in <== threshold_theta;

    component comparator = GreaterEqThan64();
    comparator.in[0] <== consolidator.composite_score;
    comparator.in[1] <== threshold_theta;

    is_human <== comparator.out;
}

component main {public [
    threshold_theta,
    context_length,
    session_hash,
    timestamp,
    alpha,
    beta,
    gamma
]} = PoHIMain(30);
