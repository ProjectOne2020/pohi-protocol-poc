/**
 * Unit Tests for Equation 3.1 (Neuromuscular Vector Extraction)
 *
 * Tests computeDwellTimeVector and computeFlightTimeVector functions.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDwellTimeVector,
  computeFlightTimeVector,
  RawInputEvent,
} from '../src/index.js';

describe('Equation 3.1: Dwell Time Vector Extraction (computeDwellTimeVector)', () => {
  it('should return an empty array for an empty input sequence', () => {
    const events: readonly RawInputEvent[] = [];
    const result = computeDwellTimeVector(events);
    assert.deepEqual(result, []);
  });

  it('should calculate exact dwell time for a single event', () => {
    const events: readonly RawInputEvent[] = [
      { key: 'a', pressTime: 100, releaseTime: 180 },
    ];
    const result = computeDwellTimeVector(events);
    assert.deepEqual(result, [80]);
  });

  it('should calculate exact dwell times for two events', () => {
    const events: readonly RawInputEvent[] = [
      { key: 'a', pressTime: 100, releaseTime: 180 },
      { key: 'b', pressTime: 220, releaseTime: 290 },
    ];
    const result = computeDwellTimeVector(events);
    assert.deepEqual(result, [80, 70]);
  });

  it('should calculate exact dwell times for multiple events', () => {
    const events: readonly RawInputEvent[] = [
      { key: 'h', pressTime: 1000, releaseTime: 1085 },
      { key: 'e', pressTime: 1120, releaseTime: 1205 },
      { key: 'l', pressTime: 1240, releaseTime: 1310 },
      { key: 'l', pressTime: 1345, releaseTime: 1420 },
      { key: 'o', pressTime: 1470, releaseTime: 1555 },
    ];
    const result = computeDwellTimeVector(events);
    assert.deepEqual(result, [85, 85, 70, 75, 85]);
  });

  it('should handle constant dwell durations across sequence', () => {
    const events: readonly RawInputEvent[] = [
      { key: 'x', pressTime: 500, releaseTime: 600 },
      { key: 'y', pressTime: 700, releaseTime: 800 },
      { key: 'z', pressTime: 900, releaseTime: 1000 },
    ];
    const result = computeDwellTimeVector(events);
    assert.deepEqual(result, [100, 100, 100]);
  });

  it('should handle variable dwell durations', () => {
    const events: readonly RawInputEvent[] = [
      { key: '1', pressTime: 0, releaseTime: 42 },
      { key: '2', pressTime: 100, releaseTime: 215 },
      { key: '3', pressTime: 300, releaseTime: 305 },
    ];
    const result = computeDwellTimeVector(events);
    assert.deepEqual(result, [42, 115, 5]);
  });

  it('should handle zero dwell time when press and release timestamps are identical', () => {
    const events: readonly RawInputEvent[] = [
      { key: 'a', pressTime: 500, releaseTime: 500 },
    ];
    const result = computeDwellTimeVector(events);
    assert.deepEqual(result, [0]);
  });

  it('should handle large timestamp values accurately with millisecond precision', () => {
    const events: readonly RawInputEvent[] = [
      { key: 'k', pressTime: 1722211200000, releaseTime: 1722211200095.5 },
    ];
    const result = computeDwellTimeVector(events);
    assert.deepEqual(result, [95.5]);
  });

  it('should preserve input immutability and not mutate the input events array', () => {
    const events: readonly RawInputEvent[] = Object.freeze([
      Object.freeze({ key: 'a', pressTime: 100, releaseTime: 150 }),
      Object.freeze({ key: 'b', pressTime: 200, releaseTime: 260 }),
    ]);
    const result = computeDwellTimeVector(events);
    assert.deepEqual(result, [50, 60]);
    assert.equal(events.length, 2);
    assert.equal(events[0].pressTime, 100);
  });
});

describe('Equation 3.1: Flight Time Vector Extraction (computeFlightTimeVector)', () => {
  it('should return an empty array for an empty input sequence', () => {
    const events: readonly RawInputEvent[] = [];
    const result = computeFlightTimeVector(events);
    assert.deepEqual(result, []);
  });

  it('should return an empty array for a single event (vector dimension n-1 = 0)', () => {
    const events: readonly RawInputEvent[] = [
      { key: 'a', pressTime: 100, releaseTime: 180 },
    ];
    const result = computeFlightTimeVector(events);
    assert.deepEqual(result, []);
  });

  it('should calculate exact flight time for two events', () => {
    const events: readonly RawInputEvent[] = [
      { key: 'a', pressTime: 100, releaseTime: 180 },
      { key: 'b', pressTime: 220, releaseTime: 290 },
    ];
    const result = computeFlightTimeVector(events);
    assert.deepEqual(result, [40]);
  });

  it('should calculate exact flight times for multiple events (n-1 output items)', () => {
    const events: readonly RawInputEvent[] = [
      { key: 'h', pressTime: 1000, releaseTime: 1085 },
      { key: 'e', pressTime: 1120, releaseTime: 1205 },
      { key: 'l', pressTime: 1240, releaseTime: 1310 },
      { key: 'l', pressTime: 1345, releaseTime: 1420 },
      { key: 'o', pressTime: 1470, releaseTime: 1555 },
    ];
    const result = computeFlightTimeVector(events);
    assert.deepEqual(result, [35, 35, 35, 50]);
  });

  it('should handle constant flight times', () => {
    const events: readonly RawInputEvent[] = [
      { key: 'a', pressTime: 100, releaseTime: 150 },
      { key: 'b', pressTime: 200, releaseTime: 250 },
      { key: 'c', pressTime: 300, releaseTime: 350 },
    ];
    const result = computeFlightTimeVector(events);
    assert.deepEqual(result, [50, 50]);
  });

  it('should handle variable flight times', () => {
    const events: readonly RawInputEvent[] = [
      { key: 'a', pressTime: 100, releaseTime: 150 },
      { key: 'b', pressTime: 180, releaseTime: 230 },
      { key: 'c', pressTime: 330, releaseTime: 400 },
    ];
    const result = computeFlightTimeVector(events);
    assert.deepEqual(result, [30, 100]);
  });

  it('should handle zero flight time when press time equals previous release time', () => {
    const events: readonly RawInputEvent[] = [
      { key: 'a', pressTime: 100, releaseTime: 180 },
      { key: 'b', pressTime: 180, releaseTime: 250 },
    ];
    const result = computeFlightTimeVector(events);
    assert.deepEqual(result, [0]);
  });

  it('should handle large timestamp values with millisecond precision', () => {
    const events: readonly RawInputEvent[] = [
      { key: 'a', pressTime: 1722211200000, releaseTime: 1722211200080 },
      { key: 'b', pressTime: 1722211200125.75, releaseTime: 1722211200200 },
    ];
    const result = computeFlightTimeVector(events);
    assert.deepEqual(result, [45.75]);
  });

  it('should preserve input immutability and ordered event sequence execution', () => {
    const events: readonly RawInputEvent[] = Object.freeze([
      Object.freeze({ key: '1', pressTime: 0, releaseTime: 50 }),
      Object.freeze({ key: '2', pressTime: 90, releaseTime: 140 }),
      Object.freeze({ key: '3', pressTime: 200, releaseTime: 250 }),
    ]);
    const result = computeFlightTimeVector(events);
    assert.deepEqual(result, [40, 60]);
    assert.equal(events.length, 3);
  });
});
