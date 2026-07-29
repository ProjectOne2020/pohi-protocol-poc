/**
 * Unit Tests for Equation 3.4 (Cognitive Assimilation Ratio)
 *
 * Tests computeCognitiveAssimilationRatio function.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCognitiveAssimilationRatio,
  computeExpectedCognitiveLatency,
} from '../src/index.js';

describe('Equation 3.4: Cognitive Assimilation Ratio (computeCognitiveAssimilationRatio)', () => {
  it('should return 0.0 when tauReal is zero', () => {
    const result = computeCognitiveAssimilationRatio(0, 40);
    assert.equal(result, 0.0);
  });

  it('should return exact 1.0 ratio when tauReal equals tauExpected', () => {
    const contextLength = 40;
    const expectedLatency = computeExpectedCognitiveLatency(contextLength);
    const result = computeCognitiveAssimilationRatio(expectedLatency, contextLength);
    assert.equal(result, 1.0);
  });

  it('should return correct non-dimensional ratio for positive tauReal (R_cog = 2.0)', () => {
    const contextLength = 40;
    const expectedLatency = computeExpectedCognitiveLatency(contextLength);
    const tauReal = expectedLatency * 2;
    const result = computeCognitiveAssimilationRatio(tauReal, contextLength);
    assert.equal(result, 2.0);
  });

  it('should return correct ratio when context length is zero (tauExpected = baseline 350 ms)', () => {
    const result = computeCognitiveAssimilationRatio(350, 0);
    assert.equal(result, 1.0);
  });

  it('should return correct ratio when context length is negative (tauExpected = baseline 350 ms)', () => {
    const result = computeCognitiveAssimilationRatio(700, -10);
    assert.equal(result, 2.0);
  });

  it('should calculate accurate ratio for typical context lengths (L_in = 200, tauReal = 5350)', () => {
    const result = computeCognitiveAssimilationRatio(5350, 200);
    assert.equal(result, 1.0);
  });

  it('should calculate accurate ratio for large context lengths and large tauReal values', () => {
    const result = computeCognitiveAssimilationRatio(50700, 1000);
    assert.equal(result, 2.0);
  });

  it('should handle fractional tauReal and context length values deterministically', () => {
    const tauReal = 675.25;
    const contextLength = 40;
    const result = computeCognitiveAssimilationRatio(tauReal, contextLength);
    assert.equal(result, 675.25 / 1350);
    assert.equal(result, 0.5001851851851852);
  });

  it('should correctly delegate to computeExpectedCognitiveLatency', () => {
    const contextLength = 100;
    const expectedLatency = computeExpectedCognitiveLatency(contextLength);
    const tauReal = 1425;
    const result = computeCognitiveAssimilationRatio(tauReal, contextLength);
    assert.equal(result, tauReal / expectedLatency);
  });
});
