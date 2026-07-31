# PSP-0005: Hardware-Anchored Witness Attestation

| Field | Value |
| :--- | :--- |
| **Status** | Draft — **proposed, not implemented**. This PSP is a design document, not a completed change. |
| **Affects** | Circuit public signals (new output), SDK (new attestation step), settlement/Oracle layer (new verification step) |
| **Triggered by** | `experiments/RESULTS.md` (2026-07-31): the pre-registered falsification condition of `experiments/README.md` §1 was met — the strongest tested adversary achieved FAR = 86.9% [95% CI 81.0–92.0%], with AUC = 0.388 (adversary scores *above* genuine humans on average) |
| **Author** | Drafted in direct response to the empirical result above |

---

## 1. Problem Statement

`docs/THREAT_MODEL.md` §5 documents that a zk-SNARK proves knowledge of a witness satisfying the score relation, not that the witness originated from a human hand. The empirical evaluation of 2026-07-31 confirmed this is not a theoretical concern: an adversary that costs nothing beyond ordinary compute defeats the software-only score the large majority of the time.

The witness — `flight_times`, `dwell_times`, `tau_real`, `backspace_selector` — is, today, simply whatever numbers the client-side JavaScript hands to the prover. Nothing in the circuit, the SDK, or the settlement layer distinguishes numbers that came from `session.attach(element)` capturing real DOM events from numbers a script assigned directly to the same variables.

This proposal asks: what is the cheapest change that measurably raises the cost of fabricating a witness, and how far does it actually go?

## 2. Constraint on the Solution

Per the missing-information policy of this project, this proposal does not claim to solve witness authenticity absolutely. No mechanism available on commodity hardware today can prove that specific keystroke timestamps were physically real, because the trust boundary the SDK operates within — the browser's JavaScript engine — sits *above* the OS input layer where the numbers actually originate. Any attestation performed at the JavaScript layer attests to what the JavaScript layer was told, not to what actually happened at the keyboard.

What hardware-backed mechanisms *can* do is move part of the trust boundary downward — closer to hardware the adversary does not control — so that fabrication requires compromising something more expensive than "run a script." This document is structured around exactly how far each available mechanism moves that boundary, stated explicitly rather than implied.

## 3. Three Tiers of Mitigation

### Tier 1 — WebAuthn Commitment Attestation (proposed for implementation now)

**Mechanism.** After the client computes the witness and derives its public commitment $c = H(\mathbf{D} \parallel \mathbf{F} \parallel \tau_{real} \parallel \mathcal{I}_{back})$ using a ZK-friendly hash (Poseidon, already available via `circomlib`), the SDK requests a WebAuthn assertion (`navigator.credentials.get()`) from a **platform authenticator** — the Secure Enclave on Apple devices, a TPM on Windows, StrongBox/TEE on Android — using $c$ as the challenge. The authenticator, which the browser sandbox cannot directly read the private key of, signs a structure binding the challenge, the origin, and a monotonic signature counter, using a private key generated inside hardware-backed storage at a one-time enrollment step.

**What this proves.** That a specific, previously-enrolled hardware-backed key, on a specific device, attested to this exact witness commitment, for this exact origin, recently (bounded by the signature counter). Reusing a fabricated witness now requires possession of that enrolled device and its authenticator, not merely knowledge of the scoring function.

**What this does not prove — stated without qualification.** The secure enclave never observes a keystroke. It signs whatever hash the JavaScript layer computed and handed it. If the JavaScript layer itself is the one fabricating $\mathbf{D}$, $\mathbf{F}$, $\tau_{real}$, the enclave signs the hash of fabricated data exactly as willingly as it signs genuine data, because from its perspective a hash is a hash. **Tier 1 raises the cost of fabricating at scale (one enrolled device per identity, not one script for arbitrary volume) and enables per-device rate-limiting; it does not close the gap identified in Threat Model §5.1.**

### Tier 2 — Native Mobile Integrity Attestation (documented, not proposed for immediate implementation)

**Mechanism.** A native mobile SDK (currently `@pohi-protocol/sdk-mobile`, reserved) could use Apple App Attest / Google Play Integrity to attest that an unmodified instance of the app binary is running on a device with an intact security chain (not rooted/jailbroken, bootloader locked), in addition to Tier 1's per-session signature.

**What this proves.** That the code computing the witness is the genuine, un-tampered application — raising the cost of the "modify the client to inject fabricated values" path specifically.

**What this does not prove.** OS-level input-injection paths that present as legitimate touch/key events to the app (Threat Vector 3, Accessibility-service injection) are not addressed: from the attested app's perspective, injected events are indistinguishable from genuine ones, because the attestation covers the app binary, not the input source.

**Disposition.** Documented here for completeness and to give the Steering Committee the full picture; not proposed for implementation in this PSP, since it depends on the currently-unimplemented native mobile SDK and duplicates most of its engineering cost.

### Tier 3 — OS/Hardware-Level Signed Input (aspirational; not achievable unilaterally)

**Mechanism.** The OS input driver itself timestamps and signs each hardware interrupt using a device-bound key, before any application code — including a compromised one — can intercept it, exposed through a new OS API.

**Status.** No commodity OS exposes this today. Building it requires platform-vendor cooperation (Apple, Google, Microsoft) that is out of scope for this project to unilaterally produce. Recorded here as the actual end-state this line of research is aimed at, and as a possible direction for outreach, not as an engineering deliverable.

## 4. Proposed Circuit and Protocol Changes (Tier 1 only)

1. **New in-circuit public output**: `witness_commitment`, computed as a Poseidon hash over the existing private witness signals (`flight_times`, `dwell_times`, `tau_real`, `backspace_selector`) inside `pohi_main.circom`. Being computed *inside* the circuit over the same signals used to derive `is_human` ties the commitment to the witness that actually produced the score — a commitment supplied as a separate, unconstrained input would not have this property and would be worthless (the prover could commit to different values than it actually scored).
2. **New SDK step**: after `processSession()` computes the witness, before or alongside proof generation, request a WebAuthn assertion with `witness_commitment` as the challenge. Requires a one-time per-device enrollment step (`navigator.credentials.create()`), which is new UX surface not present today.
3. **New settlement-layer check**: whichever party verifies the ZK proof (stateless Oracle or EVM contract) additionally verifies the WebAuthn assertion against the enrolled public key for the claimed identity, and checks the assertion's challenge equals the proof's public `witness_commitment`. P-256 signature verification is not cheap inside a Circom circuit or on-chain as a precompile at negligible cost; verifying it off-circuit at the Oracle (or via a dedicated cheap on-chain P-256 verifier where available) is the practical choice, not folding it into the R1CS.

## 5. Security and Privacy Trade-off Analysis

**Gained.** Fabricating a witness that passes now requires control of a specific, previously-enrolled hardware-backed authenticator, not merely running a script. Combined with per-device rate limiting at the settlement layer, this directly targets the "cheap, offline, arbitrary-volume" character of the A4/A6 adversaries measured in the pilot — it does not make a single sophisticated attack impossible, but it removes the zero-marginal-cost scaling that made the pilot's result so stark.

**Cost — privacy.** This is the trade-off that must be stated plainly, matching the honesty standard set in PSP-0003. The current design's private witness is fully unlinkable session to session; nothing ties two sessions to the same person beyond what the application layer chooses to do outside PoHI. A WebAuthn credential is, by construction, a **persistent per-device identifier** — whoever holds the enrollment registry can link every session that credential attests to. This is a real reduction in the privacy property that `docs/PRIVACY.md` currently describes as absolute. **Tier 1 should be an opt-in, per-domain enhanced-assurance mode** (appropriate for P2P Escrow, where fraud cost is high and linkability to a wallet/account already exists) **rather than a mandatory requirement for every calibration profile** (inappropriate for the Forum domain, whose whole point is low-friction, low-linkability participation).

**Cost — engineering.** New enrollment UX, a Poseidon circuit component, an off-circuit signature-verification step at the settlement layer, and updated documentation across `docs/PROTOCOL.md`, `docs/CRYPTOGRAPHY.md`, and `docs/PRIVACY.md` to state the reduced unlinkability honestly for domains that opt in.

**What remains unresolved even after Tier 1.** Restated without softening: a sophisticated attacker who controls their own enrolled hardware (which anyone can enroll) can still fabricate a witness and sign its commitment with their own real, legitimately-enrolled key. Tier 1 defeats *unattended, arbitrary-scale* automation; it does not defeat a determined individual attacker running the optimized mimic once per real, enrolled device they control. Closing that residual requires Tier 3, which is not currently buildable by this project.

## 6. Open Questions for the Steering Committee

1. Should Tier 1 be mandatory for the Escrow calibration specifically, given its higher fraud cost, while remaining optional elsewhere?
2. Is a Poseidon witness commitment the right ZK-friendly hash choice, or should this align with a hash already used elsewhere in the stack (e.g., if `session_hash` in `docs/PROTOCOL.md` §3.1 is later specified concretely)?
3. Should re-running the adversarial evaluation of `experiments/RESULTS.md` against a Tier-1-hardened prototype be a prerequisite before any claim that this PSP "closes" or merely "narrows" the gap?

## 7. Ratification

Requires Protocol Steering Committee review per `GOVERNANCE.md` §3, as this proposes new public circuit signals. **Not implemented.** No code in this repository currently reflects this proposal; it is recorded to make the next engineering phase explicit and reviewable before work begins.
