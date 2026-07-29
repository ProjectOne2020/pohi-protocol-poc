/**
 * @file dataset.mjs
 * @package experiments/
 *
 * Dataset schema, validation and I/O for the PoHI empirical evaluation.
 *
 * PRIVACY BY CONSTRUCTION
 * -----------------------
 * A session records only press and release timestamps plus a single boolean marking whether
 * each event was a Backspace. Character identities are never recorded, so the original text
 * cannot be reconstructed from a corpus.
 *
 * The Backspace flag is the minimum required to build the Equation 3.5 index set I_back. It
 * carries exactly the information that PSP-0003 already admits into the protocol's own private
 * witness, so collecting it discloses nothing the protocol does not already rely on.
 */

import { readFileSync, writeFileSync } from 'node:fs';

export const SCHEMA_VERSION = 1;

/** Device classes, matching the hardware strata of whitepaper Ch.10 Section 10.1. */
export const DEVICE_CLASSES = [
  'desktop-mechanical',
  'laptop-scissor',
  'ios-capacitive',
  'android-capacitive',
  'unknown',
];

/**
 * Provenance labels. `human` denotes data captured from a consenting biological participant;
 * every other value denotes generated data. The evaluation runner refuses to report a corpus
 * as empirical evidence unless its provenance is `human`.
 */
export const PROVENANCE = {
  HUMAN: 'human',
  SYNTHETIC_HARNESS: 'synthetic-harness',
  ADVERSARIAL: 'adversarial',
};

/**
 * Validates one session, returning a list of human-readable problems. An empty list means the
 * session is well formed.
 */
export function validateSession(session, index = 0) {
  const problems = [];
  const where = `session[${index}]`;

  if (typeof session !== 'object' || session === null) {
    return [`${where}: not an object`];
  }
  if (typeof session.sessionId !== 'string' || session.sessionId.length === 0) {
    problems.push(`${where}: missing sessionId`);
  }
  if (!Number.isFinite(session.contextLength) || session.contextLength < 0) {
    problems.push(`${where}: contextLength must be a non-negative number`);
  }
  if (!Number.isFinite(session.renderTime)) {
    problems.push(`${where}: renderTime must be a number`);
  }
  if (!Array.isArray(session.events)) {
    return [...problems, `${where}: events must be an array`];
  }

  session.events.forEach((event, i) => {
    if (!Number.isFinite(event.pressTime) || !Number.isFinite(event.releaseTime)) {
      problems.push(`${where}.events[${i}]: press/release must be numbers`);
    } else if (event.releaseTime < event.pressTime) {
      problems.push(`${where}.events[${i}]: release precedes press`);
    }
    if (typeof event.isBackspace !== 'boolean') {
      problems.push(`${where}.events[${i}]: isBackspace must be a boolean`);
    }
    if ('key' in event || 'char' in event) {
      problems.push(
        `${where}.events[${i}]: character identity present — corpora must never carry text`
      );
    }
  });

  for (let i = 1; i < session.events.length; i++) {
    const previous = session.events[i - 1];
    const current = session.events[i];
    if (Number.isFinite(previous.pressTime) && Number.isFinite(current.pressTime)) {
      if (current.pressTime < previous.pressTime) {
        problems.push(`${where}.events[${i}]: events are not in chronological order`);
      }
    }
  }

  if (session.events.length > 0 && Number.isFinite(session.renderTime)) {
    if (session.events[0].pressTime < session.renderTime) {
      problems.push(`${where}: first keystroke precedes the prompt render time`);
    }
  }

  return problems;
}

/** Validates a whole corpus. Throws with a consolidated report if anything is malformed. */
export function validateCorpus(corpus) {
  const problems = [];

  if (corpus?.schemaVersion !== SCHEMA_VERSION) {
    problems.push(`schemaVersion must be ${SCHEMA_VERSION}, found ${corpus?.schemaVersion}`);
  }
  if (!Object.values(PROVENANCE).includes(corpus?.provenance)) {
    problems.push(`provenance must be one of ${Object.values(PROVENANCE).join(', ')}`);
  }
  if (!Array.isArray(corpus?.sessions)) {
    problems.push('sessions must be an array');
    throw new Error(`Invalid corpus:\n  ${problems.join('\n  ')}`);
  }

  corpus.sessions.forEach((session, i) => problems.push(...validateSession(session, i)));

  if (problems.length > 0) {
    throw new Error(`Invalid corpus (${problems.length} problems):\n  ${problems.join('\n  ')}`);
  }
  return corpus;
}

export function loadCorpus(path) {
  return validateCorpus(JSON.parse(readFileSync(path, 'utf8')));
}

export function saveCorpus(path, corpus) {
  validateCorpus(corpus);
  writeFileSync(path, `${JSON.stringify(corpus, null, 2)}\n`);
}

export function createCorpus({ provenance, source, notes = '', sessions = [] }) {
  return {
    schemaVersion: SCHEMA_VERSION,
    provenance,
    source,
    notes,
    createdAt: new Date().toISOString(),
    sessions,
  };
}

// ---------------------------------------------------------------------------------------
// Deterministic pseudo-random source
// ---------------------------------------------------------------------------------------

/**
 * A seeded generator (mulberry32) so that every generated corpus is exactly reproducible from
 * its seed. Reproducibility is a requirement for the evaluation to be independently checkable.
 */
export function createRandom(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    /** Box-Muller transform: standard normal deviate. */
    normal() {
      const u1 = Math.max(next(), Number.EPSILON);
      const u2 = next();
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    },
    /** Log-normal deviate; the natural family for strictly positive right-skewed latencies. */
    logNormal(mu, sigma) {
      return Math.exp(mu + sigma * this.normal());
    },
    between(min, max) {
      return min + next() * (max - min);
    },
    pick(array) {
      return array[Math.floor(next() * array.length)];
    },
  };
}

// ---------------------------------------------------------------------------------------
// Session assembly
// ---------------------------------------------------------------------------------------

/**
 * Builds a session from explicit dwell and flight vectors.
 *
 * @param dwells        Dwell durations in milliseconds, length n.
 * @param flights       Inter-key latencies in milliseconds, length n-1.
 * @param backspaceAt   Event indices that were Backspace presses.
 * @param tauReal       Latency in ms between prompt render and the first keystroke.
 */
export function assembleSession({
  sessionId,
  dwells,
  flights,
  backspaceAt = [],
  contextLength,
  tauReal,
  device = 'unknown',
  participantId = 'anonymous',
  renderTime = 0,
}) {
  const events = [];
  let cursor = renderTime + tauReal;

  for (let i = 0; i < dwells.length; i++) {
    const pressTime = cursor;
    const releaseTime = pressTime + dwells[i];
    events.push({
      isBackspace: backspaceAt.includes(i),
      pressTime,
      releaseTime,
    });
    cursor = releaseTime + (i < flights.length ? flights[i] : 0);
  }

  return {
    sessionId,
    collectedAt: new Date(0).toISOString(),
    participantId,
    device,
    contextLength,
    renderTime,
    events,
  };
}

/**
 * Generates a corpus that imitates biological typing, for exercising the evaluation harness
 * before real participant data exists.
 *
 * > This is NOT empirical data. It is generated by the same kind of statistical process the
 * > adversary uses, so scoring it proves nothing about real humans. `run-evaluation.mjs`
 * > refuses to present results from this provenance as empirical evidence.
 */
export function generateHarnessCorpus({ sessions = 40, seed = 20260729 } = {}) {
  const random = createRandom(seed);
  const out = [];

  for (let s = 0; s < sessions; s++) {
    const eventCount = Math.round(random.between(18, 29));
    const contextLength = Math.round(random.between(80, 400));

    // Typists differ; draw per-session motor parameters so the corpus has between-subject
    // variation rather than one homogeneous distribution.
    const dwellCentre = random.between(70, 95);
    const flightMu = random.between(3.4, 3.8);
    const flightSigma = random.between(0.35, 0.6);

    const dwells = Array.from({ length: eventCount }, () =>
      Math.max(15, dwellCentre + random.normal() * 9)
    );
    const flights = Array.from({ length: eventCount - 1 }, () =>
      Math.max(8, random.logNormal(flightMu, flightSigma))
    );

    // Occasional cognitive pauses at word boundaries produce the right tail of Eq. 3.2.
    const pauseCount = Math.round(random.between(1, 4));
    for (let p = 0; p < pauseCount; p++) {
      const at = Math.floor(random.next() * flights.length);
      flights[at] += random.between(120, 400);
    }

    const backspaceAt = [];
    const corrections = Math.round(random.between(0, 3));
    for (let c = 0; c < corrections; c++) {
      const at = 1 + Math.floor(random.next() * (eventCount - 1));
      if (!backspaceAt.includes(at)) backspaceAt.push(at);
    }

    const tauExpected = 25 * contextLength + 350;
    const tauReal = tauExpected * random.between(0.9, 2.4);

    out.push(
      assembleSession({
        sessionId: `harness-${s}`,
        dwells,
        flights,
        backspaceAt,
        contextLength,
        tauReal,
        device: random.pick(DEVICE_CLASSES.slice(0, 4)),
        participantId: `harness-p${s % 12}`,
      })
    );
  }

  return createCorpus({
    provenance: PROVENANCE.SYNTHETIC_HARNESS,
    source: `generateHarnessCorpus(seed=${seed})`,
    notes:
      'Generated data for exercising the evaluation pipeline. Not empirical evidence and not ' +
      'a substitute for participant collection.',
    sessions: out,
  });
}
