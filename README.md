# Agent Receipt

Agent Receipt turns a completed AI-agent trace and a manager-declared authority envelope into an evidence-linked review receipt. It helps an AI operations manager answer one question quickly:

> Can I accept this run from the supplied evidence, or should I investigate or reject it?

The product rule is simple: deterministic rules establish what happened relative to authority; IBM Granite may explain the verified result, but it never decides the verdict.

## What the prototype does

- Preserves the exact uploaded bytes and computes their SHA-256 before normalization.
- Accounts for every raw event as mapped, metadata-only, or unparsed.
- Compares observed actions with declared systems, operations, data restrictions, egress rules, volume limits, and approvals.
- Produces a deterministic verdict, findings, coverage record, and integrity metadata.
- Summarizes every canonical action in plain language, including systems and data referenced, work completed or attempted, and carefully qualified “no observed activity” statements.
- Opens every material conclusion into its canonical event and retained raw JSON object.
- Keeps the human accept/investigate/reject disposition separate from the product verdict.
- Exports a schema-validated receipt as JSON.
- Remains usable without credentials or network inference through a deterministic fallback.

## Run the demo locally

Requirements: Node.js 24 and npm 11.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then:

1. Choose **Expected run**.
2. Review the preset authority and select **Analyze against authority**.
3. Read the verdict, plain-language action summary, coverage, and integrity record.
4. Open an evidence control to compare the canonical event with the retained raw object.
5. Start a new review with **Overreaching run**.
6. Inspect the external spreadsheet attempt, successful retry, customer-email movement, and unapproved send.
7. Record a reviewer disposition and download the receipt JSON.

The samples are synthetic. The expected run contains three in-authority events. The overreaching run contains six events, including an unknown-outcome external write followed by a successful retry and an external message send.

## How it works

```text
exact trace bytes
      ↓ SHA-256 before normalization
versioned adapter → canonical events + raw-event accounting
      ↓
deterministic policy engine → findings + qualified verdict
      ↓
minimized, redacted fact bundle → server-only Granite route
      ↓ valid citations and schema, or deterministic fallback
evidence-linked receipt → human disposition → validated JSON export
```

The browser retains the source snapshot for evidence drill-down. Only minimized and redacted facts are eligible for the server-side Granite request. Generated claims are schema-checked and rejected if their event or finding citations are invalid. Missing fields remain unknown; the model is never asked to fill them in.

## IBM AI roles

### IBM Bob: primary development tool

IBM Bob produced substantive trust-critical implementation, including the evidence schemas, native adapter, raw-event accounting, deterministic policy engine, Granite boundary, redaction, claim validation, fallback behavior, fixtures, and focused tests. Supporting tools were used for independent safety review, orchestration hardening, UI implementation, visual/accessibility QA, and documentation. The repository records this division honestly in [docs/AI_ASSISTANCE_LOG.md](docs/AI_ASSISTANCE_LOG.md); work performed by another tool is not attributed to Bob.

### IBM Granite: bounded runtime explainer

Granite receives only a minimized, redacted, server-side fact bundle. It returns structured, cited copy. The application validates its schema, citations, finding-event relationships, supported facts, and prohibited assurance language before accepting the response. Timeout, credential, network, malformed-output, and citation failures fall back to deterministic copy without blocking the review flow.

## Trust boundary

| Layer | Deterministic? | Responsibility |
|---|---:|---|
| Exact-byte capture and digest | Yes | Preserve the supplied source and its reproducible hash |
| Adapter and event accounting | Yes | Normalize known fields and expose mapped, metadata-only, and unparsed counts |
| Policy findings and verdict | Yes | Reconcile observed actions with declared authority |
| Human action summary | Yes | Translate every canonical event without changing unknown outcomes |
| Granite copy | No | Explain only supplied, redacted facts with citations |
| Claim validation and fallback | Yes | Reject unsupported generated copy and keep the receipt usable |
| Reviewer disposition | Human | Record accept, investigate, reject, or unreviewed without changing the verdict |

## Verification

Run the complete local gate:

```bash
npm run verify
```

The latest local snapshot passes lint with zero warnings, strict TypeScript, 287 tests across 12 files, a production build, and the deterministic release audit. The audit checks tracked source and production-build text for high-signal secrets, personal paths, and personal email addresses; verifies dependency license metadata; and requires attribution for app-owned media. Strict UI static analysis reports zero errors and zero warnings. Rendered checks cover both synthetic fixture flows, evidence focus/close/restore behavior, explicit unknown outcomes, a complete text alternative for system movement, and 390 px, 1280 px, and 1440 px layouts without document-level overflow or browser-console errors.

These are local results, not proof of live Granite, deployed, signed-out, screen-reader, or cross-browser behavior. See the evidence and remaining gates in [docs/RELEASE_QA.md](docs/RELEASE_QA.md).

## Input contract

The MVP accepts one UTF-8 Agent Receipt Native Trace v1 JSON document up to 2 MiB through sample selection, file upload, or paste. It rejects JSONL, archives, remote URLs, binary formats, unsupported top-level schemas, and multiple runs in one file.

Duplicate JSON property names follow the platform’s `JSON.parse` behavior: the last value is retained. Inputs should not rely on duplicate names, and the committed fixtures contain none.

## Optional live Granite configuration

The default experience requires no credentials. To test watsonx.ai, copy `.env.example` to `.env.local`, set `GRANITE_MODE=live`, and supply only server-side values. Never commit credentials.

| Variable | Purpose |
|---|---|
| `WATSONX_API_KEY` | Server-only IBM Cloud API key |
| `WATSONX_PROJECT_ID` | watsonx.ai project identifier |
| `WATSONX_URL` | Regional watsonx.ai service URL |
| `WATSONX_MODEL_ID` | Granite model verified as available to the team |
| `GRANITE_MODE` | `live` for watsonx.ai; `fallback` for deterministic copy |

## GitHub Codespaces

The committed `.devcontainer/devcontainer.json` provisions Node.js 24, installs dependencies with `npm ci`, forwards port 3000, and configures the editor for TypeScript, ESLint, Prettier, and Vitest.

After the repository is available on GitHub:

1. Select **Code → Codespaces → Create codespace on main**.
2. Wait for `npm ci` to finish.
3. Run `npm run dev`.
4. Open the forwarded port.

IBM Bob IDE is a standalone application, not a Codespaces extension. Use the same repository in Bob IDE or install Bob Shell in the Codespace terminal. See [docs/IBM_BOB_WORKFLOW.md](docs/IBM_BOB_WORKFLOW.md).

## Challenge and project documents

This MVP targets the IBM SkillsBuild AI Builders Challenge with IBM Bob, Wildcard track. The recorded deadline is August 31, 2026 at 11:59 PM ET / 8:59 PM PT. Live rules can change; recheck the [challenge platform](https://aibuilderschallenge-bobhub.bemyapp.com/) and [official rules](https://res.cloudinary.com/ideation/image/upload/q_100,f_pdf,dpr_auto/id-ibm-skillsbuil-3eec69/pkqvg8j3q3a4teedy1kd.pdf) before submission.

- [Product requirements](docs/PRD.md)
- [Release QA ledger](docs/RELEASE_QA.md)
- [IBM Bob and supporting-tools workflow](docs/IBM_BOB_WORKFLOW.md)
- [AI assistance log](docs/AI_ASSISTANCE_LOG.md)

## Limits

Agent Receipt is a post-run review aid, not live interception, enforcement, legal compliance certification, trusted capture, a tamper-proof log, or access to private chain-of-thought. “No observed activity” means no supplied event referenced an item; it does not prove real-world inactivity outside the trace. Every conclusion applies only to the supplied trace and authority envelope.
