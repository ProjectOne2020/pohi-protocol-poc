# Licensing Overview

The **Proof of Human Intent (PoHI)** protocol and reference implementation operate under a dual-licensing structure to support open-source research and community participation while offering commercial licensing options for proprietary enterprise deployments.

---

## 1. Open Source License (AGPL-3.0)

Unless otherwise explicitly licensed under commercial terms, all software, zero-knowledge circuit definitions (`.circom`), smart contracts (`.sol`), client SDKs (`@pohi-protocol/*`), and documentation contained in this repository are licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

### Key Requirements of AGPL-3.0:
- **Copyleft Enforcement**: Any modification, derivative work, or application linking against AGPL-3.0 licensed components must publish its full source code under the AGPL-3.0 license.
- **Network Copyleft (Article 13)**: Interacting with AGPL-3.0 software over a network (e.g., SaaS platforms, web services, API backends, or cloud deployments) constitutes distribution, requiring the provider to make the complete source code available to network users.

Refer to the official [AGPL-3.0 License Text](https://www.gnu.org/licenses/agpl-3.0.html) for full legal terms.

---

## 2. Commercial Dual-Licensing Model

For commercial entities, enterprise vendors, SaaS providers, or proprietary platform integrations seeking to incorporate PoHI components without incurring AGPL-3.0 copyleft obligations, custom **Commercial Licensing Agreements** are available.

### Benefits of Commercial Licensing:
- Royalty-free commercial distribution and proprietary embedding.
- Exemption from network copyleft (AGPL-3.0 Article 13) source disclosure requirements.
- Enterprise SLA, technical integration support, and custom ZK circuit parameter tuning.
- Right to relicense or sub-license proprietary derivative wrappers.

Refer to [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md) for further details regarding commercial licensing terms and enterprise inquiries.

---

## 3. License Summary Table

| Component / Layer | Default Open-Source License | Commercial Exemption Available? |
| :--- | :--- | :--- |
| **Research Whitepaper & Docs** | Creative Commons / AGPL-3.0 | Yes (Enterprise Docs & Specs) |
| **ZK Circuits (`circuits/`)** | GNU AGPL-3.0 | Yes (Custom Enterprise Circuits) |
| **TypeScript Client SDK (`@pohi-protocol/sdk-web`)** | GNU AGPL-3.0 | Yes (Proprietary App Embedding) |
| **Mobile Native SDK (`@pohi-protocol/sdk-mobile`)** | GNU AGPL-3.0 | Yes (iOS / Android Native Integration) |
| **EVM Smart Contracts (`PoHIEscrow.sol`)** | GNU AGPL-3.0 | Yes (Custom Contract Deployment) |
| **Stateless ZK-Oracle Backend** | GNU AGPL-3.0 | Yes (Hosted / Private Oracle Instances) |

---

## 4. Licensing Inquiries & Contact Details

For commercial licensing requests, enterprise inquiries, custom circuit parameters, or legal questions, contact:

- **Author / Lead Maintainer**: Alejandro Gutiérrez
- **Email**: [alejandro.gutierrezb31@gmail.com](mailto:alejandro.gutierrezb31@gmail.com)
- **Repository**: [https://github.com/ProjectOne2020/pohi-protocol-poc](https://github.com/ProjectOne2020/pohi-protocol-poc)
- **LinkedIn**: [https://www.linkedin.com/in/alejandro-guti%C3%A9rrez-9a0318107/](https://www.linkedin.com/in/alejandro-guti%C3%A9rrez-9a0318107/)
