# Proof of Human Intent (PoHI)

> A privacy-preserving protocol for verifying human intent in AI-mediated digital transactions.

## Overview

Proof of Human Intent (PoHI) is a research protocol designed to verify that a digital action was initiated through genuine human interaction rather than by an autonomous software agent.

Unlike traditional identity verification systems, PoHI does **not** attempt to determine **who** the user is.

Instead, it verifies **that a human intention physically existed before the digital action occurred**, while preserving user privacy through Zero-Knowledge Proofs (zk-SNARKs).

---

## Motivation

Modern AI systems are rapidly approaching semantic indistinguishability from human-generated content.

As language models become increasingly capable, analyzing generated text alone is no longer sufficient to determine whether an interaction originated from a human.

PoHI proposes a different paradigm.

Instead of analyzing the generated content, it analyzes the physical characteristics involved in producing the input.

---

## Core Idea

PoHI measures behavioral and neuromuscular entropy during user interaction, including:

- Keystroke timing
- Flight time
- Dwell time
- Cognitive pauses
- Motor asymmetry
- Correction dynamics
- Human interaction entropy

These metrics are processed locally on the client device.

Raw behavioral data never leaves the user's device.

Instead, a Zero-Knowledge Proof (zk-SNARK) is generated, proving that the interaction satisfies the protocol requirements without exposing any biometric information.

---

## Repository Structure

```text
paper/          Academic research
docs/           Technical documentation
prototype/      Proof of Concept
client/         Browser client
server/         Verification services
circuits/       zk-SNARK circuits
verifier/       Proof verifier
research/       Experimental work
benchmarks/     Validation datasets
```

---

## Current Status

Current stage:

- ✅ Research completed
- ✅ Academic manuscript completed
- 🚧 Prototype implementation
- 🚧 Reference implementation
- ⏳ Experimental validation

---

## Research Areas

- Computer Security
- Applied Cryptography
- Behavioral Biometrics
- Zero-Knowledge Proofs
- Human-Computer Interaction
- AI Security
- Fraud Prevention
- Distributed Systems

---

## Vision

Proof of Human Intent introduces a new security primitive.

Rather than proving identity, PoHI aims to prove that a digital action originated from genuine human intent while preserving privacy.

The protocol is designed to complement—not replace—existing authentication and identity verification systems.

---

## Repository

GitHub Repository

https://github.com/ProjectOne2020/pohi-protocol-pocmi

---

## Business & Collaboration

The PoHI project is open to:

- Commercial licensing
- Strategic partnerships
- Research collaborations
- Enterprise integrations
- Security consulting
- Investment opportunities
- Pilot implementations
- Academic collaborations

If your organization is interested in adopting or collaborating on PoHI, feel free to get in touch.

---

## Contact

**Alejandro Gutiérrez**

Email

alejandro.gutierrezb31@gmail.com

GitHub

https://github.com/ProjectOne2020/pohi-protocol-pocmi

LinkedIn

https://www.linkedin.com/in/alejandro-guti%C3%A9rrez-9a0318107/

---

## License

The license will be defined before the first stable release.

---

## Disclaimer

Proof of Human Intent (PoHI) is an active research project.

The protocol and reference implementation are under continuous development and should not yet be considered production-ready until extensive experimental validation has been completed.

---

© 2026 Alejandro Gutiérrez. All rights reserved.
