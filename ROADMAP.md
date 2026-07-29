# Protocol Roadmap & Research Directions

This document outlines the strategic research and engineering roadmap for the **Proof of Human Intent (PoHI)** protocol. Milestones are structured into completed foundations, active package developments, and planned empirical research vectors directly supported by the research whitepaper.

---

## Roadmap Overview

```mermaid
timeline
    title PoHI Protocol Roadmap & Research Progression
    section Phase 1: Formalization
        July 2026 : Academic Whitepaper v5.0
                  : Mathematical Formulation (Eq 3.1 - 3.7)
                  : Groth16 R1CS Circuit Specs
                  : 18-Vector Threat Model & Game Theory
    section Phase 2: Reference Implementation
        Active Development : Web SDK (@pohi-protocol/sdk-web)
                           : Circom R1CS Circuits (BN254)
                           : EVM Smart Contract (PoHIEscrow.sol)
                           : Mobile Native SDK (@pohi-protocol/sdk-mobile)
    section Phase 3: Empirical Validation
        Planned : N >= 10,000 Cohort Study
                : Multi-Device Sampling (PC, iOS, Android)
                : EER / FAR / FRR Bootstrap Verification
    section Phase 4: Future Extensions
        Planned : Multimodal Sensor Fusion (Accel/Gyro)
                : Ocular Saccade Tracking
                : Hardware TrustZone Attestation
                : Post-Quantum STARK Migration
```

---

## Phase 1: Core Protocol Formalization & Whitepaper v5.0 (Completed)

- [x] **Mathematical Modeling**: Formalization of Neuromuscular Vectors ($\mathbf{D}, \mathbf{F}$), Fisher-Pearson Flight Skewness ($S_F$), Cognitive Assimilation Latency ($R_{cog}$), and Error Recalibration Variance ($\sigma^2_{err}$).
- [x] **Zero-Knowledge Circuit Design**: R1CS constraint formulation ($\approx 14,250$ constraints under BN254) and proof system trade-off analysis (Groth16 vs. PLONK vs. Halo2).
- [x] **Security & Adversarial Analysis**: Exhaustive evaluation across 18 threat vectors, proof of Biometric ZK Confidentiality (Theorem 7.1), and SNARK Proof Soundness (Theorem 7.2).
- [x] **Economic Game Theory**: Proof of PoHI Economic Nash Equilibrium ($Cost_{attack}^{PoHI} > VER_{fraud}$).
- [x] **OpenAPI & EVM Specifications**: OpenAPI 3.0 REST schema (`POST /v1/verify`) and Solidity 0.8.20 escrow contract specification.

---

## Phase 2: Open-Source Reference Implementation (Active Development)

> **Notice**: *This repository is under active development.*

- [ ] **TypeScript Web Client SDK (`@pohi-protocol/sdk-web`)**
  - High-precision DOM event listener capture (`keydown`, `keyup`, `touchstart`, `touchend`).
  - Volatile memory buffer isolation and zero-overwrite clearing.
  - Client-side WebAssembly ZK prover background worker integration.
  - *Status*: Active Development.
- [ ] **Circom R1CS Circuit Definitions (`circuits/`)**
  - R1CS circuit encoding of 5th-degree minimax polynomial sigmoidal normalizers $(\Phi, \Psi, \Omega)$.
  - Bit-decomposition comparison constraints (`LessThan(64)`).
  - Groth16 proving key ($pk$) and verification key ($vk$) compilation under BN254.
  - *Status*: Active Development.
- [ ] **EVM Smart Contracts (`@pohi-protocol/contracts`)**
  - Production Solidity 0.8.20 deployment scripts for `PoHIEscrow.sol`.
  - Integration testing with alt_bn128 verifier precompile (`0x08`).
  - *Status*: Active Development.
- [ ] **Native Mobile SDK (`@pohi-protocol/sdk-mobile`)**
  - Swift bindings for iOS Taptic Engine input tracking.
  - Kotlin bindings for Android Haptic Array touch tracking.
  - *Status*: Planned / Reserved for future implementation.

---

## Phase 3: Large-Scale Empirical Benchmark Study (Planned)

To satisfy scientific auditing standards without fabricating synthetic benchmark results, Phase 3 establishes the empirical validation framework:

- [ ] **Cohort Data Collection ($N \ge 10,000$)**
  - Sampling across mechanical keyboards ($25\%$), laptop scissor keyboards ($25\%$), iOS capacitive screens ($25\%$), and Android haptic screens ($25\%$).
  - Multilingual corpus testing (Latin, Cyrillic, Hanzi, Arabic) for layout invariance.
- [ ] **Statistical Metric Verification**
  - 10-Fold Stratified Cross-Validation.
  - $B = 1,000$ non-parametric bootstrap resampling iterations for $95\%$ confidence intervals.
  - Empirical verification of Equal Error Rate (EER), False Acceptance Rate (FAR), and False Rejection Rate (FRR).
- *Status*: Planned / Empirical Validation Required.

---

## Phase 4: Future Research Vectors & Protocol Extensions (Planned)

- [ ] **Multimodal Mobile Sensor Fusion**
  - Ingestion of capacitive contact surface area ($\text{cm}^2$), touch pressure ($\text{g/cm}^2$), 3-axis accelerometer ($\mathbf{a}$), and gyroscope ($\boldsymbol{\omega}$).
- [ ] **Ocular Saccade & Eye-Gaze Tracking**
  - Visual fixation pause measurement via spatial computing headset sensors or front-facing camera saccade APIs.
- [ ] **Hardware-Anchored Secure Enclave Integration**
  - Cryptographic timestamp attestation via ARM TrustZone and Apple Secure Enclave prior to ZK witness generation.
- [ ] **Post-Quantum Zero-Knowledge Transition**
  - Migration from BN254 elliptic curves to post-quantum transparent STARKs or lattice-based proof systems.
- *Status*: Planned / Reserved for future research.
