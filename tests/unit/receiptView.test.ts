import { describe, expect, it } from "vitest";

import { buildReceipt, MAX_TRACE_BYTES } from "../../src/core/receipt.js";
import type { Finding } from "../../src/core/schemas/index.js";
import { fixtureA, fixtureB, sharedAuthority } from "../../src/fixtures/index.js";
import {
  authorityToDraft,
  blankAuthorityDraft,
  buildHumanActionSummary,
  buildSystemEdges,
  exactFixtureBytes,
  groupSystemsByBoundary,
  resolveRawPointer,
  sortFindingsByAttention,
  summarizeReceipt,
  validateAuthorityDraft,
  validateTraceBytes,
} from "../../src/ui/receiptView.js";

describe("receipt UI view helpers", () => {
  it("encodes committed samples with exact reproducible bytes", () => {
    const expected = exactFixtureBytes(fixtureA);
    expect(new TextDecoder().decode(expected)).toBe(
      `${JSON.stringify(fixtureA, null, 2)}\n`,
    );
    expect(expected.byteLength).toBe(1751);
    expect(exactFixtureBytes(fixtureB).byteLength).toBe(3421);
  });

  it("validates intake without changing bytes or echoing invalid JSON content", () => {
    const valid = validateTraceBytes(exactFixtureBytes(fixtureA), MAX_TRACE_BYTES);
    expect(valid).toEqual({ ok: true, trace: fixtureA });

    const secret = "secret-input-value-should-not-appear";
    const invalid = validateTraceBytes(
      new TextEncoder().encode(`{\n  "token": "${secret}"`),
      MAX_TRACE_BYTES,
    );
    expect(invalid.ok).toBe(false);
    if (invalid.ok) return;
    expect(invalid.code).toBe("invalid_json");
    expect(invalid.message).toContain("line");
    expect(invalid.message).not.toContain(secret);
  });

  it("rejects oversize and unsupported inputs before the authority step", () => {
    const oversize = validateTraceBytes(
      new Uint8Array(MAX_TRACE_BYTES + 1),
      MAX_TRACE_BYTES,
    );
    expect(oversize.ok).toBe(false);
    if (!oversize.ok) expect(oversize.code).toBe("input_too_large");

    const unsupported = validateTraceBytes(
      new TextEncoder().encode(JSON.stringify({ schemaVersion: "other" })),
      MAX_TRACE_BYTES,
    );
    expect(unsupported.ok).toBe(false);
    if (!unsupported.ok) expect(unsupported.code).toBe("unsupported_format");
  });

  it("maps authority drafts through the authoritative Zod boundary", () => {
    const valid = validateAuthorityDraft(authorityToDraft(sharedAuthority));
    expect(valid).toEqual({ ok: true, authority: sharedAuthority });

    const blank = validateAuthorityDraft(blankAuthorityDraft());
    expect(blank.ok).toBe(false);

    const normalized = authorityToDraft(sharedAuthority);
    normalized.prohibitedDataCategories = " Customer Email, account-id ";
    const result = validateAuthorityDraft(normalized);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.authority.prohibitedDataCategories).toEqual([
        "customer_email",
        "account_id",
      ]);
    }
  });

  it("derives manager metrics, movement edges, and raw pointer resolution", async () => {
    const result = await buildReceipt({
      rawBytes: exactFixtureBytes(fixtureB),
      authority: sharedAuthority,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(summarizeReceipt(result.receipt)).toEqual({
      events: 6,
      systems: 5,
      stateChanges: 4,
      externalTransfers: 3,
      approvals: 0,
      errors: 0,
      findings: 12,
    });
    const edges = buildSystemEdges(result.receipt.events);
    expect(edges).toHaveLength(6);
    expect(edges[0]).toMatchObject({
      from: "crm",
      to: "agent-crm-summariser",
      boundary: "internal",
    });
    expect(edges[5]).toMatchObject({
      from: "agent-crm-summariser",
      to: "email-service",
      boundary: "external",
    });
    expect(
      resolveRawPointer(result.retainedSource.rawDocument, "events[5]"),
    ).toEqual(fixtureB.events[5]);
    expect(
      resolveRawPointer(result.retainedSource.rawDocument, "events.nope"),
    ).toBeUndefined();

    expect(groupSystemsByBoundary(result.receipt.events, sharedAuthority)).toEqual({
      local: ["local-workspace"],
      internal: ["crm", "internal-kb"],
      external: ["external-spreadsheet", "email-service"],
      unknown: [],
    });

    const unknownSource = structuredClone(result.receipt.events);
    unknownSource[0].sourceSystem = "undeclared-source";
    expect(groupSystemsByBoundary(unknownSource, sharedAuthority).unknown).toContain(
      "undeclared-source",
    );
  });

  it("translates every expected-run event and qualifies no-observed activity", async () => {
    const result = await buildReceipt({
      rawBytes: exactFixtureBytes(fixtureA),
      authority: sharedAuthority,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const summary = buildHumanActionSummary(result.receipt);
    expect(summary.actions).toHaveLength(result.receipt.events.length);
    expect(summary.actions.map((action) => action.eventId)).toEqual([
      "evt-000001",
      "evt-000002",
      "evt-000003",
    ]);
    expect(summary.actions[0].text).toBe(
      "Read churn risk record from crm (250 records). Named data: churn score and account ID.",
    );
    expect(summary.actions[1].text).toContain("No data category was supplied.");
    expect(summary.actions[2].text).toContain("quantity not supplied");
    expect(summary.systems.map((system) => system.systemId)).toEqual([
      "crm",
      "internal-kb",
      "local-workspace",
    ]);
    expect(summary.systems[0]).toMatchObject({
      boundaries: ["internal"],
      roles: ["source"],
      operations: ["read"],
      statuses: ["succeeded"],
      dataCategories: ["churn_score", "account_id"],
      eventIds: ["evt-000001"],
    });
    expect(summary.noObservedActivity.map((item) => item.text)).toEqual([
      "No supplied event named the restricted data category customer email.",
      "No supplied event named an external destination.",
    ]);
    expect(summary.noObservedActivity[0].eventIds).toEqual(
      result.receipt.events.map((event) => event.eventId),
    );
  });

  it("keeps attempts distinct from completed work in the overreaching run", async () => {
    const result = await buildReceipt({
      rawBytes: exactFixtureBytes(fixtureB),
      authority: sharedAuthority,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const summary = buildHumanActionSummary(result.receipt);
    expect(summary.actions).toHaveLength(6);
    expect(summary.actions[3]).toMatchObject({
      eventId: "evt-000004",
      status: "unknown",
      text: "Attempt 1: Tried to create spreadsheet in external spreadsheet (120 records); the trace leaves the result unknown. Named data: customer email.",
    });
    expect(summary.actions[4].text).toBe(
      "Attempt 2: Created spreadsheet in external spreadsheet (120 records). Named data: customer email.",
    );
    expect(summary.actions[5].text).toBe(
      "Sent customer message to email service (20 messages). Named data: customer email.",
    );
    expect(summary.systems.map((system) => system.systemId)).toEqual([
      "crm",
      "internal-kb",
      "local-workspace",
      "external-spreadsheet",
      "email-service",
    ]);
    expect(summary.noObservedActivity).toHaveLength(1);
    expect(summary.noObservedActivity[0].text).toBe(
      "Nothing in the declared system and restricted-data list can be safely marked untouched from this trace.",
    );
  });

  it("orders attention items by severity and then event sequence", () => {
    const findings: Finding[] = [
      {
        findingId: "medium-early",
        ruleId: "TEST-2",
        severity: "medium",
        label: "Medium",
        description: "Medium item",
        eventIds: ["evt-000001"],
      },
      {
        findingId: "high-late",
        ruleId: "TEST-1",
        severity: "high",
        label: "High late",
        description: "High late item",
        eventIds: ["evt-000003"],
      },
      {
        findingId: "high-early",
        ruleId: "TEST-1",
        severity: "high",
        label: "High early",
        description: "High early item",
        eventIds: ["evt-000002"],
      },
    ];
    const events = fixtureA.events.map((source, index) => ({
      schemaVersion: "agent-receipt.canonical-event.v1" as const,
      eventId: `evt-${String(index + 1).padStart(6, "0")}`,
      sourceEventId: source.id,
      traceId: fixtureA.traceId,
      sequence: index + 1,
      timestamp: source.timestamp,
      actorType: source.actor.type,
      actorId: source.actor.id,
      operation: source.operation,
      destinationBoundary: source.destinationBoundary ?? "unknown",
      dataCategories: source.dataCategories ?? [],
      stateChange: source.stateChange,
      status: source.status,
      rawPointer: `events[${index}]`,
      adapterWarnings: [],
      riskTags: [],
    }));
    expect(sortFindingsByAttention(findings, events).map((item) => item.findingId)).toEqual([
      "high-early",
      "high-late",
      "medium-early",
    ]);
  });
});
