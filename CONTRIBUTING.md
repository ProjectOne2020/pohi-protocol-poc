# Contributing to Proof of Human Intent (PoHI)

Thank you for your interest in contributing to the **Proof of Human Intent (PoHI)** research project and protocol implementation. 

We welcome contributions from researchers, cryptographers, software engineers, and security auditors. This project is committed to maintain rigor across mathematical formalization, zero-knowledge circuit design, client SDK development, and security engineering.

---

## 1. Core Principles & Scientific Rigor

Every contribution must adhere strictly to the architectural standards defined in the project whitepaper:

1. **Absolute Privacy Preservation**: Under no circumstances should client telemetry vectors (raw dwell times $\mathbf{D}$, flight times $\mathbf{F}$, or keystroke values) be transmitted across the network boundary. All biometric feature extractions and scoring calculations must remain local to the client execution environment.
2. **Cryptographic Integrity**: Any modifications to Circom R1CS circuits or smart contracts must be mathematically verified and maintain Groth16 zk-SNARK soundness under curve BN254.
3. **No Hallucinated Claims**: Empirical benchmarks, mathematical propositions, and threat vector mitigations must be strictly supported by empirical data or peer-reviewed academic literature.

---

## 2. How to Contribute

### 2.1 Reporting Issues & Bugs
- Before opening a new issue, search existing issues to ensure it has not already been reported.
- Use clear, descriptive titles and include steps to reproduce bugs.
- For security vulnerabilities, **do not open a public GitHub issue**. Follow the disclosure process in [SECURITY.md](SECURITY.md).

### 2.2 Submitting Pull Requests (PRs)
1. Fork the repository and create a feature branch off `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Ensure all code follows repository formatting and linting guidelines.
3. Write clean, self-documenting code with clear comments explaining technical rationale.
4. Verify that any circuit or smart contract changes compile cleanly without constraint errors or gas regressions.
5. Commit your changes with clear, descriptive commit messages.
6. Push your branch to GitHub and open a Pull Request against the `main` branch.

---

## 3. Repository Areas & Package Scope

Contributions are organized across the following core project areas:

- `circuits/`: R1CS Circom zero-knowledge circuit definitions (Groth16 / BN254).
- `@pohi-protocol/sdk-web`: TypeScript client tracking engine and WebAssembly prover wrapper.
- `@pohi-protocol/sdk-mobile`: Native iOS (Swift) and Android (Kotlin) bindings *(Reserved for future implementation)*.
- `@pohi-protocol/contracts`: Solidity 0.8.20 smart contracts (`PoHIEscrow.sol`).
- `docs/`: Academic documentation, threat models, and architectural specifications.

---

## 4. Code Style & Review Criteria

Pull requests undergo peer review against the following criteria:

- **Mathematical Consistency**: Alignment with Whitepaper equations (Equations 3.1 through 3.7).
- **Security & Privacy**: Zero telemetry leakage outside the client privacy air-gap.
- **Code Quality**: Readable, maintainable TypeScript / Solidity / Circom code.
- **Documentation**: Updates to corresponding Markdown documentation in `docs/`.

---

## 5. Code of Conduct

All contributors are expected to adhere to the project's [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) to ensure a professional, collaborative, and inclusive environment.

---

## 6. Contact & Maintainer Information

For questions regarding contributions, architecture discussions, or research collaboration:

- **Author / Lead Maintainer**: Alejandro Gutiérrez
- **Email**: [alejandro.gutierrezb31@gmail.com](mailto:alejandro.gutierrezb31@gmail.com)
- **Repository**: [https://github.com/ProjectOne2020/pohi-protocol-poc](https://github.com/ProjectOne2020/pohi-protocol-poc)
- **LinkedIn**: [https://www.linkedin.com/in/alejandro-guti%C3%A9rrez-9a0318107/](https://www.linkedin.com/in/alejandro-guti%C3%A9rrez-9a0318107/)
