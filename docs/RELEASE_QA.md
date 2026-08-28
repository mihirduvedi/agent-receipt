# Release QA Ledger

**Snapshot:** August 28, 2026

**Scope:** Deployed Granite-boundary product release `7b712e5df8ad781162c896ddcae0463b3160c210` and its refreshed submission evidence

**Decision:** Release `7b712e5df8ad781162c896ddcae0463b3160c210` is the verified feature-bearing baseline. It is committed and pushed on `main`, passed hosted CI, reached a ready Vercel production deployment, and passed both public fixture journeys plus the focused desktop/mobile Granite-boundary checks.

This ledger separates automated evidence from browser, manual-accessibility, live-service, deployment, and submission evidence. A checked local test does not prove an unexecuted layer.

## Automated evidence

| Check | Latest result | What it supports |
|---|---|---|
| `npm run verify` | Release candidate passed locally on August 28: lint with zero warnings, strict TypeScript, 16 test files and 315 tests, production build, release audit across 70 source files | The tested deterministic, UI-helper, build, and release-safety contracts pass locally |
| GitHub Actions `CI` | [Run `33196317863`](https://github.com/mihirduvedi/agent-receipt/actions/runs/33196317863) passed for exact product SHA `7b712e5df8ad781162c896ddcae0463b3160c210` on August 28 | A clean hosted install and complete `npm run verify` passed for the deployed Granite-boundary product release |
| `npm run eval` | One declared evaluation test passed on August 28 | Synthetic verdict, rule-family, accounting, deterministic replay, citation, fallback, OTLP limitation, and Recovery Plan v1 assertions passed |
| `npm audit --omit=dev --json` | Zero known production dependency vulnerabilities on August 28 | Current npm advisory data reported no production vulnerability |
| Strict UI static scan | 27 source files, 0 errors, 0 warnings | Source-level UI heuristics only; not rendered or assistive-technology proof |
| Markdown local-link audit | 41 local links checked across 15 tracked Markdown files, 0 missing | Current judge-facing repository links resolve locally |

The full suite covers exact-byte digest behavior, native and narrow OTLP adaptation/accounting, deterministic policy rules, incident grouping, recovery proposals, Recovery Plan v1 binding and citation closure, Granite fact minimization/redaction/selection validation/fallback/token caching, route media and body limits, receipt orchestration and export validation, both golden fixtures, the synthetic evaluation corpus, release-source enumeration, and deterministic UI view helpers.

## Current public deployment

Verified product target: <https://receipt-one-flax.vercel.app>, exact feature-bearing product commit `7b712e5df8ad781162c896ddcae0463b3160c210`, synthetic fixtures only. Vercel deployment `dpl_DKJmKuhrMnBRAjsvXceAsixPqZe6` reached **Ready** and received a successful exact-SHA commit status.

- The alias returned HTTP 200 on August 28.
- Vercel reported **Deployment has completed** for the exact SHA.
- The GitHub repository was publicly readable at <https://github.com/mihirduvedi/agent-receipt>.

| Journey or condition | August 28 result |
|---|---|
| Expected run at 390 px | Clean verdict, 3/3 coverage, deterministic fallback provenance, Recovery Plan v1 control present, no document-level overflow |
| Overreaching run | Material-deviation verdict, two incidents, six proposed recovery actions, 12 findings, 6/6 accounting, deterministic fallback provenance |
| Recovery Plan v1 | The control was present in both deployed journeys. Overreaching activation displayed the citation-validation and exact-receipt SHA-256 success state; the clean fixture displayed the explicit empty-plan success state. Browser automation did not independently capture either Blob file event; focused tests cover serialization, digest binding, citation closure, and raw-source exclusion. |
| Mobile recovery section at 390 px | Document width equaled viewport width. The export appeared immediately below the recovery heading and before the six-action proposal list. Its description/status references resolved, and the proposal cards and evidence controls remained readable. |
| Inspectable Granite boundary | Expected displayed 3 reduced events, 0 reduced findings, and citation allowlists of 3/0. Overreaching displayed 6/12 and allowlists of 6/12. Both showed deterministic fallback provenance in production. Expanded JSON omitted raw pointers, source event IDs, event input/output, metadata, policy comparison fields, and retained raw source data. |
| Public links | Demo, repository, challenge page, submission platform, official-rules PDF, and SkillsBuild page returned HTTP 200 |

These checks used Chrome with pointer interaction and a responsive viewport override. They are not a cross-browser, physical-device, or screen-reader certification.

## Deployed Granite-boundary browser evidence

The Granite-boundary release was exercised at the public production alias in the in-app Chromium browser at 1280 × 720 and 390 × 844:

- both fixtures completed with deterministic fallback provenance, matching the credential-free public deployment contract;
- the panel exposed the exact redacted projection, both citation allowlists, and the correct reduced counts for each fixture;
- expanded JSON omitted raw pointers, source event IDs, event input/output, metadata, policy comparison fields, and retained raw source data;
- desktop and mobile layouts had no document-level horizontal overflow;
- the JSON preview stayed inside a bounded scroll region;
- browser logs contained no warning or error entries;
- browser automation observed the Recovery Plan download control and success UI, but did not capture the browser-created Blob file event.

These checks establish the tested public deployment path, but not cross-browser behavior, a real screen-reader experience, live Granite in Vercel, or future provider availability.

## Previously verified rendered behavior

The current implementation also has recorded browser evidence for:

- expected and overreaching intake, authority, and receipt flows;
- OTLP paste intake;
- long task, system, and agent names at 390 px, 640 px, and 1280 px;
- 640 CSS-pixel reflow as a 200% zoom equivalent;
- evidence-drawer focus entry, Tab/Shift+Tab containment, Escape close, focus restoration, and body-scroll restoration;
- human disposition and receipt JSON status;
- explicit text labels for unknown and succeeded outcomes;
- ten README screenshots at 1280 × 720 using only synthetic data;
- the complete project-guide PDF with bounds, font, page-grid, and readable-page inspection.

The focused 390-pixel rerun was completed on deployed product release `7b712e5df8ad781162c896ddcae0463b3160c210`. Earlier evidence remains useful for the unchanged wider responsive, long-content, keyboard-dialog, and accessibility-tree checks.

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
- `docs/JUDGE_GUIDE.md` gives a 60-second path and maps concrete evidence to the five public challenge-page lenses while noting the official rules' four-heading formulation.
- `docs/PROJECT_GUIDE.md` and the 57-page Version 1.3 PDF document the now-deployed inspectable Granite boundary and keep local live-Granite evidence separate from credential-free production fallback evidence. The exact PDF contains text on every page, reports Version 1.3 with no stale Version 1.2 cover text, passes bounds validation with 0 errors and 0 warnings, and passed readable four-page-sheet inspection across all 57 pages.
- All application screenshots use synthetic fixture data and are declared in `docs/ASSET_LICENSES.md`.

## Open release and submission gates

- [x] Run a clean hosted install and `npm run verify` on exact product SHA `7b712e5df8ad781162c896ddcae0463b3160c210`.
- [x] Verify GitHub Actions and Vercel status on exact product SHA `7b712e5df8ad781162c896ddcae0463b3160c210`.
- [x] Make the GitHub repository public and verify it while signed out.
- [x] Complete both fixture journeys on the public Recovery Plan v1 release.
- [x] Configure and test live watsonx.ai locally, including deterministic fallback after forced failure.
- [x] Run responsive, long-content, zoom-equivalent, keyboard-dialog, and accessibility-tree checks on the core journey.
- [x] Finish `npm run verify`, strict UI scan, local-link audit, and the focused local browser rerun on the presentation patch.
- [x] Commit and push the judge-path product release after explicit approval.
- [x] Verify exact-SHA CI/Vercel status and repeat both public fixture journeys after the product push. At 390 px, the export preceded the proposal list, its descriptive/status references resolved, both fixture activations displayed their correct success states, and document width equaled viewport width. Browser automation did not independently capture either Blob file event.
- [x] Run the complete local gate, static UI scan, and desktop/mobile browser checks for the Granite-boundary release.
- [x] Commit and push the Granite-boundary release after fresh approval, verify exact-SHA hosted CI/Vercel status, and repeat both public fixture journeys.
- [ ] Run a real screen-reader spot check if a stronger accessibility claim is desired.
- [ ] Have the custom proprietary terms reviewed by qualified counsel before relying on them for commercial enforcement.
- [ ] Confirm every teammate's eligibility, challenge registration, required IBM SkillsBuild Bob activity, and no conflicting prior Wildcard submission.
- [ ] Record a public video no longer than three minutes, add its URL to `docs/SUBMISSION.md`, and verify signed-out playback and captions.
- [ ] Complete and submit the project page before the official deadline.

## Release boundary

Agent Receipt is a post-run review aid. It does not prove trace completeness, trusted capture, real-world inactivity outside the supplied trace, legal compliance, tamper resistance, or access to private chain-of-thought. Every conclusion is limited to the supplied trace and authority envelope.
