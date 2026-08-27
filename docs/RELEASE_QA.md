# Release QA Ledger

**Snapshot:** August 26, 2026
**Scope:** Local six-day MVP release candidate
**Decision:** The two fixture journeys are locally usable in deterministic fallback mode. Public deployment and submission gates remain open.

This ledger separates automated evidence from browser, manual-accessibility, live-service, deployment, and submission evidence. A checked local test does not prove an unexecuted layer.

## Automated evidence

| Check | Latest result | What it supports |
|---|---|---|
| `npm run verify` | Passed: lint with zero warnings, strict TypeScript, 12 test files and 287 tests, production build, release audit | Current repository compiles and the tested deterministic and release-safety contracts pass |
| GitHub Actions `CI` | Passed for commit `f3897aa9a6aed63c9a54965a0f7860dd1240387f`: clean checkout, Node.js 24, dependency install, and `npm run verify` | Hosted verification matches the pushed release candidate |
| `npm run release:audit` | Passed: 56 staged source text files, 147 production-build text files, 474 dependency entries, 0 app-owned media assets, 8 exact build-root references in Next.js required-server metadata | Repeatable high-signal secret, personal-path/email, dependency-license, and app-asset-attribution checks; the deployed artifact must still be scanned separately |
| Strict UI static scan | Passed: 0 errors, 0 warnings | Source-level UI heuristics only; not rendered or assistive-technology proof |
| `git diff --check` | Passed | No whitespace-error patch defects |

The test suite covers exact-byte digest behavior, native adaptation and accounting, deterministic policy rules, Granite fact minimization/redaction/citation validation/fallback, receipt orchestration and export validation, both golden fixtures, and deterministic UI view helpers.

## Rendered browser evidence

Target: local Next.js development server at `http://localhost:3000`, deterministic fallback mode, synthetic fixtures.

| Journey or condition | Evidence checked | Result |
|---|---|---|
| Expected run | Sample intake → authority review → receipt; 3 of 3 canonical actions translated; CRM, internal knowledge base, and local workspace represented; restricted email data and external destinations correctly listed as having no observed activity | Passed |
| Overreaching run | Sample intake → authority review → receipt; 6 of 6 canonical actions translated; unknown spreadsheet attempt remains unknown; successful retry and email send remain separate; five systems represented | Passed |
| Evidence navigation | Summary system, no-observed, and action controls open canonical events plus retained raw objects | Passed |
| Drawer keyboard contract | Focus moves to Close; Escape closes; focus returns to the exact triggering control | Passed |
| Responsive layout | 390 px phone, 1280 px laptop, and 1440 px demo widths; summary and system content reflow without document-level horizontal overflow | Passed |
| Long-content resilience | Synthetic pasted trace with a long requested task, agent name, source system, and destination system at 390 px, 640 px, and 1280 px; no document-level overflow or controls outside their intended horizontal scroll regions | Passed after moving the single-column verdict reflow breakpoint to 700 px |
| Text enlargement equivalent | 640 CSS-pixel reflow, equivalent to a 1280 px viewport at 200% browser zoom; long verdict, task, map, table, and evidence content remained readable without clipping, overlap, or lost controls | Passed; this is reflow-equivalent evidence, not a cross-browser zoom certification |
| Accessibility-tree spot check | Chromium accessibility tree exposed the banner, main landmark, named receipt navigation, verdict/summary/movement/disposition regions and headings, focusable evidence/export controls, and a named evidence dialog with a focusable Close control | Passed; this is not a real screen-reader session |
| Status communication | Unknown and succeeded outcomes use explicit text labels in addition to color | Passed |
| Browser console | No warnings or errors in either fixture journey | Passed |

The browser checks used pointer interaction plus focused keyboard checks on the evidence dialog. The drawer kept forward and reverse traversal inside the dialog, Escape closed it, focus returned to the exact trigger, and body scrolling was restored. These checks are not a real screen-reader, real-touch-device, or cross-browser certification.

## Previously checked in the same local UI slice

- Sample, paste, and upload intake validation and recovery
- Editable authority validation
- Deterministic fallback identification
- Findings, coverage, system-map text equivalent, and integrity sections
- Reviewer disposition state and JSON export status
- Sticky navigation, step-transition scroll restoration, and invalid-form error focus

These checks should be repeated against the deployed commit before submission.

## Open release gates

- [ ] Run `npm ci` and `npm run verify` from a clean clone or clean Codespace.
- [x] Verify current GitHub Actions on the exact release commit.
- [ ] Configure and test live watsonx.ai credentials and an available Granite model; confirm fallback after a forced live failure.
- [x] Run a browser zoom/text-enlargement-equivalent pass on the core journey.
- [x] Test long task, system, and agent names at 390 px and 1280 px, plus the 640 px enlargement-equivalent width.
- [ ] Run a real screen-reader spot check. Chromium accessibility-tree inspection passed, but it is not screen-reader evidence.
- [ ] Deploy the exact release commit.
- [ ] Complete both fixture journeys on the public URL in a signed-out private window.
- [ ] Scan the public repository and build output for secrets, personal data, absolute local paths, and unlicensed assets.
- [ ] Confirm every teammate’s challenge eligibility, registration, and required IBM SkillsBuild Bob activity.
- [ ] Recheck the live deadline, rules, track selection, and prior-submission eligibility.
- [ ] Record a public video no longer than three minutes and verify its signed-out playback.
- [ ] Complete the project page and submit before the deadline.

## Release boundary

Agent Receipt is a post-run review aid. It does not prove trace completeness, trusted capture, real-world inactivity outside the supplied trace, legal compliance, tamper resistance, or access to private chain-of-thought. Every conclusion is qualified as based on the supplied trace and authority envelope.
