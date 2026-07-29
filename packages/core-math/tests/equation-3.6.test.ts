/**
 * Unit Tests for Equation 3.6 (Sigmoidal Normalization Components)
 *
 * Tests computeSigmoidalNormalizedComponents function.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeSigmoidalNormalizedComponents } from '../dist/index.js';
import type { ExtractedFeatureMetrics } from '../dist/index.js';

describe('Equation 3.6: Sigmoidal Normalization Components (computeSigmoidalNormalizedComponents)', () => {
  it('should return exactly 0.5 for all components when metrics equal reference midpoint values', () => {
    const metrics: ExtractedFeatureMetrics = {
      fisherPearsonSkewness: 1.0,
      cognitiveAssimilationRatio: 1.0,
      errorRecalibrationVariance: 50.0,
    };
    const result = computeSigmoidalNormalizedComponents(metrics);

    assert.equal(result.phi, 0.5);
    assert.equal(result.psi, 0.5);
    assert.equal(result.omega, 0.5);
  });

  it('should return values below 0.5 when metrics are below reference values', () => {
    const metrics: ExtractedFeatureMetrics = {
      fisherPearsonSkewness: 0.0,
      cognitiveAssimilationRatio: 0.0,
      errorRecalibrationVariance: 0.0,
    };
    const result = computeSigmoidalNormalizedComponents(metrics);

    assert.ok(result.phi < 0.5, `Expected phi < 0.5, got ${result.phi}`);
    assert.ok(result.psi < 0.5, `Expected psi < 0.5, got ${result.psi}`);
    assert.ok(result.omega < 0.5, `Expected omega < 0.5, got ${result.omega}`);

    assert.equal(result.phi, 1.0 / (1.0 + Math.exp(2.0)));
    assert.equal(result.psi, 1.0 / (1.0 + Math.exp(3.0)));
    assert.equal(result.omega, 1.0 / (1.0 + Math.exp(2.5)));
  });

  it('should return values above 0.5 when metrics are above reference values', () => {
    const metrics: ExtractedFeatureMetrics = {
      fisherPearsonSkewness: 2.0,
      cognitiveAssimilationRatio: 2.0,
      errorRecalibrationVariance: 100.0,
    };
    const result = computeSigmoidalNormalizedComponents(metrics);

    assert.ok(result.phi > 0.5, `Expected phi > 0.5, got ${result.phi}`);
    assert.ok(result.psi > 0.5, `Expected psi > 0.5, got ${result.psi}`);
    assert.ok(result.omega > 0.5, `Expected omega > 0.5, got ${result.omega}`);

    assert.equal(result.phi, 1.0 / (1.0 + Math.exp(-2.0)));
    assert.equal(result.psi, 1.0 / (1.0 + Math.exp(-3.0)));
    assert.equal(result.omega, 1.0 / (1.0 + Math.exp(-2.5)));
  });

  it('should remain strictly bounded within interval (0, 1) for small metric values', () => {
    const metrics: ExtractedFeatureMetrics = {
      fisherPearsonSkewness: -5.0,
      cognitiveAssimilationRatio: -5.0,
      errorRecalibrationVariance: -100.0,
    };
    const result = computeSigmoidalNormalizedComponents(metrics);

    assert.ok(result.phi > 0.0 && result.phi < 1.0);
    assert.ok(result.psi > 0.0 && result.psi < 1.0);
    assert.ok(result.omega > 0.0 && result.omega < 1.0);
  });

  it('should remain strictly bounded within interval (0, 1] for large metric values', () => {
    const metrics: ExtractedFeatureMetrics = {
      fisherPearsonSkewness: 5.0,
      cognitiveAssimilationRatio: 5.0,
      errorRecalibrationVariance: 200.0,
    };
    const result = computeSigmoidalNormalizedComponents(metrics);

    assert.ok(result.phi > 0.0 && result.phi <= 1.0);
    assert.ok(result.psi > 0.0 && result.psi <= 1.0);
    assert.ok(result.omega > 0.0 && result.omega <= 1.0);
    assert.ok(result.phi > 0.999);
    assert.ok(result.psi > 0.999);
    assert.ok(result.omega > 0.999);
  });

  it('should correctly evaluate mixed low/high metric combinations', () => {
    const metrics: ExtractedFeatureMetrics = {
      fisherPearsonSkewness: 3.5,
      cognitiveAssimilationRatio: 0.2,
      errorRecalibrationVariance: 50.0,
    };
    const result = computeSigmoidalNormalizedComponents(metrics);

    assert.ok(result.phi > 0.9);
    assert.ok(result.psi < 0.1);
    assert.equal(result.omega, 0.5);
  });

  it('should handle floating-point metric values accurately', () => {
    const metrics: ExtractedFeatureMetrics = {
      fisherPearsonSkewness: 1.25,
      cognitiveAssimilationRatio: 1.75,
      errorRecalibrationVariance: 42.5,
    };
    const result = computeSigmoidalNormalizedComponents(metrics);

    const expectedPhi = 1.0 / (1.0 + Math.exp(-2.0 * (1.25 - 1.0)));
    const expectedPsi = 1.0 / (1.0 + Math.exp(-3.0 * (1.75 - 1.0)));
    const expectedOmega = 1.0 / (1.0 + Math.exp(-0.05 * (42.5 - 50.0)));

    assert.equal(result.phi, expectedPhi);
    assert.equal(result.psi, expectedPsi);
    assert.equal(result.omega, expectedOmega);
  });

  it('should preserve input immutability and return correct output structure', () => {
    const metrics: ExtractedFeatureMetrics = Object.freeze({
      fisherPearsonSkewness: 1.5,
      cognitiveAssimilationRatio: 1.2,
      errorRecalibrationVariance: 60.0,
    });
    const result = computeSigmoidalNormalizedComponents(metrics);

    assert.ok('phi' in result);
    assert.ok('psi' in result);
    assert.ok('omega' in result);
    assert.equal(typeof result.phi, 'number');
    assert.equal(typeof result.psi, 'number');
    assert.equal(typeof result.omega, 'number');
    assert.equal(metrics.fisherPearsonSkewness, 1.5);
  });
});
