/**
 * @file metrics.mjs
 * @package experiments/
 *
 * Detection metrics implementing whitepaper Ch.10 Section 10.3.
 *
 *     FAR(theta) = FP / (FP + TN)   proportion of adversarial sessions scoring >= theta
 *     FRR(theta) = FN / (FN + TP)   proportion of human sessions scoring <  theta
 *     EER        = FAR(theta_EER) = FRR(theta_EER)
 *
 * Confidence intervals follow Ch.10 Section 10.2: non-parametric bootstrap resampling with
 * B = 1000 iterations at the 95% level.
 */

import { createRandom } from './dataset.mjs';

/** Proportion of adversarial scores at or above the threshold. */
export function falseAcceptanceRate(adversarialScores, theta) {
  if (adversarialScores.length === 0) return 0;
  return adversarialScores.filter((s) => s >= theta).length / adversarialScores.length;
}

/** Proportion of human scores below the threshold. */
export function falseRejectionRate(humanScores, theta) {
  if (humanScores.length === 0) return 0;
  return humanScores.filter((s) => s < theta).length / humanScores.length;
}

/**
 * Equal Error Rate: the operating point where FAR and FRR coincide.
 *
 * Both rates are step functions of theta, so an exact crossing rarely exists. The candidate
 * thresholds are the observed scores themselves plus the midpoints between them, and the
 * reported EER is the point minimising |FAR - FRR|.
 */
export function equalErrorRate(humanScores, adversarialScores) {
  const candidates = [...new Set([...humanScores, ...adversarialScores])].sort((a, b) => a - b);
  if (candidates.length === 0) return { eer: 0, theta: 0, far: 0, frr: 0 };

  const thresholds = [0];
  for (let i = 0; i < candidates.length; i++) {
    thresholds.push(candidates[i]);
    if (i + 1 < candidates.length) thresholds.push((candidates[i] + candidates[i + 1]) / 2);
  }
  thresholds.push(1);

  let best = null;
  for (const theta of thresholds) {
    const far = falseAcceptanceRate(adversarialScores, theta);
    const frr = falseRejectionRate(humanScores, theta);
    const gap = Math.abs(far - frr);
    if (best === null || gap < best.gap) {
      best = { gap, theta, far, frr, eer: (far + frr) / 2 };
    }
  }
  return best;
}

/**
 * Area under the ROC curve, computed as the Mann-Whitney U statistic: the probability that a
 * randomly chosen human session scores above a randomly chosen adversarial session, with ties
 * counted as one half.
 *
 * AUC = 0.5 means the score carries no discriminative information whatsoever.
 */
export function areaUnderRoc(humanScores, adversarialScores) {
  if (humanScores.length === 0 || adversarialScores.length === 0) return 0.5;
  let wins = 0;
  for (const human of humanScores) {
    for (const adversarial of adversarialScores) {
      if (human > adversarial) wins += 1;
      else if (human === adversarial) wins += 0.5;
    }
  }
  return wins / (humanScores.length * adversarialScores.length);
}

/** Samples an array with replacement. */
function resample(values, random) {
  return Array.from({ length: values.length }, () => values[Math.floor(random.next() * values.length)]);
}

function percentile(sorted, p) {
  if (sorted.length === 0) return Number.NaN;
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (index - lower) * (sorted[upper] - sorted[lower]);
}

/**
 * Non-parametric bootstrap confidence interval for a statistic of the two score sets.
 * Ch.10 Section 10.2 specifies B = 1000 iterations at 95%.
 */
export function bootstrapInterval(humanScores, adversarialScores, statistic, {
  iterations = 1000,
  level = 0.95,
  seed = 1,
} = {}) {
  const random = createRandom(seed);
  const draws = [];
  for (let b = 0; b < iterations; b++) {
    draws.push(statistic(resample(humanScores, random), resample(adversarialScores, random)));
  }
  draws.sort((a, b) => a - b);
  const tail = (1 - level) / 2;
  return {
    lower: percentile(draws, tail),
    upper: percentile(draws, 1 - tail),
    iterations,
    level,
  };
}

export function describe(values) {
  if (values.length === 0) return { n: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, c) => a + c, 0) / values.length;
  const sd = Math.sqrt(values.reduce((a, c) => a + (c - mean) ** 2, 0) / values.length);
  return {
    n: values.length,
    mean,
    sd,
    min: sorted[0],
    p25: percentile(sorted, 0.25),
    median: percentile(sorted, 0.5),
    p75: percentile(sorted, 0.75),
    max: sorted[sorted.length - 1],
  };
}

/** Full metric bundle for one human-versus-adversary comparison. */
export function evaluate(humanScores, adversarialScores, theta, options = {}) {
  const far = falseAcceptanceRate(adversarialScores, theta);
  const frr = falseRejectionRate(humanScores, theta);
  const eer = equalErrorRate(humanScores, adversarialScores);
  const auc = areaUnderRoc(humanScores, adversarialScores);

  return {
    theta,
    far,
    frr,
    eer: eer.eer,
    eerThreshold: eer.theta,
    auc,
    farInterval: bootstrapInterval(
      humanScores,
      adversarialScores,
      (_h, a) => falseAcceptanceRate(a, theta),
      options
    ),
    aucInterval: bootstrapInterval(humanScores, adversarialScores, areaUnderRoc, options),
    humanScores: describe(humanScores),
    adversarialScores: describe(adversarialScores),
  };
}
