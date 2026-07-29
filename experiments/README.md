# Empirical Evaluation Protocol

This directory contains the apparatus for the empirical validation required by whitepaper Chapter 10, and the adversarial evaluation required by [docs/THREAT_MODEL.md](../docs/THREAT_MODEL.md) §5.4.

Everything here is a measurement instrument. It contains **no results**: results appear only when a corpus collected from consenting participants is supplied.

---

## 1. The Question

The whitepaper claims that the composite score $S_{PoHI}$ distinguishes biological typing from automated input. That claim is currently **unmeasured**. This protocol measures it, and in particular measures it against an adversary that the threat model does not presently address.

**Primary hypothesis (H1).** For a fixed operating threshold $\theta$, the false acceptance rate against an offline-generating adversary is low enough for the protocol to be useful:

$$\text{FAR}_{\text{A6}}(\theta) < 0.05 \quad\text{while}\quad \text{FRR}(\theta) < 0.10$$

**Falsification condition, stated in advance.** If the strongest adversary achieves $\text{FAR} \ge 0.50$ at the domain threshold, then software-only PoHI does not deliver its claimed security property, and the hardware attestation of Chapter 12 §12.3 must be reclassified from optional future work to a load-bearing requirement.

Recording this condition **before** collecting data is what makes the result a test rather than a rationalisation. Both outcomes are publishable; only an unmeasured claim is not.

---

## 2. Why This Is Not the $N \ge 10{,}000$ Study

Chapter 10 specifies a cohort of $N \ge 10{,}000$ participants. That study exists to produce *precise* EER estimates with narrow confidence intervals for production deployment claims.

This protocol answers a different and prior question: **can a cheap adversary defeat the score at all?** Detecting an effect of that size does not require a large cohort. If an adversary passes the majority of the time, 20–40 participants make it unmistakable; if it never passes, that is equally clear. The bootstrap intervals reported by the runner make the residual uncertainty explicit.

Run this first. It costs weeks, not years, and its outcome determines whether the large study is measuring the right thing.

---

## 3. Ethics and Participant Protection

The collection page is designed so that participation carries essentially no privacy risk, and this must remain true.

| Guarantee | Mechanism |
| :--- | :--- |
| The text typed is never recorded | Only press/release timestamps and a Backspace flag are captured |
| Text cannot be reconstructed | Character identities are rejected by a database `CHECK` constraint and by `validateSession`, so the guarantee holds even against a modified client |
| No personal identifiers | The table has no column for a name, email, IP address or device fingerprint |
| Submissions are private | No `SELECT` policy exists for the anonymous role: no participant, and no holder of the publishable key, can read anyone's data |
| Informed consent | The first screen states exactly what is collected, and that it is transmitted automatically, before any capture begins |
| Withdrawal before starting | Closing the page before the first prompt is submitted leaves no record |

> [!IMPORTANT]
> Because the data carries no identifier, **a contribution cannot be located or withdrawn after
> submission**. The consent screen states this explicitly. Anonymity and revocability are in
> direct tension here, and the protocol resolves it in favour of anonymity; a reviewer is
> entitled to ask why, and the answer is that any revocation handle would be exactly the
> identifier the study is designed not to hold.

The Backspace flag is the minimum required to construct the Equation 3.5 index set $\mathcal{I}_{back}$. It discloses correction *positions* but no content, and is exactly the information PSP-0003 already admits into the protocol's own private witness.

> [!NOTE]
> If this work is submitted to a venue requiring ethics review, the above is the description to
> supply. Many institutions exempt anonymous, non-identifying, non-interventional data of this
> kind, but the determination belongs to the reviewing body, not to the researcher.

---

## 4. Collection Procedure

### 4.1 Distribute the page

`experiments/collect/index.html` is a single self-contained file: no build step, no framework, no dependencies. Publish it on any static host and share the link.

Each completed prompt is submitted automatically to the study database, so a participant only has to type. Nothing is asked of them afterwards.

### 4.2 What a participant does

1. Reads the consent screen and selects a device class.
2. Types a free-text answer to each of six prompts. Prompt lengths vary deliberately from 43 to 216 characters so that $L_{in}$, and therefore $R_{cog}$, varies across sessions.
3. Nothing else. Each session is sent as it completes.

Each participant yields six sessions. **20–40 participants gives 120–240 sessions**, which is sufficient for this protocol.

### 4.3 Storage and Access Control

Sessions land in a dedicated Postgres table whose access rules are the privacy guarantee, not a promise:

| Control | Implementation |
| :--- | :--- |
| Contributions accepted | RLS policy granting `INSERT` to the anonymous role |
| Submissions unreadable by participants or third parties | No `SELECT` policy exists, so a holder of the publishable key receives an empty result |
| Submissions cannot be altered or destroyed | No `UPDATE` or `DELETE` policy, so such requests affect zero rows |
| Typed text impossible to store | `CHECK` constraint calling `events_carry_no_text()` rejects any event object carrying `key`, `char`, `text`, `code`, `keyCode` or `value` |
| Malformed telemetry rejected | `CHECK` constraint enforcing the field types of §9, plus `release >= press` |
| Endpoint cannot be used as free storage | Payload bounded to 5,000 events per session |

The text-rejection constraint holds **even if the collection page is modified**, because it is enforced by the database rather than by the client. This is what makes the consent statement verifiable rather than merely asserted.

Reading the corpus requires the service role key, which stays on the researcher's machine and must never be committed or placed in the page.

### 4.4 Resilience

A failed submission is queued in `localStorage`, survives a page reload, and is retried automatically when connectivity returns. If anything remains unsent at the end, the participant is offered a manual download as a fallback. No session is lost to a dropped connection.

### 4.5 Sampling

Aim for coverage across the four device strata of Chapter 10 §10.1 (mechanical desktop, laptop, iOS, Android). Perfect balance is not required at this stage, but device class is recorded so that any imbalance is visible in analysis.

### 4.6 Export

```bash
# PowerShell
$env:POHI_SUPABASE_URL = "https://<ref>.supabase.co"
$env:POHI_SERVICE_KEY  = "<service role key>"
node experiments/export-corpus.mjs --out data/human-corpus.json
```

The exporter pages through every row, normalises timestamps to a common origin, drops sessions below the Equation 3.2 minimum sample size, validates the result against the schema, and reports the participant count and device breakdown. It warns if fewer than 20 participants have contributed.

---

## 5. Adversary Models

Every adversary is granted full knowledge of the protocol, the scoring function, the calibration weights and the threshold, following Kerckhoffs's principle.

| ID | Adversary | Threat vector | Knowledge assumed | Role |
| :--- | :--- | :--- | :--- | :--- |
| A1 | Constant-delay macro | 6 | None | Positive control |
| A2 | Uniform random jitter | 7 | Plausible latency range | Positive control |
| A3 | Gaussian random jitter | 7 | Plausible mean and spread | Positive control |
| A4 | Offline statistical mimic | 12 | Distribution of a public corpus | Test |
| A5 | Human telemetry replay | 8 | One captured human session | Test |
| A6 | Mimic with tuned latency | 12 | Corpus statistics plus the public specification | **Primary test** |

**A1–A3 are controls, not claims.** The threat model already asserts these are rejected. If the evaluation does *not* reject them, the apparatus is broken and no other number in the run can be trusted. This is checked automatically in `tests/experiment.test.mjs`.

**A6 is the primary test.** It exploits the two components that cost the adversary nothing to control: $\tau_{real}$ is chosen rather than measured, so $R_{cog}$ can be placed anywhere by simply waiting; and correction latencies are chosen, so $\sigma^2_{err}$ can be placed anywhere. Only $S_F$ requires any modelling, and a log-normal sample reproduces the right-skew that Equation 3.2 measures.

Crucially, A4 and A6 generate the entire vector **offline in one pass**. Threat vector 12 assigns this adversary the limitation *"high GPU inference latency per keypress"*, which assumes online per-keystroke synthesis. That limitation does not apply here, which is precisely what the evaluation is designed to expose.

---

## 6. Running the Evaluation

```bash
# Pipeline smoke test with generated data. Proves the code runs; proves nothing else.
npm run experiment:harness

# The real thing, once participant data exists.
node experiments/run-evaluation.mjs --human path/to/corpus.json --out results.json

# Other calibration domains from whitepaper Ch.9 Section 9.1.
node experiments/run-evaluation.mjs --human corpus.json --calibration merchant
```

The runner prints, for each adversary: score distribution, FAR at the domain threshold with a 95% bootstrap interval, AUC with interval, and EER.

> [!CAUTION]
> `--harness` fabricates the reference population with the same kind of statistical process the
> adversary uses. Its output is a self-test of the plumbing. It is never evidence, and the
> runner labels every such run accordingly.

---

## 7. Reading the Result

**FAR** at the domain threshold is the headline number: the fraction of adversarial sessions that were accepted.

**AUC** is the more informative diagnostic, because it is threshold-independent:

| AUC | Interpretation |
| :--- | :--- |
| 1.0 | Perfect separation |
| 0.9 | Strong discrimination |
| 0.5 | The score carries **no information** — indistinguishable from a coin flip |
| < 0.5 | The adversary systematically outscores real humans |

An AUC below 0.5 is the most serious outcome available. It means the adversary is not merely evading the score but exceeding it, because a generator sampling from an idealised distribution can produce cleaner right-skew and more convenient reading pauses than an actual tired human at a real keyboard.

**Circuit indeterminacy.** Scores within $\pm 0.0122$ of $\theta$ are indeterminate under the R1CS implementation (PSP-0002 §4). Report how many sessions fall in that band.

---

## 8. Reporting

Whichever way the result goes, report:

1. Participant count, session count, and the device-class breakdown.
2. FAR, FRR, AUC and EER per adversary, each with its bootstrap interval.
3. The full score distributions, not only summary statistics.
4. The seed and the exact command, so any reviewer can reproduce the run byte for byte.
5. The falsification condition of §1 and whether it was met.

Publish the adversary implementations. An adversarial evaluation whose attack code is withheld cannot be checked, and reviewers are right to discount it.

---

## 9. Files

| Path | Purpose |
| :--- | :--- |
| `collect/index.html` | Participant-facing collection page; self-contained, auto-submitting |
| `export-corpus.mjs` | Pulls the study database into a validated corpus file |
| `src/dataset.mjs` | Schema, validation, seeded generation, session assembly |
| `src/scoring.mjs` | Feature extraction and scoring via `@pohi-protocol/core-math` |
| `src/adversaries.mjs` | The six adversary models |
| `src/metrics.mjs` | FAR, FRR, EER, AUC, bootstrap intervals (Ch.10 §10.3) |
| `run-evaluation.mjs` | Experiment runner and report |
| `tests/` | Verification of the apparatus itself |
| `schema.sql` | The study database schema, for independent review or re-provisioning |
