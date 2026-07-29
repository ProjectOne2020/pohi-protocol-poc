# Frequently Asked Questions (FAQ)

This document addresses common technical, cryptographic, and operational questions regarding the **Proof of Human Intent (PoHI)** protocol, based strictly on the whitepaper research document.

---

## 1. Protocol Fundamentals

### What is Proof of Human Intent (PoHI)?
Proof of Human Intent (PoHI) is a privacy-preserving, serverless behavioral protocol designed to verify whether an active digital interaction was initiated by a biological human rather than an autonomous AI agent. It measures irreducible neuromuscular friction (keypress dwell/flight times, typing skewness, cognitive assimilation pauses) directly on the client device and compiles these metrics into a zero-knowledge proof (zk-SNARK).

### Why abandon post-hoc semantic content analysis?
Generative foundation models optimized via RLHF minimize the Kullback-Leibler divergence ($D_{KL}(P \parallel Q) \to 0$) between synthetic text $Q(x)$ and natural human language $P(x)$. Under **Proposition 1.1**, post-hoc text classifiers (inspecting perplexity or burstiness) encounter an asymptotic detection accuracy limit equivalent to random guessing ($50\%$). Furthermore, classifiers suffer from the False Positive Commercial Paradox (alienating neurodiverse humans) and are easily bypassed by system prompt tuning.

### How does PoHI differ from World ID?
World ID relies on physical hardware Orbs to scan iris geometry, establishing one-time personhood uniqueness. World ID cannot verify whether an active transaction session is driven by a human or an automated LLM agent logged into the account. PoHI provides dynamic, per-intent verification on commodity devices without physical hardware Orbs.

---

## 2. Behavioral & Mathematical Model

### What specific biomechanical metrics does PoHI extract?
PoHI extracts four physical metric vectors:
1. **Dwell Time ($\mathbf{D}$)**: Keycap actuation contact duration.
2. **Flight Time ($\mathbf{F}$)**: Inter-key transit latency.
3. **Fisher-Pearson Skewness ($S_F$)**: Asymmetry of flight distribution (Equation 3.2).
4. **Cognitive Assimilation Ratio ($R_{cog}$)**: Measured reading pause relative to context volume $L_{in}$ (Equations 3.3–3.4).
5. **Error Recalibration Variance ($\sigma^2_{err}$)**: Flight time variance adjacent to backspace deletion events (Equation 3.5).

### What is Fisher-Pearson Flight Skewness ($S_F$) and why is it important?
Biological typing exhibits positive right-skewness ($S_F > 1.0$) because humans type familiar n-grams rapidly while pausing at word boundaries. Automated bots deploying uniform or Gaussian random delays produce symmetric distributions ($S_F \approx 0$). Measuring skewness penalizes synthetic random delay loops.

---

## 3. Zero-Knowledge Cryptography & Performance

### Does PoHI record raw keylogs or compromise user privacy?
No. Raw timing telemetry ($\mathbf{D}, \mathbf{F}$) is maintained strictly in volatile memory arrays (`Float64Array`) inside the client sandbox and zero-overwritten immediately after witness compilation. Only a 128-byte zero-knowledge proof payload ($Z_p$) leaves the client device, preserving privacy under GDPR Article 9.

### Why is Groth16 selected as the primary proof system?
Groth16 over curve BN254 delivers the smallest proof payload (128 bytes), fast client proving time ($420\text{ ms}$ desktop, $1,150\text{ ms}$ mobile), minimal memory overhead (48 MB), and low EVM verification gas (~210,000 gas), making it optimal for resource-constrained environments.

### What are the verification overheads?
- **Web2 ZK-Oracle API**: Sub-5ms verification time for stateless proof validation.
- **Web3 On-Chain EVM**: ~210,000 gas per proof verification using Ethereum's native alt_bn128 pairing precompile at address `0x08`.

---

## 4. Threat Model & Security

### How does PoHI defend against headless browser automation (Selenium/Puppeteer)?
Frameworks dispatch synthetic events lacking physiological tremor or natural skewness ($S_F \approx 0$). Additionally, native DOM listeners detect non-trusted event flags (`isTrusted === false`).

### What happens if an adversary uses physical key-pressing robots or human click-farms?
- **Physical Key-Presser Robots**: Physical solenoid actuators incur high hardware costs per instance ($500+), destroying bot scalability ROI ($Cost_{attack} \gg VER_{fraud}$).
- **Human Click Farms**: Hiring human typists forces the adversary back into the historical model of *symmetric cognitive friction*, completely eliminating zero-marginal-cost automated bot scaling.

---

## 5. Integration & Licensing

### How do developers integrate PoHI into Web2 and Web3 applications?
- **Web2 Applications**: Use `@pohi-protocol/sdk-web` to generate local WASM proofs and submit $Z_p$ to the stateless ZK-Oracle REST API (`POST /v1/verify`).
- **Web3 Applications**: Submit proof $Z_p$ directly to the `PoHIEscrow.sol` smart contract on Ethereum-compatible networks.

### Is commercial licensing available?
Yes. PoHI is dual-licensed under open-source AGPL-3.0 and custom Commercial Licenses for enterprise integrations seeking exemption from copyleft obligations. Contact Alejandro Gutiérrez at **[alejandro.gutierrezb31@gmail.com](mailto:alejandro.gutierrezb31@gmail.com)** for inquiries.

---

## 6. Cross-References

- For system architecture breakdown, see [ARCHITECTURE.md](ARCHITECTURE.md).
- For protocol workflow details, see [PROTOCOL.md](PROTOCOL.md).
- For circuit specifications, see [CRYPTOGRAPHY.md](CRYPTOGRAPHY.md).
- For privacy compliance, see [PRIVACY.md](PRIVACY.md).
