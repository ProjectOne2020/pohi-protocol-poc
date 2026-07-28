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
4. [Why is PoHI Disruptive & Superior? (The Moat)](#-why-is-pohi-disruptive--superior-the-moat)
5. [Practical Use Cases](#-practical-use-cases)
6. [Code Architecture](#-code-architecture)
7. [Local Quickstart](#-local-quickstart)

---

## 🚀 Project Overview

**PoHI (Proof of Human Intent)** is a Proof of Concept (PoC) exploring a cryptographic primitive designed to verify human intent through **Keystroke Dynamics**, processed entirely within the user's browser and structured for Zero-Knowledge Proofs (zk-SNARKs).

---

## ⚠️ The Problem: Fraud Automation

P2P economies, decentralized markets, and critical web forms suffer from massive trust degradation due to:
- **AI-Driven Bot Farms:** Automated scripts replicating synthetic behavior at scale with near-zero operating costs.
- **Sybil Attacks & Scalping:** Massive creation of fake identities to drain smart contracts, hoard resources, or manipulate governance.
- **Privacy Violations:** Traditional biometric solutions require sending telemetry to centralized servers, creating major honeypots for data breaches.

---

## 💡 The PoHI Solution (Privacy-First)

The calculation engine (`pohiEngine.ts`) measures flight times and dwell times in real-time. By analyzing variance and neuromuscular distribution:
1. **Script Detection:** Bots inject text with near-zero latency variance (perfect linear timing).
2. **Human Entropy:** Real humans generate chaotic micro-variations driven by neuromuscular fatigue and latency.
3. **Zero Data Leaks:** No raw biometric data leaves the user's device; validation happens locally.

---

## 🧠 Why is PoHI Disruptive & Superior? (The Moat)

Unlike legacy solutions, PoHI introduces a brand-new paradigm that solves the historical flaws of behavioral biometrics:

* **1. 100% Client-Side Architecture with Cryptographic Privacy (zk-Ready):** 
  Past solutions (like *TypingDNA* or banking tools) force keystroke data to be sent to central servers, violating privacy and creating a single point of failure. PoHI processes everything locally and wraps the result in a mathematical proof (`zk-SNARK`). The server or smart contract only receives a `TRUE` or `FALSE`, without ever accessing the user's raw biometric data.
* **2. Elimination of Invasive Hardware:** 
  Web3 proof-of-humanity projects (like *Worldcoin*) require iris scanners or other intrusive hardware that users reject. PoHI uses the keyboard the user already has on their laptop or phone, adding zero friction.
* **3. Destruction of the Attacker's Economic Model:** 
  Even if a bot attempts to simulate human errors or pauses using advanced scripts, the computational and engineering cost to replicate chaotic neuromuscular variance destroys the profitability of scaled fraud. **We make scamming more expensive than the profit it yields.**

---

## 🎯 Practical Use Cases

PoHI's cryptographic primitive can be integrated across multiple industries where bots destroy digital economies:

1. **P2P Transaction Protection (Escrow):** 
   Securing smart contracts in marketplaces (such as Facebook Marketplace or decentralized ecosystems) by requiring a biometric human intent signature before holding or releasing funds, blocking bot farms.
2. **Sybil Resistance in DAOs and Airdrops:** 
   Preventing a single attacker from spinning up 10,000 automated wallets to drain free tokens or manipulate governance votes (*One person, one vote/token*).
3. **Gaming Ecosystems & Bot-Farming Prevention:** 
   Eradicating bots that play 24/7 in MMORPGs to farm resources by assessing keyboard entropy without disrupting user experience with annoying visual CAPTCHAs.
4. **Scalper Neutralization (Ticket Hoarding):** 
   Preventing scripts from buying 100% of tickets for concerts or major events in milliseconds by enforcing organic typing validation at checkout.
5. **Organic Content Certification (Anti-Spam / Anti-AI):** 
   Validating in forums or review systems whether text was genuinely written by a human mind (with natural pauses and corrections) rather than synthetically injected via *Copy/Paste* or AI.

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
