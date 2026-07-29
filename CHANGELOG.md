# Changelog

All notable changes to the **Proof of Human Intent (PoHI)** protocol, mathematical specifications, zero-knowledge circuits, and reference implementations are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
