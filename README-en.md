<div align="center">
  
  # 🛡️ PoHI Protocol (Proof of Human Intent) — PoC
  
  **Client-side behavioral biometric auditing for Sybil attack mitigation and automated fraud prevention in P2P networks.**

  [![Next.js](https://img.shields.io/badge/Next.js-App_Router-black?logo=next.js)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)](https://www.typescriptlang.org/)
  [![Privacy](https://img.shields.io/badge/Privacy-Client_Side_Only-emerald)](#)

  <br />

  🌐 *Leer en [Español](README.md)*

</div>

---

## 📑 Index
1. [Project Overview](#-project-overview)
2. [The Problem: Fraud Automation](#-the-problem-fraud-automation)
3. [The PoHI Solution (Privacy-First)](#-the-pohi-solution-privacy-first)
4. [Code Architecture](#-code-architecture)
5. [Local Quickstart](#-local-quickstart)

---

## 🚀 Project Overview

**PoHI (Proof of Human Intent)** is a Proof of Concept (PoC) exploring a cryptographic primitive designed to verify human intent through **Keystroke Dynamics**, processed entirely within the user's browser and structured for Zero-Knowledge Proofs (zk-SNARKs).

This repository demonstrates that neuromuscular entropy can be audited without transmitting sensitive biometric data to central servers.

---

## ⚠️ The Problem: Fraud Automation

P2P economies, decentralized markets, and critical web forms suffer from massive trust degradation due to:
- **AI-Driven Bot Farms:** Automated scripts replicating synthetic behavior at scale.
- **Sybil Attacks & Scalping:** Massive creation of fake identities to drain smart contracts or hoard resources.
- **Privacy Violations:** Traditional biometric solutions require sending telemetry to centralized servers, creating major honeypots for data breaches.

---

## 💡 The PoHI Solution (Privacy-First)

The calculation engine (`pohiEngine.ts`) measures flight times and dwell times in real-time.

By analyzing variance and distributional rhythm:
1. **Script Detection:** Bots inject text with near-zero latency variance (perfect linear timing).
2. **Human Entropy:** Real humans generate chaotic micro-variations driven by neuromuscular fatigue.
3. **Zero Data Leaks:** No raw biometric data leaves the user's device; intent is validated locally.

---

## 📂 Code Architecture

```text
pohi-protocol-poc/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   └── page.tsx       # Interactive PoC dashboard
│   └── lib/
│       └── pohi/
│           └── pohiEngine.ts # Biometric and mathematical engine
