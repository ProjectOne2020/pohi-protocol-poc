/**
 * @file types.ts
 * @package @pohi-protocol/sdk-web
 *
 * Formal TypeScript type definitions for Web Client SDK zero-knowledge witness compilation,
 * public signals, proof payload structures, and EB-1.0 API contracts according to docs/ARCHITECTURE.md Section 6.
 */

import type {
  DomainParameterCalibration,
  PoHIScoreResult,
  RawInputEvent,
} from '@pohi-protocol/core-math';

/**
 * Re-export RawInputEvent for SDK consumer convenience.
 */
export type { RawInputEvent };

/**
 * Public signals payload ($x_{public}$) required for ZK-SNARK verification.
 * Documented in docs/CRYPTOGRAPHY.md Section 2.1 and docs/PROTOCOL.md Section 3.1.
 */
export interface PoHIPublicSignals {
  /**
   * Target score threshold theta scaled by 10^6 fixed-point multiplier.
   */
  readonly threshold_theta: number;

  /**
   * Prompt context character length L_in.
   */
  readonly context_length: number;

  /**
   * Cryptographic commitment hash H(Session_ID || User_Address).
   */
  readonly session_hash: string;

  /**
   * Epoch timestamp when session telemetry was completed.
   */
  readonly timestamp: number;
}

/**
 * Private witness payload ($w_{private}$) maintained strictly in client volatile memory.
 * Documented in docs/CRYPTOGRAPHY.md Section 2.2 and docs/PROTOCOL.md Section 3.2.
 */
export interface PoHIPrivateWitness {
  /**
   * Array of private inter-key flight latencies (f_i) in milliseconds.
   */
  readonly flight_times: readonly number[];

  /**
   * Array of private key actuation dwell times (d_i) in milliseconds.
   */
  readonly dwell_times: readonly number[];

  /**
   * Measured cognitive assimilation latency (tau_real) in milliseconds.
   */
  readonly tau_real: number;
}

/**
 * Groth16 zero-knowledge proof payload structure (Z_p).
 * Documented in docs/CRYPTOGRAPHY.md Section 1.1 and docs/ARCHITECTURE.md Section 2.4.
 */
export interface Groth16Proof {
  /**
   * Elliptic curve G1 point A representation.
   */
  readonly pi_a: readonly [string, string, string];

  /**
   * Elliptic curve G2 point B representation.
   */
  readonly pi_b: readonly [
    readonly [string, string],
    readonly [string, string],
    readonly [string, string]
  ];

  /**
   * Elliptic curve G1 point C representation.
   */
  readonly pi_c: readonly [string, string, string];

  /**
   * Proof protocol identifier.
   */
  readonly protocol: string;

  /**
   * Curve geometry identifier (BN254 / alt_bn128).
   */
  readonly curve: string;
}

/**
 * Verification payload submitted over the privacy air-gap to Web2 ZK-Oracle or Web3 settlement.
 * Documented in docs/ARCHITECTURE.md Section 3 and docs/PROTOCOL.md Section 2 (Phase 7).
 */
export interface PoHIProofPayload {
  /**
   * Unique session identifier.
   */
  readonly session_id: string;

  /**
   * Succinct Groth16 zero-knowledge proof payload.
   */
  readonly zk_proof: Groth16Proof | string;

  /**
   * Public signals vector.
   */
  readonly public_signals: PoHIPublicSignals;
}

/**
 * Configuration options for initializing a browser PoHI session.
 * Origin: docs/ARCHITECTURE.md Section 6.1 (EB-1.0)
 */
export interface PoHISDKConfig {
  /** Prompt context character length L_in. */
  readonly contextLength: number;
  /** Cryptographic commitment hash H(Session_ID || User_Address). */
  readonly sessionHash: string;
  /** Optional domain calibration parameters (defaults to Escrow parameters). */
  readonly calibration?: DomainParameterCalibration;
  /** Optional URL path to snarkjs WASM circuit file. */
  readonly wasmPath?: string;
  /** Optional URL path to Groth16 zkey proving key file. */
  readonly zkeyPath?: string;
}

/**
 * Result payload produced upon completing a PoHI browser session evaluation.
 * Origin: docs/ARCHITECTURE.md Section 6.1 (EB-1.0)
 */
export interface PoHISessionResult {
  /** Mathematical score evaluation produced by @pohi-protocol/core-math. */
  readonly scoreResult: PoHIScoreResult;
  /** Optional Groth16 proof payload (populated if isValid === true and prover is configured). */
  readonly proofPayload?: PoHIProofPayload;
  /** Total raw telemetry events recorded during the session. */
  readonly rawEventCount: number;
}

/**
 * Public interface for managing a browser telemetry capture session.
 * Origin: docs/ARCHITECTURE.md Section 6.1 (EB-1.0)
 */
export interface PoHISession {
  /** Attaches native event listeners to target HTML input element. */
  attach(element: HTMLElement): void;
  /** Detaches event listeners without clearing collected telemetry. */
  detach(): void;
  /** Evaluates session score and generates ZK proof if valid. */
  processSession(): Promise<PoHISessionResult>;
  /** Detaches listeners, zero-overwrites volatile memory, and terminates background WebWorkers. */
  destroy(): void;
}

/**
 * WebWorker prover request message payload.
 * Origin: docs/ARCHITECTURE.md Section 6.4 (EB-1.0)
 */
export interface WorkerProverRequest {
  readonly type: 'GENERATE_PROOF';
  readonly wasmPath: string;
  readonly zkeyPath: string;
  readonly witness: PoHIPrivateWitness;
  readonly publicSignals: PoHIPublicSignals;
}

/**
 * WebWorker prover response message payload.
 * Origin: docs/ARCHITECTURE.md Section 6.4 (EB-1.0)
 */
export interface WorkerProverResponse {
  readonly type: 'PROOF_SUCCESS' | 'PROOF_ERROR';
  readonly proof?: Groth16Proof;
  readonly publicSignals?: PoHIPublicSignals;
  readonly error?: string;
}
