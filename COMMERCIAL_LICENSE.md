# Commercial License Agreement

This document outlines the commercial licensing framework for the **Proof of Human Intent (PoHI)** protocol, zero-knowledge circuit implementations, client SDKs, and associated smart contract architectures.

---

## 1. Overview

While the standard open-source codebase is made available under the **GNU Affero General Public License v3.0 (AGPL-3.0)**, commercial entities requiring proprietary usage, private SaaS deployment, or integration into closed-source software products can obtain a **PoHI Commercial License**.

A Commercial License grants explicit authorization to embed, modify, execute, and distribute PoHI components without triggering the copyleft requirements of AGPL-3.0 (including Article 13 network copyleft source disclosure).

---

## 2. Commercial Terms & Rights

Under a PoHI Commercial License, licensees receive the following rights:

1. **Proprietary Integration**: Permission to link PoHI client SDKs (`@pohi-protocol/sdk-web`, `@pohi-protocol/sdk-mobile`) into proprietary web applications, mobile apps, and enterprise software.
2. **Private Network Operations**: Authorization to operate the stateless ZK-Oracle backend API (`POST /v1/verify`) and private verification infrastructure without releasing internal source code modifications to network end-users.
3. **Custom Circuit Adaptation**: Rights to modify and deploy custom R1CS Circom zero-knowledge circuits, fixed-point parameter curves, and threshold parameters ($\theta$) suited for enterprise domain constraints.
4. **Smart Contract Deployment**: Authorization to deploy custom EVM contracts (`PoHIEscrow.sol` derivatives) on public or private Ethereum-compatible blockchains.
5. **No Copyleft Obligations**: Full exemption from AGPL-3.0 Articles 5, 6, and 13.

---

## 3. Scope of Commercial Packages

Commercial licensing applies across the following protocol components:

- **Web Client Tracking & Witness SDK**: `@pohi-protocol/sdk-web`
- **Mobile Native Tracking & Witness SDK**: `@pohi-protocol/sdk-mobile`
- **Smart Contract & Settlement Suite**: `@pohi-protocol/contracts` (`PoHIEscrow.sol`)
- **Circom R1CS ZK-SNARK Circuits**: `circuits/` (Groth16 / BN254 arithmetic circuit specifications)
- **Stateless ZK-Oracle Verification Service**: OpenAPI 3.0 server implementation

---

## 4. Obtaining a Commercial License

Commercial licenses are customized based on organization size, deployment volume, enterprise support requirements, and circuit customization specifications.

To request a commercial license quote, request enterprise integration assistance, or execute a commercial agreement, contact:

- **Author / Lead Maintainer**: Alejandro Gutiérrez
- **Email**: [alejandro.gutierrezb31@gmail.com](mailto:alejandro.gutierrezb31@gmail.com)
- **GitHub Repository**: [https://github.com/ProjectOne2020/pohi-protocol-poc](https://github.com/ProjectOne2020/pohi-protocol-poc)
- **LinkedIn Profile**: [https://www.linkedin.com/in/alejandro-guti%C3%A9rrez-9a0318107/](https://www.linkedin.com/in/alejandro-guti%C3%A9rrez-9a0318107/)
