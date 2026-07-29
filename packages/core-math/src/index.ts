/**
 * Proof of Human Intent (PoHI) - Reference Mathematical Engine Public API
 *
 * Public function declarations for the PoHI core mathematical engine as specified
 * in the research whitepaper (Equations 3.1 through 3.7).
 */

import {
  RawInputEvent,
  ExtractedFeatureMetrics,
  DomainParameterCalibration,
  SigmoidalNormalizedComponents,
  PoHIScoreResult,
} from './types.js';

import {
  LAMBDA_BIO,
  DELTA_COGNITIVE,
  MIN_SAMPLE_SIZE_SKEWNESS,
  NUMERICAL_EPSILON,
} from './constants.js';

export * from './types.js';
export * from './constants.js';

/**
 * Computes the Dwell Time Vector (D) from a sequence of raw input events according to Equation 3.1.
 *
 * Equation 3.1: D = [d_1, d_2, ..., d_n]^T where d_i = t_release,i - t_press,i
 *
 * @param events - Sequence of raw input events.
 * @returns Array of keypress actuation dwell times in milliseconds.
 *
 * Origin: Whitepaper Chapter 3 (Equation 3.1), docs/BEHAVIORAL_MODEL.md (Section 2.1)
 */
export function computeDwellTimeVector(events: readonly RawInputEvent[]): readonly number[] {
  return events.map((event) => event.releaseTime - event.pressTime);
}

/**
 * Computes the Flight Time Vector (F) from a sequence of raw input events according to Equation 3.1.
 *
 * Equation 3.1: F = [f_1, f_2, ..., f_{n-1}]^T where f_i = t_press,i+1 - t_release,i
 *
 * @param events - Sequence of raw input events.
 * @returns Array of inter-key flight transit times in milliseconds.
 *
 * Origin: Whitepaper Chapter 3 (Equation 3.1), docs/BEHAVIORAL_MODEL.md (Section 2.1)
 */
export function computeFlightTimeVector(events: readonly RawInputEvent[]): readonly number[] {
  if (events.length < 2) {
    return [];
  }
  const flightTimes: number[] = [];
  for (let i = 0; i < events.length - 1; i++) {
    flightTimes.push(events[i + 1].pressTime - events[i].releaseTime);
  }
  return flightTimes;
}

/**
 * Computes the Fisher-Pearson standardized coefficient of flight skewness (S_F) according to Equation 3.2.
 *
 * Equation 3.2: S_F = m_3 / (m_2^(3/2))
 * where m_k = (1/n) * sum_{i=1}^n (f_i - mean(f))^k
 *
 * @param flightTimes - Array of inter-key flight times in milliseconds.
 * @returns Non-dimensional flight time distribution skewness score (S_F).
 *
 * Origin: Whitepaper Chapter 3 (Equation 3.2), docs/BEHAVIORAL_MODEL.md (Section 2.2)
 */
export function computeFisherPearsonSkewness(flightTimes: readonly number[]): number {
  const n = flightTimes.length;
  if (n < MIN_SAMPLE_SIZE_SKEWNESS) {
    return 0.0;
  }

  const mean = flightTimes.reduce((acc, val) => acc + val, 0) / n;

  let m2 = 0;
  let m3 = 0;
  for (let i = 0; i < n; i++) {
    const diff = flightTimes[i] - mean;
    m2 += diff * diff;
    m3 += diff * diff * diff;
  }
  m2 /= n;
  m3 /= n;

  if (m2 < NUMERICAL_EPSILON) {
    return 0.0;
  }

  return m3 / Math.pow(m2, 1.5);
}

/**
 * Computes the expected biological assimilation latency (tau_expected) according to Equation 3.3.
 *
 * Equation 3.3: tau_expected = (L_in / lambda_bio) + delta_cognitive
 *
 * @param contextLength - Prompt context character count (L_in).
 * @returns Expected biological reading latency in milliseconds.
 *
 * Origin: Whitepaper Chapter 3 (Equation 3.3), docs/BEHAVIORAL_MODEL.md (Section 2.3)
 */
export function computeExpectedCognitiveLatency(contextLength: number): number {
  if (contextLength <= 0) {
    return DELTA_COGNITIVE;
  }
  return (contextLength / LAMBDA_BIO) * 1000 + DELTA_COGNITIVE;
}

/**
 * Computes the Cognitive Assimilation Ratio (R_cog) according to Equation 3.4.
 *
 * Equation 3.4: R_cog = tau_real / tau_expected
 *
 * @param tauReal - Measured response initiation latency in milliseconds.
 * @param contextLength - Prompt context character count (L_in).
 * @returns Non-dimensional cognitive assimilation ratio (R_cog).
 *
 * Origin: Whitepaper Chapter 3 (Equation 3.4), docs/BEHAVIORAL_MODEL.md (Section 2.3)
 */
export function computeCognitiveAssimilationRatio(tauReal: number, contextLength: number): number {
  const tauExpected = computeExpectedCognitiveLatency(contextLength);
  if (tauExpected <= 0) {
    return 0.0;
  }
  return tauReal / tauExpected;
}

/**
 * Computes the error recalibration variance (sigma^2_err) adjacent to deletion events according to Equation 3.5.
 *
 * Equation 3.5: sigma^2_err = (1 / |I_back|) * sum_{i in I_back} (f_i - mean(f_I_back))^2
 *
 * @param flightTimes - Array of inter-key flight times in milliseconds.
 * @param backspaceIndices - Index set of flight times adjacent to Backspace deletion events.
 * @returns Variance of flight times surrounding error correction events.
 *
 * Origin: Whitepaper Chapter 3 (Equation 3.5), docs/BEHAVIORAL_MODEL.md (Section 2.4)
 */
export function computeErrorRecalibrationVariance(
  flightTimes: readonly number[],
  backspaceIndices: readonly number[]
): number {
  const count = backspaceIndices.length;
  if (count === 0) {
    return 0.0;
  }

  const validIndices = backspaceIndices.filter(
    (idx) => idx >= 0 && idx < flightTimes.length
  );
  if (validIndices.length === 0) {
    return 0.0;
  }

  const mean =
    validIndices.reduce((acc, idx) => acc + flightTimes[idx], 0) /
    validIndices.length;

  const sumSquaredDiff = validIndices.reduce(
    (acc, idx) => acc + Math.pow(flightTimes[idx] - mean, 2),
    0
  );

  return sumSquaredDiff / validIndices.length;
}

/**
 * Computes the sigmoidal normalized confidence components (Phi, Psi, Omega) according to Equation 3.6.
 *
 * Equation 3.6: Maps (S_F, R_cog, sigma^2_err) onto normalized confidence intervals in [0, 1].
 *
 * @param metrics - Raw extracted feature metrics.
 * @returns Normalized confidence components object (phi, psi, omega).
 *
 * Origin: Whitepaper Chapter 3 (Equation 3.6), docs/BEHAVIORAL_MODEL.md (Section 2.5)
 */
export function computeSigmoidalNormalizedComponents(
  metrics: ExtractedFeatureMetrics
): SigmoidalNormalizedComponents {
  const kappa1 = 2.0;
  const sRef = 1.0;
  const phi = 1.0 / (1.0 + Math.exp(-kappa1 * (metrics.fisherPearsonSkewness - sRef)));

  const kappa2 = 3.0;
  const psi = 1.0 / (1.0 + Math.exp(-kappa2 * (metrics.cognitiveAssimilationRatio - 1.0)));

  const kappa3 = 0.05;
  const sigma2Ref = 50.0;
  const omega = 1.0 / (1.0 + Math.exp(-kappa3 * (metrics.errorRecalibrationVariance - sigma2Ref)));

  return {
    phi,
    psi,
    omega,
  };
}

/**
 * Computes the consolidated Proof of Human Intent composite score (S_PoHI) according to Equation 3.7.
 *
 * Equation 3.7: S_PoHI = alpha * Phi(S_F) + beta * Psi(R_cog) + gamma * Omega(sigma^2_err)
 * Validation assertion: b_valid = (S_PoHI >= theta)
 *
 * @param metrics - Raw extracted feature metrics.
 * @param calibration - Domain parameter weighting and threshold configuration.
 * @returns Consolidated PoHI score result object.
 *
 * Origin: Whitepaper Chapter 3 (Equation 3.7), docs/BEHAVIORAL_MODEL.md (Section 2.5)
 */
export function computePoHIScore(
  metrics: ExtractedFeatureMetrics,
  calibration: DomainParameterCalibration
): PoHIScoreResult {
  const normalizedComponents = computeSigmoidalNormalizedComponents(metrics);

  const compositeScore =
    calibration.alpha * normalizedComponents.phi +
    calibration.beta * normalizedComponents.psi +
    calibration.gamma * normalizedComponents.omega;

  const isValid = compositeScore >= calibration.theta;

  return {
    compositeScore,
    isValid,
    metrics,
    normalizedComponents,
    calibration,
  };
}
