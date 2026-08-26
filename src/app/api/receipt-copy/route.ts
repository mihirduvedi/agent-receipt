import { z } from "zod";
import { NextResponse } from "next/server";
import {
  CanonicalEventSchema,
  RawEventAccountingSchema,
  AuthorityEnvelopeV1Schema,
  GeneratedReceiptCopySchema,
} from "@/core/schemas/index";
import { runPolicyEngine } from "@/core/policyEngine";
import { buildFactBundle } from "@/ai/factBundle";
import { callGranite } from "@/ai/graniteClient";
import { validateClaims } from "@/ai/validateClaims";
import { deterministicFallback } from "@/ai/deterministicFallback";

// ─── Request schema ───────────────────────────────────────────────────────────

const RequestBodySchema = z
  .object({
    events: z.array(CanonicalEventSchema),
    accounting: z.array(RawEventAccountingSchema),
    authority: AuthorityEnvelopeV1Schema,
    traceCompletionStatus: z.enum([
      "succeeded",
      "failed",
      "cancelled",
      "unknown",
    ]),
  })
  .strict()
  .superRefine(({ events, accounting }, context) => {
    const eventIds = new Set<string>();
    events.forEach((event, index) => {
      if (eventIds.has(event.eventId)) {
        context.addIssue({
          code: "custom",
          path: ["events", index, "eventId"],
          message: `Duplicate canonical eventId "${event.eventId}"`,
        });
      }
      eventIds.add(event.eventId);
    });

    const rawPointers = new Set<string>();
    const accountingCounts = new Map<string, number>();
    accounting.forEach((entry, index) => {
      if (rawPointers.has(entry.rawPointer)) {
        context.addIssue({
          code: "custom",
          path: ["accounting", index, "rawPointer"],
          message: `Duplicate raw-event accounting pointer "${entry.rawPointer}"`,
        });
      }
      rawPointers.add(entry.rawPointer);

      entry.canonicalEventIds.forEach((eventId) => {
        if (!eventIds.has(eventId)) {
          context.addIssue({
            code: "custom",
            path: ["accounting", index, "canonicalEventIds"],
            message: `Accounting references unknown canonical eventId "${eventId}"`,
          });
        }
        accountingCounts.set(
          eventId,
          (accountingCounts.get(eventId) ?? 0) + 1,
        );
      });
    });

    events.forEach((event, index) => {
      if (accountingCounts.get(event.eventId) !== 1) {
        context.addIssue({
          code: "custom",
          path: ["events", index, "eventId"],
          message: `Canonical eventId "${event.eventId}" must appear in exactly one accounting record`,
        });
      }
    });
  });

// ─── Response schema ──────────────────────────────────────────────────────────

const RouteResponseSchema = z.discriminatedUnion("generationSource", [
  z
    .object({
      generationSource: z.literal("granite"),
      copy: GeneratedReceiptCopySchema,
      modelId: z.string().min(1),
      modelApiVersion: z.string().min(1),
    })
    .strict(),
  z
    .object({
      generationSource: z.literal("deterministic_fallback"),
      copy: GeneratedReceiptCopySchema,
    })
    .strict(),
]);

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<NextResponse> {
  // Parse and validate request body
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const bodyResult = RequestBodySchema.safeParse(rawBody);
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
  body: z.infer<typeof RequestBodySchema>,
): Promise<NextResponse> {

  const { events, accounting, authority, traceCompletionStatus } =
    body;

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
  });

  // Step 1: Initial Granite call
  const initialResult = await callGranite(bundle);

  if (initialResult.ok) {
    const graniteAttempt = tryParseAndValidate(initialResult.text, bundle);
    if (graniteAttempt.valid) {
      const responseBody = {
        generationSource: "granite" as const,
        copy: graniteAttempt.copy,
        modelId: initialResult.modelId,
        modelApiVersion: initialResult.apiVersion,
      };
      const validated = RouteResponseSchema.safeParse(responseBody);
      if (validated.success) {
        return NextResponse.json(validated.data, { status: 200 });
      }
    }

    // Step 4: Repair attempt — collect errors from the failed initial attempt
    const repairErrors = graniteAttempt.valid ? [] : graniteAttempt.errors;
    const repairResult = await callGranite(bundle, { repairErrors });

    if (repairResult.ok) {
      const repairAttempt = tryParseAndValidate(repairResult.text, bundle);
      if (repairAttempt.valid) {
        const responseBody = {
          generationSource: "granite" as const,
          copy: repairAttempt.copy,
          modelId: repairResult.modelId,
          modelApiVersion: repairResult.apiVersion,
        };
        const validated = RouteResponseSchema.safeParse(responseBody);
        if (validated.success) {
          return NextResponse.json(validated.data, { status: 200 });
        }
      }
    }
  }
  // if !initialResult.ok → fall through to deterministic fallback below

  // Step 5: Deterministic fallback
  return runFallback(bundle);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ParseAttempt =
  | { valid: true; copy: z.infer<typeof GeneratedReceiptCopySchema> }
  | { valid: false; errors: string[] };

function tryParseAndValidate(
  text: string,
  bundle: ReturnType<typeof buildFactBundle>,
): ParseAttempt {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { valid: false, errors: ["Response is not valid JSON"] };
  }

  const schemaResult = GeneratedReceiptCopySchema.safeParse(json);
  if (!schemaResult.success) {
    return {
      valid: false,
      errors: schemaResult.error.issues.map((i) => i.message),
    };
  }

  const claimsResult = validateClaims(schemaResult.data, bundle);
  if (!claimsResult.valid) {
    return { valid: false, errors: claimsResult.errors };
  }

  return { valid: true, copy: schemaResult.data };
}

function runFallback(
  bundle: ReturnType<typeof buildFactBundle>,
): NextResponse {
  const fallbackCopy = deterministicFallback(bundle);

  const schemaResult = GeneratedReceiptCopySchema.safeParse(fallbackCopy);
  if (!schemaResult.success) {
    return NextResponse.json(
      { error: "Internal error: fallback copy failed schema validation" },
      { status: 500 },
    );
  }

  const claimsResult = validateClaims(schemaResult.data, bundle);
  if (!claimsResult.valid) {
    return NextResponse.json(
      { error: "Internal error: fallback copy failed claim validation" },
      { status: 500 },
    );
  }

  const responseBody = {
    generationSource: "deterministic_fallback" as const,
    copy: schemaResult.data,
  };

  const validated = RouteResponseSchema.safeParse(responseBody);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Internal error: fallback response schema invalid" },
      { status: 500 },
    );
  }

  return NextResponse.json(validated.data, { status: 200 });
}
