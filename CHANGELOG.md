# Changelog

All notable changes to the **Proof of Human Intent (PoHI)** protocol, mathematical specifications, zero-knowledge circuits, and reference implementations are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] - 2026-07-29

### Fixed — Zero-Knowledge Circuit Soundness

The Circom circuits were rewritten. The previous revision expressed nearly every value with
the witness-assignment operator `<--` without a matching constraint, so the signals it claimed
to compute were not bound to their inputs and a prover could choose them freely.

- **Unconstrained sigmoid output**: `MinimaxSigmoidNormalizer` assigned `out_normalized` by
  witness hint only and never used the polynomial powers it computed, leaving the output
  entirely free. It now evaluates a real degree-5 odd polynomial with every rescaling proved.
- **Unconstrained comparator**: `LessThan64` contained no bit decomposition despite its name,
  so `is_human` was not bound to the score or the threshold. It now delegates to circomlib's
  `Num2Bits`-based comparators.
- **Unsound fixed-point division**: rescalings used Circom's `/`, which is field division, in
  the tautological pattern `q <-- a/SCALE; q*SCALE === a`. All divisions now prove
  `numerator = q*d + r` with `0 <= r < d` and bit-decomposed `q` and `r`.
- **Prover-chosen calibration weights**: `alpha`, `beta` and `gamma` were private witness
  inputs, letting the prover pick the weights and satisfy any threshold. They are now public
  inputs, and the Equation 3.7 simplex constraint `alpha + beta + gamma = 1` is enforced.
- **Missing feature extraction**: the circuit consumed `flight_times[0]`, `tau_real` and
  `dwell_times[0]` directly and implemented none of Equations 3.1–3.5. It now computes the
  moment accumulators and Fisher-Pearson skewness (3.1/3.2), the cognitive assimilation ratio
  from `context_length`, which was previously a declared but entirely unused public input
  (3.3/3.4), and the error recalibration variance (3.5).

### Added

- `circuits/lib/fixed_point.circom`: proved integer division, signed magnitude decomposition,
  constrained integer square root and clamping primitives.
- `circuits/moments.circom`: in-circuit implementations of Equations 3.1, 3.2, 3.3, 3.4 and 3.5.
- `circuits/tools/derive_sigmoid_coefficients.mjs`: reproducible derivation of the polynomial
  coefficients, which the whitepaper specifies in form but never numerically. Coefficients are
  fitted to the logistic function fixed by `@pohi-protocol/core-math` and reach minimax
  equioscillation at ±0.011790.
- `circuits/build.mjs` and `circuits/tests/circuit.test.mjs`: reproducible build pipeline and a
  15-case suite covering fidelity to the reference engine, protocol behaviour, and soundness
  regressions for each defect listed above.
- `backspace_selector[N-1]` private witness signal, the R1CS encoding of the Equation 3.5 index
  set, without which that equation cannot be expressed in-circuit.
- Root npm workspace so the monorepo builds from a clean clone.

### Fixed — Build and Test Infrastructure

- `@pohi-protocol/core-math` declared no module type while emitting ESM-style imports, so three
  of the seven equation test files aborted before running a single assertion. The suite now
  executes 74 tests, up from 42 that ran previously.
- `@pohi-protocol/sdk-web` tests imported a path that is never produced by any build step, so
  the entire suite failed to load. All 4 tests now run.
- `@pohi-protocol/sdk-web` imported `core-math` through a relative path into a gitignored build
  directory, making a clean clone unbuildable. It now resolves via the package specifier.
- `snarkjs` was imported at runtime but never declared as a dependency.
- Compiled JavaScript had been committed alongside the TypeScript sources, contradicting the
  configured `outDir`. Removed, with a `.gitignore` rule to prevent recurrence.

### Changed

- `@pohi-protocol/sdk-web` was published under `Apache-2.0`, contradicting `LICENSING.md`,
  which mandates AGPL-3.0 for every `@pohi-protocol/*` package. Corrected to `AGPL-3.0-only`.
- `docs/CRYPTOGRAPHY.md`: the constraint count is now the measured 11,170 rather than the
  previously estimated ~14,250, and the ±0.0122 accuracy bound of the degree-5 approximation is
  documented.
- `docs/IMPLEMENTATION_STATUS.md` and `README.md`: components described as "Active Development"
  that have no source file in the repository (`PoHIEscrow.sol`, the ZK-Oracle API) are now
  labelled "Specified only". `README.md` had also listed the mobile SDK as under active
  development, contradicting every other document.

### Added — Governance and Trusted Setup

- `docs/psp/`: the Protocol Specification Proposal register required by `GOVERNANCE.md` §3,
  with PSP-0001 through PSP-0004 recording every engineering decision that extended or
  specialised the whitepaper specification. All four are implemented but **not yet ratified**.
- `docs/CEREMONY.md` and `circuits/ceremony.mjs`: multi-party Groth16 phase-2 trusted setup
  tooling with a published, verifiable transcript. Supports an external Perpetual Powers of Tau
  for phase 1 and refuses to verify if the circuit has changed since the ceremony began.
- `GOVERNANCE.md`: trusted setup release authority, and a rule that no release may be certified
  while a PSP affecting it is unratified.

### Changed — Variable Session Length

- The circuit accepted only sessions of exactly 30 events, which contradicted Equation 3.1
  (where $n$ is a variable) and made the Equation 3.2 assumption $n \ge 10$ unrepresentable.
  It now accepts any $1 \le n \le 30$ via a private `event_count` signal and an in-circuit
  prefix mask, and suppresses the skewness estimate below 10 flight samples exactly as
  `MIN_SAMPLE_SIZE_SKEWNESS` does in the reference engine. Constraint count 11,170 → 12,481.

### Known Limitations

- The committed proving key uses development entropy and is **not** production-safe. The
  ceremony tooling is production-ready; phase 1 requires an external Powers of Tau file.
- Sessions whose exact score lies within ±0.0122 of the threshold may be classified differently
  by the circuit and by the reference engine (PSP-0002 §4).
- `MAX_EVENTS = 30` remains a compile-time capacity; longer sessions must be truncated by the
  SDK. Raising it requires recompilation and a new ceremony.
- **The protocol assumes, but does not verify, that the private witness originates from
  physical input.** A prover that submits fabricated timing vectors produces a proof that is
  cryptographically valid, because the statement "these values score above the threshold" is
  true of the fabricated values. This is a limitation of the protocol design, not of the
  implementation, and is not resolved by any change in this release. See the analysis appended
  to `docs/THREAT_MODEL.md`.

---

## [5.0.0] - 2026-07-01 (Whitepaper v5.0 Final Release)

### Added
- **Academic Whitepaper Publication**: Published final v5.0 academic research whitepaper titled *"Proof of Human Intent (PoHI): A Privacy-Preserving Behavioral Protocol for Human Intent Verification in AI-Mediated Digital Transactions"*.
- **Neuromuscular & Cognitive Mathematical Formalization**:
  - Vector extraction equations for Dwell Time ($\mathbf{D}$) and Flight Time ($\mathbf{F}$) (Equation 3.1).
  - Adjusted Fisher-Pearson standardized coefficient of flight skewness ($S_F$) (Equation 3.2).
  - Expected biological cognitive assimilation latency ($\tau_{expected}$) and ratio ($R_{cog}$) (Equations 3.3–3.4).
  - Stochastic error recalibration variance ($\sigma^2_{err}$) adjacent to deletion events (Equation 3.5).
  - Sigmoidal normalizers $(\Phi, \Psi, \Omega)$ and composite score formula $S_{PoHI}$ (Equations 3.6–3.7).
- **Zero-Knowledge Circuit Specification**:
  - Rank-1 Constraint System (R1CS) arithmetic circuit formulation for BN254 curve geometry ($\approx 14,250$ constraints for $N=30$ input characters under Groth16).
  - Benchmarks comparing Groth16 against PLONK and Halo2 schemes across proving times, WASM memory, proof size, and EVM gas costs.
- **Formal Threat Modeling**:
  - Exhaustive 18-vector threat matrix evaluating API injection, automation frameworks, emulators, copy-paste, macro scripts, random noise, replay, remote desktop, USB HID, robotic key-pressers, GAN timing engines, RL evasion, and Sybil swarms.
  - Formal proof of Biometric Zero-Knowledge Confidentiality (Theorem 7.1) and SNARK Proof Soundness (Theorem 7.2).
  - Explicit definition of Trusted Computing Base (TCB) boundaries.
- **Economic Game Theory**:
  - Formal payoff matrix proving PoHI Economic Nash Equilibrium ($Cost_{attack}^{PoHI} > VER_{fraud}$).
- **Developer Integration Specifications**:
  - OpenAPI 3.0 REST specification for stateless ZK-Oracle verification endpoint (`POST /v1/verify`).
  - TypeScript client SDK reference implementation architecture (`@pohi-protocol/sdk-web`).
  - EVM Smart Contract specification (`PoHIEscrow.sol`) utilizing precompiled Groth16 verifier (`0x08`).
- **Comparative Technology Survey**:
  - 12-column comparative evaluation matrix assessing PoHI against 10 baseline technologies (CAPTCHA v2/v3, World ID, Proof of Humanity, BrightID, Dynamic CAPTCHA, Behavioral Biometrics, Device Fingerprinting, Traditional KYC, Face Biometrics).

### Reserved for Future Implementation
- Multi-device empirical cohort benchmark study ($N \ge 10,000$ participants).
- Post-quantum zero-knowledge STARK circuit migration.
- Hardware TrustZone / Apple Secure Enclave timestamp attestation.
- Mobile native SDK bindings (`@pohi-protocol/sdk-mobile`).

---

## [0.1.0-alpha] - 2026-06-15

### Added
- Initial project structure setup and research proof-of-concept repository initialization.
- AGPL-3.0 and Commercial dual-licensing framework definition.
