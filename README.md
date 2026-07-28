# Proof of Human Intent (PoHI)

> A privacy-preserving protocol for verifying human intent in AI-mediated digital transactions.

## Overview

Proof of Human Intent (PoHI) is a research protocol designed to verify that a digital action was initiated through genuine human interaction rather than by an autonomous software agent.

Unlike traditional identity verification systems, PoHI does **not** attempt to determine **who** the user is.

Instead, it verifies **that a human intention physically existed before the digital action occurred**, while preserving user privacy through Zero-Knowledge Proofs (zk-SNARKs).

---

## Motivation

Modern AI systems are rapidly approaching semantic indistinguishability from human-generated content.

As language models become increasingly capable, analyzing the generated text itself is no longer sufficient for determining whether an interaction originated from a human.

PoHI proposes a different paradigm.

Instead of analyzing output, it analyzes the physical characteristics involved in producing the input.

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

Raw behavioral data never leaves the device.

Instead, a Zero-Knowledge Proof is generated proving that the interaction satisfies the protocol without exposing biometric information.

---

## Repository Structure
