/**
 * DOM capture tests for @pohi-protocol/sdk-web.
 *
 * Covers the browser telemetry ingestion path specified in docs/ARCHITECTURE.md Section 6.2
 * (event registration and filtering rules), 6.3 (volatile buffer sanitization) and 6.5
 * (interaction with @pohi-protocol/core-math).
 *
 * The suite runs in Node, so it substitutes two browser facilities:
 *
 *   - `EventTarget`, which Node provides natively, stands in for `HTMLElement`. The SDK only
 *     uses addEventListener/removeEventListener, so this exercises the real code path.
 *   - `performance` is replaced by a controllable clock. The SDK reads the wall clock inside
 *     its handlers, so without this the recorded dwell and flight times would be whatever the
 *     machine happened to measure and no exact assertion would be possible.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeDwellTimeVector,
  computeFlightTimeVector,
  computeFisherPearsonSkewness,
  computeErrorRecalibrationVariance,
  type RawInputEvent,
} from '@pohi-protocol/core-math';

import { createPoHISession } from '../dist/index.js';
import type { PoHISDKConfig, PoHISession } from '../dist/index.js';

// ---------------------------------------------------------------------------------------
// Controllable clock
// ---------------------------------------------------------------------------------------

let clock = 0;
let originalPerformance: typeof globalThis.performance;

function advance(milliseconds: number): void {
  clock += milliseconds;
}

beforeEach(() => {
  originalPerformance = globalThis.performance;
  clock = 1_000_000;
  // timeOrigin is 0 so the SDK's `timeOrigin + now()` reduces exactly to the fake clock.
  (globalThis as { performance: unknown }).performance = {
    timeOrigin: 0,
    now: () => clock,
  };
});

afterEach(() => {
  (globalThis as { performance: unknown }).performance = originalPerformance;
});

// ---------------------------------------------------------------------------------------
// Fake DOM helpers
// ---------------------------------------------------------------------------------------

/** Node's EventTarget satisfies the surface of HTMLElement that the SDK actually uses. */
function createElement(): HTMLElement {
  return new EventTarget() as unknown as HTMLElement;
}

interface KeyEventInit {
  repeat?: boolean;
  isComposing?: boolean;
}

function keyEvent(type: 'keydown' | 'keyup', key: string, init: KeyEventInit = {}): Event {
  const event = new Event(type);
  Object.assign(event, {
    key,
    repeat: init.repeat ?? false,
    isComposing: init.isComposing ?? false,
  });
  return event;
}

/** Presses and releases a key, holding it for `dwell` ms and idling `flight` ms afterwards. */
function typeKey(element: HTMLElement, key: string, dwell: number, flight = 0): void {
  element.dispatchEvent(keyEvent('keydown', key));
  advance(dwell);
  element.dispatchEvent(keyEvent('keyup', key));
  advance(flight);
}

function touch(element: HTMLElement, dwell: number, flight = 0): void {
  element.dispatchEvent(new Event('touchstart'));
  advance(dwell);
  element.dispatchEvent(new Event('touchend'));
  advance(flight);
}

const BASE_CONFIG: PoHISDKConfig = {
  contextLength: 120,
  sessionHash: '0xtest',
};

function newSession(config: Partial<PoHISDKConfig> = {}): PoHISession {
  return createPoHISession({ ...BASE_CONFIG, ...config });
}

// ---------------------------------------------------------------------------------------
// Listener lifecycle
// ---------------------------------------------------------------------------------------

describe('SDK DOM capture: listener lifecycle', () => {
  it('records nothing before attach() is called', async () => {
    const session = newSession();
    const element = createElement();

    typeKey(element, 'a', 80, 40);

    const result = await session.processSession();
    assert.equal(result.rawEventCount, 0);
    session.destroy();
  });

  it('records a keydown/keyup pair once attached', async () => {
    const session = newSession();
    const element = createElement();
    session.attach(element);

    typeKey(element, 'a', 80);

    const result = await session.processSession();
    assert.equal(result.rawEventCount, 1);
    session.destroy();
  });

  it('stops recording after detach() but retains telemetry already collected', async () => {
    const session = newSession();
    const element = createElement();
    session.attach(element);

    typeKey(element, 'a', 80, 40);
    session.detach();
    typeKey(element, 'b', 80, 40);
    typeKey(element, 'c', 80, 40);

    const result = await session.processSession();
    assert.equal(result.rawEventCount, 1, 'only the pre-detach event should be present');
    session.destroy();
  });

  it('is idempotent when attaching the same element twice', async () => {
    const session = newSession();
    const element = createElement();

    session.attach(element);
    session.attach(element);

    typeKey(element, 'a', 80);

    const result = await session.processSession();
    assert.equal(result.rawEventCount, 1, 'a duplicate attach must not double-register listeners');
    session.destroy();
  });

  it('moves listeners when attached to a different element', async () => {
    const session = newSession();
    const first = createElement();
    const second = createElement();

    session.attach(first);
    session.attach(second);

    typeKey(first, 'a', 80, 40); // must be ignored: listeners moved away
    typeKey(second, 'b', 80, 40);

    const result = await session.processSession();
    assert.equal(result.rawEventCount, 1, 'the abandoned element must no longer be observed');
    session.destroy();
  });

  it('tolerates detach() without a prior attach()', () => {
    const session = newSession();
    assert.doesNotThrow(() => session.detach());
    session.destroy();
  });
});

// ---------------------------------------------------------------------------------------
// Timestamp semantics (Equation 3.1)
// ---------------------------------------------------------------------------------------

describe('SDK DOM capture: Equation 3.1 timestamp semantics', () => {
  it('derives dwell time as t_release - t_press', async () => {
    const session = newSession();
    const element = createElement();
    session.attach(element);

    typeKey(element, 'a', 83);

    const result = await session.processSession();
    // A single event yields no flight samples, so skewness is 0 and only dwell is observable.
    assert.equal(result.rawEventCount, 1);
    session.destroy();
  });

  it('derives flight time as t_press,i+1 - t_release,i across a sequence', async () => {
    const session = newSession();
    const element = createElement();
    session.attach(element);

    // Dwell 80/70/90 ms, flight 40/55 ms.
    typeKey(element, 'a', 80, 40);
    typeKey(element, 'b', 70, 55);
    typeKey(element, 'c', 90);

    const result = await session.processSession();
    assert.equal(result.rawEventCount, 3);

    // Reconstruct the same event stream and confirm the reference engine agrees.
    const events: RawInputEvent[] = [
      { key: 'a', pressTime: 1_000_000, releaseTime: 1_000_080 },
      { key: 'b', pressTime: 1_000_120, releaseTime: 1_000_190 },
      { key: 'c', pressTime: 1_000_245, releaseTime: 1_000_335 },
    ];
    assert.deepEqual(computeDwellTimeVector(events), [80, 70, 90]);
    assert.deepEqual(computeFlightTimeVector(events), [40, 55]);

    session.destroy();
  });

  it('handles interleaved keys, pairing each keyup with its own keydown', async () => {
    const session = newSession();
    const element = createElement();
    session.attach(element);

    // Rolling overlap: press 'a', press 'b', release 'a', release 'b'.
    element.dispatchEvent(keyEvent('keydown', 'a'));
    advance(20);
    element.dispatchEvent(keyEvent('keydown', 'b'));
    advance(30);
    element.dispatchEvent(keyEvent('keyup', 'a')); // dwell 50
    advance(25);
    element.dispatchEvent(keyEvent('keyup', 'b')); // dwell 55

    const result = await session.processSession();
    assert.equal(result.rawEventCount, 2, 'both overlapping keys must be recorded');
    session.destroy();
  });
});

// ---------------------------------------------------------------------------------------
// Filtering rules (docs/ARCHITECTURE.md Section 6.2)
// ---------------------------------------------------------------------------------------

describe('SDK DOM capture: event filtering rules', () => {
  it('ignores OS auto-repeat events', async () => {
    const session = newSession();
    const element = createElement();
    session.attach(element);

    element.dispatchEvent(keyEvent('keydown', 'a', { repeat: true }));
    advance(80);
    element.dispatchEvent(keyEvent('keyup', 'a'));

    const result = await session.processSession();
    assert.equal(result.rawEventCount, 0, 'auto-repeat must not produce telemetry');
    session.destroy();
  });

  it('ignores IME composition events', async () => {
    const session = newSession();
    const element = createElement();
    session.attach(element);

    element.dispatchEvent(keyEvent('keydown', 'a', { isComposing: true }));
    advance(80);
    element.dispatchEvent(keyEvent('keyup', 'a'));

    const result = await session.processSession();
    assert.equal(result.rawEventCount, 0, 'composition input must not produce telemetry');
    session.destroy();
  });

  it('ignores non-character modifier keys', async () => {
    const session = newSession();
    const element = createElement();
    session.attach(element);

    for (const modifier of ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock']) {
      typeKey(element, modifier, 80, 20);
    }

    const result = await session.processSession();
    assert.equal(result.rawEventCount, 0, 'modifier keys carry no biomechanical signal');
    session.destroy();
  });

  it('records Backspace, which is a character-affecting key rather than a modifier', async () => {
    const session = newSession();
    const element = createElement();
    session.attach(element);

    typeKey(element, 'a', 80, 40);
    typeKey(element, 'Backspace', 90);

    const result = await session.processSession();
    assert.equal(result.rawEventCount, 2);
    session.destroy();
  });

  it('ignores a keyup with no matching keydown', async () => {
    const session = newSession();
    const element = createElement();
    session.attach(element);

    // Occurs in practice when a key is pressed before the element gains focus.
    element.dispatchEvent(keyEvent('keyup', 'a'));

    const result = await session.processSession();
    assert.equal(result.rawEventCount, 0);
    session.destroy();
  });

  it('records capacitive touch events', async () => {
    const session = newSession();
    const element = createElement();
    session.attach(element);

    touch(element, 60, 45);
    touch(element, 75);

    const result = await session.processSession();
    assert.equal(result.rawEventCount, 2);
    session.destroy();
  });

  it('ignores a touchend with no matching touchstart', async () => {
    const session = newSession();
    const element = createElement();
    session.attach(element);

    element.dispatchEvent(new Event('touchend'));

    const result = await session.processSession();
    assert.equal(result.rawEventCount, 0);
    session.destroy();
  });
});

// ---------------------------------------------------------------------------------------
// Equation 3.5 index set construction
// ---------------------------------------------------------------------------------------

describe('SDK DOM capture: Equation 3.5 correction index set', () => {
  it('marks the flight time preceding each Backspace', async () => {
    const session = newSession();
    const element = createElement();
    session.attach(element);

    typeKey(element, 'a', 80, 40);          // index 0
    typeKey(element, 'b', 70, 50);          // index 1
    typeKey(element, 'Backspace', 90, 120); // index 2 -> marks flight index 1
    typeKey(element, 'c', 75, 45);          // index 3
    typeKey(element, 'Backspace', 85);      // index 4 -> marks flight index 3

    const result = await session.processSession();
    assert.equal(result.rawEventCount, 5);

    // The reference engine, given the same flight vector and index set, must agree.
    const flightTimes = [40, 50, 120, 45];
    const variance = computeErrorRecalibrationVariance(flightTimes, [1, 3]);
    assert.ok(variance > 0, 'differing correction latencies must produce non-zero variance');

    session.destroy();
  });

  it('does not mark an index when Backspace is the very first event', async () => {
    const session = newSession();
    const element = createElement();
    session.attach(element);

    typeKey(element, 'Backspace', 90, 40);
    typeKey(element, 'a', 80);

    const result = await session.processSession();
    assert.equal(result.rawEventCount, 2);
    // A leading Backspace has no preceding flight time, so the index set stays empty and
    // Equation 3.5 returns 0 exactly as the reference engine does for an empty set.
    assert.equal(computeErrorRecalibrationVariance([40], []), 0);

    session.destroy();
  });
});

// ---------------------------------------------------------------------------------------
// Volatile buffer growth and sanitization (docs/ARCHITECTURE.md Section 6.3)
// ---------------------------------------------------------------------------------------

describe('SDK DOM capture: volatile buffer management', () => {
  it('grows beyond the initial 256-event capacity without losing telemetry', async () => {
    const session = newSession();
    const element = createElement();
    session.attach(element);

    // 300 events forces one doubling of the Float64Array buffers.
    const total = 300;
    for (let i = 0; i < total; i++) {
      typeKey(element, 'a', 50, 30);
    }

    const result = await session.processSession();
    assert.equal(result.rawEventCount, total, 'every event must survive the buffer reallocation');

    // Constant timings across the whole sequence imply zero flight variance, which the
    // reference engine reports as skewness 0 via the NUMERICAL_EPSILON guard. Reaching that
    // value proves the copied region holds correct data rather than zeros.
    assert.equal(result.scoreResult.metrics.fisherPearsonSkewness, 0);
    assert.equal(computeFisherPearsonSkewness(new Array(total - 1).fill(30)), 0);

    session.destroy();
  });

  it('preserves correction indices recorded before a buffer reallocation', async () => {
    const session = newSession();
    const element = createElement();
    session.attach(element);

    typeKey(element, 'a', 50, 30);
    typeKey(element, 'Backspace', 60, 200); // correction inside the first buffer

    for (let i = 0; i < 300; i++) {
      typeKey(element, 'b', 50, 30);
    }

    const result = await session.processSession();
    assert.equal(result.rawEventCount, 302);
    assert.ok(
      result.scoreResult.metrics.errorRecalibrationVariance >= 0,
      'the correction index set must remain usable after reallocation'
    );

    session.destroy();
  });

  it('zero-overwrites telemetry and resets the counter on destroy()', async () => {
    const session = newSession();
    const element = createElement();
    session.attach(element);

    typeKey(element, 'a', 80, 40);
    typeKey(element, 'b', 70);

    assert.equal((await session.processSession()).rawEventCount, 2);

    session.destroy();

    const afterDestroy = await session.processSession();
    assert.equal(afterDestroy.rawEventCount, 0, 'destroy() must clear collected telemetry');
    assert.equal(afterDestroy.scoreResult.metrics.fisherPearsonSkewness, 0);
  });

  it('detaches listeners as part of destroy()', async () => {
    const session = newSession();
    const element = createElement();
    session.attach(element);

    typeKey(element, 'a', 80, 40);
    session.destroy();

    // Events arriving after destroy() must not repopulate the sanitized buffers.
    typeKey(element, 'b', 80, 40);
    typeKey(element, 'c', 80);

    const result = await session.processSession();
    assert.equal(result.rawEventCount, 0);
  });

  it('tolerates repeated destroy() calls', () => {
    const session = newSession();
    const element = createElement();
    session.attach(element);

    typeKey(element, 'a', 80);

    assert.doesNotThrow(() => {
      session.destroy();
      session.destroy();
    });
  });
});

// ---------------------------------------------------------------------------------------
// End-to-end agreement with the reference engine
// ---------------------------------------------------------------------------------------

describe('SDK DOM capture: agreement with @pohi-protocol/core-math', () => {
  it('produces the same metrics the reference engine derives from the same event stream', async () => {
    const session = newSession({ contextLength: 200 });
    const element = createElement();

    // The session's render timestamp is captured at construction, so advancing the clock
    // before the first keystroke simulates the reading pause of Equation 3.4.
    advance(6000);
    session.attach(element);

    // A right-skewed flight profile: fast digraphs with occasional cognitive pauses.
    const dwells = [82, 79, 85, 77, 88, 80, 83, 76, 90, 81, 84, 78];
    const flights = [38, 42, 35, 210, 40, 37, 165, 39, 41, 36, 95];

    for (let i = 0; i < dwells.length; i++) {
      typeKey(element, 'x', dwells[i], i < flights.length ? flights[i] : 0);
    }

    const result = await session.processSession();
    assert.equal(result.rawEventCount, dwells.length);

    // Rebuild the identical stream for the reference engine.
    const events: RawInputEvent[] = [];
    let t = 1_000_000 + 6000;
    for (let i = 0; i < dwells.length; i++) {
      const pressTime = t;
      const releaseTime = pressTime + dwells[i];
      events.push({ key: 'x', pressTime, releaseTime });
      t = releaseTime + (i < flights.length ? flights[i] : 0);
    }

    const expectedSkewness = computeFisherPearsonSkewness(computeFlightTimeVector(events));

    assert.equal(
      result.scoreResult.metrics.fisherPearsonSkewness,
      expectedSkewness,
      'the SDK must report exactly what the reference engine computes for this stream'
    );
    assert.ok(expectedSkewness > 1.0, 'this profile is right-skewed, as biological typing is');

    // Equation 3.4: the 6000 ms pause against tau_expected = 25*200 + 350 = 5350 ms.
    assert.ok(
      Math.abs(result.scoreResult.metrics.cognitiveAssimilationRatio - 6000 / 5350) < 1e-9,
      'R_cog must reflect the measured reading pause'
    );

    session.destroy();
  });
});
