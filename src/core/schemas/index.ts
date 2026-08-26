import { z } from "zod";
import { isRfc3339WithTz } from "../timestamps";

// ─── Shared primitives ────────────────────────────────────────────────────────

/**
 * Zod schema for a timestamp string that must be RFC 3339 with an explicit
 * timezone (Z or ±HH:MM). The original string is preserved verbatim.
 */
export const Rfc3339Schema = z
  .string()
  .refine(isRfc3339WithTz, {
    message:
      "Timestamp must be RFC 3339 with an explicit timezone (e.g. 2024-01-01T00:00:00Z or +05:30)",
  });

export const CanonicalOperationSchema = z.enum([
  "read",
  "retrieve",
  "create",
  "update",
  "delete",
  "send",
  "execute",
  "approve",
  "error",
  "unknown",
]);
export type CanonicalOperation = z.infer<typeof CanonicalOperationSchema>;

// ─── Native trace v1 ─────────────────────────────────────────────────────────

export const NativeEventV1Schema = z.object({
  id: z.string(),
  parentId: z.string().optional(),
  timestamp: Rfc3339Schema,
  actor: z.object({
    type: z.enum(["agent", "workflow", "tool", "human"]),
    id: z.string(),
  }),
  operation: CanonicalOperationSchema,
  toolName: z.string().optional(),
  sourceSystem: z.string().optional(),
  destinationSystem: z.string().optional(),
  destinationBoundary: z
    .enum(["local", "internal", "external", "unknown"])
    .optional(),
  resourceType: z.string().optional(),
  dataCategories: z.array(z.string()).optional(),
  quantity: z
    .object({
      value: z.number(),
      unit: z.enum(["records", "messages", "bytes", "files"]),
    })
    .optional(),
  stateChange: z.boolean(),
  status: z.enum(["started", "succeeded", "failed", "cancelled", "unknown"]),
  approvalRef: z.string().optional(),
  actionKey: z.string().optional(),
  attempt: z.number().optional(),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  error: z
    .object({ code: z.string().optional(), message: z.string().optional() })
    .optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type NativeEventV1 = z.infer<typeof NativeEventV1Schema>;

export const NativeTraceV1Schema = z.object({
  schemaVersion: z.literal("agent-receipt.native-trace.v1"),
  traceId: z.string(),
  agent: z.object({
    id: z.string(),
    name: z.string().optional(),
    version: z.string().optional(),
  }),
  startedAt: Rfc3339Schema,
  completedAt: Rfc3339Schema.optional(),
  status: z.enum(["succeeded", "failed", "cancelled", "unknown"]),
  events: z.array(NativeEventV1Schema),
});
export type NativeTraceV1 = z.infer<typeof NativeTraceV1Schema>;

// ─── Authority envelope v1 ────────────────────────────────────────────────────

export const AuthorityEnvelopeV1Schema = z.object({
  schemaVersion: z.literal("agent-receipt.authority.v1"),
  policyId: z.string(),
  task: z.string(),
  permittedSystems: z.array(
    z.object({
      systemId: z.string(),
      boundary: z.enum(["local", "internal", "external"]),
    }),
  ),
  permittedOperations: z.array(CanonicalOperationSchema),
  prohibitedDataCategories: z.array(z.string()),
  externalEgressAllowed: z.boolean(),
  maxRecordsRead: z.number().optional(),
  approvalRequiredFor: z.array(CanonicalOperationSchema),
});
export type AuthorityEnvelopeV1 = z.infer<typeof AuthorityEnvelopeV1Schema>;

// ─── Canonical event v1 ───────────────────────────────────────────────────────

export const CanonicalEventSchema = z.object({
  schemaVersion: z.literal("agent-receipt.canonical-event.v1"),
  eventId: z.string(),
  sourceEventId: z.string().optional(),
  traceId: z.string(),
  parentEventId: z.string().optional(),
  sequence: z.number(),
  timestamp: Rfc3339Schema,
  actorType: z.enum(["agent", "workflow", "tool", "human"]),
  actorId: z.string(),
  operation: CanonicalOperationSchema,
  toolName: z.string().optional(),
  sourceSystem: z.string().optional(),
  destinationSystem: z.string().optional(),
  destinationBoundary: z.enum(["local", "internal", "external", "unknown"]),
  resourceType: z.string().optional(),
  dataCategories: z.array(z.string()),
  quantity: z
    .object({
      value: z.number(),
      unit: z.enum(["records", "messages", "bytes", "files"]),
    })
    .optional(),
  stateChange: z.boolean(),
  status: z.enum(["started", "succeeded", "failed", "cancelled", "unknown"]),
  approvalRef: z.string().optional(),
  actionKey: z.string().optional(),
  attempt: z.number().optional(),
  rawPointer: z.string(),
  adapterWarnings: z.array(z.string()),
  riskTags: z.array(z.string()),
});
export type CanonicalEvent = z.infer<typeof CanonicalEventSchema>;

// ─── Adapter result and accounting ───────────────────────────────────────────

export const ParseWarningSchema = z.object({
  pointer: z.string(),
  message: z.string(),
});
export type ParseWarning = z.infer<typeof ParseWarningSchema>;

export const RawEventAccountingSchema = z.object({
  rawPointer: z.string(),
  sourceEventId: z.string().optional(),
  status: z.enum(["mapped", "metadata-only", "unparsed"]),
  canonicalEventIds: z.array(z.string()),
  reason: z.string().optional(),
  material: z.boolean(),
});
export type RawEventAccounting = z.infer<typeof RawEventAccountingSchema>;

export const AdapterResultSchema = z.object({
  format: z.string(),
  adapterVersion: z.string(),
  events: z.array(CanonicalEventSchema),
  accounting: z.array(RawEventAccountingSchema),
  warnings: z.array(ParseWarningSchema),
});
export type AdapterResult = z.infer<typeof AdapterResultSchema>;

// ─── Finding ─────────────────────────────────────────────────────────────────

export const FindingSchema = z.object({
  findingId: z.string(),
  ruleId: z.string(),
  severity: z.enum(["low", "medium", "high"]),
  label: z.string(),
  description: z.string(),
  eventIds: z.array(z.string()),
  policyPath: z.string().optional(),
  observedValue: z.unknown().optional(),
  expectedValue: z.unknown().optional(),
});
export type Finding = z.infer<typeof FindingSchema>;

// ─── Verdict ──────────────────────────────────────────────────────────────────

export const VerdictSchema = z.enum([
  "within_declared_authority",
  "review_recommended",
  "material_deviations_found",
  "unable_to_assess_fully",
]);
export type Verdict = z.infer<typeof VerdictSchema>;

// ─── Receipt result ───────────────────────────────────────────────────────────

export const IntegrityMetadataSchema = z.object({
  sha256: z.string(),
  byteLength: z.number(),
  inputFormat: z.string(),
  schemaVersion: z.string(),
  adapterName: z.string(),
  adapterVersion: z.string(),
  authoritySchemaVersion: z.string(),
  policyId: z.string(),
  canonicalEventSchemaVersion: z.string(),
  receiptSchemaVersion: z.string(),
  generatedAt: Rfc3339Schema,
  generationSource: z.enum(["granite", "deterministic_fallback"]),
  modelId: z.string().optional(),
  modelApiVersion: z.string().optional(),
});
export type IntegrityMetadata = z.infer<typeof IntegrityMetadataSchema>;

export const ReceiptResultSchema = z.object({
  schemaVersion: z.literal("agent-receipt.receipt.v1"),
  verdict: VerdictSchema,
  verdictLabel: z.string(),
  findings: z.array(FindingSchema),
  events: z.array(CanonicalEventSchema),
  accounting: z.array(RawEventAccountingSchema),
  warnings: z.array(ParseWarningSchema),
  integrity: IntegrityMetadataSchema,
});
export type ReceiptResult = z.infer<typeof ReceiptResultSchema>;

// ─── UI length limits (P0 constants) ─────────────────────────────────────────

export const UI_LIMITS = {
  HEADLINE_MAX: 200,
  OUTCOME_MAX: 500,
  NOTABLE_ACTION_MAX: 300,
  LIMITATION_MAX: 300,
} as const;

// ─── Generated receipt copy (Granite output contract) ─────────────────────────

/**
 * The output schema Granite must produce. Strict objects reject unknown fields
 * from model-generated JSON. All text fields require at least one character.
 * limitations items intentionally have no findingIds — matches PRD § 9 exactly.
 */
export const GeneratedReceiptCopySchema = z.object({
  headline: z.object({
    text: z.string().min(1),
    eventIds: z.array(z.string()),
    findingIds: z.array(z.string()),
  }).strict(),
  outcome: z.object({
    text: z.string().min(1),
    eventIds: z.array(z.string()),
  }).strict(),
  notableActions: z.array(
    z.object({
      text: z.string().min(1),
      eventIds: z.array(z.string()),
      findingIds: z.array(z.string()),
    }).strict(),
  ),
  limitations: z.array(
    z.object({
      text: z.string().min(1),
      eventIds: z.array(z.string()),
    }).strict(),
  ),
}).strict();
export type GeneratedReceiptCopy = z.infer<typeof GeneratedReceiptCopySchema>;
