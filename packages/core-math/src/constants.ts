/**
 * Proof of Human Intent (PoHI) - Core Mathematical Constants
 *
 * This module defines the exported physical, mathematical, and cryptographic constants
 * explicitly specified in the PoHI protocol documentation and academic whitepaper.
 */

/**
 * Maximum biological reading throughput parameter in characters per second (~400 words/minute).
 * Origin: Whitepaper Chapter 3 (Equation 3.3), docs/BEHAVIORAL_MODEL.md (Section 2.3)
 */
export const LAMBDA_BIO = 40;

/**
 * Minimal neurological formulation delay required to process context and initiate motor execution in milliseconds.
 * Origin: Whitepaper Chapter 3 (Equation 3.3), docs/BEHAVIORAL_MODEL.md (Section 2.3)
 */
export const DELTA_COGNITIVE = 350;

/**
 * R1CS circuit fixed-point integer arithmetic scaling factor (10^6).
 * Origin: Whitepaper Chapter 5 (Section 5.1), docs/CRYPTOGRAPHY.md (Section 2.1)
 */
export const FIXED_POINT_SCALING_FACTOR = 1000000;

/**
 * Fixed-point representation of the default P2P escrow security threshold (0.85 * 10^6).
 * Origin: Whitepaper Chapter 13 (Section 13.3 PoHIEscrow.sol), README.md (EVM Smart Contract)
 */
export const THRESHOLD_THETA_ESCROW_FIXED = 850000;

/**
 * Minimum sample size of flight events required for higher-order moment skewness estimations (n >= 10).
 * Origin: Whitepaper Chapter 3 (Equation 3.2), docs/BEHAVIORAL_MODEL.md (Section 4)
 */
export const MIN_SAMPLE_SIZE_SKEWNESS = 10;

/**
 * Numerical epsilon clamping value (10^-6) to prevent division by near-zero variance (m_2 -> 0).
 * Origin: Whitepaper Chapter 3 (Section 3.6), docs/BEHAVIORAL_MODEL.md (Section 4)
 */
export const NUMERICAL_EPSILON = 0.000001;

/**
 * Groth16 zero-knowledge proof payload size in bytes under BN254 curve geometry.
 * Origin: Whitepaper Chapter 2 (Section 2.3.2), Chapter 5 (Section 5.2), docs/CRYPTOGRAPHY.md (Section 3)
 */
export const GROTH16_PROOF_SIZE_BYTES = 128;

/**
 * Approximate R1CS arithmetic circuit constraint count for N=30 character input session.
 * Origin: Whitepaper Chapter 5 (Section 5.1), docs/CRYPTOGRAPHY.md (Section 2.3)
 */
export const R1CS_CONSTRAINT_COUNT_BASE = 14250;

/**
 * P2P Financial Escrow domain calibration - Motor skewness weight (alpha).
 * Origin: Whitepaper Chapter 9 (Table 9.1), docs/BEHAVIORAL_MODEL.md (Section 3)
 */
export const PARAM_ESCROW_ALPHA = 0.30;

/**
 * P2P Financial Escrow domain calibration - Cognitive assimilation weight (beta).
 * Origin: Whitepaper Chapter 9 (Table 9.1), docs/BEHAVIORAL_MODEL.md (Section 3)
 */
export const PARAM_ESCROW_BETA = 0.50;

/**
 * P2P Financial Escrow domain calibration - Error recalibration variance weight (gamma).
 * Origin: Whitepaper Chapter 9 (Table 9.1), docs/BEHAVIORAL_MODEL.md (Section 3)
 */
export const PARAM_ESCROW_GAMMA = 0.20;

/**
 * P2P Financial Escrow domain calibration - Security threshold (theta).
 * Origin: Whitepaper Chapter 9 (Table 9.1), docs/BEHAVIORAL_MODEL.md (Section 3)
 */
export const PARAM_ESCROW_THETA = 0.85;

/**
 * B2B Merchant Messaging domain calibration - Motor skewness weight (alpha).
 * Origin: Whitepaper Chapter 9 (Table 9.1), docs/BEHAVIORAL_MODEL.md (Section 3)
 */
export const PARAM_MERCHANT_ALPHA = 0.40;

/**
 * B2B Merchant Messaging domain calibration - Cognitive assimilation weight (beta).
 * Origin: Whitepaper Chapter 9 (Table 9.1), docs/BEHAVIORAL_MODEL.md (Section 3)
 */
export const PARAM_MERCHANT_BETA = 0.40;

/**
 * B2B Merchant Messaging domain calibration - Error recalibration variance weight (gamma).
 * Origin: Whitepaper Chapter 9 (Table 9.1), docs/BEHAVIORAL_MODEL.md (Section 3)
 */
export const PARAM_MERCHANT_GAMMA = 0.20;

/**
 * B2B Merchant Messaging domain calibration - Security threshold (theta).
 * Origin: Whitepaper Chapter 9 (Table 9.1), docs/BEHAVIORAL_MODEL.md (Section 3)
 */
export const PARAM_MERCHANT_THETA = 0.75;

/**
 * Gaming Guild Chat domain calibration - Motor skewness weight (alpha).
 * Origin: Whitepaper Chapter 9 (Table 9.1), docs/BEHAVIORAL_MODEL.md (Section 3)
 */
export const PARAM_GAMING_ALPHA = 0.70;

/**
 * Gaming Guild Chat domain calibration - Cognitive assimilation weight (beta).
 * Origin: Whitepaper Chapter 9 (Table 9.1), docs/BEHAVIORAL_MODEL.md (Section 3)
 */
export const PARAM_GAMING_BETA = 0.15;

/**
 * Gaming Guild Chat domain calibration - Error recalibration variance weight (gamma).
 * Origin: Whitepaper Chapter 9 (Table 9.1), docs/BEHAVIORAL_MODEL.md (Section 3)
 */
export const PARAM_GAMING_GAMMA = 0.15;

/**
 * Gaming Guild Chat domain calibration - Security threshold (theta).
 * Origin: Whitepaper Chapter 9 (Table 9.1), docs/BEHAVIORAL_MODEL.md (Section 3)
 */
export const PARAM_GAMING_THETA = 0.60;

/**
 * Public Community Forum domain calibration - Motor skewness weight (alpha).
 * Origin: Whitepaper Chapter 9 (Table 9.1), docs/BEHAVIORAL_MODEL.md (Section 3)
 */
export const PARAM_FORUM_ALPHA = 0.50;

/**
 * Public Community Forum domain calibration - Cognitive assimilation weight (beta).
 * Origin: Whitepaper Chapter 9 (Table 9.1), docs/BEHAVIORAL_MODEL.md (Section 3)
 */
export const PARAM_FORUM_BETA = 0.25;

/**
 * Public Community Forum domain calibration - Error recalibration variance weight (gamma).
 * Origin: Whitepaper Chapter 9 (Table 9.1), docs/BEHAVIORAL_MODEL.md (Section 3)
 */
export const PARAM_FORUM_GAMMA = 0.25;

/**
 * Public Community Forum domain calibration - Security threshold (theta).
 * Origin: Whitepaper Chapter 9 (Table 9.1), docs/BEHAVIORAL_MODEL.md (Section 3)
 */
export const PARAM_FORUM_THETA = 0.55;
