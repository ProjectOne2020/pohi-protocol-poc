# PSP-0004: Variable Session Length

| Field | Value |
| :--- | :--- |
| **Status** | Draft — implemented pending ratification |
| **Affects** | Equations 3.1 and 3.2, circuit private witness signals, [PROTOCOL.md](../PROTOCOL.md) §3.2 |
| **Author** | Remediation of circuit soundness defects, 2026-07-29 |

---

## 1. Problem Statement

Equation 3.1 defines the telemetry vectors for a session of $n$ characters:

$$\mathbf{D} = [d_1, \dots, d_n]^T \in \mathbb{R}^n, \qquad \mathbf{F} = [f_1, \dots, f_{n-1}]^T \in \mathbb{R}^{n-1}$$

and Equation 3.2 carries the explicit assumption "$n \ge 10$ flight events to ensure statistical validity of third-moment estimations". Session length is thus a **variable of the model**, and the $n \ge 10$ condition is only meaningful if $n$ can vary.

The $N = 30$ figure in whitepaper Ch.5 Section 5.1 is a constraint-count sizing example ("Total circuit constraint count for an $n=30$ character input session"), not a mandate that sessions contain exactly 30 keystrokes.

The initial circuit was compiled at exactly `PoHIMain(30)` with no length signal, which meant every session had to contain precisely 30 events. This is inconsistent with Equation 3.1 and makes the Equation 3.2 minimum-sample assumption unrepresentable. It also conflicts with the threat model: vector 1 (Raw API Injection) is mitigated by "$n = 0$ produces score $S_{PoHI} = 0.0$" and vector 5 (Clipboard Paste) by "$n = 1$ triggers a score penalty" — neither of which the circuit could express.

## 2. Proposed Modification

1. Add a private witness signal `event_count` carrying the session length $n$.
2. Constrain $1 \le n \le \texttt{MAX\_EVENTS}$, with `MAX_EVENTS` the compiled capacity.
3. Derive a prefix activity mask $\texttt{active}[i] = (i < n-1)$ **in-circuit** from `event_count`, rather than accepting it as a witness, so a prover cannot present an activity pattern inconsistent with the length it declares.
4. Mask every accumulator in Equations 3.1, 3.2 and 3.5 so that padding entries contribute exactly zero.
5. Implement the Equation 3.2 minimum-sample condition: when the flight count is below 10, $S_F$ is suppressed to $0$, matching `MIN_SAMPLE_SIZE_SKEWNESS` in `packages/core-math/src/constants.ts`.

### 2.1 Why the Mask Is Derived, Not Supplied

Masking is security-critical. Deviations are computed as $\texttt{active}[i] \cdot (F_i - \bar{F})$ rather than $F_i - \bar{F}$: without masking, each unused slot would contribute a spurious deviation of $-\bar{F}$ to the second and third moments, silently corrupting $S_F$ for every session shorter than capacity.

If the mask were prover-supplied, a prover could activate a high-variance padding slot while declaring a short session, manufacturing skewness. Deriving it from `event_count` with a comparator chain removes that freedom entirely.

## 3. Privacy Analysis

`event_count` is a **private** witness signal, not a public input.

The number of keystrokes is a proxy for message length, which is user content. Publishing it would weaken the air-gap guarantee of [PRIVACY.md](../PRIVACY.md) §1, which states that zero raw timestamps, keystroke characters, or timing vectors leave the client. Session length is in the same category.

Keeping it private costs nothing: the $n \ge 10$ rule and all length-dependent behaviour are enforced **inside** the circuit, and the verifier learns only $b_{valid}$, exactly as before.

## 4. Security Trade-off Analysis

**Gained.** Equation 3.1 is implemented as specified. Equation 3.2's stated assumption becomes an enforced constraint. Short-session threat vectors (1 and 5) become expressible. The protocol becomes usable for real messages, which are not uniformly 30 characters.

**Cost.** Constraint count rises from 11,170 to 12,481 (+11.7%), from the comparator chain deriving the mask and the additional masking multiplications. This remains below the ~14,250 figure in whitepaper Ch.5 Section 5.1.

**Capacity.** `MAX_EVENTS` remains a compile-time constant: an R1CS circuit has fixed structure, so the *capacity* cannot be dynamic even though the *occupancy* now can. Sessions longer than capacity must be truncated by the SDK, which is a behaviour the SDK must document. Raising capacity requires recompilation and a new trusted setup ceremony ([CEREMONY.md](../CEREMONY.md) §4).

**Interaction with scoring.** Suppressing $S_F$ to $0$ for short sessions yields $\Phi(0) = \sigma(-2) = 0.119$, a low but non-zero motor confidence. Combined with the other components this correctly penalises very short sessions without hard-failing them, consistent with the "degrades gracefully under shorter input sessions" statement in [BEHAVIORAL_MODEL.md](../BEHAVIORAL_MODEL.md) §4.

## 5. Implementation

- `circuits/pohi_main.circom` — `event_count` input, range constraints, `flight_count` derivation.
- `circuits/moments.circom` — `PrefixMask` template; masked accumulators in `FlightSkewness` and `SelectedVariance`; `MIN_SAMPLES` guard.
- `circuits/tests/circuit.test.mjs` — "Variable session length" suite: partial-fill fidelity, minimum-sample suppression, padding independence, and capacity/zero-length rejection.

## 6. Documentation Impact

- [PROTOCOL.md](../PROTOCOL.md) §3.2 and §3.3 — signal and domain constraints.
- [CRYPTOGRAPHY.md](../CRYPTOGRAPHY.md) §2.4 — measured constraint count updated.

## 7. Ratification

Requires Protocol Steering Committee review per [GOVERNANCE.md](../../GOVERNANCE.md) §3. **Not yet ratified.**
