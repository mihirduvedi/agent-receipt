# AI Assistance Log

Use this log to demonstrate IBM Bob’s substantive role and disclose supporting tools accurately. Never include credentials, personal data, private trace content, or full hidden model reasoning.

| Date | Tool and mode | Bounded task | Files or artifact | Human review | Verification |
|---|---|---|---|---|---|
| 2026-08-25 | OpenAI Codex | Audited the empty workspace and project handoff; verified live challenge requirements; drafted PRD and Codespaces scaffold | `docs/PRD.md`, development guidance, repository foundation | Product decisions and generated files require team review | Scaffold verification recorded in handoff response |
| 2026-08-25 | IBM Bob Agent | Implemented P0 evidence pipeline and deterministic policy engine: Zod schemas for all boundary types (NativeTraceV1, NativeEventV1, AuthorityEnvelopeV1, CanonicalEvent, AdapterResult, RawEventAccounting, Finding, Verdict, ReceiptResult); SHA-256 integrity module; native v1 adapter with stable ordering, receipt-local evt-NNNNNN IDs, duplicate-ID rejection, 100% accounting; deterministic policy engine with all 10 rules (AR-SYS-001 through AR-TRACE-001) and verdict precedence; synthetic fixtures A and B; 64 tests across unit/adapter, unit/integrity, unit/policyEngine, and golden/fixtures test suites | `src/core/schemas/index.ts`, `src/core/integrity.ts`, `src/core/policyEngine.ts`, `src/adapters/nativeTrace.ts`, `src/fixtures/index.ts`, `tests/unit/adapter.test.ts`, `tests/unit/integrity.test.ts`, `tests/unit/policyEngine.test.ts`, `tests/golden/fixtures.test.ts` | Human review required on all rule logic, fixture data categories, and verdict thresholds | `npm run verify` passed: lint 0 warnings, typecheck clean, 64/64 tests, build succeeded |
| 2026-08-25 | IBM Bob Agent | Hardened evidence/policy slice: RFC 3339 timezone enforcement in Zod schemas; instant-based sort and approval timestamp comparison; unknown-quantity → AR-TRACE-001 assessment limitation when maxRecordsRead defined; approval linkage in both directions (action.approvalRef → approval.sourceEventId, approval.approvalRef → action.sourceEventId, shared actionKey) with NativeAdapterResult sourceIdToCanonicalId map | `src/core/timestamps.ts`, `src/core/schemas/index.ts`, `src/core/policyEngine.ts`, `src/adapters/nativeTrace.ts`, `tests/unit/hardening.test.ts`, `tests/unit/policyEngine.test.ts`, `tests/golden/fixtures.test.ts` | Human review required on timestamp regex edge cases, approval linkage logic, and volume limitation semantics | `npm run verify` passed: lint 0 warnings, typecheck clean, 96/96 tests, build succeeded |
| 2026-08-25 | OpenAI Codex | Independently reviewed Bob's trust-critical slice; tightened RFC 3339 validation to reject impossible calendar dates, aligned fallback/integrity metadata with the PRD, and removed a redundant non-serializable source-ID `Map` while preserving approval linkage through canonical `sourceEventId` | `src/core/timestamps.ts`, `src/core/schemas/index.ts`, `src/adapters/nativeTrace.ts`, `src/core/policyEngine.ts`, `tests/unit/hardening.test.ts`, `tests/golden/fixtures.test.ts` | User authorized narrow safety corrections and commit after review; final logic remains available for human inspection | `npm run verify` passed: lint 0 warnings, typecheck clean, 97/97 tests, build succeeded |

## Entry rules

- One row per material session, not every autocomplete.
- Name the actual tool and mode.
- Describe the bounded task and affected files.
- State what a human reviewed.
- Record commands that actually ran; do not claim tests that were only suggested.
- Link a commit or pull request after one exists.
