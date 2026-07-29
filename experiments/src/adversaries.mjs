/**
 * @file adversaries.mjs
 * @package experiments/
 *
 * Adversary models for the PoHI empirical evaluation.
 *
 * Each adversary generates a corpus of sessions that no human produced, and declares exactly
 * what knowledge and resources it assumes. Following Kerckhoffs's principle, every adversary
 * is granted full knowledge of the protocol, the scoring function, the calibration weights and
 * the threshold: security must not depend on any of those being secret.
 *
 * The adversaries are ordered by increasing capability. The first three correspond to threat
 * vectors already claimed as mitigated in docs/THREAT_MODEL.md; they act as positive controls,
 * because an evaluation in which they are NOT rejected would indicate a broken harness rather
 * than a broken protocol.
 *
 * The last three test the witness authenticity gap documented in docs/THREAT_MODEL.md §5.
 */

import { assembleSession, createCorpus, createRandom, PROVENANCE } from './dataset.mjs';
import { extractFeatures } from './scoring.mjs';

/**
 * Estimates the distributional parameters of a human corpus. This is the only information an
 * offline adversary needs, and it is obtainable from any public keystroke-dynamics dataset.
 */
export function fitCorpusStatistics(corpus) {
  const logFlights = [];
  const dwells = [];
  const ratios = [];
  const eventCounts = [];
  const correctionRates = [];

  for (const session of corpus.sessions) {
    const features = extractFeatures(session);
    for (const flight of features.flightTimes) {
      if (flight > 0) logFlights.push(Math.log(flight));
    }
    dwells.push(...features.dwellTimes.filter((d) => d > 0));
    ratios.push(features.metrics.cognitiveAssimilationRatio);
    eventCounts.push(session.events.length);
    correctionRates.push(
      session.events.length > 0 ? features.backspaceIndices.length / session.events.length : 0
    );
  }

  const mean = (xs) => xs.reduce((a, c) => a + c, 0) / Math.max(1, xs.length);
  const sd = (xs) => {
    const m = mean(xs);
    return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
  };

  return {
    flightLogMean: mean(logFlights),
    flightLogSd: sd(logFlights),
    dwellMean: mean(dwells),
    dwellSd: sd(dwells),
    ratioMean: mean(ratios),
    ratioSd: sd(ratios),
    eventCountMean: mean(eventCounts),
    eventCountSd: sd(eventCounts),
    correctionRate: mean(correctionRates),
    sampleSizes: { flights: logFlights.length, dwells: dwells.length, sessions: corpus.sessions.length },
  };
}

function contextAndTau(random, ratio) {
  const contextLength = Math.round(random.between(80, 400));
  const tauExpected = 25 * contextLength + 350;
  return { contextLength, tauReal: Math.max(0, tauExpected * ratio) };
}

// ---------------------------------------------------------------------------------------
// Positive controls: adversaries the threat model already claims to defeat
// ---------------------------------------------------------------------------------------

/** Threat vector 6: AutoHotkey / xdotool style fixed-delay replay. */
export const constantDelay = {
  id: 'A1-constant',
  label: 'Constant-delay macro',
  threatVector: 6,
  knowledge: 'None. Emits a fixed inter-key delay.',
  expectation: 'Rejected: zero flight variance drives S_F to 0 via the epsilon guard.',
  generate({ sessions, seed }) {
    const random = createRandom(seed);
    return Array.from({ length: sessions }, (_, s) => {
      const eventCount = Math.round(random.between(18, 29));
      const { contextLength, tauReal } = contextAndTau(random, random.between(0.05, 0.4));
      return assembleSession({
        sessionId: `${this.id}-${s}`,
        dwells: new Array(eventCount).fill(60),
        flights: new Array(eventCount - 1).fill(50),
        contextLength,
        tauReal,
        participantId: this.id,
      });
    });
  },
};

/** Threat vector 7: uniform random jitter between synthetic keystrokes. */
export const uniformNoise = {
  id: 'A2-uniform',
  label: 'Uniform random jitter',
  threatVector: 7,
  knowledge: 'None beyond a plausible latency range.',
  expectation: 'Rejected: a uniform distribution is symmetric, so S_F is near 0.',
  generate({ sessions, seed }) {
    const random = createRandom(seed);
    return Array.from({ length: sessions }, (_, s) => {
      const eventCount = Math.round(random.between(18, 29));
      const { contextLength, tauReal } = contextAndTau(random, random.between(0.05, 0.5));
      return assembleSession({
        sessionId: `${this.id}-${s}`,
        dwells: Array.from({ length: eventCount }, () => random.between(40, 120)),
        flights: Array.from({ length: eventCount - 1 }, () => random.between(20, 150)),
        contextLength,
        tauReal,
        participantId: this.id,
      });
    });
  },
};

/** Threat vector 7 variant: Gaussian jitter, still symmetric. */
export const gaussianNoise = {
  id: 'A3-gaussian',
  label: 'Gaussian random jitter',
  threatVector: 7,
  knowledge: 'A plausible mean and spread for human latencies.',
  expectation: 'Rejected: a Gaussian is symmetric, so S_F is near 0.',
  generate({ sessions, seed }) {
    const random = createRandom(seed);
    return Array.from({ length: sessions }, (_, s) => {
      const eventCount = Math.round(random.between(18, 29));
      const { contextLength, tauReal } = contextAndTau(random, random.between(0.1, 0.6));
      return assembleSession({
        sessionId: `${this.id}-${s}`,
        dwells: Array.from({ length: eventCount }, () => Math.max(15, 80 + random.normal() * 15)),
        flights: Array.from({ length: eventCount - 1 }, () =>
          Math.max(8, 90 + random.normal() * 30)
        ),
        contextLength,
        tauReal,
        participantId: this.id,
      });
    });
  },
};

// ---------------------------------------------------------------------------------------
// Witness authenticity adversaries
// ---------------------------------------------------------------------------------------

/**
 * Threat vector 12, achieved without a GAN.
 *
 * The threat model assigns this adversary the limitation "high GPU inference latency per
 * keypress". That limitation assumes online, per-keystroke synthesis. This adversary generates
 * the entire vector offline in a single pass, so no per-keystroke inference occurs and the
 * stated limitation does not apply.
 *
 * A log-normal family is used because it is strictly positive and naturally right-skewed,
 * which is precisely the property Equation 3.2 measures.
 */
export const statisticalMimic = {
  id: 'A4-mimic',
  label: 'Offline statistical mimic',
  threatVector: 12,
  knowledge: 'Distributional parameters of a public keystroke corpus. No per-keystroke inference.',
  expectation: 'Under test. This is the adversary the threat model does not currently address.',
  generate({ sessions, seed, statistics }) {
    const random = createRandom(seed);
    return Array.from({ length: sessions }, (_, s) => {
      const eventCount = Math.max(
        12,
        Math.round(statistics.eventCountMean + random.normal() * statistics.eventCountSd)
      );
      const ratio = Math.max(
        0,
        statistics.ratioMean + random.normal() * Math.max(0.01, statistics.ratioSd)
      );
      const { contextLength, tauReal } = contextAndTau(random, ratio);

      const dwells = Array.from({ length: eventCount }, () =>
        Math.max(15, statistics.dwellMean + random.normal() * statistics.dwellSd)
      );
      const flights = Array.from({ length: eventCount - 1 }, () =>
        Math.max(5, random.logNormal(statistics.flightLogMean, statistics.flightLogSd))
      );

      const backspaceAt = [];
      const corrections = Math.round(statistics.correctionRate * eventCount);
      for (let c = 0; c < corrections; c++) {
        const at = 1 + Math.floor(random.next() * (eventCount - 1));
        if (!backspaceAt.includes(at)) backspaceAt.push(at);
      }

      return assembleSession({
        sessionId: `${this.id}-${s}`,
        dwells,
        flights,
        backspaceAt,
        contextLength,
        tauReal,
        participantId: this.id,
      });
    });
  },
};

/**
 * Telemetry-level replay.
 *
 * Threat vector 8 mitigates replay of a *proof* by binding it to the session commitment, which
 * the circuit does correctly. It does not address reuse of the *timing values*: the adversary
 * takes a genuine human vector and generates a fresh, valid proof for a new session.
 *
 * This is the cheapest adversary in the set: it requires no modelling at all.
 */
export const telemetryReplay = {
  id: 'A5-replay',
  label: 'Human telemetry replay',
  threatVector: 8,
  knowledge: 'A single captured human session, or any public corpus.',
  expectation: 'Under test. Session-hash binding does not constrain the witness values.',
  generate({ sessions, seed, humanCorpus }) {
    const random = createRandom(seed);
    const donors = humanCorpus.sessions;
    return Array.from({ length: sessions }, (_, s) => {
      const donor = donors[Math.floor(random.next() * donors.length)];
      const features = extractFeatures(donor);
      // Reuse the timings verbatim under a new session identity and a new prompt context.
      const { contextLength, tauReal } = contextAndTau(
        random,
        features.metrics.cognitiveAssimilationRatio
      );
      return assembleSession({
        sessionId: `${this.id}-${s}`,
        dwells: [...features.dwellTimes],
        flights: [...features.flightTimes],
        backspaceAt: features.backspaceIndices.map((i) => i + 1),
        contextLength,
        tauReal,
        participantId: this.id,
      });
    });
  },
};

/**
 * The mimic, additionally exploiting the two components that are free to control.
 *
 * tau_real is chosen rather than measured, so R_cog can be placed anywhere; waiting costs
 * nothing. The correction latencies are likewise chosen, so sigma^2_err can be placed anywhere.
 * Only S_F requires any modelling at all.
 *
 * This adversary represents the realistic capability of a competent attacker and is the
 * primary test of the Chapter 9 economic argument.
 */
export const optimisedMimic = {
  id: 'A6-optimised',
  label: 'Offline mimic with tuned latency and corrections',
  threatVector: 12,
  knowledge:
    'Corpus statistics, the scoring function, the calibration weights and the threshold. ' +
    'All obtainable from the public specification.',
  expectation: 'Under test. Directly probes the witness authenticity gap.',
  generate({ sessions, seed, statistics }) {
    const random = createRandom(seed);
    return Array.from({ length: sessions }, (_, s) => {
      const eventCount = Math.max(14, Math.round(random.between(20, 29)));

      // R_cog is placed comfortably above 1.0, which costs the adversary only wall-clock time.
      const ratio = random.between(1.8, 3.0);
      const { contextLength, tauReal } = contextAndTau(random, ratio);

      const dwells = Array.from({ length: eventCount }, () =>
        Math.max(15, statistics.dwellMean + random.normal() * statistics.dwellSd)
      );

      // Right-skewed base, plus deliberate pauses to push S_F above the Phi midpoint.
      const flights = Array.from({ length: eventCount - 1 }, () =>
        Math.max(5, random.logNormal(statistics.flightLogMean, statistics.flightLogSd))
      );
      const pauses = Math.round(random.between(2, 4));
      for (let p = 0; p < pauses; p++) {
        flights[Math.floor(random.next() * flights.length)] += random.between(150, 450);
      }

      // Corrections with deliberately dispersed latencies to raise sigma^2_err.
      const backspaceAt = [];
      const corrections = 3;
      for (let c = 0; c < corrections; c++) {
        const at = 1 + Math.floor(random.next() * (eventCount - 1));
        if (!backspaceAt.includes(at)) {
          backspaceAt.push(at);
          if (at - 1 < flights.length) flights[at - 1] += random.between(50, 350);
        }
      }

      return assembleSession({
        sessionId: `${this.id}-${s}`,
        dwells,
        flights,
        backspaceAt,
        contextLength,
        tauReal,
        participantId: this.id,
      });
    });
  },
};

export const ADVERSARIES = [
  constantDelay,
  uniformNoise,
  gaussianNoise,
  statisticalMimic,
  telemetryReplay,
  optimisedMimic,
];

/** Generates an adversarial corpus for one adversary. */
export function generateAdversarialCorpus(adversary, { sessions, seed, statistics, humanCorpus }) {
  return createCorpus({
    provenance: PROVENANCE.ADVERSARIAL,
    source: `${adversary.id} (seed=${seed})`,
    notes: `${adversary.label}. Knowledge assumed: ${adversary.knowledge}`,
    sessions: adversary.generate({ sessions, seed, statistics, humanCorpus }),
  });
}
