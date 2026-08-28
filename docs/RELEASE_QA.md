# Release QA Ledger

**Snapshot:** August 28, 2026

**Scope:** Current local submission-polish candidate based on public commit `3c289c64d5d63c5459e86722a1143b1bd9220f26`

**Decision:** The exact public commit has successful GitHub CI and Vercel status, the repository is public, and both synthetic fixture journeys work at the production alias in deterministic fallback mode. Recovery Plan v1 is present in production. The current local candidate moves that existing export ahead of the long proposal list and refreshes the judge, submission, release, and project-guide artifacts. The candidate passed its final local verification; it still needs an approved commit and separate approved push before it can replace the public snapshot.

This ledger separates automated evidence from browser, manual-accessibility, live-service, deployment, and submission evidence. A checked local test does not prove an unexecuted layer.

## Automated evidence

| Check | Latest result | What it supports |
|---|---|---|
| `npm run verify` | Passed on August 28 on the current presentation candidate: lint with zero warnings, strict TypeScript, 15 test files and 313 tests, production build, release audit across 68 source files | The current local source compiles and the tested deterministic and release-safety contracts pass after the presentation change |
| GitHub Actions `CI` | [Run `33184141465`](https://github.com/mihirduvedi/agent-receipt/actions/runs/33184141465) passed for exact SHA `3c289c64d5d63c5459e86722a1143b1bd9220f26` on August 28 | A clean hosted install and complete `npm run verify` passed for the public release |
| `npm run eval` | One declared evaluation test passed on August 28 | Synthetic verdict, rule-family, accounting, deterministic replay, citation, fallback, OTLP limitation, and Recovery Plan v1 assertions passed |
| `npm audit --omit=dev --json` | Zero known production dependency vulnerabilities on August 28 | Current npm advisory data reported no production vulnerability |
| Strict UI static scan | 26 source files, 0 errors, 0 warnings | Source-level UI heuristics only; not rendered or assistive-technology proof |
| Markdown local-link audit | 39 local links checked across 14 Markdown files, 0 missing | Current judge-facing repository links resolve locally |

The full suite covers exact-byte digest behavior, native and narrow OTLP adaptation/accounting, deterministic policy rules, incident grouping, recovery proposals, Recovery Plan v1 binding and citation closure, Granite fact minimization/redaction/selection validation/fallback/token caching, route media and body limits, receipt orchestration and export validation, both golden fixtures, the synthetic evaluation corpus, release-source enumeration, and deterministic UI view helpers.

## Current public deployment

Target: <https://receipt-one-flax.vercel.app>, exact commit `3c289c64d5d63c5459e86722a1143b1bd9220f26`, synthetic fixtures only.

- The alias returned HTTP 200 on August 28.
- Vercel reported **Deployment has completed** for the exact SHA.
- The GitHub repository was publicly readable at <https://github.com/mihirduvedi/agent-receipt>.

| Journey or condition | August 28 result |
|---|---|
| Expected run at 390 px | Clean verdict, 3/3 coverage, deterministic fallback provenance, Recovery Plan v1 control present, no document-level overflow |
| Overreaching run | Material-deviation verdict, two incidents, six proposed recovery actions, 12 findings, 6/6 accounting, deterministic fallback provenance |
| Recovery Plan v1 | The control was present in both deployed journeys. Overreaching activation displayed the citation-validation and exact-receipt SHA-256 success state. Browser automation did not independently capture the Blob file event; focused tests cover serialization, digest binding, citation closure, and raw-source exclusion. |
| Mobile recovery section at 390 px | Document width equaled viewport width. The proposal cards, evidence controls, and export action remained readable. The current public placement puts the export after six long actions; the local candidate moves it immediately below the recovery heading. |
| Public links | Demo, repository, challenge page, submission platform, official-rules PDF, and SkillsBuild page returned HTTP 200 |

These checks used Chrome with pointer interaction and a responsive viewport override. They are not a cross-browser, physical-device, or screen-reader certification.

## Previously verified rendered behavior

The current implementation also has recorded browser evidence for:

- expected and overreaching intake, authority, and receipt flows;
- OTLP paste intake;
- long task, system, and agent names at 390 px, 640 px, and 1280 px;
- 640 CSS-pixel reflow as a 200% zoom equivalent;
- evidence-drawer focus entry, Tab/Shift+Tab containment, Escape close, focus restoration, and body-scroll restoration;
- human disposition and receipt JSON status;
- explicit text labels for unknown and succeeded outcomes;
- nine README screenshots at 1280 × 720 using only synthetic data;
- the complete project-guide PDF with bounds, font, page-grid, and readable-page inspection.

Earlier evidence remains useful for unchanged behavior. It does not replace a focused rerun on the current local presentation patch.

## Live watsonx.ai evidence

Local live-service checks on August 28 used the Dallas watsonx.ai Chat API and `ibm/granite-4-h-small`. Credentials stayed in `.env.local`; no key or access token was printed or committed.

| Condition | Result |
|---|---|
| IAM exchange and minimal Chat API request | HTTP 200; current response shape contained `choices[0].message.content` |
| Expected and overreaching fixture journeys | Valid compact finding selections; integrity recorded `granite`, model `ibm/granite-4-h-small`, API version `2025-10-25` |
| Invalid process-only credential | Safe deterministic fallback; no model metadata attached |
| Explicit `GRANITE_MODE=fallback` | Receipt remained fully usable without a network call |
| Rejected open-ended paraphrase diagnostic | Unsupported claims were rejected; the compact selection contract replaced the wider output surface |

The production browser journeys recorded `deterministic_fallback`. Local provider success does not prove that live Granite is configured in Vercel or that future provider behavior will be identical.

## Documentation and artifact state

- `README.md` links the live demo, public repository, judge guide, complete guide, PDF, evaluation, recovery contract, submission copy, and demo script.
- `docs/SUBMISSION.md` contains the verified public repository URL. The public-video and eligible-team fields remain intentionally unresolved.
- `docs/JUDGE_GUIDE.md` gives a 60-second path and maps concrete evidence to all five judging criteria.
- `docs/PROJECT_GUIDE.md` and the 55-page Version 1.2 PDF reflect the public-release facts and local-candidate boundary. The exact PDF rendered 55 pages, contained text on every page, passed bounds validation with 0 errors and 0 warnings, and passed readable four-page-sheet inspection across the full document.
- All application screenshots use synthetic fixture data and are declared in `docs/ASSET_LICENSES.md`.

## Open release and submission gates

- [x] Run a clean hosted install and `npm run verify` on exact public SHA `3c289c64d5d63c5459e86722a1143b1bd9220f26`.
- [x] Verify GitHub Actions and Vercel status on exact public SHA `3c289c64d5d63c5459e86722a1143b1bd9220f26`.
- [x] Make the GitHub repository public and verify it while signed out.
- [x] Complete both fixture journeys on the public Recovery Plan v1 release.
- [x] Configure and test live watsonx.ai locally, including deterministic fallback after forced failure.
- [x] Run responsive, long-content, zoom-equivalent, keyboard-dialog, and accessibility-tree checks on the core journey.
- [x] Finish `npm run verify`, strict UI scan, local-link audit, and the focused local browser rerun on the current presentation patch. At 390 px, the export precedes the proposal list, its descriptive/status references resolve, both fixture activations displayed their correct success states, and document width equaled viewport width. Browser automation did not independently capture either Blob file event.
- [ ] Obtain fresh approval before committing the current presentation patch.
- [ ] Obtain separate fresh approval before pushing; a `main` push can trigger automatic deployment.
- [ ] After any approved push, verify exact-SHA CI/Vercel status and repeat both public fixture journeys.
- [ ] Run a real screen-reader spot check if a stronger accessibility claim is desired.
- [ ] Have the custom proprietary terms reviewed by qualified counsel before relying on them for commercial enforcement.
- [ ] Confirm every teammate's eligibility, challenge registration, required IBM SkillsBuild Bob activity, and no conflicting prior Wildcard submission.
- [ ] Record a public video no longer than three minutes, add its URL to `docs/SUBMISSION.md`, and verify signed-out playback and captions.
- [ ] Complete and submit the project page before the official deadline.

## Release boundary

Agent Receipt is a post-run review aid. It does not prove trace completeness, trusted capture, real-world inactivity outside the supplied trace, legal compliance, tamper resistance, or access to private chain-of-thought. Every conclusion is limited to the supplied trace and authority envelope.
