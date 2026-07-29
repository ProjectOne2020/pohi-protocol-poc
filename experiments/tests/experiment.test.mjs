/**
 * @file experiment.test.mjs
 * @package experiments/tests
 *
 * Verification of the evaluation instrument itself.
 *
 * An empirical result is only as trustworthy as the apparatus that produced it. These tests
 * check the schema guarantees, the determinism of every generator, the correctness of the
 * detection metrics against hand-computable cases, and the agreement between the scoring
 * harness and the reference engine.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  validateSession,
  validateCorpus,
  loadCorpus,
  createCorpus,
  createRandom,
  assembleSession,
  generateHarnessCorpus,
  PROVENANCE,
  SCHEMA_VERSION,
} from '../src/dataset.mjs';

import { extractFeatures, scoreSession, scoreCorpus, CALIBRATIONS } from '../src/scoring.mjs';
import { rowToSession, rowsToCorpus, summarise, DEFAULT_MIN_EVENTS } from '../src/export.mjs';
import { ADVERSARIES, fitCorpusStatistics, generateAdversarialCorpus } from '../src/adversaries.mjs';
import {
  falseAcceptanceRate,
  falseRejectionRate,
  equalErrorRate,
  areaUnderRoc,
  bootstrapInterval,
  evaluate,
} from '../src/metrics.mjs';

import {
  computeFisherPearsonSkewness,
  computeFlightTimeVector,
  computeCognitiveAssimilationRatio,
} from '@pohi-protocol/core-math';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(HERE, 'fixtures', 'browser-capture.json');

// ---------------------------------------------------------------------------------------
// Schema and privacy guarantees
// ---------------------------------------------------------------------------------------

describe('Dataset schema', () => {
  it('accepts a corpus captured by the collection page', () => {
    const corpus = loadCorpus(FIXTURE);
    assert.equal(corpus.schemaVersion, SCHEMA_VERSION);
    assert.equal(corpus.provenance, PROVENANCE.HUMAN);
    assert.equal(corpus.sessions.length, 2);
    assert.ok(corpus.sessions[0].events.length > 12);
  });

  it('rejects any event carrying character identity', () => {
    // This is the privacy invariant: a corpus must never make text reconstructible.
    const problems = validateSession({
      sessionId: 's',
      contextLength: 10,
      renderTime: 0,
      events: [{ key: 'a', isBackspace: false, pressTime: 1, releaseTime: 2 }],
    });
    assert.ok(
      problems.some((p) => p.includes('character identity')),
      'a leaked key field must be reported'
    );
  });

  it('rejects a release that precedes its press', () => {
    const problems = validateSession({
      sessionId: 's',
      contextLength: 10,
      renderTime: 0,
      events: [{ isBackspace: false, pressTime: 100, releaseTime: 50 }],
    });
    assert.ok(problems.some((p) => p.includes('release precedes press')));
  });

  it('rejects events that are out of chronological order', () => {
    const problems = validateSession({
      sessionId: 's',
      contextLength: 10,
      renderTime: 0,
      events: [
        { isBackspace: false, pressTime: 200, releaseTime: 210 },
        { isBackspace: false, pressTime: 100, releaseTime: 110 },
      ],
    });
    assert.ok(problems.some((p) => p.includes('chronological')));
  });

  it('rejects a keystroke recorded before the prompt was rendered', () => {
    const problems = validateSession({
      sessionId: 's',
      contextLength: 10,
      renderTime: 500,
      events: [{ isBackspace: false, pressTime: 100, releaseTime: 110 }],
    });
    assert.ok(problems.some((p) => p.includes('precedes the prompt render time')));
  });

  it('rejects an unknown provenance label', () => {
    assert.throws(
      () => validateCorpus({ schemaVersion: SCHEMA_VERSION, provenance: 'made-up', sessions: [] }),
      /provenance/
    );
  });
});

// ---------------------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------------------

describe('Reproducibility', () => {
  it('produces identical random streams for identical seeds', () => {
    const a = createRandom(42);
    const b = createRandom(42);
    const drawsA = Array.from({ length: 50 }, () => a.next());
    const drawsB = Array.from({ length: 50 }, () => b.next());
    assert.deepEqual(drawsA, drawsB);
  });

  it('produces different streams for different seeds', () => {
    const a = createRandom(1);
    const b = createRandom(2);
    assert.notEqual(a.next(), b.next());
  });

  it('regenerates an identical harness corpus from the same seed', () => {
    const first = generateHarnessCorpus({ sessions: 8, seed: 7 });
    const second = generateHarnessCorpus({ sessions: 8, seed: 7 });
    assert.deepEqual(
      first.sessions.map((s) => s.events),
      second.sessions.map((s) => s.events)
    );
  });

  it('regenerates identical adversarial corpora from the same seed', () => {
    const human = generateHarnessCorpus({ sessions: 10, seed: 3 });
    const statistics = fitCorpusStatistics(human);
    const options = { sessions: 10, seed: 99, statistics, humanCorpus: human };

    for (const adversary of ADVERSARIES) {
      const a = generateAdversarialCorpus(adversary, options);
      const b = generateAdversarialCorpus(adversary, options);
      assert.deepEqual(
        a.sessions.map((s) => s.events),
        b.sessions.map((s) => s.events),
        `${adversary.id} must be reproducible`
      );
    }
  });
});

// ---------------------------------------------------------------------------------------
// Feature extraction agrees with the reference engine
// ---------------------------------------------------------------------------------------

describe('Scoring harness', () => {
  it('reconstructs the same flight vector the reference engine derives', () => {
    const session = assembleSession({
      sessionId: 't',
      dwells: [80, 70, 90, 75],
      flights: [40, 55, 35],
      contextLength: 100,
      tauReal: 3000,
    });

    const features = extractFeatures(session);
    assert.deepEqual(features.dwellTimes, [80, 70, 90, 75]);
    assert.deepEqual(features.flightTimes, [40, 55, 35]);
    assert.equal(features.tauReal, 3000);
  });

  it('marks the flight preceding each Backspace, matching the SDK', () => {
    const session = assembleSession({
      sessionId: 't',
      dwells: [80, 70, 90, 75, 85],
      flights: [40, 55, 35, 60],
      backspaceAt: [2, 4],
      contextLength: 100,
      tauReal: 3000,
    });

    // A Backspace at event i marks flight index i-1.
    assert.deepEqual(extractFeatures(session).backspaceIndices, [1, 3]);
  });

  it('computes R_cog exactly as the reference engine does', () => {
    const session = assembleSession({
      sessionId: 't',
      dwells: new Array(14).fill(80),
      flights: new Array(13).fill(45),
      contextLength: 200,
      tauReal: 7000,
    });

    assert.equal(
      extractFeatures(session).metrics.cognitiveAssimilationRatio,
      computeCognitiveAssimilationRatio(7000, 200)
    );
  });

  it('computes S_F exactly as the reference engine does on the same flight vector', () => {
    const corpus = generateHarnessCorpus({ sessions: 5, seed: 11 });
    for (const session of corpus.sessions) {
      const features = extractFeatures(session);
      const events = session.events.map((e) => ({
        key: e.isBackspace ? 'Backspace' : 'x',
        pressTime: e.pressTime,
        releaseTime: e.releaseTime,
      }));
      assert.equal(
        features.metrics.fisherPearsonSkewness,
        computeFisherPearsonSkewness(computeFlightTimeVector(events))
      );
    }
  });

  it('scores the browser fixture without error under every calibration', () => {
    const corpus = loadCorpus(FIXTURE);
    for (const key of Object.keys(CALIBRATIONS)) {
      const scored = scoreCorpus(corpus, CALIBRATIONS[key]);
      assert.equal(scored.length, 2);
      for (const row of scored) {
        assert.ok(row.score >= 0 && row.score <= 1, `${key}: score must lie in [0,1]`);
        assert.equal(typeof row.isValid, 'boolean');
      }
    }
  });
});

// ---------------------------------------------------------------------------------------
// Database export
// ---------------------------------------------------------------------------------------

describe('Study database export', () => {
  /** A row shaped exactly as PostgREST returns it from public.keystroke_sessions. */
  function databaseRow(overrides = {}) {
    const origin = 1_785_353_953_901;
    return {
      session_id: 's-abc',
      participant_token: 'p-xyz',
      device: 'laptop-scissor',
      context_length: 168,
      render_time: origin,
      event_count: 12,
      client_collected_at: '2026-07-29T19:39:26.134Z',
      received_at: '2026-07-29T19:39:27.000Z',
      study_batch: 'piloto',
      events: Array.from({ length: 12 }, (_, i) => ({
        isBackspace: i === 5,
        pressTime: origin + 4000 + i * 130,
        releaseTime: origin + 4000 + i * 130 + 80,
      })),
      ...overrides,
    };
  }

  it('rebases timestamps so renderTime becomes zero', () => {
    const session = rowToSession(databaseRow());
    assert.equal(session.renderTime, 0);
    assert.equal(session.events[0].pressTime, 4000);
    assert.equal(session.events[0].releaseTime, 4080);
  });

  it('preserves inter-event intervals exactly through rebasing', () => {
    const row = databaseRow();
    const session = rowToSession(row);
    for (let i = 1; i < row.events.length; i++) {
      const originalGap = row.events[i].pressTime - row.events[i - 1].releaseTime;
      const exportedGap = session.events[i].pressTime - session.events[i - 1].releaseTime;
      assert.equal(exportedGap, originalGap, 'flight times must survive the origin shift');
    }
  });

  it('maps the database column names onto the corpus field names', () => {
    const session = rowToSession(databaseRow());
    assert.equal(session.sessionId, 's-abc');
    assert.equal(session.participantId, 'p-xyz');
    assert.equal(session.contextLength, 168);
    assert.equal(session.device, 'laptop-scissor');
  });

  it('falls back to received_at when the client timestamp is absent', () => {
    const session = rowToSession(databaseRow({ client_collected_at: null }));
    assert.equal(session.collectedAt, '2026-07-29T19:39:27.000Z');
  });

  it('carries the Backspace flag through unchanged', () => {
    const session = rowToSession(databaseRow());
    assert.deepEqual(
      session.events.map((e) => e.isBackspace),
      Array.from({ length: 12 }, (_, i) => i === 5)
    );
  });

  it('produces a corpus that passes schema validation', () => {
    const { corpus } = rowsToCorpus([databaseRow(), databaseRow({ session_id: 's-2' })]);
    assert.doesNotThrow(() => validateCorpus(corpus));
    assert.equal(corpus.provenance, PROVENANCE.HUMAN);
    assert.equal(corpus.sessions.length, 2);
  });

  it('drops sessions below the Equation 3.2 minimum sample size', () => {
    const short = databaseRow({ session_id: 's-short', event_count: 6, events: databaseRow().events.slice(0, 6) });
    const { corpus, dropped } = rowsToCorpus([databaseRow(), short]);

    assert.equal(dropped.tooShort, 1);
    assert.equal(corpus.sessions.length, 1);
    assert.equal(corpus.sessions[0].session_id, undefined);
    assert.equal(corpus.sessions[0].sessionId, 's-abc');
  });

  it('honours a custom minimum-events threshold', () => {
    const { corpus, dropped } = rowsToCorpus([databaseRow()], { minEvents: 50 });
    assert.equal(dropped.tooShort, 1);
    assert.equal(corpus.sessions.length, 0);
  });

  it('labels the corpus source with the batch when one is given', () => {
    const { corpus } = rowsToCorpus([databaseRow()], { batch: 'piloto' });
    assert.equal(corpus.source, 'study-database:piloto');
  });

  it('summarises participants, sessions and device strata', () => {
    const rows = [
      databaseRow({ session_id: 'a', participant_token: 'p1', device: 'laptop-scissor' }),
      databaseRow({ session_id: 'b', participant_token: 'p1', device: 'laptop-scissor' }),
      databaseRow({ session_id: 'c', participant_token: 'p2', device: 'ios-capacitive' }),
    ];
    const { corpus } = rowsToCorpus(rows);
    const stats = summarise(corpus);

    assert.equal(stats.sessions, 3);
    assert.equal(stats.participants, 2, 'sessions sharing a token are one participant');
    assert.equal(stats.byDevice['laptop-scissor'], 2);
    assert.equal(stats.byDevice['ios-capacitive'], 1);
    assert.equal(stats.keystrokes, 36);
  });

  it('exports a corpus that the scoring harness can consume directly', () => {
    const { corpus } = rowsToCorpus([databaseRow(), databaseRow({ session_id: 's-2' })]);
    const scored = scoreCorpus(corpus, CALIBRATIONS.escrow);
    assert.equal(scored.length, 2);
    for (const row of scored) {
      assert.ok(row.score >= 0 && row.score <= 1);
    }
  });

  it('uses 11 keystrokes as the default threshold', () => {
    assert.equal(DEFAULT_MIN_EVENTS, 11);
  });
});

// ---------------------------------------------------------------------------------------
// Detection metrics
// ---------------------------------------------------------------------------------------

describe('Detection metrics', () => {
  it('computes FAR as the proportion of adversarial scores at or above theta', () => {
    assert.equal(falseAcceptanceRate([0.9, 0.8, 0.4, 0.2], 0.85), 0.25);
    assert.equal(falseAcceptanceRate([0.9, 0.86, 0.85, 0.2], 0.85), 0.75);
    assert.equal(falseAcceptanceRate([], 0.85), 0);
  });

  it('computes FRR as the proportion of human scores below theta', () => {
    assert.equal(falseRejectionRate([0.9, 0.8, 0.4, 0.95], 0.85), 0.5);
    assert.equal(falseRejectionRate([0.9, 0.95], 0.85), 0);
  });

  it('reports AUC 1.0 for perfectly separated populations', () => {
    assert.equal(areaUnderRoc([0.9, 0.95, 0.99], [0.1, 0.2, 0.3]), 1);
  });

  it('reports AUC 0.5 for identical populations', () => {
    const same = [0.5, 0.6, 0.7];
    assert.equal(areaUnderRoc(same, [...same]), 0.5);
  });

  it('reports AUC below 0.5 when the adversary outscores the humans', () => {
    // This is the signature of an adversary that does not merely evade but dominates.
    assert.ok(areaUnderRoc([0.2, 0.3], [0.8, 0.9]) < 0.5);
  });

  it('finds an EER of zero for perfectly separated populations', () => {
    const result = equalErrorRate([0.9, 0.95, 0.99], [0.1, 0.2, 0.3]);
    assert.equal(result.eer, 0);
    assert.ok(result.theta > 0.3 && result.theta <= 0.9);
  });

  it('produces a bootstrap interval that brackets the point estimate', () => {
    const human = Array.from({ length: 40 }, (_, i) => 0.6 + (i % 10) / 50);
    const bot = Array.from({ length: 40 }, (_, i) => 0.2 + (i % 10) / 50);
    const point = areaUnderRoc(human, bot);
    const interval = bootstrapInterval(human, bot, areaUnderRoc, { iterations: 200, seed: 5 });

    assert.ok(interval.lower <= point && point <= interval.upper);
    assert.equal(interval.level, 0.95);
  });

  it('returns a complete metric bundle', () => {
    const human = [0.9, 0.88, 0.92, 0.87];
    const bot = [0.3, 0.4, 0.86, 0.2];
    const result = evaluate(human, bot, 0.85, { iterations: 100, seed: 1 });

    assert.equal(result.far, 0.25);
    assert.equal(result.frr, 0);
    assert.ok(result.auc > 0.5);
    assert.ok(Number.isFinite(result.eer));
    assert.equal(result.humanScores.n, 4);
    assert.equal(result.adversarialScores.n, 4);
  });
});

// ---------------------------------------------------------------------------------------
// Adversary sanity
// ---------------------------------------------------------------------------------------

describe('Adversary models', () => {
  const human = generateHarnessCorpus({ sessions: 30, seed: 2026 });
  const statistics = fitCorpusStatistics(human);

  it('fits corpus statistics with finite parameters', () => {
    assert.ok(Number.isFinite(statistics.flightLogMean));
    assert.ok(statistics.flightLogSd > 0);
    assert.ok(statistics.dwellMean > 0);
    assert.ok(statistics.sampleSizes.sessions === 30);
  });

  it('generates schema-valid corpora for every adversary', () => {
    for (const adversary of ADVERSARIES) {
      const corpus = generateAdversarialCorpus(adversary, {
        sessions: 12,
        seed: 4,
        statistics,
        humanCorpus: human,
      });
      assert.doesNotThrow(() => validateCorpus(corpus), `${adversary.id} produced invalid data`);
      assert.equal(corpus.provenance, PROVENANCE.ADVERSARIAL);
      assert.equal(corpus.sessions.length, 12);
    }
  });

  it('labels every adversary with a threat vector and a knowledge assumption', () => {
    for (const adversary of ADVERSARIES) {
      assert.ok(Number.isInteger(adversary.threatVector), `${adversary.id} lacks a threat vector`);
      assert.ok(adversary.knowledge.length > 0, `${adversary.id} lacks a knowledge statement`);
    }
  });

  it('rejects the isochronous control adversaries, as the threat model claims', () => {
    // Positive control: if these were accepted, the harness would be broken rather than the
    // protocol. Constant delays produce zero flight variance, so S_F collapses to 0.
    const calibration = CALIBRATIONS.escrow;
    const humanScores = scoreCorpus(human, calibration).map((r) => r.score);

    for (const adversary of ADVERSARIES.slice(0, 3)) {
      const corpus = generateAdversarialCorpus(adversary, {
        sessions: 30,
        seed: 8,
        statistics,
        humanCorpus: human,
      });
      const scores = scoreCorpus(corpus, calibration).map((r) => r.score);
      const far = falseAcceptanceRate(scores, calibration.theta);
      assert.equal(far, 0, `${adversary.id} should not reach theta`);
      assert.ok(
        areaUnderRoc(humanScores, scores) > 0.9,
        `${adversary.id} should be clearly separable`
      );
    }
  });

  it('produces sessions long enough for the Equation 3.2 minimum sample size', () => {
    for (const adversary of ADVERSARIES) {
      const corpus = generateAdversarialCorpus(adversary, {
        sessions: 10,
        seed: 6,
        statistics,
        humanCorpus: human,
      });
      for (const session of corpus.sessions) {
        assert.ok(
          session.events.length >= 11,
          `${adversary.id} produced a session too short to estimate skewness`
        );
      }
    }
  });
});
