/**
 * Proof of Human Intent (PoHI) - Core Mathematical Data Model
 *
 * This module defines the strongly-typed interfaces and data structures
 * for the PoHI reference mathematical engine as specified in the protocol
 * whitepaper (Equations 3.1 through 3.7).
 */

/**
 * Discrete physical input event captured at the client interface layer.
 * Represents a single keypress or touch actuation event tuple.
 */
export interface RawInputEvent {
  /** Physical key or gesture symbol (k_i) */
  readonly key: string;
  /** Actuation contact timestamp in milliseconds (t_press,i) */
  readonly pressTime: number;
  /** Actuation release timestamp in milliseconds (t_release,i) */
  readonly releaseTime: number;
}

/**
 * Neuromuscular vector pair extracted from raw input event sequences (Equation 3.1).
 */
export interface NeuromuscularVectors {
  /** Dwell Time Vector D = [d_1, d_2, ..., d_n]^T where d_i = t_release,i - t_press,i */
  readonly dwellTimes: readonly number[];
  /** Flight Time Vector F = [f_1, f_2, ..., f_{n-1}]^T where f_i = t_press,i+1 - t_release,i */
  readonly flightTimes: readonly number[];
}

/**
 * Extracted physical feature metrics before sigmoidal normalization.
 */
export interface ExtractedFeatureMetrics {
  /** Fisher-Pearson standardized coefficient of flight skewness (S_F) (Equation 3.2) */
  readonly fisherPearsonSkewness: number;
  /** Non-dimensional cognitive assimilation ratio (R_cog) (Equation 3.4) */
  readonly cognitiveAssimilationRatio: number;
  /** Error recalibration variance adjacent to deletion events (sigma^2_err) (Equation 3.5) */
  readonly errorRecalibrationVariance: number;
}

/**
 * Domain-specific parameter calibration configuration (Equation 3.7).
 */
export interface DomainParameterCalibration {
  /** Motor skewness weighting factor (alpha >= 0) */
  readonly alpha: number;
  /** Cognitive assimilation weighting factor (beta >= 0) */
  readonly beta: number;
  /** Error recalibration variance weighting factor (gamma >= 0) */
  readonly gamma: number;
  /** Domain-specific security threshold theta in range (0, 1) */
  readonly theta: number;
}

/**
 * Sigmoidal normalization outputs mapped onto confidence intervals (Equation 3.6).
 */
export interface SigmoidalNormalizedComponents {
  /** Normalized motor skewness confidence Phi(S_F) in [0, 1] */
  readonly phi: number;
  /** Normalized cognitive assimilation confidence Psi(R_cog) in [0, 1] */
  readonly psi: number;
  /** Normalized error recalibration confidence Omega(sigma^2_err) in [0, 1] */
  readonly omega: number;
}

/**
 * Final consolidated Proof of Human Intent score result (Equation 3.7).
 */
export interface PoHIScoreResult {
  /** Composite scalar score S_PoHI in range [0, 1] */
  readonly compositeScore: number;
  /** Boolean assertion result b_valid = (S_PoHI >= theta) */
  readonly isValid: boolean;
  /** Raw domain feature metrics extracted from session */
  readonly metrics: ExtractedFeatureMetrics;
  /** Sigmoidal normalized confidence components */
  readonly normalizedComponents: SigmoidalNormalizedComponents;
  /** Calibration parameters used for evaluation */
  readonly calibration: DomainParameterCalibration;
}
