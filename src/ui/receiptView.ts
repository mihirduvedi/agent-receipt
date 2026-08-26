import {
  AuthorityEnvelopeV1Schema,
  CanonicalOperationSchema,
  NativeTraceV1Schema,
} from "../core/schemas/index";
import type {
  AuthorityEnvelopeV1,
  CanonicalEvent,
  CanonicalOperation,
  Finding,
  NativeTraceV1,
  ReceiptResult,
} from "../core/schemas/index";

export const ALL_OPERATIONS = CanonicalOperationSchema.options;

export type AuthorityDraft = {
  policyId: string;
  task: string;
  permittedSystems: Array<{
    systemId: string;
    boundary: "local" | "internal" | "external";
  }>;
  permittedOperations: CanonicalOperation[];
  prohibitedDataCategories: string;
  externalEgressAllowed: boolean;
  maxRecordsRead: string;
  approvalRequiredFor: CanonicalOperation[];
};

export type IntakeValidation =
  | { ok: true; trace: NativeTraceV1 }
  | {
      ok: false;
      code: "input_too_large" | "invalid_utf8" | "invalid_json" | "unsupported_format" | "invalid_trace";
      message: string;
      issues?: Array<{ path: string; message: string }>;
    };

export type AuthorityDraftValidation =
  | { ok: true; authority: AuthorityEnvelopeV1 }
  | { ok: false; issues: Array<{ path: string; message: string }> };

export type ReceiptMetrics = {
  events: number;
  systems: number;
  stateChanges: number;
  externalTransfers: number;
  approvals: number;
  errors: number;
  findings: number;
};

export type SystemEdge = {
  eventId: string;
  from: string;
  to: string;
  operation: CanonicalOperation;
  boundary: CanonicalEvent["destinationBoundary"];
  detail: string;
};

export type SystemsByBoundary = Record<
  "local" | "internal" | "external" | "unknown",
  string[]
>;

type Boundary = CanonicalEvent["destinationBoundary"];

export type HumanSystemSummary = {
  systemId: string;
  boundaries: Boundary[];
  roles: Array<"source" | "destination">;
  operations: CanonicalOperation[];
  statuses: CanonicalEvent["status"][];
  dataCategories: string[];
  eventIds: string[];
};

export type HumanActionSummary = {
  systems: HumanSystemSummary[];
  noObservedActivity: Array<{
    text: string;
    eventIds: string[];
  }>;
  actions: Array<{
    eventId: string;
    sequence: number;
    status: CanonicalEvent["status"];
    text: string;
  }>;
};

export function exactFixtureBytes(trace: NativeTraceV1): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(trace, null, 2)}\n`);
}

export function validateTraceBytes(
  rawBytes: Uint8Array,
  maxBytes: number,
): IntakeValidation {
  if (rawBytes.byteLength > maxBytes) {
    return {
      ok: false,
      code: "input_too_large",
      message: `Trace input exceeds the ${maxBytes}-byte (2 MiB) limit.`,
    };
  }

  let sourceText: string;
  try {
    sourceText = new TextDecoder("utf-8", { fatal: true }).decode(rawBytes);
  } catch {
    return {
      ok: false,
      code: "invalid_utf8",
      message: "Trace input must be valid UTF-8 JSON.",
    };
  }

  let rawDocument: unknown;
  try {
    rawDocument = JSON.parse(sourceText) as unknown;
  } catch (error) {
    return {
      ok: false,
      code: "invalid_json",
      message: formatJsonLocation(error, sourceText),
    };
  }

  if (
    typeof rawDocument !== "object" ||
    rawDocument === null ||
    !("schemaVersion" in rawDocument) ||
    rawDocument.schemaVersion !== "agent-receipt.native-trace.v1"
  ) {
    return {
      ok: false,
      code: "unsupported_format",
      message:
        "Unsupported trace format. Expected agent-receipt.native-trace.v1 JSON.",
    };
  }

  const trace = NativeTraceV1Schema.safeParse(rawDocument);
  if (!trace.success) {
    return {
      ok: false,
      code: "invalid_trace",
      message: "Trace validation failed. Correct the named fields and try again.",
      issues: trace.error.issues.map((issue) => ({
        path: issue.path.length > 0 ? issue.path.join(".") : "trace",
        message: issue.message,
      })),
    };
  }

  return { ok: true, trace: trace.data };
}

export function authorityToDraft(
  authority: AuthorityEnvelopeV1,
): AuthorityDraft {
  return {
    policyId: authority.policyId,
    task: authority.task,
    permittedSystems: authority.permittedSystems.map((system) => ({ ...system })),
    permittedOperations: [...authority.permittedOperations],
    prohibitedDataCategories: authority.prohibitedDataCategories.join(", "),
    externalEgressAllowed: authority.externalEgressAllowed,
    maxRecordsRead:
      authority.maxRecordsRead === undefined
        ? ""
        : String(authority.maxRecordsRead),
    approvalRequiredFor: [...authority.approvalRequiredFor],
  };
}

export function blankAuthorityDraft(): AuthorityDraft {
  return {
    policyId: "",
    task: "",
    permittedSystems: [{ systemId: "", boundary: "internal" }],
    permittedOperations: [],
    prohibitedDataCategories: "",
    externalEgressAllowed: false,
    maxRecordsRead: "",
    approvalRequiredFor: [],
  };
}

export function validateAuthorityDraft(
  draft: AuthorityDraft,
): AuthorityDraftValidation {
  const maxRecordsRead = draft.maxRecordsRead.trim();
  const candidate = {
    schemaVersion: "agent-receipt.authority.v1",
    policyId: draft.policyId,
    task: draft.task,
    permittedSystems: draft.permittedSystems,
    permittedOperations: draft.permittedOperations,
    prohibitedDataCategories: splitDataCategories(
      draft.prohibitedDataCategories,
    ),
    externalEgressAllowed: draft.externalEgressAllowed,
    ...(maxRecordsRead === "" ? {} : { maxRecordsRead: Number(maxRecordsRead) }),
    approvalRequiredFor: draft.approvalRequiredFor,
  };
  const result = AuthorityEnvelopeV1Schema.safeParse(candidate);
  if (!result.success) {
    return {
      ok: false,
      issues: result.error.issues.map((issue) => ({
        path: issue.path.length > 0 ? issue.path.join(".") : "authority",
        message: issue.message,
      })),
    };
  }
  return { ok: true, authority: result.data };
}

export function summarizeReceipt(receipt: ReceiptResult): ReceiptMetrics {
  const systems = new Set<string>();
  for (const event of receipt.events) {
    if (event.sourceSystem) systems.add(event.sourceSystem);
    if (event.destinationSystem) systems.add(event.destinationSystem);
  }

  return {
    events: receipt.events.length,
    systems: systems.size,
    stateChanges: receipt.events.filter((event) => event.stateChange).length,
    externalTransfers: receipt.events.filter(
      (event) => event.destinationBoundary === "external",
    ).length,
    approvals: receipt.events.filter(
      (event) => event.operation === "approve" && event.status === "succeeded",
    ).length,
    errors: receipt.events.filter(
      (event) => event.operation === "error" || event.status === "failed",
    ).length,
    findings: receipt.findings.length,
  };
}

export function sortFindingsByAttention(
  findings: Finding[],
  events: CanonicalEvent[],
): Finding[] {
  const severityRank = { high: 0, medium: 1, low: 2 } as const;
  const sequenceByEventId = new Map(
    events.map((event) => [event.eventId, event.sequence]),
  );
  return [...findings].sort((left, right) => {
    const severity = severityRank[left.severity] - severityRank[right.severity];
    if (severity !== 0) return severity;
    const leftSequence = Math.min(
      ...left.eventIds.map((eventId) => sequenceByEventId.get(eventId) ?? Infinity),
    );
    const rightSequence = Math.min(
      ...right.eventIds.map((eventId) => sequenceByEventId.get(eventId) ?? Infinity),
    );
    return leftSequence - rightSequence;
  });
}

export function buildSystemEdges(events: CanonicalEvent[]): SystemEdge[] {
  return events.map((event) => {
    const from = event.sourceSystem ?? event.actorId;
    const to =
      event.destinationSystem ??
      (event.sourceSystem ? event.actorId : "unknown destination");
    return {
      eventId: event.eventId,
      from,
      to,
      operation: event.operation,
      boundary: event.destinationBoundary,
      detail: [
        event.dataCategories.length > 0
          ? event.dataCategories.join(", ")
          : "data category unknown",
        event.quantity
          ? `${event.quantity.value} ${event.quantity.unit}`
          : "quantity unknown",
      ].join(" · "),
    };
  });
}

export function groupSystemsByBoundary(
  events: CanonicalEvent[],
  authority: AuthorityEnvelopeV1,
): SystemsByBoundary {
  const groups: Record<keyof SystemsByBoundary, Set<string>> = {
    local: new Set(),
    internal: new Set(),
    external: new Set(),
    unknown: new Set(),
  };
  const declaredBoundary = new Map(
    authority.permittedSystems.map((system) => [system.systemId, system.boundary]),
  );

  for (const event of events) {
    if (event.sourceSystem) {
      const boundary = declaredBoundary.get(event.sourceSystem) ?? "unknown";
      groups[boundary].add(event.sourceSystem);
    }
    if (event.destinationSystem) {
      groups[event.destinationBoundary].add(event.destinationSystem);
    }
  }

  return {
    local: [...groups.local],
    internal: [...groups.internal],
    external: [...groups.external],
    unknown: [...groups.unknown],
  };
}

export function buildHumanActionSummary(
  receipt: ReceiptResult,
): HumanActionSummary {
  const declaredBoundary = new Map(
    receipt.authority.permittedSystems.map((system) => [
      system.systemId,
      system.boundary,
    ]),
  );
  const systems = new Map<string, HumanSystemSummary>();

  const recordSystem = (
    systemId: string,
    boundary: Boundary,
    role: "source" | "destination",
    event: CanonicalEvent,
  ) => {
    const existing = systems.get(systemId) ?? {
      systemId,
      boundaries: [],
      roles: [],
      operations: [],
      statuses: [],
      dataCategories: [],
      eventIds: [],
    };
    pushUnique(existing.boundaries, boundary);
    pushUnique(existing.roles, role);
    pushUnique(existing.operations, event.operation);
    pushUnique(existing.statuses, event.status);
    for (const category of event.dataCategories) {
      pushUnique(existing.dataCategories, category);
    }
    pushUnique(existing.eventIds, event.eventId);
    systems.set(systemId, existing);
  };

  for (const event of receipt.events) {
    if (event.sourceSystem) {
      recordSystem(
        event.sourceSystem,
        declaredBoundary.get(event.sourceSystem) ?? "unknown",
        "source",
        event,
      );
    }
    if (event.destinationSystem) {
      recordSystem(
        event.destinationSystem,
        event.destinationBoundary,
        "destination",
        event,
      );
    }
  }

  const allEventIds = receipt.events.map((event) => event.eventId);
  const referencedSystems = new Set(systems.keys());
  const referencedDataCategories = new Set(
    receipt.events.flatMap((event) => event.dataCategories),
  );
  const noObservedActivity: HumanActionSummary["noObservedActivity"] = [];

  for (const system of receipt.authority.permittedSystems) {
    if (!referencedSystems.has(system.systemId)) {
      noObservedActivity.push({
        text: `No supplied event referenced the declared ${humanizeSlug(system.systemId)} system.`,
        eventIds: allEventIds,
      });
    }
  }
  for (const category of receipt.authority.prohibitedDataCategories) {
    if (!referencedDataCategories.has(category)) {
      noObservedActivity.push({
        text: `No supplied event named the restricted data category ${humanizeSlug(category)}.`,
        eventIds: allEventIds,
      });
    }
  }
  if (
    !receipt.events.some(
      (event) =>
        event.destinationSystem !== undefined &&
        event.destinationBoundary === "external",
    )
  ) {
    noObservedActivity.push({
      text: "No supplied event named an external destination.",
      eventIds: allEventIds,
    });
  }
  if (noObservedActivity.length === 0) {
    noObservedActivity.push({
      text: "Nothing in the declared system and restricted-data list can be safely marked untouched from this trace.",
      eventIds: allEventIds,
    });
  }

  return {
    systems: [...systems.values()],
    noObservedActivity,
    actions: receipt.events.map((event) => ({
      eventId: event.eventId,
      sequence: event.sequence,
      status: event.status,
      text: humanizeEvent(event),
    })),
  };
}

export function resolveRawPointer(
  rawDocument: unknown,
  rawPointer: string,
): unknown {
  const match = /^events\[(\d+)]$/.exec(rawPointer);
  if (!match || typeof rawDocument !== "object" || rawDocument === null) {
    return undefined;
  }
  const rawEvents = (rawDocument as { events?: unknown }).events;
  if (!Array.isArray(rawEvents)) return undefined;
  return rawEvents[Number(match[1])];
}

function splitDataCategories(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function humanizeEvent(event: CanonicalEvent): string {
  const operation = actionVerb(event.operation);
  const resource = humanizeSlug(event.resourceType ?? "unnamed resource");
  const system = event.destinationSystem ?? event.sourceSystem;
  const location = system
    ? `${locationPreposition(event.operation, Boolean(event.destinationSystem))} ${humanizeSlug(system)}`
    : "at an unspecified system";
  const quantity = event.quantity
    ? `${event.quantity.value.toLocaleString("en-US")} ${event.quantity.unit}`
    : "quantity not supplied";
  const target = `${resource} ${location} (${quantity})`;
  const attempt = event.attempt === undefined ? "" : `Attempt ${event.attempt}: `;
  const data =
    event.dataCategories.length > 0
      ? ` Named data: ${formatHumanList(event.dataCategories.map(humanizeSlug))}.`
      : " No data category was supplied.";

  switch (event.status) {
    case "succeeded":
      return `${attempt}${capitalize(operation.past)} ${target}.${data}`;
    case "failed":
      return `${attempt}Tried to ${operation.base} ${target}, but the trace records failure.${data}`;
    case "cancelled":
      return `${attempt}Started to ${operation.base} ${target}, then the action was cancelled.${data}`;
    case "started":
      return `${attempt}Started to ${operation.base} ${target}; the trace does not record a completed result.${data}`;
    case "unknown":
      return `${attempt}Tried to ${operation.base} ${target}; the trace leaves the result unknown.${data}`;
  }
}

function actionVerb(operation: CanonicalOperation): {
  base: string;
  past: string;
} {
  const verbs: Record<CanonicalOperation, { base: string; past: string }> = {
    read: { base: "read", past: "read" },
    retrieve: { base: "retrieve", past: "retrieved" },
    create: { base: "create", past: "created" },
    update: { base: "update", past: "updated" },
    delete: { base: "delete", past: "deleted" },
    send: { base: "send", past: "sent" },
    execute: { base: "run", past: "ran" },
    approve: { base: "approve", past: "approved" },
    error: { base: "report an error for", past: "reported an error for" },
    unknown: {
      base: "perform an unknown operation on",
      past: "performed an unknown operation on",
    },
  };
  return verbs[operation];
}

function locationPreposition(
  operation: CanonicalOperation,
  hasDestination: boolean,
): "from" | "in" | "to" | "using" {
  if (!hasDestination) return "from";
  if (operation === "send") return "to";
  if (operation === "execute") return "using";
  return "in";
}

function humanizeSlug(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\bid\b/gi, "ID")
    .replace(/\bkb\b/gi, "KB");
}

function formatHumanList(items: string[]): string {
  if (items.length < 2) return items[0] ?? "unknown";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function pushUnique<T>(items: T[], value: T): void {
  if (!items.includes(value)) items.push(value);
}

function formatJsonLocation(error: unknown, sourceText: string): string {
  const rawMessage = error instanceof Error ? error.message : "";
  const positionMatch = /position\s+(\d+)/i.exec(rawMessage);
  if (!positionMatch) {
    return "Trace input is not valid JSON. Check the JSON syntax and try again.";
  }
  const position = Number(positionMatch[1]);
  const before = sourceText.slice(0, position);
  const line = before.split("\n").length;
  const lineStart = before.lastIndexOf("\n");
  const column = position - lineStart;
  return `Trace input is not valid JSON near line ${line}, column ${column}.`;
}
