# PSP-0001: Domain Calibration Weights as Public Inputs

| Field | Value |
| :--- | :--- |
| **Status** | Draft — implemented pending ratification |
| **Affects** | Equation 3.7, circuit public input signals, [PROTOCOL.md](../PROTOCOL.md) §3, [CRYPTOGRAPHY.md](../CRYPTOGRAPHY.md) §2 |
| **Author** | Remediation of circuit soundness defects, 2026-07-29 |

---

## 1. Problem Statement

Equation 3.7 defines the composite score as a convex combination:

$$S_{PoHI} = \alpha \cdot \Phi(S_F) + \beta \cdot \Psi(R_{cog}) + \gamma \cdot \Omega(\sigma^2_{err}), \qquad \alpha + \beta + \gamma = 1$$

The whitepaper (Ch.9 Section 9.1) specifies $(\alpha, \beta, \gamma)$ per deployment domain, and Ch.9 Section 9.2 derives the economic security argument from the resulting threshold semantics.

Neither the whitepaper nor [PROTOCOL.md](../PROTOCOL.md) §3 nor [CRYPTOGRAPHY.md](../CRYPTOGRAPHY.md) §2 states whether these weights are public inputs, private witness, or circuit constants. The signal schema sections list only `threshold_theta`, `context_length`, `session_hash` and `timestamp` as public, and `flight_times`, `dwell_times` and `tau_real` as private. The weights appear in neither list.

The initial circuit implementation declared them as `signal input` without including them in the `public` list, which in Circom makes them **private witness inputs chosen by the prover**.

## 2. Security Analysis of the Unspecified Behaviour

If the prover selects $(\alpha, \beta, \gamma)$, the threshold assertion $b_{valid} = (S_{PoHI} \ge \theta)$ becomes vacuous. For any session, the prover computes the three normalized components and assigns weight $1$ to whichever is largest:

$$\max_{\alpha+\beta+\gamma=1} S_{PoHI} = \max\left(\Phi(S_F),\ \Psi(R_{cog}),\ \Omega(\sigma^2_{err})\right)$$

An adversary need only make **one** of the three components exceed $\theta$ rather than the weighted combination of all three. Since $\Psi(R_{cog})$ approaches $1$ simply by waiting before typing — a zero-cost action — this reduces the protocol to "the attacker paused before submitting."

This voids:
- The Equation 3.7 threshold semantics.
- The domain calibration matrix of whitepaper Ch.9 Section 9.1, which exists precisely so that different deployments can weight motor versus cognitive evidence differently.
- Proposition 9.1, whose $Cost_{attack}^{PoHI} > VER_{fraud}$ premise assumes the adversary must satisfy all weighted components.

## 3. Proposed Modification

1. Declare `alpha`, `beta` and `gamma` as **public inputs** of the circuit. They express the verifier's security policy and must be visible to, and chosen by, the verifier.
2. Enforce the Equation 3.7 simplex constraint in-circuit:
   $$\alpha + \beta + \gamma = 10^6 \quad \text{(fixed-point)}$$
3. Range-check each weight as non-negative, which combined with the sum constraint confines $(\alpha, \beta, \gamma)$ to the probability simplex exactly as Equation 3.7 requires.

## 4. Security Trade-off Analysis

**Gained.** The threshold assertion regains its meaning. The verifier, not the prover, fixes the security policy. The simplex constraint — stated in the whitepaper but never previously enforced anywhere in the implementation — becomes a cryptographic guarantee rather than a modelling convention.

**Cost.** Three additional public inputs. Under Groth16 the verification cost grows with the number of public inputs, adding approximately 3 scalar multiplications to on-chain verification. This is negligible relative to the pairing check that dominates the ~210,000 gas figure of whitepaper Ch.5 Section 5.2.

**Privacy.** None. The weights are deployment policy, not user telemetry. They reveal nothing about the session and are typically identical across all users of a given integration.

**Alternative considered and rejected.** Compiling the weights as circuit constants would also be sound, but would require a separate circuit, proving key and trusted setup ceremony per deployment domain. Given that whitepaper Ch.9 Section 9.1 defines four domains and anticipates enterprise customisation ([COMMERCIAL.md](../COMMERCIAL.md) §3), this multiplies the ceremony burden with no security benefit over public inputs.

## 5. Implementation

- `circuits/pohi_main.circom` — weights listed in the `component main {public [...]}` declaration.
- `circuits/score_consolidator.circom` — simplex constraint `alpha + beta + gamma === SCALE` and non-negativity range checks.
- `circuits/tests/circuit.test.mjs` — "enforces the Equation 3.7 simplex constraint" regression test.

## 6. Documentation Impact

- [PROTOCOL.md](../PROTOCOL.md) §3.1 — weights added to the public signal list with rationale.
- [CRYPTOGRAPHY.md](../CRYPTOGRAPHY.md) §2.1 — same.

## 7. Ratification

Requires Protocol Steering Committee review per [GOVERNANCE.md](../../GOVERNANCE.md) §3. **Not yet ratified.**
