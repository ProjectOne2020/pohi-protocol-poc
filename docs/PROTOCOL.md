# PoHI Protocol Specification

This document provides the formal operational specification for the **Proof of Human Intent (PoHI)** protocol execution workflow, covering session initialization, telemetry extraction, local score evaluation, zero-knowledge witness compilation, and settlement verification.

---

## 1. Protocol Execution Phases

The PoHI protocol executes across seven sequential phases:

```mermaid
flowchart TD
    P1["Phase 1: Session Initialization & Context Binding"] --> P2["Phase 2: Client Telemetry Ingestion"]
    P2 --> P3["Phase 3: Biomechanical Metric Extraction"]
    P3 --> P4["Phase 4: Local Score Consolidation & Threshold Check"]
    P4 --> P5["Phase 5: Client ZK-SNARK Proof Generation"]
    P5 --> P6["Phase 6: Volatile Memory Sanitization"]
    P6 --> P7["Phase 7: Settlement & Verification"]
```

---

## 2. Phase-by-Phase Protocol Workflow

### Phase 1: Session Initialization & Context Binding
1. The application context registers a session with a unique cryptographic commitment:
   $$\text{SessionHash} = H(\text{Session\_ID} \parallel \text{User\_Address})$$
2. The prompt context character length $L_{in}$ is recorded.
3. Screen paint timestamp $t_{render}$ is captured via native frame callback (`requestAnimationFrame`).

### Phase 2: Client Telemetry Ingestion
1. Native event listeners log raw keypress sequence $\mathcal{E} = \{(k_i, t_{press,i}, t_{release,i})\}_{i=1}^n$.
2. All timestamps are written exclusively to volatile client typed arrays (`Float64Array`).

### Phase 3: Biomechanical Metric Extraction
From raw event stream $\mathcal{E}$, the client extracts:
- **Dwell Time Vector**: $\mathbf{D} = [d_1, \dots, d_n]^T$ where $d_i = t_{release,i} - t_{press,i}$.
- **Flight Time Vector**: $\mathbf{F} = [f_1, \dots, f_{n-1}]^T$ where $f_i = t_{press,i+1} - t_{release,i}$.
- **Fisher-Pearson Flight Skewness ($S_F$)**:
  $$S_F = \frac{\frac{1}{n-1} \sum_{i=1}^{n-1} (f_i - \bar{f})^3}{\left( \frac{1}{n-1} \sum_{i=1}^{n-1} (f_i - \bar{f})^2 \right)^{3/2}}$$
- **Cognitive Assimilation Ratio ($R_{cog}$)**:
  $$R_{cog} = \frac{t_{press,1} - t_{render}}{\left( \frac{L_{in}}{\lambda_{bio}} + \delta_{cognitive} \right)}$$
- **Stochastic Correction Variance ($\sigma^2_{err}$)**: Computed across flight indices $\mathcal{I}_{back}$ adjacent to backspace deletion events.

### Phase 4: Local Score Consolidation
1. Sigmoidal normalization functions $(\Phi, \Psi, \Omega)$ map domain metrics onto $[0, 1]$.
2. Consolidated score $S_{PoHI}$ is computed:
   $$S_{PoHI} = \alpha \cdot \Phi(S_F) + \beta \cdot \Psi(R_{cog}) + \gamma \cdot \Omega(\sigma^2_{err})$$
3. Evaluate boolean assertion: $b_{valid} = (S_{PoHI} \ge \theta)$.

### Phase 5: Client ZK-SNARK Proof Generation
If $b_{valid} = 1$, the WASM prover compiles the witness into R1CS arithmetic circuit format and computes Groth16 proof $Z_p$:

$$Z_p = \text{Prove}(pk, x_{public}, w_{private})$$

### Phase 6: Volatile Memory Sanitization
Immediately following proof generation, the client SDK executes zero-overwrite memory clearing across all typed arrays containing raw telemetry vectors ($\mathbf{D}, \mathbf{F}$).

### Phase 7: Settlement & Verification
The proof $Z_p$ is submitted to the chosen settlement layer:

```mermaid
sequenceDiagram
    autonumber
    participant App as Client Application
    participant SDK as PoHI Telemetry SDK
    participant Prover as WASM ZK Prover
    participant Oracle as ZK-Oracle API (Web2)
    participant Contract as EVM Contract (Web3)

    App->>SDK: Initialize session (L_in, SessionHash)
    SDK->>SDK: Ingest keypress stream E & compute metrics
    SDK->>SDK: Calculate S_PoHI & check S_PoHI >= theta
    SDK->>Prover: Send private witness w & public signals x
    Prover->>Prover: Compute Groth16 proof Z_p (128 bytes)
    SDK->>SDK: Zero-overwrite volatile memory buffers

    alt Web2 Oracle Verification Route
        App->>Oracle: POST /v1/verify { session_id, zk_proof, public_signals }
        Oracle->>Oracle: Verify proof (< 5 ms execution)
        Oracle-->>App: Return ECDSA signed token
    else Web3 EVM On-Chain Route
        App->>Contract: releaseFunds(txId, a, b, c, publicInputs)
        Contract->>Contract: Call pairing precompile 0x08 (~210,000 gas)
        Contract-->>App: Release escrow funds
    end
```

---

## 3. Signal & Witness Formats

### 3.1 Public Signals ($x_{public}$)
- `threshold_theta`: Fixed-point target score $\theta \times 10^6$.
- `context_length`: Character length $L_{in}$ of prompt context.
- `session_hash`: Commitment $H(\text{Session\_ID} \parallel \text{User\_Address})$.
- `timestamp`: Epoch completion timestamp.

### 3.2 Private Witness ($w_{private}$)
- `flight_times[N-1]`: Inter-key flight latencies in milliseconds.
- `dwell_times[N]`: Key actuation dwell times in milliseconds.
- `tau_real`: Measured cognitive assimilation latency.

---

## 4. Cross-References

- For circuit implementation details, see [CRYPTOGRAPHY.md](CRYPTOGRAPHY.md).
- For behavioral dynamics explanations, see [BEHAVIORAL_MODEL.md](BEHAVIORAL_MODEL.md).
- For multi-tier architecture design, see [ARCHITECTURE.md](ARCHITECTURE.md).
