# Security Policy & Vulnerability Disclosure

The **Proof of Human Intent (PoHI)** protocol team takes the security and privacy of our software, zero-knowledge circuits, and smart contracts seriously. This document outlines our security model, threat boundaries, and responsible vulnerability disclosure policy.

---

## 1. Security & Privacy Guarantees

PoHI is engineered around strict mathematical and cryptographic security guarantees:

1. **Biometric Zero-Knowledge Confidentiality (Theorem 7.1)**: Under the zero-knowledge property of the Groth16 proof system, public proof transcripts $\mathcal{T} = \{x_{public}, Z_p\}$ reveal zero computational information regarding private client telemetry vectors $\mathbf{w} = \{\mathbf{D}, \mathbf{F}, \tau_{real}\}$. Raw telemetry is maintained exclusively in volatile client memory and is never transmitted over network interfaces.
2. **Proof Soundness (Theorem 7.2)**: Under Discrete Logarithm and $q$-PAIRING computational hardness assumptions over elliptic curve BN254, no polynomial-time adversary can forge a valid proof $Z_p^*$ for a session failing the security threshold ($S_{PoHI} < \theta$).

---

## 2. Trusted Computing Base (TCB) & Security Scope

### Inside TCB Boundary (Covered by Security Policy):
- WASM-compiled R1CS Circom zero-knowledge circuit prover logic.
- Local feature extraction engines and sigmoidal score evaluation algorithms.
- Groth16 zero-knowledge proof generation primitives ($Z_p = \text{Prove}(pk, x, \mathbf{w})$).
- On-chain EVM verifier precompile invocations (`0x08` pairing check) inside `PoHIEscrow.sol`.
- Stateless ZK-Oracle REST verification service logic.

### Outside TCB Boundary (Explicit Model Limits):
- Operating system kernel drivers and hardware Direct Memory Access (DMA).
- Client physical device security against physical coercion or theft.
- Third-party browser extension integrity operating outside DOM sandbox boundaries.

---

## 3. Reporting a Vulnerability

If you discover a potential security vulnerability, cryptographic weakness, or telemetry leakage issue within the PoHI protocol, please report it through our responsible disclosure process.

> [!CAUTION]
> **DO NOT open a public GitHub issue for security vulnerabilities.**

### Disclosure Protocol:
1. Email your findings directly to the lead security maintainer at **[alejandro.gutierrezb31@gmail.com](mailto:alejandro.gutierrezb31@gmail.com)**.
2. Encrypt your message if sensitive details or proof-of-concept exploits are included.
3. Include detailed information:
   - Affected component (e.g., Circom circuit, TypeScript SDK, Smart Contract, ZK-Oracle).
   - Detailed description of the vulnerability and attack vector.
   - Proof-of-concept (PoC) code or steps to reproduce.
   - Potential impact analysis.

---

## 4. Response & Remediation Timeline

- **Initial Acknowledgment**: Within 48 hours of receipt.
- **Triage & Assessment**: Within 5 business days, confirming vulnerability validity and severity rating (CVSS v3.1).
- **Remediation & Patch**: Target patch release within 14–30 business days depending on severity.
- **Public Disclosure**: Coordinated disclosure after patches have been deployed and verified across public SDKs and smart contracts.

---

## 5. Security Contacts

- **Lead Security Architect**: Alejandro Gutiérrez
- **Email**: [alejandro.gutierrezb31@gmail.com](mailto:alejandro.gutierrezb31@gmail.com)
- **GitHub Repository**: [https://github.com/ProjectOne2020/pohi-protocol-poc](https://github.com/ProjectOne2020/pohi-protocol-poc)
- **LinkedIn**: [https://www.linkedin.com/in/alejandro-guti%C3%A9rrez-9a0318107/](https://www.linkedin.com/in/alejandro-guti%C3%A9rrez-9a0318107/)
