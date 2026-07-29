# PSP-0002: Derivation of the Fixed-Point Sigmoid Coefficients

| Field | Value |
| :--- | :--- |
| **Status** | Draft — implemented pending ratification |
| **Affects** | Equation 3.6, circuit constraint operations, [CRYPTOGRAPHY.md](../CRYPTOGRAPHY.md) §2.3 |
| **Author** | Remediation of circuit soundness defects, 2026-07-29 |

---

## 1. Problem Statement

Whitepaper Ch.5 Section 5.1 specifies that the circuit approximates the Equation 3.6 sigmoidal normalizers with a 5th-degree minimax polynomial:

$$P_{sig}(x) \approx c_0 + c_1 x + c_2 x^2 + c_3 x^3 + c_4 x^4 + c_5 x^5$$

The specification gives the **form** of the approximation but not its **content**: no coefficient values, no approximation interval, and no accuracy bound appear anywhere in the whitepaper or the documentation set.

A polynomial approximation is not implementable from its degree alone. Without the interval, the coefficients are undefined; without the coefficients, the circuit cannot evaluate Equation 3.6.

## 2. Constraint on the Solution

The missing-information policy of this project forbids inventing constants. However, the target function is **not** underspecified: `packages/core-math/src/index.ts` fixes every parameter of Equation 3.6.

$$\Phi(S_F) = \sigma\big(2.0 \cdot (S_F - 1.0)\big), \qquad \Psi(R_{cog}) = \sigma\big(3.0 \cdot (R_{cog} - 1.0)\big), \qquad \Omega(\sigma^2_{err}) = \sigma\big(0.05 \cdot (\sigma^2_{err} - 50.0)\big)$$

where $\sigma(z) = 1/(1 + e^{-z})$. All three are the same logistic function under different affine pre-transforms.

The coefficients are therefore **derivable** from artifacts already in the repository, not free parameters. This proposal derives rather than invents them, and commits the derivation so that any reviewer can reproduce and audit the result.

## 3. Proposed Modification

### 3.1 Single Normalizer

Since $\Phi$, $\Psi$ and $\Omega$ differ only by an affine pre-transform, the circuit applies the transform in-circuit and requires **one** approximation of $\sigma(z)$. This removes two thirds of the polynomial evaluation cost.

### 3.2 Odd-Symmetric Basis

$\sigma(z) - 0.5$ is an odd function. Restricting the approximation to the odd basis:

$$P(z) = 0.5 + c_1 z + c_3 z^3 + c_5 z^5$$

eliminates $c_0$, $c_2$ and $c_4$, and makes $P(0) = 0.5$ hold **exactly**. This preserves the reference-midpoint behaviour that `packages/core-math/tests/equation-3.6.test.ts` asserts, and halves the number of constrained multiplications.

### 3.3 Derived Coefficients

`circuits/tools/derive_sigmoid_coefficients.mjs` fits the model by Iteratively Reweighted Least Squares driven toward the $L_\infty$ criterion named in the whitepaper. The interval is selected to minimise the worst case of (in-interval approximation error, out-of-interval saturation-clamping error):

| $Z_{max}$ | In-interval error | Clamp error | Worst case |
| :--- | :--- | :--- | :--- |
| 3 | 0.001572 | 0.047426 | 0.047426 |
| 4 | 0.005357 | 0.017986 | 0.017986 |
| **5** | **0.011804** | **0.006693** | **0.011804** |
| 6 | 0.020367 | 0.002473 | 0.020367 |

**Selected: $Z_{max} = 5$.**

| Constant | Value (fixed-point $\times 10^6$) |
| :--- | :--- |
| `SIGMOID_C1` | 229351 |
| `SIGMOID_C3` | −10115 |
| `SIGMOID_C5` | 199 |
| `SIGMOID_Z_MAX` | 5000000 |

### 3.4 Evidence of Minimax Optimality

The interior error extrema of the fitted solution are:

$$+0.011790,\ -0.011789,\ +0.011790,\ -0.011790,\ +0.011789,\ -0.011790$$

They alternate in sign with equal magnitude to five decimal places. By the equioscillation theorem this is the signature of the minimax optimum for this basis, so the derived polynomial satisfies the criterion the whitepaper names rather than merely approximating it.

## 4. Security Trade-off Analysis

**Accuracy bound.** After fixed-point rounding of the coefficients, the worst-case deviation from the exact logistic function is $0.0122$. Since $S_{PoHI}$ is a convex combination of three such approximations, it inherits the same bound:

$$\left| S_{PoHI}^{circuit} - S_{PoHI}^{exact} \right| \le 0.0122$$

**Consequence.** Sessions whose exact score lies within $0.0122$ of $\theta$ may be classified differently by the circuit and by the reference engine. At the P2P escrow calibration $\theta = 0.85$, the ambiguous band is $[0.838, 0.862]$.

**Direction of error.** The error is two-sided, so the band admits both false accepts and false rejects. It is not a conservative approximation. Any future empirical calibration of $\theta$ (whitepaper Ch.10) must account for this band, and reported EER/FAR/FRR figures must state whether they were measured against the circuit or the reference engine.

**Saturation.** Outside $|z| \le 5$ the output is clamped to $\{0, 1\}$. A degree-5 polynomial cannot represent the sigmoid tails; $\sigma(5) = 0.9933$, so the clamp introduces at most $0.0067$ and behaves conservatively, saturating rather than diverging.

**Alternative considered.** Raising the polynomial degree would narrow the band, but the degree is fixed by whitepaper Ch.5 Section 5.1 and changing it is itself a specification change requiring a separate PSP.

## 5. Implementation

- `circuits/tools/derive_sigmoid_coefficients.mjs` — reproducible derivation; re-run to audit.
- `circuits/sigmoid_eval.circom` — coefficients, affine pre-transform, saturation clamp, codomain clamp.
- `circuits/tests/circuit.test.mjs` — composite-score fidelity asserted against the $0.0122$ bound.

## 6. Documentation Impact

- [CRYPTOGRAPHY.md](../CRYPTOGRAPHY.md) §2.3 — approximation method and provenance.
- [CRYPTOGRAPHY.md](../CRYPTOGRAPHY.md) §2.5 — accuracy bound stated explicitly.

## 7. Open Question for the Steering Committee

The whitepaper specifies a general degree-5 polynomial; this proposal implements an odd-symmetric degree-5 polynomial. The odd form is a strict subset with two fewer degrees of freedom, chosen because it makes $P(0) = 0.5$ exact.

The Committee should decide whether the whitepaper text is amended to state the odd form, or whether the general form is retained and the implementation is treated as a permitted specialisation.

## 8. Ratification

Requires Protocol Steering Committee review per [GOVERNANCE.md](../../GOVERNANCE.md) §3. **Not yet ratified.**
