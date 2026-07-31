# Protocol Specification Proposals (PSP)

[GOVERNANCE.md](../../GOVERNANCE.md) Section 3 requires a formal Protocol Specification Proposal for any breaking change to the core mathematical formulas (Equations 3.1–3.7), R1CS arithmetic circuit structures, EVM verifier interfaces, or public input signals.

This directory is the PSP record. Each proposal states the problem, the proposed modification, the security trade-off analysis, and its ratification status.

## Status Definitions

| Status | Meaning |
| :--- | :--- |
| **Draft** | Written, not yet submitted for review |
| **Under Review** | In the mandatory 14-day public review period |
| **Ratified** | Approved by unanimous Protocol Steering Committee consensus |
| **Implemented** | Ratified and present in the reference implementation |
| **Rejected** | Declined; rationale recorded |

## Register

| PSP | Title | Status |
| :--- | :--- | :--- |
| [PSP-0001](PSP-0001-calibration-weights-public.md) | Domain calibration weights as public inputs | **Draft** — implemented pending ratification |
| [PSP-0002](PSP-0002-sigmoid-coefficients.md) | Derivation of the fixed-point sigmoid coefficients | **Draft** — implemented pending ratification |
| [PSP-0003](PSP-0003-backspace-selector.md) | Backspace selector witness signal for Equation 3.5 | **Draft** — implemented pending ratification |
| [PSP-0004](PSP-0004-variable-session-length.md) | Variable session length | **Draft** — implemented pending ratification |
| [PSP-0005](PSP-0005-hardware-attestation.md) | Hardware-anchored witness attestation | **Draft** — design proposed, **not implemented** |

> [!IMPORTANT]
> PSP-0001 through PSP-0004 are currently **implemented in the reference circuit but not yet ratified**. They were written retroactively, during the remediation of the circuit soundness defects recorded in [CHANGELOG.md](../../CHANGELOG.md), to document engineering decisions that were unavoidable to make the circuit implementable at all.
>
> **PSP-0005 is different: it is a design proposal only, with no corresponding code.** It was written in direct response to the empirical result in [`experiments/RESULTS.md`](../../experiments/RESULTS.md) — the pre-registered falsification condition in `experiments/README.md` §1 was triggered (strongest adversary FAR = 86.9%), which reclassifies hardware attestation from optional future work to a required next phase per `docs/THREAT_MODEL.md` §5.5.
>
> All five proposals require Steering Committee review before any release is certified.
