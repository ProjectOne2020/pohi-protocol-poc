/**
 * Unit Tests for Equation 3.2 (Fisher-Pearson Flight Skewness)
 *
 * Tests computeFisherPearsonSkewness function.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeFisherPearsonSkewness,
  MIN_SAMPLE_SIZE_SKEWNESS,
} from '../src/index.js';

describe('Equation 3.2: Fisher-Pearson Flight Skewness (computeFisherPearsonSkewness)', () => {
  it('should return 0.0 for an empty flight times input array', () => {
    const flightTimes: readonly number[] = [];
    const result = computeFisherPearsonSkewness(flightTimes);
    assert.equal(result, 0.0);
  });

  it('should return 0.0 for a single sample (n = 1)', () => {
    const flightTimes: readonly number[] = [150];
    const result = computeFisherPearsonSkewness(flightTimes);
    assert.equal(result, 0.0);
  });

  it('should return 0.0 when sample size is below MIN_SAMPLE_SIZE_SKEWNESS (n = 9)', () => {
    const flightTimes: readonly number[] = [10, 20, 30, 40, 50, 60, 70, 80, 90];
    assert.equal(flightTimes.length, MIN_SAMPLE_SIZE_SKEWNESS - 1);
    const result = computeFisherPearsonSkewness(flightTimes);
    assert.equal(result, 0.0);
  });

  it('should calculate valid skewness when sample size is exactly MIN_SAMPLE_SIZE_SKEWNESS (n = 10)', () => {
    const flightTimes: readonly number[] = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    assert.equal(flightTimes.length, MIN_SAMPLE_SIZE_SKEWNESS);
    const result = computeFisherPearsonSkewness(flightTimes);
    assert.equal(result, 0.0);
  });

  it('should calculate valid skewness when sample size is above MIN_SAMPLE_SIZE_SKEWNESS (n = 12)', () => {
    const flightTimes: readonly number[] = [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75];
    const result = computeFisherPearsonSkewness(flightTimes);
    assert.equal(result, 0.0);
  });

  it('should return 0.0 for a perfectly symmetric flight time distribution', () => {
    const flightTimes: readonly number[] = [10, 20, 30, 40, 50, 50, 40, 30, 20, 10];
    const result = computeFisherPearsonSkewness(flightTimes);
    assert.equal(Math.abs(result), 0.0);
  });

  it('should return a positive skewness value (S_F > 0) for a right-skewed distribution', () => {
    const flightTimes: readonly number[] = [30, 35, 32, 28, 31, 33, 29, 34, 150, 400];
    const result = computeFisherPearsonSkewness(flightTimes);
    assert.ok(result > 1.0, `Expected positive skewness > 1.0, got ${result}`);
  });

  it('should return a negative skewness value (S_F < 0) for a left-skewed distribution', () => {
    const flightTimes: readonly number[] = [400, 390, 380, 385, 395, 388, 392, 389, 50, 20];
    const result = computeFisherPearsonSkewness(flightTimes);
    assert.ok(result < 0, `Expected negative skewness < 0, got ${result}`);
  });

  it('should return 0.0 for zero variance (constant flight times)', () => {
    const flightTimes: readonly number[] = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100];
    const result = computeFisherPearsonSkewness(flightTimes);
    assert.equal(result, 0.0);
  });

  it('should return 0.0 when variance is below NUMERICAL_EPSILON (m2 < 10^-6)', () => {
    const flightTimes: readonly number[] = [
      100.00001, 100.00002, 100.00001, 100.00002, 100.00001,
      100.00002, 100.00001, 100.00002, 100.00001, 100.00002,
    ];
    const result = computeFisherPearsonSkewness(flightTimes);
    assert.equal(result, 0.0);
  });

  it('should accurately calculate skewness with floating-point millisecond values', () => {
    const flightTimes: readonly number[] = [
      25.4, 30.1, 28.7, 32.2, 27.8, 29.5, 31.0, 26.9, 85.3, 142.6,
    ];
    const result = computeFisherPearsonSkewness(flightTimes);
    assert.ok(!isNaN(result), 'Result should be a valid number');
    assert.ok(isFinite(result), 'Result should be finite');
    assert.ok(result > 0, 'Expected positive skewness');
  });

  it('should handle large numerical values without overflow or loss of accuracy', () => {
    const flightTimes: readonly number[] = [
      100000, 100000, 100000, 100000, 100000,
      100000, 100000, 100000, 100000, 500000,
    ];
    const result = computeFisherPearsonSkewness(flightTimes);
    assert.ok(result > 2.0, `Expected high skewness, got ${result}`);
    assert.ok(isFinite(result), 'Result should be finite');
  });

  it('should preserve input immutability and not mutate the input array', () => {
    const flightTimes: readonly number[] = Object.freeze([
      10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
    ]);
    const result = computeFisherPearsonSkewness(flightTimes);
    assert.equal(result, 0.0);
    assert.equal(flightTimes.length, 10);
    assert.equal(flightTimes[0], 10);
  });
});
