import { NextResponse } from "next/server";
import {
  ReceiptCopyRequestSchema,
  ReceiptCopyGenerationResultSchema,
  type ReceiptCopyRequest,
} from "@/core/schemas/index";
import { runPolicyEngine } from "@/core/policyEngine";
import { computeCoverage } from "@/core/coverage";
import { buildFactBundle } from "@/ai/factBundle";
import { generateReceiptCopy } from "@/ai/generateReceiptCopy";

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<NextResponse> {
  // Parse and validate request body
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const bodyResult = ReceiptCopyRequestSchema.safeParse(rawBody);
  if (!bodyResult.success) {
    return NextResponse.json(
      { error: "Request validation failed", issues: bodyResult.error.issues },
      { status: 400 },
    );
  }

  try {
    return await handleValidatedRequest(bodyResult.data);
  } catch {
    return NextResponse.json(
      { error: "Internal receipt-copy error" },
      { status: 500 },
    );
  }
}

async function handleValidatedRequest(
  body: ReceiptCopyRequest,
): Promise<NextResponse> {

  const {
    rawEventCount,
    events,
    accounting,
    authority,
    traceCompletionStatus,
  } =
    body;

  const coverage = computeCoverage({
    rawEventCount,
    events,
    accounting,
  });

  // Server-side policy execution
  const { findings, verdict, hasAssessmentLimitation } = runPolicyEngine({
    events,
    accounting,
    authority,
    traceCompletionStatus,
  });

  // Build fact bundle
  const bundle = buildFactBundle({
    events,
    findings,
    accounting,
    verdict,
    authority,
    hasAssessmentLimitation,
    coverage,
  });

  const generationResult = await generateReceiptCopy(bundle);
  const validated = ReceiptCopyGenerationResultSchema.safeParse(generationResult);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Internal error: receipt-copy response schema invalid" },
      { status: 500 },
    );
  }

  return NextResponse.json(validated.data, { status: 200 });
}
