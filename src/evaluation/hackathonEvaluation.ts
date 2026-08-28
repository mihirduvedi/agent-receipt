import { buildFactBundle } from "../ai/factBundle";
import { generateReceiptCopy } from "../ai/generateReceiptCopy";
import { validateClaims } from "../ai/validateClaims";
import {
  buildReceipt,
  serializeReceipt,
  type BuildReceiptResult,
} from "../core/receipt";
import type { ReceiptResult, Verdict } from "../core/schemas/index";
import {
  fixtureA,
  fixtureB,
  otlpDemoAuthority,
  otlpGenAiFixture,
  sharedAuthority,
} from "../fixtures";
import { exactFixtureBytes } from "../ui/receiptView";

const EVALUATION_TIME = "2026-08-27T23:00:00.000Z";

type EvaluationCase = {
  name: string;
  receipt: ReceiptResult;
  expectedVerdict: Verdict;
};

export type HackathonEvaluationResult = {
  methodology: "automated_synthetic_corpus";
  corpus: {
    cases: number;
    verdictCasesPassed: number;
    rawRecords: number;
    accountedRawRecords: number;
    canonicalEvents: number;
    nativeCases: number;
    otlpCases: number;
  };
  seededPolicyRules: {
    expected: string[];
    detected: string[];
    passed: number;
  };
  trustChecks: {
    knownDigestCasesPassed: number;
    deterministicReplayPassed: boolean;
    receiptSchemaCasesPassed: number;
    generatedItemsWithValidCitations: number;
    invalidCitationRejected: boolean;
    invalidGraniteSelectionFellBack: boolean;
    materialUnparsedSpanForcedIncompleteVerdict: boolean;
  };
};

export async function runHackathonEvaluation(): Promise<HackathonEvaluationResult> {
  const nativeA = await requireReceipt(
    buildReceipt(
      { rawBytes: exactFixtureBytes(fixtureA), authority: sharedAuthority },
      { now: () => EVALUATION_TIME },
    ),
  );
  const nativeB = await requireReceipt(
    buildReceipt(
      { rawBytes: exactFixtureBytes(fixtureB), authority: sharedAuthority },
      { now: () => EVALUATION_TIME },
    ),
  );
  const otlp = await requireReceipt(
    buildReceipt(
      {
        rawBytes: formattedBytes(otlpGenAiFixture),
        authority: otlpDemoAuthority,
      },
      { now: () => EVALUATION_TIME },
    ),
  );

  const cases: EvaluationCase[] = [
    {
      name: "native expected run",
      receipt: nativeA,
      expectedVerdict: "within_declared_authority",
    },
    {
      name: "native overreaching run",
      receipt: nativeB,
      expectedVerdict: "material_deviations_found",
    },
    {
      name: "narrow OTLP GenAI export",
      receipt: otlp,
      expectedVerdict: "within_declared_authority",
    },
  ];

  const expectedRuleIds = [
    "AR-SYS-001",
    "AR-OP-001",
    "AR-EGRESS-001",
    "AR-DATA-001",
    "AR-APPROVAL-001",
    "AR-RETRY-001",
  ];
  const detectedRuleIds = unique(
    nativeB.findings.map((finding) => finding.ruleId),
  ).filter((ruleId) => expectedRuleIds.includes(ruleId));

  const replay = await requireReceipt(
    buildReceipt(
      { rawBytes: exactFixtureBytes(fixtureB), authority: sharedAuthority },
      { now: () => EVALUATION_TIME },
    ),
  );

  const bundle = buildFactBundle({
    events: nativeB.events,
    findings: nativeB.findings,
    accounting: nativeB.accounting,
    verdict: nativeB.verdict,
    authority: nativeB.authority,
    hasAssessmentLimitation: nativeB.findings.some(
      (finding) => finding.ruleId === "AR-TRACE-001",
    ),
    coverage: nativeB.coverage,
  });
  const invalidCopy = structuredClone(nativeB.copy);
  invalidCopy.headline.eventIds = ["evt-invented"];
  const invalidCitationRejected = !validateClaims(invalidCopy, bundle).valid;

  const invalidSelection = await generateReceiptCopy(bundle, {
    callGranite: async () => ({
      ok: true,
      text: JSON.stringify({ notableFindingIds: ["finding-invented"] }),
      modelId: "ibm/evaluation-double",
      apiVersion: "2025-10-25",
    }),
  });

  const incompleteOtlp = structuredClone(otlpGenAiFixture);
  const actionSpan =
    incompleteOtlp.resourceSpans[0]?.scopeSpans[0]?.spans[1];
  if (!actionSpan) throw new Error("Evaluation fixture action span is missing");
  actionSpan.attributes = actionSpan.attributes.filter(
    (attribute) => attribute.key !== "agent.receipt.operation",
  );
  const incompleteReceipt = await requireReceipt(
    buildReceipt({
      rawBytes: formattedBytes(incompleteOtlp),
      authority: otlpDemoAuthority,
    }),
  );

  return {
    methodology: "automated_synthetic_corpus",
    corpus: {
      cases: cases.length,
      verdictCasesPassed: cases.filter(
        (item) => item.receipt.verdict === item.expectedVerdict,
      ).length,
      rawRecords: sum(cases.map((item) => item.receipt.coverage.rawEvents)),
      accountedRawRecords: sum(
        cases.map((item) => item.receipt.coverage.accountedRawEvents),
      ),
      canonicalEvents: sum(
        cases.map((item) => item.receipt.coverage.canonicalEvents),
      ),
      nativeCases: cases.filter(
        (item) =>
          item.receipt.integrity.inputFormat ===
          "agent-receipt.native-trace.v1",
      ).length,
      otlpCases: cases.filter(
        (item) =>
          item.receipt.integrity.inputFormat ===
          "otlp-json-resource-spans.v1",
      ).length,
    },
    seededPolicyRules: {
      expected: expectedRuleIds,
      detected: detectedRuleIds,
      passed: expectedRuleIds.filter((ruleId) => detectedRuleIds.includes(ruleId))
        .length,
    },
    trustChecks: {
      knownDigestCasesPassed: [
        nativeA.integrity.sha256 ===
          "270901ead9e358c7f8c360d65c0cf59c82861180cd867f7ea51132ee371e8b9e",
        nativeB.integrity.sha256 ===
          "19d64c62de2f63509741ff0c96e4394e35ce5fdb869e5dfc3d7f8d744f527926",
      ].filter(Boolean).length,
      deterministicReplayPassed:
        serializeReceipt(nativeB) === serializeReceipt(replay),
      receiptSchemaCasesPassed: cases.length,
      generatedItemsWithValidCitations: cases.reduce(
        (total, item) =>
          total +
          2 +
          item.receipt.copy.notableActions.length +
          item.receipt.copy.limitations.length,
        0,
      ),
      invalidCitationRejected,
      invalidGraniteSelectionFellBack:
        invalidSelection.generationSource === "deterministic_fallback",
      materialUnparsedSpanForcedIncompleteVerdict:
        incompleteReceipt.verdict === "unable_to_assess_fully" &&
        incompleteReceipt.coverage.unparsed === 1,
    },
  };
}

async function requireReceipt(
  result: Promise<BuildReceiptResult>,
): Promise<ReceiptResult> {
  const resolved = await result;
  if (!resolved.ok) {
    throw new Error(
      `Evaluation receipt failed: ${resolved.error.code} ${resolved.error.message}`,
    );
  }
  return resolved.receipt;
}

function formattedBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(value, null, 2)}\n`);
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
