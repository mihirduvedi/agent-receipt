import {
  GeneratedReceiptCopySchema,
  ReceiptCopyGenerationResultSchema,
  type ReceiptCopyGenerationResult,
} from "../core/schemas/index";
import { deterministicFallback } from "./deterministicFallback";
import type { GraniteFactBundle } from "./factBundle";
import {
  callGranite as defaultCallGranite,
  type GraniteCaller,
  type GraniteCallSuccess,
} from "./graniteClient";
import { validateClaims } from "./validateClaims";

/** One deadline covers the initial call and the single permitted repair call. */
export const RECEIPT_COPY_TOTAL_TIMEOUT_MS = 8_000;

export type GenerateReceiptCopyDependencies = {
  callGranite?: GraniteCaller;
};

type ParseAttempt =
  | { valid: true; result: ReceiptCopyGenerationResult }
  | { valid: false; errors: string[] };

function parseGeneratedCopy(
  callResult: GraniteCallSuccess,
  bundle: GraniteFactBundle,
): ParseAttempt {
  let json: unknown;
  try {
    json = JSON.parse(callResult.text);
  } catch {
    return { valid: false, errors: ["Response is not valid JSON"] };
  }

  const schemaResult = GeneratedReceiptCopySchema.safeParse(json);
  if (!schemaResult.success) {
    return {
      valid: false,
      errors: schemaResult.error.issues.map((issue) => issue.message),
    };
  }

  const claimsResult = validateClaims(schemaResult.data, bundle);
  if (!claimsResult.valid) {
    return { valid: false, errors: claimsResult.errors };
  }

  const generationResult = ReceiptCopyGenerationResultSchema.safeParse({
    generationSource: "granite",
    copy: schemaResult.data,
    modelId: callResult.modelId,
    modelApiVersion: callResult.apiVersion,
  });
  if (!generationResult.success) {
    return {
      valid: false,
      errors: generationResult.error.issues.map((issue) => issue.message),
    };
  }

  return { valid: true, result: generationResult.data };
}

function buildValidatedFallback(
  bundle: GraniteFactBundle,
): ReceiptCopyGenerationResult {
  const copyResult = GeneratedReceiptCopySchema.safeParse(
    deterministicFallback(bundle),
  );
  if (!copyResult.success) {
    throw new Error("Deterministic fallback failed schema validation");
  }

  const claimsResult = validateClaims(copyResult.data, bundle);
  if (!claimsResult.valid) {
    throw new Error("Deterministic fallback failed claim validation");
  }

  const generationResult = ReceiptCopyGenerationResultSchema.safeParse({
    generationSource: "deterministic_fallback",
    copy: copyResult.data,
  });
  if (!generationResult.success) {
    throw new Error("Deterministic fallback result contract is invalid");
  }

  return generationResult.data;
}

async function runGraniteAttempts(
  bundle: GraniteFactBundle,
  fallback: ReceiptCopyGenerationResult,
  graniteCaller: GraniteCaller,
  signal: AbortSignal,
): Promise<ReceiptCopyGenerationResult> {
  try {
    const initialResult = await graniteCaller(bundle, { signal });
    if (signal.aborted || !initialResult.ok) {
      return fallback;
    }

    const initialAttempt = parseGeneratedCopy(initialResult, bundle);
    if (initialAttempt.valid) {
      return initialAttempt.result;
    }

    const repairResult = await graniteCaller(bundle, {
      repairErrors: initialAttempt.errors,
      signal,
    });
    if (signal.aborted || !repairResult.ok) {
      return fallback;
    }

    const repairAttempt = parseGeneratedCopy(repairResult, bundle);
    return repairAttempt.valid ? repairAttempt.result : fallback;
  } catch {
    // The deterministic path remains usable if an injected or future model
    // client rejects instead of returning a structured failure.
    return fallback;
  }
}

/**
 * Generate manager-readable receipt copy from an already validated/redacted fact
 * bundle. Model unavailability, invalid output, repair failure, and the total
 * deadline all resolve to the same validated deterministic fallback contract.
 */
export async function generateReceiptCopy(
  bundle: GraniteFactBundle,
  dependencies: GenerateReceiptCopyDependencies = {},
): Promise<ReceiptCopyGenerationResult> {
  const fallback = buildValidatedFallback(bundle);
  const graniteCaller = dependencies.callGranite ?? defaultCallGranite;
  const controller = new AbortController();

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<ReceiptCopyGenerationResult>((resolve) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      resolve(fallback);
    }, RECEIPT_COPY_TOTAL_TIMEOUT_MS);
  });

  try {
    return await Promise.race([
      runGraniteAttempts(
        bundle,
        fallback,
        graniteCaller,
        controller.signal,
      ),
      deadline,
    ]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}
