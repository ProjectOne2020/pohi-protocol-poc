/**
 * Unit Tests for Equation 3.3 (Expected Biological Assimilation Latency)
 *
 * Tests computeExpectedCognitiveLatency function.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeExpectedCognitiveLatency,
  LAMBDA_BIO,
  DELTA_COGNITIVE,
} from '../dist/index.js';

describe('Equation 3.3: Expected Cognitive Latency (computeExpectedCognitiveLatency)', () => {
  it('should return baseline DELTA_COGNITIVE (350 ms) when context length is zero', () => {
    const result = computeExpectedCognitiveLatency(0);
    assert.equal(result, DELTA_COGNITIVE);
    assert.equal(result, 350);
  });

  it('should return baseline DELTA_COGNITIVE (350 ms) when context length is negative', () => {
    const result = computeExpectedCognitiveLatency(-50);
    assert.equal(result, DELTA_COGNITIVE);
    assert.equal(result, 350);
  });

  it('should calculate exact expected latency for context length of one character', () => {
    const result = computeExpectedCognitiveLatency(1);
    const expected = (1 / LAMBDA_BIO) * 1000 + DELTA_COGNITIVE;
    assert.equal(result, 375);
    assert.equal(result, expected);
  });

  it('should calculate exact expected latency for typical context lengths (L_in = 40)', () => {
    const result = computeExpectedCognitiveLatency(40);
    assert.equal(result, 1350);
  });

  it('should calculate exact expected latency for medium context lengths (L_in = 200)', () => {
    const result = computeExpectedCognitiveLatency(200);
    assert.equal(result, 5350);
  });

  it('should calculate exact expected latency for large context lengths (L_in = 1000)', () => {
    const result = computeExpectedCognitiveLatency(1000);
    assert.equal(result, 25350);
  });

  it('should handle fractional context lengths deterministically', () => {
    const result = computeExpectedCognitiveLatency(10.5);
    assert.equal(result, 612.5);
  });

  it('should scale linearly with context length', () => {
    const latency100 = computeExpectedCognitiveLatency(100);
    const latency200 = computeExpectedCognitiveLatency(200);
    assert.equal(latency200 - latency100, (100 / LAMBDA_BIO) * 1000);
    assert.equal(latency200 - latency100, 2500);
  });
});
