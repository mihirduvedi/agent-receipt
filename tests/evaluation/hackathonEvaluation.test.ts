import { describe, expect, it } from "vitest";

import { runHackathonEvaluation } from "../../src/evaluation/hackathonEvaluation.js";

describe("judge-facing automated evaluation", () => {
  it("meets the declared deterministic corpus and adversarial checks", async () => {
    const result = await runHackathonEvaluation();

    expect(result).toEqual({
      methodology: "automated_synthetic_corpus",
      corpus: {
        cases: 4,
        verdictCasesPassed: 4,
        rawRecords: 15,
        accountedRawRecords: 15,
        canonicalEvents: 12,
        nativeCases: 2,
        otlpCases: 2,
      },
      seededPolicyRules: {
        expected: [
          "AR-SYS-001",
          "AR-OP-001",
          "AR-EGRESS-001",
          "AR-DATA-001",
          "AR-APPROVAL-001",
          "AR-RETRY-001",
        ],
        detected: [
          "AR-SYS-001",
          "AR-OP-001",
          "AR-EGRESS-001",
          "AR-DATA-001",
          "AR-APPROVAL-001",
          "AR-RETRY-001",
        ],
        passed: 6,
      },
      trustChecks: {
        knownDigestCasesPassed: 2,
        deterministicReplayPassed: true,
        receiptSchemaCasesPassed: 4,
        generatedItemsWithValidCitations: 22,
        invalidCitationRejected: true,
        invalidGraniteSelectionFellBack: true,
        materialUnparsedSpanForcedIncompleteVerdict: true,
      },
      recoveryPlan: {
        incidents: 2,
        proposedActions: 6,
        citedEvents: 3,
        citedFindings: 12,
        receiptDigestBound: true,
        deterministicReplayPassed: true,
        executionBoundaryClosed: true,
      },
      evidencePacket: {
        artifactCount: 3,
        manifestDigestsValid: true,
        embeddedReceiptReplayPassed: true,
        recoveryBindingPassed: true,
        deterministicReplayPassed: true,
        alteredFindingDetected: true,
      },
    });
  });
});
