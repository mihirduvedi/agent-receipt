import { describe, expect, it } from "vitest";

import { runHackathonEvaluation } from "../../src/evaluation/hackathonEvaluation.js";

describe("judge-facing automated evaluation", () => {
  it("meets the declared deterministic corpus and adversarial checks", async () => {
    const result = await runHackathonEvaluation();

    expect(result).toEqual({
      methodology: "automated_synthetic_corpus",
      corpus: {
        cases: 3,
        verdictCasesPassed: 3,
        rawRecords: 12,
        accountedRawRecords: 12,
        canonicalEvents: 11,
        nativeCases: 2,
        otlpCases: 1,
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
        receiptSchemaCasesPassed: 3,
        generatedItemsWithValidCitations: 18,
        invalidCitationRejected: true,
        invalidGraniteSelectionFellBack: true,
        materialUnparsedSpanForcedIncompleteVerdict: true,
      },
    });
  });
});
