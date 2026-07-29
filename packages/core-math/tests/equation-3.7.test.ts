/**
 * Unit Tests for Equation 3.7 (Composite PoHI Score and Validation Assertion)
 *
 * Tests computePoHIScore function.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computePoHIScore,
  PARAM_ESCROW_ALPHA,
  PARAM_ESCROW_BETA,
  PARAM_ESCROW_GAMMA,
  PARAM_ESCROW_THETA,
  PARAM_MERCHANT_ALPHA,
  PARAM_MERCHANT_BETA,
  PARAM_MERCHANT_GAMMA,
  PARAM_MERCHANT_THETA,
} from '../dist/index.js';
import type {
  ExtractedFeatureMetrics,
  DomainParameterCalibration,
} from '../dist/index.js';

describe('Equation 3.7: Composite PoHI Score Computation (computePoHIScore)', () => {
  it('should return score equal to 0.5 when metrics match reference midpoints (Phi = 0.5, Psi = 0.5, Omega = 0.5)', () => {
    const metrics: ExtractedFeatureMetrics = {
      fisherPearsonSkewness: 1.0,
      cognitiveAssimilationRatio: 1.0,
      errorRecalibrationVariance: 50.0,
    };
    const calibration: DomainParameterCalibration = {
      alpha: PARAM_ESCROW_ALPHA,
      beta: PARAM_ESCROW_BETA,
      gamma: PARAM_ESCROW_GAMMA,
      theta: PARAM_ESCROW_THETA,
    };

    const result = computePoHIScore(metrics, calibration);

    assert.equal(result.compositeScore, 0.5);
    assert.equal(result.isValid, false);
  });

  it('should evaluate isValid = true when compositeScore >= theta', () => {
    const metrics: ExtractedFeatureMetrics = {
      fisherPearsonSkewness: 3.5,
      cognitiveAssimilationRatio: 2.0,
      errorRecalibrationVariance: 150.0,
    };
    const calibration: DomainParameterCalibration = {
      alpha: PARAM_ESCROW_ALPHA,
      beta: PARAM_ESCROW_BETA,
      gamma: PARAM_ESCROW_GAMMA,
      theta: PARAM_ESCROW_THETA,
    };

    const result = computePoHIScore(metrics, calibration);

    assert.ok(result.compositeScore >= calibration.theta, `Expected score >= 0.85, got ${result.compositeScore}`);
    assert.equal(result.isValid, true);
  });

  it('should evaluate isValid = false when compositeScore < theta', () => {
    const metrics: ExtractedFeatureMetrics = {
      fisherPearsonSkewness: 0.0,
      cognitiveAssimilationRatio: 0.1,
      errorRecalibrationVariance: 0.0,
    };
    const calibration: DomainParameterCalibration = {
      alpha: PARAM_MERCHANT_ALPHA,
      beta: PARAM_MERCHANT_BETA,
      gamma: PARAM_MERCHANT_GAMMA,
      theta: PARAM_MERCHANT_THETA,
    };

    const result = computePoHIScore(metrics, calibration);

    assert.ok(result.compositeScore < calibration.theta);
    assert.equal(result.isValid, false);
  });

  it('should compute exact weighted linear combination of normalized components', () => {
    const metrics: ExtractedFeatureMetrics = {
      fisherPearsonSkewness: 1.5,
      cognitiveAssimilationRatio: 1.2,
      errorRecalibrationVariance: 60.0,
    };
    const calibration: DomainParameterCalibration = {
      alpha: 0.50,
      beta: 0.30,
      gamma: 0.20,
      theta: 0.70,
    };

    const result = computePoHIScore(metrics, calibration);

    const expectedScore =
      calibration.alpha * result.normalizedComponents.phi +
      calibration.beta * result.normalizedComponents.psi +
      calibration.gamma * result.normalizedComponents.omega;

    assert.equal(result.compositeScore, expectedScore);
    assert.equal(result.isValid, expectedScore >= calibration.theta);
  });

  it('should ensure compositeScore remains strictly bounded within interval (0, 1]', () => {
    const metrics: ExtractedFeatureMetrics = {
      fisherPearsonSkewness: 50.0,
      cognitiveAssimilationRatio: 50.0,
      errorRecalibrationVariance: 1000.0,
    };
    const calibration: DomainParameterCalibration = {
      alpha: 0.333,
      beta: 0.333,
      gamma: 0.334,
      theta: 0.90,
    };

    const result = computePoHIScore(metrics, calibration);

    assert.ok(result.compositeScore > 0.0 && result.compositeScore <= 1.0);
  });

  it('should preserve input immutability and return full result object structure', () => {
    const metrics: ExtractedFeatureMetrics = Object.freeze({
      fisherPearsonSkewness: 1.0,
      cognitiveAssimilationRatio: 1.0,
      errorRecalibrationVariance: 50.0,
    });
    const calibration: DomainParameterCalibration = Object.freeze({
      alpha: 0.40,
      beta: 0.40,
      gamma: 0.20,
      theta: 0.75,
    });

    const result = computePoHIScore(metrics, calibration);

    assert.ok('compositeScore' in result);
    assert.ok('isValid' in result);
    assert.ok('metrics' in result);
    assert.ok('normalizedComponents' in result);
    assert.ok('calibration' in result);

    assert.equal(result.metrics.fisherPearsonSkewness, 1.0);
    assert.equal(result.calibration.theta, 0.75);
  });
});
