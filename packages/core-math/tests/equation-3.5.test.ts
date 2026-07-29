/**
 * Unit Tests for Equation 3.5 (Error Recalibration Variance)
 *
 * Tests computeErrorRecalibrationVariance function.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeErrorRecalibrationVariance } from '../src/index.js';

describe('Equation 3.5: Error Recalibration Variance (computeErrorRecalibrationVariance)', () => {
  it('should return 0.0 when flightTimes array is empty', () => {
    const result = computeErrorRecalibrationVariance([], [0, 1]);
    assert.equal(result, 0.0);
  });

  it('should return 0.0 when backspaceIndices array is empty', () => {
    const flightTimes = [50, 60, 70, 80];
    const result = computeErrorRecalibrationVariance(flightTimes, []);
    assert.equal(result, 0.0);
  });

  it('should return 0.0 for a single valid backspace index (variance of 1 element = 0)', () => {
    const flightTimes = [40, 80, 120, 160];
    const result = computeErrorRecalibrationVariance(flightTimes, [2]);
    assert.equal(result, 0.0);
  });

  it('should calculate exact variance for multiple valid backspace indices', () => {
    const flightTimes = [50, 100, 150, 300, 200];
    const backspaceIndices = [1, 3];
    const result = computeErrorRecalibrationVariance(flightTimes, backspaceIndices);
    assert.equal(result, 10000);
  });

  it('should calculate variance across all indices when all are selected', () => {
    const flightTimes = [10, 20, 30];
    const backspaceIndices = [0, 1, 2];
    const result = computeErrorRecalibrationVariance(flightTimes, backspaceIndices);
    assert.equal(result, 200 / 3);
  });

  it('should return 0.0 for repeated flight time values (zero variance)', () => {
    const flightTimes = [150, 150, 150, 150];
    const backspaceIndices = [0, 2, 3];
    const result = computeErrorRecalibrationVariance(flightTimes, backspaceIndices);
    assert.equal(result, 0.0);
  });

  it('should return 0.0 when all provided indices are negative (invalid)', () => {
    const flightTimes = [100, 200, 300];
    const backspaceIndices = [-1, -5];
    const result = computeErrorRecalibrationVariance(flightTimes, backspaceIndices);
    assert.equal(result, 0.0);
  });

  it('should return 0.0 when all provided indices exceed flightTimes bounds', () => {
    const flightTimes = [100, 200, 300];
    const backspaceIndices = [3, 10, 99];
    const result = computeErrorRecalibrationVariance(flightTimes, backspaceIndices);
    assert.equal(result, 0.0);
  });

  it('should filter out invalid indices and calculate variance strictly over valid indices', () => {
    const flightTimes = [50, 100, 150, 300];
    const backspaceIndices = [-1, 1, 3, 10];
    const result = computeErrorRecalibrationVariance(flightTimes, backspaceIndices);
    assert.equal(result, 10000);
  });

  it('should calculate accurate variance with floating-point flight times', () => {
    const flightTimes = [10.5, 20.5, 30.5];
    const backspaceIndices = [0, 1];
    const result = computeErrorRecalibrationVariance(flightTimes, backspaceIndices);
    assert.equal(result, 25.0);
  });

  it('should handle large numerical values without loss of precision', () => {
    const flightTimes = [1000000, 3000000, 500000];
    const backspaceIndices = [0, 1];
    const result = computeErrorRecalibrationVariance(flightTimes, backspaceIndices);
    assert.equal(result, 1e12);
  });

  it('should preserve input immutability and not mutate input arrays', () => {
    const flightTimes = Object.freeze([100, 200, 300]);
    const backspaceIndices = Object.freeze([0, 2]);
    const result = computeErrorRecalibrationVariance(flightTimes, backspaceIndices);
    assert.equal(result, 10000);
    assert.equal(flightTimes.length, 3);
    assert.equal(backspaceIndices.length, 2);
  });
});
