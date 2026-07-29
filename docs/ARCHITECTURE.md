# System Architecture Specification

This document details the multi-tier system architecture of the **Proof of Human Intent (PoHI)** protocol. PoHI is engineered as a serverless, decoupled behavioral verification framework designed to enforce a strict privacy air-gap between client telemetry capture and settlement verification.

---

## 1. Architectural Overview & System Tiers

PoHI separates execution into three distinct layers: the **Client Processing Layer**, the **Privacy Air-Gap Boundary**, and the **Settlement & Oracle Layer**.

```mermaid
flowchart TD
    subgraph Tier1["1. Client Layer (Browser / Mobile App volatile memory)"]
        A["Native Event Capture Engine<br/>(onKeyDown, touchstart, touchend)"] --> B["Signal Filtering & Feature Preprocessing<br/>(Dwell D, Flight F, Skewness S_F)"]
        B --> C["Local Sigmoidal Scoring Engine<br/>(Computes S_PoHI via Eq 3.7)"]
        C --> D["WASM ZK-SNARK Witness Generator<br/>(Compiles R1CS constraints)"]
    end

    Tier1 -- "Zero Telemetry Shared<br/>(Only Succinct Proof Z_p)" --> AirGap(("PRIVACY AIR-GAP"))

    subgraph Tier2["2. Settlement Layer (Web2 & Web3 Options)"]
        AirGap --> E["Web2 Stateless ZK-Oracle API<br/>(POST /v1/verify)"]
        AirGap --> F["Web3 EVM Smart Contract<br/>(PoHIEscrow.sol - Precompile 0x08)"]
    end

    E --> G["ECDSA Signed Attestation Token"]
    F --> H["On-Chain Escrow Fund Transfer"]
```

---

## 2. Component Subsystem Breakdown

### 2.1 Client Layer & Monitored Event SDK

The Client Layer executes entirely within the volatile memory space of the user's web browser (`@pohi-protocol/sdk-web`) or native mobile runtime (`@pohi-protocol/sdk-mobile` *[Reserved for future implementation]*).

1. **Event Capture Engine**: Registers native high-precision listeners for `keydown`, `keyup`, `touchstart`, and `touchend` events on target input elements.
2. **Volatile Buffer Security**: Raw event timestamps ($t_{press}, t_{release}$) are held strictly in volatile typed arrays (`Float64Array`).
3. **Zero-Overwrite Sanitization**: Immediately following metric extraction and witness compilation, raw telemetry buffers are zero-overwritten in memory to prevent keylogging or side-channel memory inspection.

### 2.2 Feature Preprocessing Pipeline

1. **Signal Filtering**: Filters out synthetic autorepeat events (e.g., physical key hold-down producing $d_i \approx 0$).
2. **Vector Construction**: Constructs Dwell Vector $\mathbf{D} \in \mathbb{R}^n$ and Flight Vector $\mathbf{F} \in \mathbb{R}^{n-1}$.
3. **Statistical Extraction**: Calculates Fisher-Pearson skewness ($S_F$), cognitive assimilation ratio ($R_{cog}$), and error recalibration variance ($\sigma^2_{err}$).

### 2.3 Local Normalization & Scoring Engine

Applies continuous sigmoidal normalizers $(\Phi, \Psi, \Omega)$ to compute composite scalar $S_{PoHI} \in [0, 1]$:

$$S_{PoHI} = \alpha \cdot \Phi(S_F) + \beta \cdot \Psi(R_{cog}) + \gamma \cdot \Omega(\sigma^2_{err})$$

Evaluates local validity assertion: $b_{valid} = (S_{PoHI} \ge \theta)$.

### 2.4 ZK Circuit Generation Pipeline

If $b_{valid} = 1$, the client invokes its WebAssembly-compiled ZK prover (`snarkjs` / `halo2-wasm`). The prover compiles private telemetry vectors as witness $w$ and outputs a succinct Groth16 proof $Z_p$:

$$Z_p = \text{Prove}(pk, x_{public}, w_{private})$$

Proof size under Groth16 / BN254 is **128 bytes**, ensuring minimal network transmission overhead.

---

## 3. Settlement & Verification Layer

PoHI supports two decoupled settlement interfaces:

```mermaid
sequenceDiagram
    autonumber
    participant Client as Client Application
    participant Prover as WASM ZK Prover
    participant Oracle as Stateless ZK-Oracle REST API
    participant Contract as EVM Smart Contract (PoHIEscrow.sol)

    Client->>Client: Capture input telemetry & compute S_PoHI
    Client->>Prover: Send private witness w & public signals x
    Prover->>Prover: Generate Groth16 proof Z_p (128 bytes)
    Client->>Client: Zero-overwrite volatile memory buffers

    alt Web2 Settlement Route
        Client->>Oracle: POST /v1/verify { session_id, zk_proof, public_signals }
        Oracle->>Oracle: Execute Groth16 verification (< 5 ms)
        Oracle-->>Client: Return Signed Token { is_human: true, oracle_signature }
    else Web3 Settlement Route
        Client->>Contract: releaseFunds(txId, a, b, c, publicInputs)
        Contract->>Contract: Call pairing precompile (0x08) (~210,000 gas)
        Contract-->>Client: Transfer escrow funds
    end
```

### 3.1 Web2 Stateless ZK-Oracle API
Receives proof payload $Z_p$ and public signals $x_{public}$, verifies proof validity in $< 5\text{ ms}$, and returns an ECDSA-signed attestation token.

### 3.2 Web3 On-Chain EVM Smart Contract (`PoHIEscrow.sol`)
Submits proof $Z_p$ to Solidity smart contract. Verifies Groth16 proof directly on-chain using Ethereum's native alt_bn128 pairing precompile at address `0x08` (~210,000 gas).

---

## 4. Repository Package Structure

| Package / Directory | Description | Implementation Status |
| :--- | :--- | :--- |
| `circuits/` | Circom R1CS Groth16 zero-knowledge circuit definitions | Active Development |
| `@pohi-protocol/sdk-web` | TypeScript browser event tracking & WASM witness wrapper | Active Development |
| `@pohi-protocol/sdk-mobile` | Native iOS (Swift) & Android (Kotlin) tracking bindings | Reserved for future implementation |
| `@pohi-protocol/contracts` | Solidity 0.8.20 smart contracts (`PoHIEscrow.sol`) | Active Development |
| `docs/` | Architectural specs, threat models, and mathematical papers | Active Development |

---

## 5. Architectural References

- For execution sequence workflows, see [PROTOCOL.md](PROTOCOL.md).
- For R1CS constraint specifications, see [CRYPTOGRAPHY.md](CRYPTOGRAPHY.md).
- For formal threat vector analyses, see [THREAT_MODEL.md](THREAT_MODEL.md).

---

## 6. Web Client SDK Specification (`@pohi-protocol/sdk-web`)

### 6.1 Public API & Exported Symbols

The `@pohi-protocol/sdk-web` package exports a thread-safe, modular API surface:

```typescript
/**
 * Configuration options for initializing a browser PoHI session.
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
 * Factory function for instantiating a new PoHISession.
 */
export function createPoHISession(config: PoHISDKConfig): PoHISession;
```

### 6.2 Browser Event Registration & Timestamp Semantics

1. **Event Types Captured**:
   - `keydown`: Captures key actuation press timestamp $t_{press,i}$.
   - `keyup`: Captures key release timestamp $t_{release,i}$.
   - `touchstart` / `touchend`: Captures capacitive screen contact start/end timestamps on mobile browsers.
2. **Event Filtering Rules**:
   - Ignores synthetic key events (`event.isComposing === true`).
   - Ignores OS key auto-repeat events (`event.repeat === true`).
   - Filters out non-character modifier keys (`Shift`, `Control`, `Alt`, `Meta`, `CapsLock`), which carry no biomechanical signal. `Backspace` is *not* a modifier and is always captured: it is the trigger for the Equation 3.5 correction index set.
3. **Timestamp Precision & Monotonic Conversion**:
   - Timestamps are acquired via `performance.now()` providing sub-millisecond precision.
   - Absolute epoch millisecond conversion: $t = \text{performance.timeOrigin} + \text{performance.now()}$.

### 6.3 Volatile Memory Management & Zero-Overwrite Sanitization

1. **Typed Array Buffer Isolation**:
   - Raw event timestamps are written directly to pre-allocated `Float64Array` typed memory buffers.
   - Buffers reside exclusively in volatile client browser heap RAM.
2. **Zero-Overwrite Sanitization Protocol**:
   - Immediately following metric calculation and ZK witness compilation, the SDK executes `.fill(0)` across all allocated `Float64Array` memory buffers:
     ```typescript
     pressTimesBuffer.fill(0);
     releaseTimesBuffer.fill(0);
     ```
   - This process guarantees that raw telemetry cannot be extracted by subsequent browser scripts or side-channel inspection.

### 6.4 WebWorker Architecture & `snarkjs` WASM Prover RPC Protocol

1. **Worker Threading Model**:
   - Groth16 proof generation runs inside a dedicated WebWorker thread to preserve main UI thread responsiveness ($60\text{ fps}$).
2. **RPC Message Protocol**:
   - **Worker Request Message**:
     ```typescript
     export interface WorkerProverRequest {
       readonly type: 'GENERATE_PROOF';
       readonly wasmPath: string;
       readonly zkeyPath: string;
       readonly witness: PoHIPrivateWitness;
       readonly publicSignals: PoHIPublicSignals;
     }
     ```
   - **Worker Response Message**:
     ```typescript
     export interface WorkerProverResponse {
       readonly type: 'PROOF_SUCCESS' | 'PROOF_ERROR';
       readonly proof?: Groth16Proof;
       readonly publicSignals?: PoHIPublicSignals;
       readonly error?: string;
     }
     ```
3. **`snarkjs` Integration**:
   - The worker loads `snarkjs.groth16.fullProve(witness, wasmPath, zkeyPath)`.
   - Returns succinct 128-byte proof payload $Z_p$ back to the main thread over `postMessage`.

### 6.5 Interaction with `@pohi-protocol/core-math`

- Telemetry vectors extracted from typed buffers are passed directly to reference mathematical functions:
  - `computeDwellTimeVector(events)` [Eq 3.1]
  - `computeFlightTimeVector(events)` [Eq 3.1]
  - `computeFisherPearsonSkewness(flightTimes)` [Eq 3.2]
  - `computeExpectedCognitiveLatency(contextLength)` [Eq 3.3]
  - `computeCognitiveAssimilationRatio(tauReal, contextLength)` [Eq 3.4]
  - `computeErrorRecalibrationVariance(flightTimes, backspaceIndices)` [Eq 3.5]
  - `computeSigmoidalNormalizedComponents(metrics)` [Eq 3.6]
  - `computePoHIScore(metrics, calibration)` [Eq 3.7]

### 6.6 Resource Cleanup & Error Handling

- Calling `destroy()` on a `PoHISession`:
  1. Detaches all event listeners from the target `HTMLElement`.
  2. Executes zero-overwrite `.fill(0)` memory sanitization across typed arrays.
  3. Invokes `Worker.terminate()` on background ZK prover workers.
  4. Nullifies internal buffer references to trigger garbage collection.

