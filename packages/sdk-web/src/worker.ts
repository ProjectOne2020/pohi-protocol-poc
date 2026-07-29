/**
 * @file worker.ts
 * @package @pohi-protocol/sdk-web
 *
 * WebWorker background prover handler for non-blocking snarkjs Groth16 proof generation.
 * Origin: docs/ARCHITECTURE.md Section 6.4 (EB-1.0)
 */

import type { WorkerProverRequest, WorkerProverResponse } from './types.js';

/**
 * Handles incoming RPC messages sent to the WebWorker thread.
 * Documented in docs/ARCHITECTURE.md Section 6.4.
 */
export async function handleWorkerProverRequest(
  request: WorkerProverRequest
): Promise<WorkerProverResponse> {
  if (request.type !== 'GENERATE_PROOF') {
    return {
      type: 'PROOF_ERROR',
      error: `Unsupported request type: ${(request as { type: string }).type}`,
    };
  }

  try {
    let snarkjs: { groth16: { fullProve: (witness: unknown, wasm: string, zkey: string) => Promise<{ proof: unknown; publicSignals: unknown[] }> } };
    if (typeof globalThis !== 'undefined' && (globalThis as unknown as { snarkjs?: unknown }).snarkjs) {
      snarkjs = (globalThis as unknown as { snarkjs: typeof snarkjs }).snarkjs;
    } else {
      // @ts-ignore dynamic import of snarkjs in browser/node environment
      snarkjs = await import('snarkjs');
    }

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      request.witness,
      request.wasmPath,
      request.zkeyPath
    );

    return {
      type: 'PROOF_SUCCESS',
      proof: proof as WorkerProverResponse['proof'],
      publicSignals: {
        threshold_theta: Number(publicSignals[0]),
        context_length: Number(publicSignals[1]),
        session_hash: String(publicSignals[2]),
        timestamp: Number(publicSignals[3]),
      },
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      type: 'PROOF_ERROR',
      error: errorMessage,
    };
  }
}
