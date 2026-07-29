/**
 * @file scoring.mjs
 * @package experiments/
 *
 * Scores a recorded session with the reference mathematical engine.
 *
 * This reproduces exactly the pipeline of packages/sdk-web/src/session.ts: the same vector
 * extraction, the same correction-index construction, and the same call into
 * @pohi-protocol/core-math. Evaluating with the reference engine rather than the circuit is
 * deliberate — the circuit is proved to agree with it to within the +/-0.0122 bound of
 * PSP-0002, and running 10^4 proofs would add days of compute for no change in conclusion.
 *
 * Any score reported here that falls within 0.0122 of the operating threshold should be
 * treated as indeterminate for circuit-based deployment.
 */

import {
  computeDwellTimeVector,
  computeFlightTimeVector,
  computeFisherPearsonSkewness,
  computeCognitiveAssimilationRatio,
  computeErrorRecalibrationVariance,
  computePoHIScore,
  PARAM_ESCROW_ALPHA,
  PARAM_ESCROW_BETA,
  PARAM_ESCROW_GAMMA,
  PARAM_ESCROW_THETA,
  PARAM_MERCHANT_ALPHA,
  PARAM_MERCHANT_BETA,
  PARAM_MERCHANT_GAMMA,
  PARAM_MERCHANT_THETA,
  PARAM_GAMING_ALPHA,
  PARAM_GAMING_BETA,
  PARAM_GAMING_GAMMA,
  PARAM_GAMING_THETA,
  PARAM_FORUM_ALPHA,
  PARAM_FORUM_BETA,
  PARAM_FORUM_GAMMA,
  PARAM_FORUM_THETA,
} from '@pohi-protocol/core-math';

/** The four calibration domains of whitepaper Ch.9 Section 9.1. */
export const CALIBRATIONS = {
  escrow: {
    label: 'P2P Financial Escrow',
    alpha: PARAM_ESCROW_ALPHA,
    beta: PARAM_ESCROW_BETA,
    gamma: PARAM_ESCROW_GAMMA,
    theta: PARAM_ESCROW_THETA,
  },
  merchant: {
    label: 'B2B Merchant Messaging',
    alpha: PARAM_MERCHANT_ALPHA,
    beta: PARAM_MERCHANT_BETA,
    gamma: PARAM_MERCHANT_GAMMA,
    theta: PARAM_MERCHANT_THETA,
  },
  gaming: {
    label: 'Gaming Guild Chat',
    alpha: PARAM_GAMING_ALPHA,
    beta: PARAM_GAMING_BETA,
    gamma: PARAM_GAMING_GAMMA,
    theta: PARAM_GAMING_THETA,
  },
  forum: {
    label: 'Public Community Forum',
    alpha: PARAM_FORUM_ALPHA,
    beta: PARAM_FORUM_BETA,
    gamma: PARAM_FORUM_GAMMA,
    theta: PARAM_FORUM_THETA,
  },
};

/**
 * Extracts the Equation 3.1 vectors and the Equation 3.5 index set from a session.
 * The index set construction mirrors sdk-web: a Backspace at event i marks flight index i-1,
 * which is the inter-key latency immediately preceding the correction.
 */
export function extractFeatures(session) {
  const events = session.events.map((event) => ({
    key: event.isBackspace ? 'Backspace' : 'x',
    pressTime: event.pressTime,
    releaseTime: event.releaseTime,
  }));

  const dwellTimes = computeDwellTimeVector(events);
  const flightTimes = computeFlightTimeVector(events);

  const backspaceIndices = [];
  events.forEach((event, i) => {
    if (event.key === 'Backspace' && i > 0) backspaceIndices.push(i - 1);
  });

  const tauReal = events.length > 0 ? Math.max(0, events[0].pressTime - session.renderTime) : 0;

  return {
    dwellTimes,
    flightTimes,
    backspaceIndices,
    tauReal,
    metrics: {
      fisherPearsonSkewness: computeFisherPearsonSkewness(flightTimes),
      cognitiveAssimilationRatio: computeCognitiveAssimilationRatio(tauReal, session.contextLength),
      errorRecalibrationVariance: computeErrorRecalibrationVariance(flightTimes, backspaceIndices),
    },
  };
}

/** Scores a single session under one calibration. */
export function scoreSession(session, calibration) {
  const features = extractFeatures(session);
  const result = computePoHIScore(features.metrics, calibration);
  return {
    sessionId: session.sessionId,
    participantId: session.participantId,
    device: session.device,
    eventCount: session.events.length,
    metrics: features.metrics,
    normalizedComponents: result.normalizedComponents,
    score: result.compositeScore,
    isValid: result.isValid,
  };
}

/** Scores every session in a corpus. */
export function scoreCorpus(corpus, calibration) {
  return corpus.sessions.map((session) => scoreSession(session, calibration));
}
