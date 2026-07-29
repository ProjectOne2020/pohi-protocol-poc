/**
 * @file session.ts
 * @package @pohi-protocol/sdk-web
 *
 * Implementation of PoHISession interface and createPoHISession factory function.
 * Origin: docs/ARCHITECTURE.md Section 6.1 (EB-1.0)
 */

import {
  computeDwellTimeVector,
  computeFlightTimeVector,
  computeFisherPearsonSkewness,
  computeCognitiveAssimilationRatio,
  computeErrorRecalibrationVariance,
  computePoHIScore,
  PARAM_ESCROW_ALPHA,
  PARAM_ESCROW_BETA,
  PARAM_ESCROW_GAMMA,
  PARAM_ESCROW_THETA,
  FIXED_POINT_SCALING_FACTOR,
  type DomainParameterCalibration,
  type ExtractedFeatureMetrics,
  type PoHIScoreResult,
  type RawInputEvent,
} from '@pohi-protocol/core-math';

import type {
  PoHISDKConfig,
  PoHISession,
  PoHISessionResult,
  PoHIProofPayload,
  PoHIPrivateWitness,
  PoHIPublicSignals,
  WorkerProverRequest,
  WorkerProverResponse,
} from './types.js';

import { handleWorkerProverRequest } from './worker.js';

const INITIAL_BUFFER_CAPACITY = 256;

const DEFAULT_CALIBRATION: DomainParameterCalibration = {
  alpha: PARAM_ESCROW_ALPHA,
  beta: PARAM_ESCROW_BETA,
  gamma: PARAM_ESCROW_GAMMA,
  theta: PARAM_ESCROW_THETA,
};

/**
 * Internal implementation of the PoHISession interface.
 * Origin: docs/ARCHITECTURE.md Section 6.1 (EB-1.0)
 */
class PoHISessionImpl implements PoHISession {
  private readonly config: PoHISDKConfig;
  private readonly calibration: DomainParameterCalibration;

  private targetElement: HTMLElement | null = null;
  private isAttached = false;
  private renderTimestamp: number = 0;

  // Volatile typed arrays for high-precision timestamp ingestion
  private pressTimesBuffer: Float64Array;
  private releaseTimesBuffer: Float64Array;
  private keyCodes: string[];
  private eventCount = 0;
  private backspaceIndices: number[] = [];

  // Active key presses tracked by key identifier
  private activePresses: Map<string, number> = new Map();

  private keydownHandler: ((ev: KeyboardEvent) => void) | null = null;
  private keyupHandler: ((ev: KeyboardEvent) => void) | null = null;
  private touchstartHandler: ((ev: TouchEvent) => void) | null = null;
  private touchendHandler: ((ev: TouchEvent) => void) | null = null;

  constructor(config: PoHISDKConfig) {
    this.config = config;
    this.calibration = config.calibration ?? DEFAULT_CALIBRATION;

    this.pressTimesBuffer = new Float64Array(INITIAL_BUFFER_CAPACITY);
    this.releaseTimesBuffer = new Float64Array(INITIAL_BUFFER_CAPACITY);
    this.keyCodes = new Array(INITIAL_BUFFER_CAPACITY);

    const nowOrigin = typeof performance !== 'undefined' ? performance.timeOrigin + performance.now() : Date.now();
    this.renderTimestamp = nowOrigin;
  }

  public attach(element: HTMLElement): void {
    if (this.isAttached && this.targetElement === element) {
      return;
    }
    if (this.isAttached) {
      this.detach();
    }

    this.targetElement = element;
    this.isAttached = true;

    this.keydownHandler = (ev: KeyboardEvent) => this.handleKeyDown(ev);
    this.keyupHandler = (ev: KeyboardEvent) => this.handleKeyUp(ev);
    this.touchstartHandler = () => this.handleTouchStart();
    this.touchendHandler = () => this.handleTouchEnd();

    element.addEventListener('keydown', this.keydownHandler);
    element.addEventListener('keyup', this.keyupHandler);
    element.addEventListener('touchstart', this.touchstartHandler, { passive: true });
    element.addEventListener('touchend', this.touchendHandler, { passive: true });
  }

  public detach(): void {
    if (!this.isAttached || !this.targetElement) {
      return;
    }

    if (this.keydownHandler) {
      this.targetElement.removeEventListener('keydown', this.keydownHandler);
    }
    if (this.keyupHandler) {
      this.targetElement.removeEventListener('keyup', this.keyupHandler);
    }
    if (this.touchstartHandler) {
      this.targetElement.removeEventListener('touchstart', this.touchstartHandler);
    }
    if (this.touchendHandler) {
      this.targetElement.removeEventListener('touchend', this.touchendHandler);
    }

    this.isAttached = false;
    this.targetElement = null;
  }

  public async processSession(): Promise<PoHISessionResult> {
    const events: RawInputEvent[] = [];
    for (let i = 0; i < this.eventCount; i++) {
      events.push({
        key: this.keyCodes[i],
        pressTime: this.pressTimesBuffer[i],
        releaseTime: this.releaseTimesBuffer[i],
      });
    }

    const dwellTimes = computeDwellTimeVector(events);
    const flightTimes = computeFlightTimeVector(events);

    const fisherPearsonSkewness = computeFisherPearsonSkewness(flightTimes);

    const firstPressTime = events.length > 0 ? events[0].pressTime : this.renderTimestamp;
    const tauReal = Math.max(0, firstPressTime - this.renderTimestamp);
    const cognitiveAssimilationRatio = computeCognitiveAssimilationRatio(
      tauReal,
      this.config.contextLength
    );

    const errorRecalibrationVariance = computeErrorRecalibrationVariance(
      flightTimes,
      this.backspaceIndices
    );

    const metrics: ExtractedFeatureMetrics = {
      fisherPearsonSkewness,
      cognitiveAssimilationRatio,
      errorRecalibrationVariance,
    };

    const scoreResult: PoHIScoreResult = computePoHIScore(metrics, this.calibration);

    let proofPayload: PoHIProofPayload | undefined = undefined;

    if (scoreResult.isValid && this.config.wasmPath && this.config.zkeyPath) {
      const publicSignals: PoHIPublicSignals = {
        threshold_theta: Math.round(this.calibration.theta * FIXED_POINT_SCALING_FACTOR),
        context_length: this.config.contextLength,
        session_hash: this.config.sessionHash,
        timestamp: Math.round(Date.now()),
      };

      const witness: PoHIPrivateWitness = {
        flight_times: flightTimes,
        dwell_times: dwellTimes,
        tau_real: tauReal,
      };

      const request: WorkerProverRequest = {
        type: 'GENERATE_PROOF',
        wasmPath: this.config.wasmPath,
        zkeyPath: this.config.zkeyPath,
        witness,
        publicSignals,
      };

      const response: WorkerProverResponse = await handleWorkerProverRequest(request);

      if (response.type === 'PROOF_SUCCESS' && response.proof) {
        proofPayload = {
          session_id: this.config.sessionHash,
          zk_proof: response.proof,
          public_signals: publicSignals,
        };
      }
    }

    return {
      scoreResult,
      proofPayload,
      rawEventCount: this.eventCount,
    };
  }

  public destroy(): void {
    this.detach();

    // Zero-overwrite volatile typed array memory buffers (docs/ARCHITECTURE.md §6.3)
    this.pressTimesBuffer.fill(0);
    this.releaseTimesBuffer.fill(0);

    this.keyCodes = [];
    this.eventCount = 0;
    this.backspaceIndices = [];
    this.activePresses.clear();
  }

  private handleKeyDown(ev: KeyboardEvent): void {
    if (ev.isComposing || ev.repeat) {
      return;
    }

    const key = ev.key;
    const isModifier = ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(key);
    if (isModifier && key !== 'Backspace') {
      return;
    }

    const now = typeof performance !== 'undefined' ? performance.timeOrigin + performance.now() : Date.now();
    this.activePresses.set(key, now);
  }

  private handleKeyUp(ev: KeyboardEvent): void {
    const key = ev.key;
    const pressTime = this.activePresses.get(key);
    if (pressTime === undefined) {
      return;
    }
    this.activePresses.delete(key);

    const releaseTime = typeof performance !== 'undefined' ? performance.timeOrigin + performance.now() : Date.now();

    this.recordEvent(key, pressTime, releaseTime);
  }

  private handleTouchStart(): void {
    const now = typeof performance !== 'undefined' ? performance.timeOrigin + performance.now() : Date.now();
    this.activePresses.set('touch', now);
  }

  private handleTouchEnd(): void {
    const pressTime = this.activePresses.get('touch');
    if (pressTime === undefined) {
      return;
    }
    this.activePresses.delete('touch');

    const releaseTime = typeof performance !== 'undefined' ? performance.timeOrigin + performance.now() : Date.now();
    this.recordEvent('touch', pressTime, releaseTime);
  }

  private recordEvent(key: string, pressTime: number, releaseTime: number): void {
    this.ensureBufferCapacity(this.eventCount + 1);

    const idx = this.eventCount;
    this.pressTimesBuffer[idx] = pressTime;
    this.releaseTimesBuffer[idx] = releaseTime;
    this.keyCodes[idx] = key;

    if (key === 'Backspace') {
      if (idx > 0) {
        this.backspaceIndices.push(idx - 1);
      }
    }

    this.eventCount++;
  }

  private ensureBufferCapacity(required: number): void {
    if (required <= this.pressTimesBuffer.length) {
      return;
    }
    const newCapacity = this.pressTimesBuffer.length * 2;
    const newPresses = new Float64Array(newCapacity);
    const newReleases = new Float64Array(newCapacity);

    newPresses.set(this.pressTimesBuffer);
    newReleases.set(this.releaseTimesBuffer);

    this.pressTimesBuffer.fill(0);
    this.releaseTimesBuffer.fill(0);

    this.pressTimesBuffer = newPresses;
    this.releaseTimesBuffer = newReleases;
  }
}

/**
 * Factory function for instantiating a new PoHISession.
 * Origin: docs/ARCHITECTURE.md Section 6.1 (EB-1.0)
 */
export function createPoHISession(config: PoHISDKConfig): PoHISession {
  return new PoHISessionImpl(config);
}
