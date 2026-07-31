# Empirical Evaluation Results — Run 1

**Date:** 2026-07-31
**Status:** Completed. Pre-registered falsification condition **triggered**.

This document reports the first run of the adversarial evaluation described in [README.md](README.md). It contains only aggregate statistics — no individual session records — consistent with the collection consent, which promises data may be published "in aggregate form" only. Raw per-session data is not published; see `experiments/data/` (gitignored).

---

## 1. Pre-Registered Falsification Condition

Recorded in `README.md` §1 before any participant data was collected:

> If the strongest adversary achieves FAR(θ) ≥ 0.50 at the domain operating threshold, software-only PoHI does not deliver its claimed security property, and the hardware-attestation extension must be reclassified from optional future work to a load-bearing requirement.

**Result: triggered.** See §4.

---

## 2. Reference Corpus

| | |
| :--- | :--- |
| Participants | 25 |
| Sessions collected | 143 |
| Sessions passing the Eq. 3.2 minimum sample size (≥11 keystrokes) | 137 |
| Total keystrokes captured | 20,107 |
| Device breakdown | Android 63 · iOS 29 (6 dropped for insufficient events) · Laptop 24 · Desktop 14 · Unspecified 7 |
| Collection window | 2026-07-29 to 2026-07-31 |
| Provenance | `human` (consenting participants via `experiments/collect/index.html`) |

## 3. Evaluation Parameters

| | |
| :--- | :--- |
| Calibration | P2P Financial Escrow (α=0.30, β=0.50, γ=0.20, θ=0.85) — highest-security domain profile |
| Adversarial sessions per adversary | 137 (matched to reference population size) |
| Bootstrap | B=1000 iterations, 95% confidence level |
| Master seed | 20260729 (reproducible — see §6) |
| Scoring engine | `@pohi-protocol/core-math` reference implementation (not the R1CS circuit — see §7) |

## 4. Results

### 4.1 Reference population (no adversary)

Of 137 real human sessions, **68 (49.6%) were accepted** at θ=0.85. Score distribution: mean 0.8195, range [0.3745, 1.0000].

### 4.2 Per-adversary results

| Adversary | Threat Vector | FAR (95% CI) | AUC (95% CI) | EER | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| A1 — Constant-delay macro | 6 | 0.0% [0.0–0.0%] | 1.000 [1.000–1.000] | 0.0% | Rejected |
| A2 — Uniform random jitter | 7 | 0.0% [0.0–0.0%] | 1.000 [1.000–1.000] | 0.0% | Rejected |
| A3 — Gaussian random jitter | 7 | 0.0% [0.0–0.0%] | 1.000 [1.000–1.000] | 0.0% | Rejected |
| A4 — Offline statistical mimic | 12 | 48.9% [40.9–57.7%] | 0.532 [0.454–0.604] | 48.9% | Partially effective |
| A5 — Human telemetry replay | 8 | 46.0% [37.2–54.7%] | 0.509 [0.436–0.576] | 47.8% | Partially effective |
| **A6 — Optimized mimic** | 12 | **86.9% [81.0–92.0%]** | **0.388 [0.318–0.458]** | 57.7% | **Defeats the protocol** |

## 5. Interpretation

**Positive controls (A1–A3) behaved exactly as the threat model claims** — zero acceptance, perfect separation (AUC 1.0). This confirms the evaluation apparatus measures what it is designed to measure; had these failed, the fault would lie in the harness, not the protocol.

**A4 and A5 are statistically indistinguishable from chance.** Both AUC confidence intervals contain 0.5 — there is no statistically demonstrated discriminative power against an adversary that either fits a distribution to public corpus statistics offline, or simply reuses a captured human timing vector under a new session identity.

**A6 is the decisive result, and it is worse than "the score is beatable."** Its AUC of 0.388 has a confidence interval entirely below 0.5, meaning this adversary **scores higher than genuine humans on average, not merely high enough to pass**. This matches the mechanism predicted in `docs/THREAT_MODEL.md` §5.2: the cognitive-latency ratio ($R_{cog}$) and error-recalibration variance ($\sigma^2_{err}$) components are free for an adversary to choose (waiting costs nothing; correction timing is fabricated, not measured), while an idealized offline-fit distribution for flight-time skewness is cleaner than a real, noisy human sample.

**Secondary finding, independent of adversarial testing:** only 49.6% of genuine human sessions were accepted at this calibration's threshold. This indicates the domain weights and/or the sigmoidal reference parameters in `packages/core-math/src/index.ts` (calibrated without empirical grounding — see `docs/psp/PSP-0002-sigmoid-coefficients.md`) likely require recalibration against real population data, independent of and in addition to the adversarial finding above.

## 6. Reproducing This Run

The evaluation is deterministic given the same corpus and seed:

```bash
node experiments/run-evaluation.mjs --human experiments/data/human-corpus.json --seed 20260729 --out experiments/data/results.json
```

The reference corpus itself (`experiments/data/human-corpus.json`) is not published in this repository (gitignored — see §1 above regarding aggregate-only publication). The adversary implementations, scoring code, and metrics are public and unchanged from what produced this run: `experiments/src/`.

## 7. What This Result Does Not Cover

- **The R1CS circuit was not re-run for this evaluation.** Scoring used the reference math engine (`@pohi-protocol/core-math`), which the circuit is proved to match within ±0.0122 (PSP-0002). Sessions within that band of θ=0.85 (i.e., scores in [0.8378, 0.8622]) may be classified differently by the circuit than reported here.
- **This is not the N ≥ 10,000 cohort study** of whitepaper Chapter 10. N=25 is sufficient to detect an effect of this size (86.9% FAR is unambiguous at this sample size — see the confidence interval), but not to produce production-grade FAR/FRR estimates or characterize performance across the full demographic and device range.
- **Only the Escrow (highest-security) calibration was evaluated.** The other three domain profiles (Merchant, Gaming, Forum — lower θ, different weight distributions) were not tested and may behave differently against these adversaries.

## 8. Consequence

Per the pre-registered condition (§1), this result reclassifies hardware-anchored timestamp attestation from optional future work to a required research direction. See [`docs/psp/PSP-0005-hardware-attestation.md`](../docs/psp/PSP-0005-hardware-attestation.md) for the design proposal, and `docs/THREAT_MODEL.md` §5.5 for the threat-model-level summary.
