/**
 * @file export.mjs
 * @package experiments/
 *
 * Pure transformation from study-database rows into the corpus format.
 *
 * Kept separate from export-corpus.mjs so it can be unit-tested without network access or a
 * service role key. The CLI is a thin wrapper over these functions.
 */

import { createCorpus, validateCorpus, PROVENANCE } from './dataset.mjs';

/** Equation 3.2 requires at least 10 flight samples, hence 11 keystrokes. */
export const DEFAULT_MIN_EVENTS = 11;

/**
 * Converts one database row into a corpus session.
 *
 * Timestamps are rebased so that renderTime is 0. The absolute epoch offset carries no
 * scientific information — it is an artifact of when the participant happened to take part —
 * and removing it makes sessions from different participants directly comparable.
 */
export function rowToSession(row) {
  const origin = row.render_time;
  return {
    sessionId: row.session_id,
    collectedAt: row.client_collected_at ?? row.received_at,
    participantId: row.participant_token,
    device: row.device,
    contextLength: row.context_length,
    renderTime: 0,
    events: row.events.map((event) => ({
      isBackspace: event.isBackspace,
      pressTime: Number((event.pressTime - origin).toFixed(3)),
      releaseTime: Number((event.releaseTime - origin).toFixed(3)),
    })),
  };
}

/**
 * Converts a set of rows into a validated corpus, dropping sessions too short to support the
 * Equation 3.2 third-moment estimate.
 *
 * @returns {{corpus: object, dropped: {tooShort: number}}}
 */
export function rowsToCorpus(rows, { minEvents = DEFAULT_MIN_EVENTS, batch = null } = {}) {
  const dropped = { tooShort: 0 };
  const sessions = [];

  for (const row of rows) {
    if (row.event_count < minEvents) {
      dropped.tooShort += 1;
      continue;
    }
    sessions.push(rowToSession(row));
  }

  const corpus = createCorpus({
    provenance: PROVENANCE.HUMAN,
    source: batch ? `study-database:${batch}` : 'study-database',
    notes:
      'Collected with informed consent through experiments/collect/index.html. Contains timing ' +
      'only; character identities were never recorded and are rejected at the database level.',
    sessions,
  });

  validateCorpus(corpus);
  return { corpus, dropped };
}

/** Summarises a corpus for the export report. */
export function summarise(corpus) {
  const participants = new Set(corpus.sessions.map((s) => s.participantId));
  const byDevice = corpus.sessions.reduce((acc, s) => {
    acc[s.device] = (acc[s.device] ?? 0) + 1;
    return acc;
  }, {});
  return {
    sessions: corpus.sessions.length,
    participants: participants.size,
    byDevice,
    keystrokes: corpus.sessions.reduce((a, s) => a + s.events.length, 0),
  };
}
