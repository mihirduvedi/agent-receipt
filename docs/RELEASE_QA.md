# Release QA Ledger

**Snapshot:** August 28, 2026

**Scope:** Current local Recovery Plan v1 candidate plus committed and deployed `0d3881fdb1f9304cb9d2c50298384283fca25560`

**Decision:** The local candidate passes the complete automated gate, strict UI source scan, native browser journeys, recovery-export checks, and compact live-Granite path. The public `0d3881f` deployment completes both synthetic journeys in deterministic fallback mode. Recovery Plan v1 is newer than that commit and is not yet committed, pushed, or deployed.

This ledger separates automated evidence from browser, manual-accessibility, live-service, deployment, and submission evidence. A checked local test does not prove an unexecuted layer.

## Automated evidence

| Check | Latest result | What it supports |
|---|---|---|
| `npm run verify` | Passed on August 28: lint with zero warnings, strict TypeScript, 15 test files and 313 tests, production build, release audit | Current local source compiles and the tested deterministic and release-safety contracts pass |
| GitHub Actions `CI` | Success for exact committed/deployed SHA `0d3881fdb1f9304cb9d2c50298384283fca25560`, run `33178195979`, on August 28 | Hosted verification supports the current public snapshot; the newer local candidate still needs exact-SHA CI after an approved push |
| `npm run release:audit` | Passed: 67 release-scoped source text files, 147 production-build text files, 474 dependency entries, 9 app-owned media assets, 8 exact build-root references in required-server metadata | Repeatable high-signal secret, personal-path/email, dependency-license, and app-asset-attribution checks; source enumeration includes untracked candidate files but does not replace public-repository or deployed-artifact review |
| Strict UI static scan | Passed across 46 scanned source files: 0 errors, 0 warnings | Source-level UI heuristics only; not rendered or assistive-technology proof |
| Text-source `git diff --check` | Passed; generated PDF and JPEG binaries were excluded | No whitespace-error defects in the current text patch |

The test suite covers exact-byte digest behavior, native and narrow OTLP adaptation/accounting, deterministic policy rules, incident grouping, recovery proposals, Recovery Plan v1 binding and citation closure, Granite fact minimization/redaction/selection validation/fallback/token caching, route media and body limits, receipt orchestration and export validation, both golden fixtures, the synthetic evaluation corpus, release-source enumeration, and deterministic UI view helpers.

## Rendered browser evidence

Targets: local Next.js candidate at `http://localhost:3002` and public Vercel deployment at `https://receipt-one-flax.vercel.app`, synthetic fixtures only.

| Journey or condition | Evidence checked | Result |
|---|---|---|
| Expected run | Sample intake → authority review → receipt at 390 px; 3 of 3 canonical actions translated; clean verdict and explicit provenance | Passed with live Granite in the local candidate and deterministic fallback on public `0d3881f` |
| Overreaching run | Sample intake → authority review → receipt at 1280 px and 390 px; 6 of 6 canonical actions translated; unknown spreadsheet attempt remains unknown; successful retry and email send remain separate; 12 findings rendered | Passed with live Granite in the local candidate and deterministic fallback on public `0d3881f` |
| Incident brief | The 12 findings group into exactly two incidents by cited-event overlap or shared explicit action key; both evidence controls open the retained supporting records | Passed at 1280 px and 390 px; detailed findings remain present |
| Human-approved recovery plan | Six cited proposals render with authority and reversibility labels; every action says proposed/not executed and no execution control is present | Passed at 1280 px and 390 px |
| Recovery Plan v1, overreaching run | Export control remains readable; success status reports citation validation and exact-receipt SHA-256 binding; document width equals viewport width at 1280 px and 390 px | Passed in the local candidate; schema serialization and the downloaded status path are covered, but the browser download file was not independently captured |
| Recovery Plan v1, clean run | Clean receipt exports an explicit empty plan and does not invent incidents or actions | Passed at 390 px in the local candidate; focused test validates empty arrays |
| Recovery evidence keyboard contract | Multi-finding, multi-event drawer receives focus on Close; Escape closes it, restores body scrolling, and returns focus to the exact recovery trigger | Passed |
| OTLP paste journey | Pasted documented OTLP/JSON shape → completed authority → receipt at 840 px | Passed: `otlp-json-resource-spans.v1`, `otlpGenAi 1.0.0`, 3/3 raw spans accounted for, 2 mapped, 1 metadata-only, 0 unparsed, clean verdict under the supplied OTLP test authority |
| Evidence wording | Quoted systems, operations, action keys, and statuses keep punctuation outside the quotation marks; the visible identifier remains byte-for-byte recognizable | Passed in the rendered finding queue and evidence drawer, with focused unit/integration expectations |
| Source provenance | Synthetic, uploaded, and pasted inputs have distinct labels; size is displayed in bytes; export language refers to the source trace rather than assuming an upload | Passed by rendered synthetic checks plus focused helper tests |
| Evidence navigation | Summary system, no-observed, and action controls open canonical events plus retained raw objects | Passed |
| Drawer keyboard contract | Focus moves to Close; Escape closes; focus returns to the exact triggering control | Passed |
| Responsive layout | Current 390 px receipt has `documentWidth === viewportWidth === 390`; the receipt navigation and data tables retain intentional internal horizontal scrolling | Passed; 1280 px screenshots were also re-inspected at original size |
| Long-content resilience | Synthetic pasted trace with a long requested task, agent name, source system, and destination system at 390 px, 640 px, and 1280 px; no document-level overflow or controls outside their intended horizontal scroll regions | Passed after moving the single-column verdict reflow breakpoint to 700 px |
| Text enlargement equivalent | 640 CSS-pixel reflow, equivalent to a 1280 px viewport at 200% browser zoom; long verdict, task, map, table, and evidence content remained readable without clipping, overlap, or lost controls | Passed; this is reflow-equivalent evidence, not a cross-browser zoom certification |
| Accessibility-tree spot check | Chromium accessibility tree exposed the banner, main landmark, named receipt navigation, verdict/summary/movement/disposition regions and headings, focusable evidence/export controls, and a named evidence dialog with a focusable Close control | Passed; this is not a real screen-reader session |
| Status communication | Unknown and succeeded outcomes use explicit text labels in addition to color | Passed |
| Browser diagnostics | No rendered error summary appeared in the current expected, overreaching, or deployed journeys; earlier current-candidate console inspection recorded no warnings or errors | Passed for the inspected browser surface; this is not cross-browser evidence |
| README release screenshots | Nine production-build captures at 1280 × 720, including the new two-incident brief and human-approved recovery plan | Passed original-size visual inspection; every JPEG uses only the synthetic fixture and is declared in `docs/ASSET_LICENSES.md` |
| Project guide PDF | Rebuilt from the August 28 editable source; all 55 Letter pages rendered, extracted as text, and inspected through overview plus readable four-page sheets; bounds validator reported 0 errors and 0 warnings | Passed with no clipping, overlap, unreadable code, broken tables, or stale release-state wording found |

The local browser checks used pointer interaction plus focused keyboard checks on the evidence dialog. The drawer kept forward and reverse traversal inside the dialog, Escape closed it, focus returned to the exact trigger, and body scrolling was restored. The August 28 deployed overreaching journey opened and closed incident evidence, recorded **Investigate**, and triggered the receipt download status. These checks are not a real screen-reader, real-touch-device, or cross-browser certification.

## Current deployed evidence

The production alias returned HTTP 200 and Vercel reported a successful commit status for `0d3881fdb1f9304cb9d2c50298384283fca25560`.

| Journey | August 28 result |
|---|---|
| Expected fixture | Clean verdict, 3/3 raw-event accounting, `deterministic_fallback`, no model metadata, no document overflow at 1280 px |
| Overreaching fixture | Material-deviation verdict, two incidents, recovery plan, 12 findings, 6/6 accounting, evidence drawer, Investigate disposition, receipt-download status, `deterministic_fallback`, no document overflow at 1280 px |
| Recovery Plan v1 export | Not present, as expected: this feature exists only in the newer local working candidate |

These are current deployed browser results, not proof that the public site already contains the local Recovery Plan v1 candidate.

## Live watsonx.ai evidence

Target: local Next.js servers using the Dallas watsonx.ai endpoint and the provided `ibm/granite-4-h-small` model through `/ml/v1/text/chat?version=2025-10-25`. Credentials stayed in `.env.local`; diagnostics printed no key or access token.

| Journey or condition | Evidence checked | Result |
|---|---|---|
| Authentication and model smoke test | IBM IAM token exchange, minimal Chat API request, and current response shape | Passed: IAM and watsonx.ai returned HTTP 200; the response contained `choices[0].message.content` |
| Expected run | Full sample intake → authority → receipt with the current compact-selection live server route | Passed: integrity recorded `granite`, model `ibm/granite-4-h-small`, and model API `2025-10-25` |
| Overreaching run | Full six-event sample with 12 deterministic findings and the current compact-selection route | Passed: Granite returned valid finding IDs and the app rendered exact deterministic cited sentences; integrity recorded `granite` |
| Prior open-ended-copy diagnostic | Earlier boundary asked Granite to reproduce full notable-action prose | Safe fallback: unsupported paraphrases were rejected. The compact selection contract replaced that wider output surface. |
| Forced live failure | Separate local server with an intentionally invalid process-only API key override; the real `.env.local` was not changed | Passed: the receipt remained available as **Deterministic template**, integrity recorded `deterministic_fallback`, and no model metadata was attached |
| Explicit fallback mode | Current production build on a separate local server with `GRANITE_MODE=fallback` | Passed: expected receipt completed with `deterministic_fallback` provenance and no browser warnings/errors |

The current local candidate completed both fixture journeys with `granite`, model `ibm/granite-4-h-small`, and API version `2025-10-25` on August 28, 2026. The public `0d3881f` browser journeys displayed `deterministic_fallback`, which remains a fully usable and intentional release mode. Local live checks do not prove future provider availability.

## Previously checked in the same local UI slice

- Sample, paste, and upload intake validation and recovery
- Editable authority validation
- Deterministic fallback identification
- Findings, coverage, system-map text equivalent, and integrity sections
- Reviewer disposition state and JSON export status
- Sticky navigation, step-transition scroll restoration, and invalid-form error focus

These checks should be repeated against the exact final deployed commit after the approved Recovery Plan v1 push.

## Open release gates

- [ ] Run `npm ci` and `npm run verify` from a clean clone or clean Codespace.
- [ ] Verify GitHub Actions on the exact final candidate commit. Run `33178195979` passed for current public SHA `0d3881f`; the local candidate is newer.
- [x] Configure and test live watsonx.ai credentials with `ibm/granite-4-h-small`; confirm deterministic fallback after a forced live failure and after rejected generated claims.
- [x] Run a browser zoom/text-enlargement-equivalent pass on the core journey.
- [x] Test long task, system, and agent names at 390 px and 1280 px, plus the 640 px enlargement-equivalent width.
- [ ] Run a real screen-reader spot check. Chromium accessibility-tree inspection passed, but it is not screen-reader evidence.
- [x] Verify that exact commit `0d3881fdb1f9304cb9d2c50298384283fca25560` has successful GitHub CI and Vercel status.
- [x] Complete both fixture journeys on the current public `0d3881f` snapshot.
- [ ] After an approved final push, recheck the production alias and repeat both public journeys against the new exact SHA, including Recovery Plan v1.
- [ ] Scan the public repository and build output for secrets, personal data, absolute local paths, and unlicensed assets.
- [x] Add a proprietary evaluation license, declare all nine project-owned README screenshots, and include documentation screenshots in the deterministic asset audit.
- [ ] Have the custom proprietary terms reviewed by qualified counsel before relying on them for commercial enforcement.
- [ ] Make the GitHub repository public after explicit approval; it is currently private.
- [ ] Confirm every teammate’s challenge eligibility, registration, and required IBM SkillsBuild Bob activity.
- [x] Recheck the live challenge page on August 28: Wildcard future-of-work theme, Bob primary-development requirement, public repository, public video no longer than three minutes, and August 31 at 11:59 PM ET deadline.
- [ ] Confirm track selection and no prior-submission eligibility conflict for the actual team.
- [ ] Record a public video no longer than three minutes and verify its signed-out playback.
- [ ] Complete the project page and submit before the deadline.

## Release boundary

Agent Receipt is a post-run review aid. It does not prove trace completeness, trusted capture, real-world inactivity outside the supplied trace, legal compliance, tamper resistance, or access to private chain-of-thought. Every conclusion is qualified as based on the supplied trace and authority envelope.
