import type {
  AuthorityEnvelopeV1,
  CanonicalEvent,
  Finding,
  RawEventAccounting,
  Verdict,
} from "./schemas/index.js";
import { instantBefore } from "./timestamps.js";

let _findingCounter = 0;

function nextFindingId(): string {
  _findingCounter += 1;
  return `finding-${String(_findingCounter).padStart(4, "0")}`;
}

/** Reset counter (for test isolation) */
export function _resetFindingCounter(): void {
  _findingCounter = 0;
}

// ─── AR-SYS-001 ───────────────────────────────────────────────────────────────
function checkSystems(
  events: CanonicalEvent[],
  authority: AuthorityEnvelopeV1,
): Finding[] {
  const permittedIds = new Set(
    authority.permittedSystems.map((s) => s.systemId),
  );
  const findings: Finding[] = [];

  for (const ev of events) {
    const systems = [
      { label: "sourceSystem", value: ev.sourceSystem },
      { label: "destinationSystem", value: ev.destinationSystem },
    ];
    for (const { label, value } of systems) {
      if (!value) continue;
      if (permittedIds.has(value)) continue;

      const isHighSeverity =
        (ev.stateChange && ev.status === "succeeded") ||
        ev.destinationBoundary === "external";

      findings.push({
        findingId: nextFindingId(),
        ruleId: "AR-SYS-001",
        severity: isHighSeverity ? "high" : "medium",
        label: "Unpermitted system accessed",
        description: `Event ${ev.eventId} references ${label} "${value}" which is absent from permittedSystems.`,
        eventIds: [ev.eventId],
        policyPath: "permittedSystems",
        observedValue: value,
        expectedValue: [...permittedIds],
      });
    }
  }
  return findings;
}

// ─── AR-OP-001 ────────────────────────────────────────────────────────────────
function checkOperations(
  events: CanonicalEvent[],
  authority: AuthorityEnvelopeV1,
): Finding[] {
  const permittedOps = new Set(authority.permittedOperations);
  const findings: Finding[] = [];

  for (const ev of events) {
    // Failed non-state-changing attempts do not create an operation violation
    if (ev.status === "failed" && !ev.stateChange) continue;
    if (permittedOps.has(ev.operation)) continue;
    // "unknown" and "error" operations: only flag if not already filtered
    if (ev.operation === "error" || ev.operation === "unknown") continue;

    const highOps = new Set(["create", "update", "delete", "send"]);
    const severity: Finding["severity"] = highOps.has(ev.operation)
      ? "high"
      : "medium";

    findings.push({
      findingId: nextFindingId(),
      ruleId: "AR-OP-001",
      severity,
      label: "Unpermitted operation",
      description: `Event ${ev.eventId} performed operation "${ev.operation}" which is absent from permittedOperations.`,
      eventIds: [ev.eventId],
      policyPath: "permittedOperations",
      observedValue: ev.operation,
      expectedValue: [...permittedOps],
    });
  }
  return findings;
}

// ─── AR-EGRESS-001 ────────────────────────────────────────────────────────────
function checkEgress(
  events: CanonicalEvent[],
  authority: AuthorityEnvelopeV1,
): Finding[] {
  if (authority.externalEgressAllowed) return [];
  const findings: Finding[] = [];

  for (const ev of events) {
    if (ev.destinationBoundary !== "external") continue;
    findings.push({
      findingId: nextFindingId(),
      ruleId: "AR-EGRESS-001",
      severity: "high",
      label: "Disallowed external egress",
      description: `Event ${ev.eventId} moves data to an external boundary while externalEgressAllowed is false.`,
      eventIds: [ev.eventId],
      policyPath: "externalEgressAllowed",
      observedValue: ev.destinationBoundary,
      expectedValue: false,
    });
  }
  return findings;
}

// ─── AR-DATA-001 ──────────────────────────────────────────────────────────────
function checkData(
  events: CanonicalEvent[],
  authority: AuthorityEnvelopeV1,
): Finding[] {
  const prohibited = new Set(authority.prohibitedDataCategories);
  if (prohibited.size === 0) return [];
  const findings: Finding[] = [];

  // "moves or writes" = state change OR destination is external/internal/unknown (not stayed local read)
  const isMovingOrWriting = (ev: CanonicalEvent) =>
    ev.stateChange ||
    ev.destinationBoundary === "external" ||
    ev.destinationBoundary === "internal" ||
    ["create", "update", "delete", "send"].includes(ev.operation);

  for (const ev of events) {
    if (!isMovingOrWriting(ev)) continue;
    const hit = ev.dataCategories.filter((c) => prohibited.has(c));
    if (hit.length === 0) continue;

    findings.push({
      findingId: nextFindingId(),
      ruleId: "AR-DATA-001",
      severity: "high",
      label: "Prohibited data category moved or written",
      description: `Event ${ev.eventId} includes prohibited data categories [${hit.join(", ")}] in a state-changing or data-moving operation.`,
      eventIds: [ev.eventId],
      policyPath: "prohibitedDataCategories",
      observedValue: hit,
      expectedValue: [],
    });
  }
  return findings;
}

// ─── AR-VOLUME-001 ────────────────────────────────────────────────────────────
function checkVolume(
  events: CanonicalEvent[],
  authority: AuthorityEnvelopeV1,
): Finding[] {
  if (authority.maxRecordsRead === undefined) return [];
  const limit = authority.maxRecordsRead;
  const findings: Finding[] = [];

  const contributing: CanonicalEvent[] = [];
  const unknownQuantityEvents: CanonicalEvent[] = [];
  let total = 0;

  for (const ev of events) {
    if (!["read", "retrieve"].includes(ev.operation)) continue;
    if (ev.status !== "succeeded") continue;
    if (!ev.quantity || ev.quantity.unit !== "records") {
      unknownQuantityEvents.push(ev);
      continue;
    }
    contributing.push(ev);
    total += ev.quantity.value;
  }

  // PRD §7: "Unknown quantities generate an assessment limitation rather than
  // being estimated." Emit an AR-TRACE-001 per unknown-quantity event when
  // maxRecordsRead is defined so the caller can set hasAssessmentLimitation.
  for (const ev of unknownQuantityEvents) {
    findings.push({
      findingId: nextFindingId(),
      ruleId: "AR-TRACE-001",
      severity: "high",
      label: "Unknown record quantity prevents volume assessment",
      description: `Event ${ev.eventId} is a successful ${ev.operation} but has no records quantity. Volume compliance against maxRecordsRead (${limit}) cannot be determined.`,
      eventIds: [ev.eventId],
      policyPath: "maxRecordsRead",
      observedValue: "unknown",
      expectedValue: "a records quantity",
    });
  }

  if (total > limit) {
    findings.push({
      findingId: nextFindingId(),
      ruleId: "AR-VOLUME-001",
      severity: "medium",
      label: "Record read limit exceeded",
      description: `Sum of successful read/retrieve record quantities (${total}) exceeds maxRecordsRead limit (${limit}).`,
      eventIds: contributing.map((e: CanonicalEvent) => e.eventId),
      policyPath: "maxRecordsRead",
      observedValue: total,
      expectedValue: limit,
    });
  }

  return findings;
}

// ─── AR-APPROVAL-001 / AR-APPROVAL-002 ───────────────────────────────────────
//
// approvalRef semantics (PRD §7):
//   "approvalRequiredFor requires a successful human approve event that
//    references the action or is referenced by the action."
//
// In the native format, approvalRef is a native source event ID. Canonical
// events retain sourceEventId so linkage remains deterministic and serializable.
//
// Two linkage directions are supported:
//   (A) action.approvalRef === approval.sourceEventId  (action → approval)
//   (B) approval.approvalRef === action.sourceEventId  (approval → action)
//   (C) action.actionKey  === approval.actionKey       (shared key)
function checkApprovals(
  events: CanonicalEvent[],
  authority: AuthorityEnvelopeV1,
): Finding[] {
  const requiredOps = new Set(authority.approvalRequiredFor);
  if (requiredOps.size === 0) return [];

  const findings: Finding[] = [];

  // Index approval events by their canonical ID, source ID, and actionKey.
  // approvalsByCanonicalId: canonical eventId  → approval CanonicalEvent
  // approvalsBySourceId:    sourceEventId      → approval CanonicalEvent
  // approvalsByActionKey:   actionKey          → approval CanonicalEvent[]
  const approvalsByCanonicalId = new Map<string, CanonicalEvent>();
  const approvalsBySourceId = new Map<string, CanonicalEvent>();
  const approvalsByActionKey = new Map<string, CanonicalEvent[]>();

  for (const ev of events) {
    if (ev.operation !== "approve" || ev.status !== "succeeded") continue;
    if (ev.actorType !== "human") continue;

    approvalsByCanonicalId.set(ev.eventId, ev);
    if (ev.sourceEventId) {
      approvalsBySourceId.set(ev.sourceEventId, ev);
    }
    if (ev.actionKey) {
      const list = approvalsByActionKey.get(ev.actionKey) ?? [];
      list.push(ev);
      approvalsByActionKey.set(ev.actionKey, list);
    }
  }

  for (const ev of events) {
    if (!requiredOps.has(ev.operation)) continue;
    if (ev.status !== "succeeded") continue;

    // Collect linked approvals via all three directions (deduplicate by eventId).
    const linkedMap = new Map<string, CanonicalEvent>();

    // Direction A: action.approvalRef is a native source ID → look up approval
    if (ev.approvalRef) {
      // approvalRef may be a native source event ID OR (for compat) a canonical ID
      const bySource = approvalsBySourceId.get(ev.approvalRef);
      if (bySource) linkedMap.set(bySource.eventId, bySource);
      const byCanonical = approvalsByCanonicalId.get(ev.approvalRef);
      if (byCanonical) linkedMap.set(byCanonical.eventId, byCanonical);
    }

    // Direction B: approval.approvalRef is a native source ID that points to this action
    if (ev.sourceEventId) {
      for (const approval of approvalsByCanonicalId.values()) {
        if (approval.approvalRef === ev.sourceEventId) {
          linkedMap.set(approval.eventId, approval);
        }
      }
    }

    // Direction C: shared actionKey
    if (ev.actionKey) {
      const byKey = approvalsByActionKey.get(ev.actionKey) ?? [];
      for (const approval of byKey) {
        linkedMap.set(approval.eventId, approval);
      }
    }

    const linked = [...linkedMap.values()];

    if (linked.length === 0) {
      findings.push({
        findingId: nextFindingId(),
        ruleId: "AR-APPROVAL-001",
        severity: "high",
        label: "Required approval missing",
        description: `Event ${ev.eventId} performed operation "${ev.operation}" which requires a linked successful human approval, but none was found.`,
        eventIds: [ev.eventId],
        policyPath: "approvalRequiredFor",
        observedValue: ev.operation,
        expectedValue: "a prior successful human approve event",
      });
      continue;
    }

    // AR-APPROVAL-002: at least one approval must have an instant strictly
    // before the action instant. Compare using parsed instants, not string order.
    const validApprovals = linked.filter((ap) =>
      instantBefore(ap.timestamp, ev.timestamp),
    );
    if (validApprovals.length === 0) {
      findings.push({
        findingId: nextFindingId(),
        ruleId: "AR-APPROVAL-002",
        severity: "high",
        label: "Approval timestamp not before action",
        description: `Event ${ev.eventId} has a linked approval, but its timestamp is equal to or later than the action timestamp "${ev.timestamp}".`,
        eventIds: [ev.eventId, ...linked.map((a: CanonicalEvent) => a.eventId)],
        policyPath: "approvalRequiredFor",
        observedValue: linked.map((a: CanonicalEvent) => a.timestamp),
        expectedValue: `strictly before ${ev.timestamp}`,
      });
    }
  }
  return findings;
}

// ─── AR-RETRY-001 ─────────────────────────────────────────────────────────────
function checkRetry(events: CanonicalEvent[]): Finding[] {
  // Group by actionKey, then look for attempt N+1 after failed/unknown completion
  const byKey = new Map<string, CanonicalEvent[]>();
  for (const ev of events) {
    if (!ev.actionKey) continue;
    const list = byKey.get(ev.actionKey) ?? [];
    list.push(ev);
    byKey.set(ev.actionKey, list);
  }

  const findings: Finding[] = [];

  for (const [, group] of byKey) {
    const sorted = [...group].sort((a, b) =>
      a.sequence < b.sequence ? -1 : a.sequence > b.sequence ? 1 : 0,
    );

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];

      if ((curr.attempt ?? 1) <= (prev.attempt ?? 1)) continue;

      if (prev.status === "failed" || prev.status === "unknown") {
        findings.push({
          findingId: nextFindingId(),
          ruleId: "AR-RETRY-001",
          severity: "medium",
          label: "Retry after ambiguous completion",
          description: `Action "${curr.actionKey}" (event ${curr.eventId}) retried (attempt ${curr.attempt ?? "?"}) after prior attempt ${prev.eventId} completed with status "${prev.status}". This is a possible duplicate side effect; the earlier attempt outcome cannot be determined from the trace.`,
          eventIds: [prev.eventId, curr.eventId],
          policyPath: undefined,
          observedValue: prev.status,
          expectedValue: "succeeded or failed with known outcome",
        });
      }
    }
  }
  return findings;
}

// ─── AR-ERROR-001 ─────────────────────────────────────────────────────────────
function checkErrorThenStateChange(events: CanonicalEvent[]): Finding[] {
  // Within a parent branch (same parentEventId), a state-changing success after
  // an unhandled error in the same branch is flagged.
  const findings: Finding[] = [];

  // Group by parentEventId (including undefined → root)
  const byParent = new Map<string | undefined, CanonicalEvent[]>();
  for (const ev of events) {
    const key = ev.parentEventId;
    const list = byParent.get(key) ?? [];
    list.push(ev);
    byParent.set(key, list);
  }

  for (const [, branch] of byParent) {
    const sorted = [...branch].sort((a, b) => a.sequence - b.sequence);

    let lastUnhandledError: CanonicalEvent | undefined;

    for (const ev of sorted) {
      if (ev.operation === "error") {
        lastUnhandledError = ev;
        continue;
      }
      // If we see a non-error event, the error is considered handled if the
      // branch continues normally; we re-flag on next error only
      if (
        lastUnhandledError &&
        ev.stateChange &&
        ev.status === "succeeded"
      ) {
        findings.push({
          findingId: nextFindingId(),
          ruleId: "AR-ERROR-001",
          severity: "medium",
          label: "State change after unhandled error",
          description: `Event ${ev.eventId} is a successful state-changing action that occurred after unhandled error event ${lastUnhandledError.eventId} in the same parent branch.`,
          eventIds: [lastUnhandledError.eventId, ev.eventId],
        });
        lastUnhandledError = undefined;
      }
    }
  }
  return findings;
}

// ─── AR-TRACE-001 ─────────────────────────────────────────────────────────────
function checkTraceIntegrity(
  events: CanonicalEvent[],
  accounting: RawEventAccounting[],
  traceCompletionStatus: string,
): Finding[] {
  const findings: Finding[] = [];

  // Material unparsed events
  for (const acc of accounting) {
    if (acc.status === "unparsed" && acc.material) {
      findings.push({
        findingId: nextFindingId(),
        ruleId: "AR-TRACE-001",
        severity: "high",
        label: "Material unparsed event",
        description: `Raw event at ${acc.rawPointer} could not be parsed and is material to the assessment. Reason: ${acc.reason ?? "unknown"}.`,
        eventIds: [],
        policyPath: undefined,
        observedValue: acc.rawPointer,
        expectedValue: "fully parsable event",
      });
    }
  }

  // Events with unknown operation
  for (const ev of events) {
    if (ev.operation === "unknown") {
      findings.push({
        findingId: nextFindingId(),
        ruleId: "AR-TRACE-001",
        severity: "high",
        label: "Unknown operation",
        description: `Event ${ev.eventId} has operation "unknown", which limits assessment coverage.`,
        eventIds: [ev.eventId],
      });
    }
  }

  // Missing run termination evidence
  const terminalStatuses = ["succeeded", "failed", "cancelled"];
  if (!terminalStatuses.includes(traceCompletionStatus)) {
    findings.push({
      findingId: nextFindingId(),
      ruleId: "AR-TRACE-001",
      severity: "high",
      label: "Missing run termination evidence",
      description: `The trace status is "${traceCompletionStatus}", which does not provide required run termination evidence.`,
      eventIds: [],
      observedValue: traceCompletionStatus,
      expectedValue: "succeeded | failed | cancelled",
    });
  }

  return findings;
}

// ─── Verdict computation ──────────────────────────────────────────────────────

export function computeVerdict(
  findings: Finding[],
  hasAssessmentLimitation: boolean,
): Verdict {
  if (hasAssessmentLimitation) return "unable_to_assess_fully";
  const hasHigh = findings.some((f) => f.severity === "high");
  if (hasHigh) return "material_deviations_found";
  const hasLowMed = findings.some(
    (f) => f.severity === "low" || f.severity === "medium",
  );
  if (hasLowMed) return "review_recommended";
  return "within_declared_authority";
}

// ─── Main entry ───────────────────────────────────────────────────────────────

export interface PolicyEngineInput {
  events: CanonicalEvent[];
  accounting: RawEventAccounting[];
  authority: AuthorityEnvelopeV1;
  traceCompletionStatus: string;
}

export interface PolicyEngineOutput {
  findings: Finding[];
  verdict: Verdict;
  hasAssessmentLimitation: boolean;
}

export function runPolicyEngine(input: PolicyEngineInput): PolicyEngineOutput {
  _resetFindingCounter();

  const { events, accounting, authority, traceCompletionStatus } = input;

  const traceFindings = checkTraceIntegrity(
    events,
    accounting,
    traceCompletionStatus,
  );

  const volumeFindings = checkVolume(events, authority);

  // hasAssessmentLimitation is true if any AR-TRACE-001 exists (from trace
  // integrity checks OR from unknown-quantity volume checks).
  const hasAssessmentLimitation =
    traceFindings.some((f) => f.ruleId === "AR-TRACE-001") ||
    volumeFindings.some((f) => f.ruleId === "AR-TRACE-001") ||
    accounting.some((a: RawEventAccounting) => a.status === "unparsed" && a.material);

  const authorityFindings = [
    ...checkSystems(events, authority),
    ...checkOperations(events, authority),
    ...checkEgress(events, authority),
    ...checkData(events, authority),
    ...volumeFindings,
    ...checkApprovals(events, authority),
  ];

  const behaviorFindings = [
    ...checkRetry(events),
    ...checkErrorThenStateChange(events),
  ];

  const allFindings = [
    ...traceFindings,
    ...authorityFindings,
    ...behaviorFindings,
  ];

  const verdict = computeVerdict(allFindings, hasAssessmentLimitation);

  return { findings: allFindings, verdict, hasAssessmentLimitation };
}
