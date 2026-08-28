# Agent Receipt submission copy

This is paste-ready copy for the IBM SkillsBuild AI Builders Challenge with IBM Bob. Replace the video and team placeholders only after checking the final details in a signed-out browser.

## Project title

Agent Receipt

## One-line pitch

Agent Receipt turns a completed AI-agent trace and a manager-declared authority envelope into an evidence-linked receipt for deciding whether to accept, investigate, or reject the run.

## Selected theme

Wildcard: Build Intelligent Systems for the Future of Work

## Problem

AI agents can finish useful work while leaving a manager with an accountability gap. A success message rarely answers which systems the agent touched, whether it used restricted data, whether approval was present, or what happened after an uncertain side effect. General logs contain detail, but they do not reconcile observed actions with the authority a person actually granted.

## Solution

Agent Receipt reviews one completed run. It preserves the exact supplied bytes, accounts for every raw event, converts supported records into canonical actions, and compares those actions with a manager-confirmed authority envelope. Deterministic rules produce the findings and verdict. Every material conclusion opens into retained evidence.

When a run needs attention, the interface groups related findings into incidents and proposes cited recovery steps for human approval. The manager can export both the validated receipt and a Recovery Plan v1 file bound to that exact receipt by SHA-256. The recovery plan says that current state is unknown, approval is required, and no action was executed.

## AI and technical architecture

IBM Granite has a deliberately narrow runtime role. A server-only route recomputes deterministic findings, minimizes and redacts the facts, then asks Granite to select notable finding IDs. The application accepts only valid IDs and renders deterministic cited sentences. The receipt also exposes the exact read-only model projection, allowed citation IDs, omitted fields, and fallback or Granite provenance. Missing credentials, timeouts, malformed output, or invented citations use the same usable deterministic fallback.

The prototype is built with strict TypeScript, Next.js, React, and Zod. It supports Agent Receipt Native Trace v1 and one documented OTLP/JSON GenAI shape. The browser receives no model credentials, Granite cannot change the verdict, and missing evidence stays unknown.

## How IBM Bob was used

IBM Bob was the primary development tool for the trust-critical foundation: the versioned schemas, native adapter, raw-event accounting, deterministic policy engine, first Granite boundary, redaction, claim validation, fallback path, fixtures, and focused tests. Supporting tools performed independent review, later UI and orchestration work, documentation, and verification. The repository's Bob build story and assistance records keep those roles separate.

## Why it matters

Agent Receipt gives people a practical review surface for work completed by AI collaborators. It does not claim to watch agents live or certify compliance. It helps the accountable manager make a bounded decision from supplied evidence, then carry cited follow-up work into an approval process without silently granting execution authority.

## Reproducible evidence

- Three declared synthetic cases produce three expected deterministic verdicts.
- All twelve raw corpus records are explicitly accounted for.
- The overreaching fixture activates all six seeded authority-rule families.
- Invented generated citations and invalid Granite selections are rejected.
- The AI boundary preview uses the same minimized, redacted bundle builder as the server route and excludes retained raw fields.
- A material unparsed OTLP span forces `unable_to_assess_fully`.
- Recovery Plan v1 closes two incidents and six proposed actions over three events and twelve findings, with an independently checked receipt digest.
- `npm run verify` runs lint, strict type checking, the full tests, a production build, and release-safety scans.

These are synthetic-prototype results, not claims about universal policy coverage, production scale, legal compliance, or real-world false-positive rates.

## Links

- Live demo: <https://receipt-one-flax.vercel.app>
- Public repository: <https://github.com/mihirduvedi/agent-receipt>
- Public video, no more than three minutes: `[ADD VIDEO URL AFTER SIGNED-OUT PLAYBACK CHECK]`
- Team members: `[CONFIRM REGISTERED ELIGIBLE TEAM LIST]`

## Final form check

- Confirm Wildcard is selected and no teammate has a conflicting prior Wildcard submission.
- Confirm every teammate completed the required IBM SkillsBuild Bob activity.
- Open the repository, live demo, and video links while signed out.
- Confirm the video duration is at or below three minutes.
- Confirm GitHub Actions remains successful for current `main`. The deployed judge-path baseline `25cfde56ff520ec50580147e35b34dfb55525867` passed run `33189569253`. If the local Granite-boundary candidate is released, replace this baseline with its exact commit and successful hosted run before submission.
- Submit before August 31, 2026 at 11:59 PM ET / 8:59 PM PT, unless the live challenge page shows a newer deadline.
