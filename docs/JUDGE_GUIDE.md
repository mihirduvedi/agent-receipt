# Judge guide

Agent Receipt is a post-run review tool for an AI operations manager. It compares a completed agent trace with the authority a manager declared before review, then produces a deterministic, evidence-linked receipt.

**Live demo:** <https://receipt-one-flax.vercel.app>

**Public repository:** <https://github.com/mihirduvedi/agent-receipt>

## If you have 60 seconds

1. Open the live demo and choose **Overreaching run**.
2. Keep the preset authority and select **Build receipt**.
3. Read the verdict and the two-incident brief. Open one evidence control to see the finding, canonical event, and retained source object together.
4. Open **Recovery plan** from the receipt navigation and download Recovery Plan v1. The status confirms citation validation and a SHA-256 binding to the exact receipt.

The seeded run records six events. Three stay inside the declared authority. The other three capture an external spreadsheet attempt with an unknown result, its successful retry, and an unapproved customer-email send. Deterministic rules produce 12 findings and group them into two incidents without hiding the underlying queue.

## What makes the project different

Most trace tools show activity. Agent Receipt asks whether that activity stayed inside a specific authority envelope and gives the accountable human a bounded decision: accept, investigate, or reject.

The model does not decide the verdict. IBM Granite receives a minimized, redacted fact bundle from a server-only route and may select which verified findings to emphasize. Invalid output, missing credentials, or a network failure uses the deterministic fallback. The review still works.

Recovery Plan v1 carries cited follow-up work into a later approval process. It contains no credentials or execution commands, records current external state as unknown, and grants no execution authority.

## Evidence for the judging criteria

| Criterion | Evidence to inspect |
|---|---|
| Technical execution | Exact-byte SHA-256, complete raw-event accounting, strict Zod boundaries, deterministic policy and verdict, server-only Granite route, 313 tests, production build, and release audit |
| Innovation | Intent-versus-action reconciliation, citation-validated model output, retained evidence drill-down, and a recovery export bound to the reviewed receipt |
| Feasibility | Native Trace v1 plus a documented OTLP/JSON shape, credential-free fallback, public Next.js deployment, receipt JSON, and Recovery Plan v1 JSON |
| Challenge fit | Decision support for managers reviewing work completed by AI collaborators, under the Future of Work wildcard theme |
| Real-world impact | A manager can see what happened, what crossed authority, what remains unknown, and what a controlled response workflow should review next |

These are prototype results from synthetic fixtures. They do not establish legal compliance, trusted trace capture, production-scale performance, or universal policy coverage.

## Reproduce the evidence

Run the declared evaluation:

```bash
npm ci
npm run eval
```

Run the complete gate:

```bash
npm run verify
```

The evaluation report explains the corpus and limitations: [docs/EVALUATION.md](EVALUATION.md). The public Bob build story records IBM Bob's primary role without attributing supporting-tool work to Bob: [docs/BOB_BUILD_STORY.md](BOB_BUILD_STORY.md).

## Product boundary

Agent Receipt reviews supplied evidence after a run. It does not watch an agent live, stop actions, execute remediation, certify compliance, prove that a trace is complete, or expose private chain-of-thought. Every conclusion is limited to the supplied trace and authority envelope.
