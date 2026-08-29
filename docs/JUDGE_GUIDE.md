# Judge guide

Agent Receipt is a post-run review tool for an AI operations manager. It compares a completed agent trace with the authority a manager declared before review, then produces a deterministic, evidence-linked receipt.

**Live demo:** <https://receipt-one-flax.vercel.app>

**Public repository:** <https://github.com/mihirduvedi/agent-receipt>

**Current public release:** Evidence Gap Mode plus the Portable Receipt Verifier at product commit `4f96c4b34c3336a5f4facc1fde135a1368d0e89f`. Exact-SHA CI and Vercel deployment passed on August 28, 2026.

## If you have 30 seconds

1. Open `https://receipt-one-flax.vercel.app/?mode=verify&sample=valid`.
2. Read **PASS** and scan the eight replay gates: exact bytes, size, UTF-8, JSON, receipt contract, accounting, policy, and citations.
3. Change `sample=valid` to `sample=altered`. One exported finding was changed after the receipt was built, so deterministic policy and citation replay fail with **CHECK FAILED**.
4. Point to **What this cannot verify**. The checker proves internal consistency, not exporter identity, trace completeness, or signed provenance.

## If you have 60 seconds

1. Open the live demo and choose **Overreaching run**.
2. Keep the preset authority and select **Build receipt**.
3. Read the verdict and the two-incident brief. Open one evidence control to see the finding, canonical event, and retained source object together.
4. Open **AI boundary**. The panel shows fallback or Granite provenance, the exact minimized and redacted fact bundle, the evidence IDs Granite may select, and the raw fields held back from the model request.
5. Open **Recovery plan** and download Recovery Plan v1. The status confirms citation validation and a SHA-256 binding to the exact receipt.
6. Start a new review with **Incomplete OTLP run**. Build the receipt, then open **Evidence gaps**. The product accounts for all three source spans but refuses a clean or deviation verdict because one material action cannot be mapped and run termination is unknown.

The seeded run records six events. Three stay inside the declared authority. The other three capture an external spreadsheet attempt with an unknown result, its successful retry, and an unapproved customer-email send. Deterministic rules produce 12 findings and group them into two incidents without hiding the underlying queue.

## What makes the project different

Most trace tools show activity. Agent Receipt asks whether that activity stayed inside a specific authority envelope and gives the accountable human a bounded decision: accept, investigate, or reject.

The model does not decide the verdict. IBM Granite receives a minimized, redacted fact bundle from a server-only route and may select which verified findings to emphasize. The receipt makes that boundary inspectable instead of asking a judge to trust a model badge. Invalid output, missing credentials, or a network failure uses the deterministic fallback. The review still works.

Recovery Plan v1 carries cited follow-up work into a later approval process. It contains no credentials or execution commands, records current external state as unknown, and grants no execution authority.

Evidence Gap Mode completes the decision model. A run can be inside authority, outside authority, or not assessable from the supplied trace. The third state is not a softer risk score: it is a deterministic refusal with a raw-record ledger and exact evidence requests.

The Portable Receipt Verifier makes the exported artifact testable after it changes hands. It hashes the exact imported file, validates the strict receipt contract, recomputes event accounting, replays the deterministic policy result, and checks the cited copy. It runs in the browser without credentials or a network call.

## Evidence for the judging lenses

| Criterion | Evidence to inspect |
|---|---|
| Technical execution | Exact-byte SHA-256, complete raw-event accounting, strict Zod boundaries, deterministic policy and verdict, full exported-receipt replay, server-only Granite route, inspectable model projection, full test suite, production build, and release audit |
| Innovation | Intent-versus-action reconciliation, a deterministic evidence-refusal state, an inspectable AI boundary, citation-validated model output, retained raw-record drill-down, a recovery export bound to the reviewed receipt, and a portable checker that catches altered deterministic claims |
| Feasibility | Native Trace v1 plus a documented OTLP/JSON shape, credential-free fallback, public Next.js deployment, receipt and Recovery Plan JSON, and browser-only receipt verification with no service dependency |
| Challenge fit | Decision support for managers reviewing work completed by AI collaborators, under the Future of Work wildcard theme |
| Real-world impact | A manager can see what happened, what crossed authority, why the evidence may be insufficient, and what a controlled response workflow should review next |

The challenge page presents five lenses. The official rules use four scored headings and combine implementation with feasibility; the evidence above covers both versions.

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

The evaluation report explains the corpus and limitations: [docs/EVALUATION.md](EVALUATION.md). The [Portable Receipt Verifier contract](PORTABLE_RECEIPT_VERIFIER.md) records every gate and non-claim. The public Bob build story records IBM Bob's primary role without attributing supporting-tool work to Bob: [docs/BOB_BUILD_STORY.md](BOB_BUILD_STORY.md).

## Product boundary

Agent Receipt reviews supplied evidence after a run. It does not watch an agent live, stop actions, execute remediation, certify compliance, prove that a trace is complete, or expose private chain-of-thought. Every conclusion is limited to the supplied trace and authority envelope.
