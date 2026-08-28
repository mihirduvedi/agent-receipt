# Agent Receipt Evaluation

This report records a reproducible automated evaluation of the current prototype. It is deliberately narrow: the corpus is synthetic, the expected outcomes are declared in code, and every result below can be regenerated locally.

## Result at a glance

| Check | Result |
|---|---:|
| Expected deterministic verdicts | 3 / 3 |
| Seeded authority-rule detections | 6 / 6 |
| Raw records explicitly accounted for | 12 / 12 |
| Known native-trace SHA-256 digests | 2 / 2 |
| Receipt schemas accepted | 3 / 3 |
| Generated receipt items with valid citations | 18 |
| Byte-identical deterministic replay | Passed |
| Invented citation rejected | Passed |
| Invalid Granite selection rejected with usable fallback | Passed |
| Material unparsed OTLP span forced an incomplete verdict | Passed |
| Recovery plan receipt binding and deterministic replay | Passed |
| Recovery plan evidence closure | 2 incidents, 6 actions, 3 events, 12 findings |
| Recovery plan execution boundary | Closed: not executed, current state unknown, approval required |

Run the evaluation with:

```bash
npm run eval
```

The executable corpus and assertions live in `src/evaluation/hackathonEvaluation.ts` and `tests/evaluation/hackathonEvaluation.test.ts`.

## Corpus

| Case | Input | Expected verdict | Purpose |
|---|---|---|---|
| Native expected run | Agent Receipt Native Trace v1, 3 raw events | `within_declared_authority` | Confirms that activity inside the supplied authority envelope is not over-flagged. |
| Native overreaching run | Agent Receipt Native Trace v1, 6 raw events | `material_deviations_found` | Seeds six policy-rule families and checks that each is detected. |
| Narrow OTLP GenAI export | OTLP/JSON `resourceSpans`, 3 raw spans | `within_declared_authority` | Confirms the documented external adapter path and metadata-only accounting. |

Across the corpus, all 12 raw records are classified as mapped, metadata-only, or unparsed. Eleven become canonical events; the unrelated HTTP span is intentionally retained as metadata-only rather than converted into an agent action.

## Seeded rule coverage

The overreaching fixture is expected to activate these deterministic rules:

- `AR-SYS-001`: system outside the declared allowlist
- `AR-OP-001`: operation outside the declared allowlist
- `AR-EGRESS-001`: external egress contrary to the envelope
- `AR-DATA-001`: restricted data category referenced
- `AR-APPROVAL-001`: required approval absent or invalid
- `AR-RETRY-001`: retry after an unknown outcome, creating possible duplicate-side-effect risk

The evaluation detected all six. This is fixture coverage, not a claim that the catalog detects every possible real-world policy violation.

## Adversarial trust checks

The harness also changes inputs or generated output to verify failure behavior:

1. Rebuilding the same receipt with a fixed evaluation timestamp produces an identical serialized receipt.
2. Replacing a generated citation with `evt-invented` causes claim validation to reject the copy.
3. Returning a Granite selection containing `finding-invented` causes the application to use deterministic fallback copy.
4. Removing the explicit operation semantic from a material OTLP action span makes that span unparsed and changes the receipt verdict to `unable_to_assess_fully`.
5. Building the recovery plan twice from the same validated receipt produces identical JSON, and its SHA-256 binding independently matches the exact serialized receipt.
6. Every incident and proposed action in the exported plan resolves to retained receipt evidence. The plan carries no execution authority and makes no claim about current external state.

These checks protect the product's central claim: uncertainty is exposed rather than filled in by a model.

## What this evaluation does not establish

- It is not a production benchmark, penetration test, legal-compliance assessment, or independent audit.
- It does not measure manager task time, usability, false-positive rates on real traces, or performance at scale.
- It does not claim universal OpenTelemetry compatibility; the OTLP adapter supports one documented JSON shape and a small GenAI/action semantic profile.
- It does not compare Granite with other models. Granite is optional and cannot change the deterministic verdict.
- The synthetic cases are intentionally small and known. More adapters, real consented traces, larger stress corpora, and structured user studies are future evaluation work.

## Suggested judge demo

Run `npm run eval`, then open the overreaching sample in the product. The automated result establishes deterministic behavior; the interface shows how a manager can move from two grouped incidents to exact cited findings, inspect the facts that may reach Granite, review retained events, and export a recovery plan without granting the product authority to execute changes.
