# PSP-0003: Backspace Selector Witness Signal for Equation 3.5

| Field | Value |
| :--- | :--- |
| **Status** | Draft — implemented pending ratification |
| **Affects** | Equation 3.5, circuit private witness signals, [PROTOCOL.md](../PROTOCOL.md) §3.2, [CRYPTOGRAPHY.md](../CRYPTOGRAPHY.md) §2.2 |
| **Author** | Remediation of circuit soundness defects, 2026-07-29 |

---

## 1. Problem Statement

Equation 3.5 defines the error recalibration variance over an index set:

$$\sigma^2_{err} = \frac{1}{|\mathcal{I}_{back}|} \sum_{i \in \mathcal{I}_{back}} \left( f_i - \bar{f}_{\mathcal{I}_{back}} \right)^2$$

where $\mathcal{I}_{back} \subset \{1, \dots, n-1\}$ is "the index set of flight times immediately adjacent to backspace events" (whitepaper Ch.3 Section 3.4).

The documented private witness comprises only `flight_times[N-1]`, `dwell_times[N]` and `tau_real`. None of these carries $\mathcal{I}_{back}$. The key identities $k_i$ of the event stream $\mathcal{E}$, from which backspace positions would be recovered, are deliberately excluded from the witness — and rightly so, since transmitting them would enable text reconstruction, which [PRIVACY.md](../PRIVACY.md) §1 exists to prevent.

**Equation 3.5 is therefore not expressible in the circuit as the witness is currently specified.** The initial implementation silently omitted it and substituted `dwell_times[0]` as the $\Omega$ input, which corresponds to no equation in the research.

## 2. Proposed Modification

Add a private witness signal encoding set membership as a boolean mask:

```
signal input backspace_selector[N-1];   // 1 when i is in I_back, else 0
```

with the constraints:
- $\texttt{selector}[i] \cdot (1 - \texttt{selector}[i]) = 0$ for all $i$ — booleanity.
- $\texttt{selector}[i] \cdot \texttt{active}[i]$ — intersected with the session activity mask (see [PSP-0004](PSP-0004-variable-session-length.md)) so a padding slot cannot be marked as a correction event.

A boolean mask is the standard R1CS encoding of set membership: an arithmetic circuit has fixed structure and cannot index a variable-length set, so the set is represented by its indicator vector over the fixed domain.

## 3. Security Trade-off Analysis

**Privacy.** The mask reveals the **positions of corrections** within the session, but not the key identities. This is strictly less information than the key stream $k_i$, and is never transmitted: it is a private witness, so under the zero-knowledge property of Groth16 (Theorem 7.1) it does not cross the privacy air-gap. The proof reveals only $b_{valid}$.

**Residual leakage.** None across the air-gap. Inside the client the mask lives in the same volatile memory as the telemetry it derives from and is subject to the same zero-overwrite sanitization ([ARCHITECTURE.md](../ARCHITECTURE.md) §6.3).

**Soundness.** The mask is prover-supplied, so a prover can claim an arbitrary correction pattern. This does **not** create a new attack: a prover who fabricates the mask can equally fabricate the flight times themselves. The mask is no weaker than the witness it accompanies, and the constraints above prevent only the degenerate cases (non-boolean entries, corrections in unused slots).

> [!IMPORTANT]
> This proposal does not address, and must not be read as addressing, the general question of whether prover-supplied telemetry corresponds to genuine physical input. That is a protocol-level limitation affecting the entire private witness, not a property of this signal.

**Alternative considered and rejected.** Deriving $\mathcal{I}_{back}$ in-circuit from the key stream would require admitting $k_i$ into the witness, reintroducing the text-reconstruction risk that the privacy architecture is designed to eliminate. The mask is the minimal disclosure sufficient to evaluate Equation 3.5.

## 4. Implementation

- `circuits/pohi_main.circom` — `backspace_selector` private input.
- `circuits/moments.circom` — `SelectedVariance` template implementing Equation 3.5 over the mask.
- `circuits/tests/circuit.test.mjs` — fidelity test against `computeErrorRecalibrationVariance`, and a booleanity regression test.

## 5. Documentation Impact

- [PROTOCOL.md](../PROTOCOL.md) §3.2 and §3.3 — signal and its domain constraint.
- [CRYPTOGRAPHY.md](../CRYPTOGRAPHY.md) §2.2 — same.

## 6. Ratification

Requires Protocol Steering Committee review per [GOVERNANCE.md](../../GOVERNANCE.md) §3. **Not yet ratified.**
