"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent } from "react";

import { formatCoverageSummary } from "../core/coverage";
import {
  buildReceipt,
  MAX_TRACE_BYTES,
  serializeReceipt,
  withReviewerDisposition,
} from "../core/receipt";
import type {
  BuildReceiptResult,
  ReceiptCopyGenerator,
} from "../core/receipt";
import type {
  CanonicalEvent,
  CanonicalOperation,
  Finding,
  ReceiptResult,
  ReviewDisposition,
} from "../core/schemas/index";
import { fixtureA, fixtureB, sharedAuthority } from "../fixtures";
import {
  ALL_OPERATIONS,
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
} from "../ui/receiptView";
import type {
  AuthorityDraft,
  HumanActionSummary,
} from "../ui/receiptView";

type Step = "intake" | "authority" | "receipt";

type TraceSource = {
  bytes: Uint8Array;
  label: string;
  synthetic: boolean;
};

type SuccessfulBuild = Extract<BuildReceiptResult, { ok: true }>;

type EvidenceRequest = {
  title: string;
  eventIds: string[];
  findingIds: string[];
  trigger: HTMLButtonElement;
};

const requestGeneratedCopy: ReceiptCopyGenerator = async (
  request,
  options,
) => {
  const response = await fetch("/api/receipt-copy", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
    signal: options.signal,
  });
  if (!response.ok) throw new Error("Receipt copy request failed");
  return response.json();
};

const DISPOSITIONS: Array<{
  value: ReviewDisposition;
  label: string;
  description: string;
}> = [
  {
    value: "unreviewed",
    label: "Unreviewed",
    description: "No manager decision recorded.",
  },
  {
    value: "accepted",
    label: "Accepted",
    description: "Accept the run output as reviewed.",
  },
  {
    value: "investigate",
    label: "Investigate",
    description: "Request additional examination.",
  },
  {
    value: "rejected",
    label: "Rejected",
    description: "Decline the run output.",
  },
];

export function ReceiptReviewApp() {
  const [step, setStep] = useState<Step>("intake");
  const [source, setSource] = useState<TraceSource | null>(null);
  const [pasteValue, setPasteValue] = useState("");
  const [authorityDraft, setAuthorityDraft] = useState<AuthorityDraft>(
    blankAuthorityDraft,
  );
  const [intakeError, setIntakeError] = useState<{
    message: string;
    issues?: Array<{ path: string; message: string }>;
  } | null>(null);
  const [buildError, setBuildError] = useState<{
    message: string;
    issues?: Array<{ path: string; message: string }>;
  } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<SuccessfulBuild | null>(null);
  const [evidence, setEvidence] = useState<EvidenceRequest | null>(null);
  const [exportStatus, setExportStatus] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const authorityValidation = useMemo(
    () => validateAuthorityDraft(authorityDraft),
    [authorityDraft],
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      // Temporarily override the global smooth-scroll style so a newly
      // rendered step cannot remain parked mid-screen during the transition.
      const previousScrollBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      document.documentElement.style.scrollBehavior = previousScrollBehavior;
    });
    return () => cancelAnimationFrame(frame);
  }, [step]);

  useEffect(() => {
    if (!evidence) return;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        const trigger = evidence.trigger;
        setEvidence(null);
        requestAnimationFrame(() => trigger.focus());
        return;
      }
      if (event.key !== "Tab") return;
      const drawer = closeButtonRef.current?.closest("[role='dialog']");
      if (!drawer) return;
      const focusable = Array.from(
        drawer.querySelectorAll<HTMLElement>(
          "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = priorOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [evidence]);

  function beginWithSource(
    bytes: Uint8Array,
    label: string,
    synthetic: boolean,
    useSampleAuthority: boolean,
  ) {
    const validation = validateTraceBytes(bytes, MAX_TRACE_BYTES);
    if (!validation.ok) {
      setIntakeError({
        message: validation.message,
        issues: validation.issues,
      });
      return;
    }
    setIntakeError(null);
    setBuildError(null);
    setExportStatus("");
    setSource({ bytes: Uint8Array.from(bytes), label, synthetic });
    setAuthorityDraft(
      useSampleAuthority ? authorityToDraft(sharedAuthority) : blankAuthorityDraft(),
    );
    setResult(null);
    setStep("authority");
  }

  function selectSample(kind: "expected" | "overreaching") {
    const trace = kind === "expected" ? fixtureA : fixtureB;
    beginWithSource(
      exactFixtureBytes(trace),
      kind === "expected" ? "Expected run" : "Overreaching run",
      true,
      true,
    );
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (
      file.type !== "application/json" &&
      !file.name.toLowerCase().endsWith(".json")
    ) {
      setIntakeError({
        message: "Choose a UTF-8 .json file. JSONL, ZIP, YAML, and binary inputs are not supported.",
      });
      return;
    }
    if (file.size > MAX_TRACE_BYTES) {
      setIntakeError({
        message: "That file is larger than the 2 MiB trace limit.",
      });
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    beginWithSource(bytes, file.name, false, false);
  }

  function usePastedTrace() {
    if (pasteValue.trim().length === 0) {
      setIntakeError({ message: "Paste one Native Trace v1 JSON object first." });
      return;
    }
    beginWithSource(
      new TextEncoder().encode(pasteValue),
      "Pasted trace",
      false,
      false,
    );
  }

  async function analyzeTrace() {
    if (!source || !authorityValidation.ok || analyzing) return;
    setAnalyzing(true);
    setBuildError(null);
    setExportStatus("");
    try {
      const build = await buildReceipt(
        {
          rawBytes: source.bytes,
          authority: authorityValidation.authority,
        },
        { generateCopy: requestGeneratedCopy },
      );
      if (!build.ok) {
        setBuildError({
          message: build.error.message,
          issues: build.error.issues,
        });
        return;
      }
      setResult(build);
      setStep("receipt");
    } catch {
      setBuildError({
        message: "The receipt could not be assembled. Your trace and authority edits are still here.",
      });
    } finally {
      setAnalyzing(false);
    }
  }

  function closeEvidence() {
    if (!evidence) return;
    const trigger = evidence.trigger;
    setEvidence(null);
    requestAnimationFrame(() => trigger.focus());
  }

  function openEvidence(
    event: ReactKeyboardEvent<HTMLButtonElement> | React.MouseEvent<HTMLButtonElement>,
    title: string,
    eventIds: string[],
    findingIds: string[] = [],
  ) {
    setEvidence({
      title,
      eventIds: [...new Set(eventIds)],
      findingIds: [...new Set(findingIds)],
      trigger: event.currentTarget,
    });
  }

  function changeDisposition(disposition: ReviewDisposition) {
    if (!result) return;
    try {
      const receipt = withReviewerDisposition(result.receipt, disposition);
      setResult({ ...result, receipt });
      setExportStatus(`Disposition saved in this browser session: ${disposition}.`);
    } catch {
      setExportStatus("The disposition could not be validated and was not saved.");
    }
  }

  function downloadReceipt() {
    if (!result) return;
    try {
      const serialized = serializeReceipt(result.receipt);
      const blob = new Blob([serialized], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const safeTraceId = result.receipt.run.traceId.replace(/[^a-z0-9_-]+/gi, "-");
      anchor.href = url;
      anchor.download = `agent-receipt-${safeTraceId}.json`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setExportStatus("Validated receipt JSON downloaded. Raw input was not included.");
    } catch {
      setExportStatus("Export validation failed. No file was downloaded.");
    }
  }

  function startAgain() {
    setStep("intake");
    setResult(null);
    setSource(null);
    setBuildError(null);
    setIntakeError(null);
    setExportStatus("");
    setPasteValue("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <>
      <header className="app-header">
        <a className="brand" href="#top" aria-label="Agent Receipt home">
          <span aria-hidden="true" className="brand-mark">AR</span>
          <span>
            <strong>Agent Receipt</strong>
            <small>Post-run authority review</small>
          </span>
        </a>
        <ol className="step-list" aria-label="Review progress">
          {(["intake", "authority", "receipt"] as const).map((item, index) => {
            const currentIndex = ["intake", "authority", "receipt"].indexOf(step);
            return (
              <li
                key={item}
                className={
                  item === step ? "is-current" : index < currentIndex ? "is-complete" : ""
                }
                aria-current={item === step ? "step" : undefined}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                {item === "intake" ? "Trace" : item === "authority" ? "Authority" : "Receipt"}
              </li>
            );
          })}
        </ol>
        {step !== "intake" ? (
          <button className="text-button" type="button" onClick={startAgain}>
            New review
          </button>
        ) : (
          <span className="fallback-chip">Works offline</span>
        )}
      </header>

      <main id="top" className={`app-main step-${step}`}>
        {step === "intake" ? (
          <IntakeStep
            error={intakeError}
            pasteValue={pasteValue}
            fileInputRef={fileInputRef}
            onPasteChange={setPasteValue}
            onSelectSample={selectSample}
            onFile={handleFile}
            onUsePaste={usePastedTrace}
          />
        ) : null}

        {step === "authority" && source ? (
          <AuthorityStep
            source={source}
            draft={authorityDraft}
            validation={authorityValidation}
            analyzing={analyzing}
            buildError={buildError}
            onDraftChange={setAuthorityDraft}
            onBack={() => setStep("intake")}
            onAnalyze={analyzeTrace}
          />
        ) : null}

        {step === "receipt" && result && source ? (
          <ReceiptStep
            build={result}
            source={source}
            exportStatus={exportStatus}
            onOpenEvidence={openEvidence}
            onDisposition={changeDisposition}
            onDownload={downloadReceipt}
          />
        ) : null}
      </main>

      {evidence && result ? (
        <EvidenceDrawer
          request={evidence}
          build={result}
          synthetic={source?.synthetic ?? false}
          closeButtonRef={closeButtonRef}
          onClose={closeEvidence}
        />
      ) : null}
    </>
  );
}

type IntakeStepProps = {
  error: { message: string; issues?: Array<{ path: string; message: string }> } | null;
  pasteValue: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onPasteChange: (value: string) => void;
  onSelectSample: (kind: "expected" | "overreaching") => void;
  onFile: (event: ChangeEvent<HTMLInputElement>) => void;
  onUsePaste: () => void;
};

function IntakeStep({
  error,
  pasteValue,
  fileInputRef,
  onPasteChange,
  onSelectSample,
  onFile,
  onUsePaste,
}: IntakeStepProps) {
  return (
    <div className="intake-layout">
      <section className="intro-panel" aria-labelledby="intake-title">
        <p className="kicker">Completed run review</p>
        <h1 id="intake-title">What did the agent do with its authority?</h1>
        <p className="intro-copy">
          Compare an exact execution trace with the authority a manager declared. Rules establish
          the verdict; generated copy only explains cited evidence.
        </p>
        <div className="trust-note">
          <span aria-hidden="true">01</span>
          <p>
            The raw trace stays in this browser session. Only minimized, redacted facts may reach
            Granite through the server route.
          </p>
        </div>
      </section>

      <section className="intake-workbench" aria-labelledby="choose-trace-title">
        <div className="section-heading">
          <div>
            <p className="section-number">Step 01</p>
            <h2 id="choose-trace-title">Choose a trace</h2>
          </div>
          <p>Native Trace v1 JSON · 2 MiB maximum</p>
        </div>

        {error ? <ErrorSummary error={error} /> : null}

        <div className="sample-list" aria-label="Synthetic sample traces">
          <SampleButton
            label="Expected run"
            verdict="No deviations expected"
            detail="3 events · internal read and local output"
            tone="calm"
            onClick={() => onSelectSample("expected")}
          />
          <SampleButton
            label="Overreaching run"
            verdict="Material deviations expected"
            detail="6 events · external write, retry, and send"
            tone="alert"
            onClick={() => onSelectSample("overreaching")}
          />
        </div>

        <div className="input-divider"><span>or use your own trace</span></div>

        <div className="custom-input-grid">
          <div className="upload-field">
            <label htmlFor="trace-file">Upload JSON file</label>
            <p id="trace-file-help">Exact file bytes are hashed before parsing.</p>
            <input
              ref={fileInputRef}
              id="trace-file"
              name="trace-file"
              type="file"
              accept="application/json,.json"
              aria-describedby="trace-file-help"
              onChange={onFile}
            />
          </div>
          <div className="paste-field">
            <label htmlFor="trace-json">Paste JSON</label>
            <textarea
              id="trace-json"
              name="trace-json"
              rows={7}
              spellCheck={false}
              value={pasteValue}
              onChange={(event) => onPasteChange(event.target.value)}
              aria-describedby="trace-json-help"
              placeholder={'{\n  "schemaVersion": "agent-receipt.native-trace.v1"\n}' }
            />
            <div className="field-action-row">
              <p id="trace-json-help">One UTF-8 JSON object. JSONL and remote URLs are not accepted.</p>
              <button className="secondary-button" type="button" onClick={onUsePaste}>
                Review pasted trace
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function SampleButton(props: {
  label: string;
  verdict: string;
  detail: string;
  tone: "calm" | "alert";
  onClick: () => void;
}) {
  return (
    <button className={`sample-button sample-${props.tone}`} type="button" onClick={props.onClick}>
      <span className="sample-topline">
        <span className="synthetic-label">Synthetic sample</span>
        <span aria-hidden="true">↗</span>
      </span>
      <strong>{props.label}</strong>
      <span>{props.verdict}</span>
      <small>{props.detail}</small>
    </button>
  );
}

type AuthorityStepProps = {
  source: TraceSource;
  draft: AuthorityDraft;
  validation: ReturnType<typeof validateAuthorityDraft>;
  analyzing: boolean;
  buildError: { message: string; issues?: Array<{ path: string; message: string }> } | null;
  onDraftChange: (draft: AuthorityDraft) => void;
  onBack: () => void;
  onAnalyze: () => void;
};

function AuthorityStep(props: AuthorityStepProps) {
  const update = <K extends keyof AuthorityDraft>(key: K, value: AuthorityDraft[K]) => {
    props.onDraftChange({ ...props.draft, [key]: value });
  };
  const toggleOperation = (
    key: "permittedOperations" | "approvalRequiredFor",
    operation: CanonicalOperation,
  ) => {
    const current = props.draft[key];
    update(
      key,
      current.includes(operation)
        ? current.filter((item) => item !== operation)
        : [...current, operation],
    );
  };

  return (
    <div className="authority-layout">
      <aside className="authority-context">
        <button className="back-button" type="button" onClick={props.onBack}>← Back to trace</button>
        <p className="section-number">Step 02</p>
        <h1>Confirm the authority envelope.</h1>
        <p>
          This is the rule boundary the run will be measured against. It is never inferred from
          what the agent happened to do.
        </p>
        <dl className="source-facts">
          <div><dt>Trace</dt><dd>{props.source.label}</dd></div>
          <div><dt>Source</dt><dd>{props.source.synthetic ? "Synthetic fixture" : "Browser-provided input"}</dd></div>
          <div><dt>Exact bytes</dt><dd>{props.source.bytes.byteLength.toLocaleString()}</dd></div>
        </dl>
      </aside>

      <section className="authority-form-shell" aria-labelledby="authority-form-title">
        <div className="section-heading">
          <div>
            <p className="section-number">Declared policy</p>
            <h2 id="authority-form-title">Review before analysis</h2>
          </div>
          <span className={props.validation.ok ? "validity valid" : "validity invalid"}>
            {props.validation.ok ? "Ready to analyze" : "Needs information"}
          </span>
        </div>

        {props.buildError ? <ErrorSummary error={props.buildError} /> : null}

        <form onSubmit={(event) => { event.preventDefault(); props.onAnalyze(); }} noValidate>
          <div className="form-grid two-column">
            <label>
              <span>Policy ID</span>
              <input
                name="policyId"
                value={props.draft.policyId}
                onChange={(event) => update("policyId", event.target.value)}
                aria-describedby="policy-id-help"
              />
              <small id="policy-id-help">Stable identifier recorded in receipt integrity.</small>
            </label>
            <label className="wide-field">
              <span>Requested task</span>
              <textarea
                name="task"
                rows={4}
                value={props.draft.task}
                onChange={(event) => update("task", event.target.value)}
                aria-describedby="task-help"
              />
              <small id="task-help">Describe what the agent was asked to accomplish and its boundaries.</small>
            </label>
          </div>

          <fieldset className="form-section">
            <legend>Permitted systems and boundaries</legend>
            <p>Only listed systems are allowed. Boundary labels are declarations, not model guesses.</p>
            <div className="system-editor">
              {props.draft.permittedSystems.map((system, index) => (
                <div className="system-row" key={`system-${index}`}>
                  <label>
                    <span>System {index + 1}</span>
                    <input
                      name={`system-${index}`}
                      value={system.systemId}
                      onChange={(event) => {
                        const next = props.draft.permittedSystems.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, systemId: event.target.value } : item,
                        );
                        update("permittedSystems", next);
                      }}
                    />
                  </label>
                  <label>
                    <span>Boundary</span>
                    <select
                      name={`boundary-${index}`}
                      value={system.boundary}
                      onChange={(event) => {
                        const boundary = event.target.value as typeof system.boundary;
                        const next = props.draft.permittedSystems.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, boundary } : item,
                        );
                        update("permittedSystems", next);
                      }}
                    >
                      <option value="local">Local</option>
                      <option value="internal">Internal</option>
                      <option value="external">External</option>
                    </select>
                  </label>
                  <button
                    className="remove-button"
                    type="button"
                    disabled={props.draft.permittedSystems.length === 1}
                    title={props.draft.permittedSystems.length === 1 ? "At least one system row is kept for editing" : undefined}
                    onClick={() => update(
                      "permittedSystems",
                      props.draft.permittedSystems.filter((_, itemIndex) => itemIndex !== index),
                    )}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              className="inline-button"
              type="button"
              onClick={() => update("permittedSystems", [
                ...props.draft.permittedSystems,
                { systemId: "", boundary: "internal" },
              ])}
            >
              + Add permitted system
            </button>
          </fieldset>

          <OperationFieldset
            legend="Permitted operations"
            description="Successful, unknown-status, or state-changing operations outside this allowlist create a finding."
            selected={props.draft.permittedOperations}
            onToggle={(operation) => toggleOperation("permittedOperations", operation)}
          />

          <div className="form-grid two-column form-section">
            <label>
              <span>Prohibited data categories</span>
              <textarea
                name="prohibitedDataCategories"
                rows={4}
                value={props.draft.prohibitedDataCategories}
                onChange={(event) => update("prohibitedDataCategories", event.target.value)}
                aria-describedby="category-help"
              />
              <small id="category-help">Comma or line-separated slugs, such as customer_email.</small>
            </label>
            <label>
              <span>Maximum records read <em>Optional</em></span>
              <input
                name="maxRecordsRead"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={props.draft.maxRecordsRead}
                onChange={(event) => update("maxRecordsRead", event.target.value)}
                aria-describedby="record-limit-help"
              />
              <small id="record-limit-help">Unknown quantities remain unknown; they are never estimated.</small>
            </label>
          </div>

          <div className="toggle-row form-section">
            <div>
              <strong>Allow external egress</strong>
              <p>Permit movement to destinations explicitly labeled external.</p>
            </div>
            <label className="switch-control">
              <input
                type="checkbox"
                name="externalEgressAllowed"
                checked={props.draft.externalEgressAllowed}
                onChange={(event) => update("externalEgressAllowed", event.target.checked)}
              />
              <span>{props.draft.externalEgressAllowed ? "Allowed" : "Not allowed"}</span>
            </label>
          </div>

          <OperationFieldset
            legend="Operations requiring approval"
            description="A qualifying action needs an explicitly linked, earlier, successful human approval event."
            selected={props.draft.approvalRequiredFor}
            onToggle={(operation) => toggleOperation("approvalRequiredFor", operation)}
          />

          {!props.validation.ok ? (
            <div className="validation-note" role="status">
              <strong>Complete the authority envelope to continue.</strong>
              <ul>
                {props.validation.issues.slice(0, 5).map((issue, index) => (
                  <li key={`${issue.path}-${index}`}><code>{issue.path}</code>: {issue.message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="form-submit-row">
            <p>
              Analysis preserves the exact bytes above and computes policy findings locally.
            </p>
            <button
              className="primary-button"
              type="submit"
              disabled={!props.validation.ok || props.analyzing}
              aria-describedby={!props.validation.ok ? "analyze-disabled-reason" : undefined}
            >
              {props.analyzing ? "Analyzing trace…" : "Analyze against authority"}
            </button>
          </div>
          {!props.validation.ok ? (
            <p className="sr-only" id="analyze-disabled-reason">Complete all required authority fields first.</p>
          ) : null}
          <p className="analysis-status" aria-live="polite">
            {props.analyzing ? "Computing exact digest, canonical events, coverage, policy findings, and receipt copy." : ""}
          </p>
        </form>
      </section>
    </div>
  );
}

function OperationFieldset(props: {
  legend: string;
  description: string;
  selected: CanonicalOperation[];
  onToggle: (operation: CanonicalOperation) => void;
}) {
  return (
    <fieldset className="form-section operation-fieldset">
      <legend>{props.legend}</legend>
      <p>{props.description}</p>
      <div className="operation-grid">
        {ALL_OPERATIONS.map((operation) => (
          <label key={operation}>
            <input
              type="checkbox"
              checked={props.selected.includes(operation)}
              onChange={() => props.onToggle(operation)}
            />
            <span>{operation}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

type OpenEvidence = (
  event: ReactKeyboardEvent<HTMLButtonElement> | React.MouseEvent<HTMLButtonElement>,
  title: string,
  eventIds: string[],
  findingIds?: string[],
) => void;

function ReceiptStep(props: {
  build: SuccessfulBuild;
  source: TraceSource;
  exportStatus: string;
  onOpenEvidence: OpenEvidence;
  onDisposition: (disposition: ReviewDisposition) => void;
  onDownload: () => void;
}) {
  const { receipt } = props.build;
  const metrics = summarizeReceipt(receipt);
  const humanSummary = buildHumanActionSummary(receipt);
  const attention = sortFindingsByAttention(receipt.findings, receipt.events);
  const findingsByEvent = new Map<string, Finding[]>();
  for (const finding of receipt.findings) {
    for (const eventId of finding.eventIds) {
      findingsByEvent.set(eventId, [...(findingsByEvent.get(eventId) ?? []), finding]);
    }
  }

  return (
    <div className="receipt-shell">
      <nav className="receipt-nav" aria-label="Receipt sections">
        <span>Review receipt</span>
        <a href="#overview">Overview</a>
        <a href="#human-summary">Summary</a>
        <a href="#activity">Activity</a>
        <a href="#movement">Systems & data</a>
        <a href="#deviations">Deviations</a>
        <a href="#integrity">Integrity</a>
        <a href="#disposition">Disposition</a>
      </nav>

      <section id="overview" className={`verdict-hero verdict-${receipt.verdict}`} aria-labelledby="verdict-title">
        <div className="verdict-register">
          <p className="section-number">Deterministic verdict</p>
          <span className="verdict-icon" aria-hidden="true">
            {receipt.verdict === "within_declared_authority" ? "✓" : "!"}
          </span>
          <p>{receipt.run.agent.name ?? receipt.run.agent.id}</p>
          <p>{receipt.run.traceId}</p>
        </div>
        <div className="verdict-copy">
          <p className="source-line">
            <span>{receipt.integrity.generationSource === "granite" ? "Granite explained" : "Deterministic fallback"}</span>
            <span>{props.source.synthetic ? "Synthetic sample" : "User-provided trace"}</span>
          </p>
          <h1 id="verdict-title">{receipt.verdictLabel}</h1>
          <p className="verdict-qualifier">{receipt.verdictQualifier}</p>
          <EvidenceClaim
            text={receipt.copy.headline.text}
            label="Open headline evidence"
            eventIds={receipt.copy.headline.eventIds}
            findingIds={receipt.copy.headline.findingIds}
            onOpen={props.onOpenEvidence}
          />
        </div>
        <div className="verdict-attention">
          <span className="attention-count">{receipt.findings.length.toString().padStart(2, "0")}</span>
          <p>items deserve attention</p>
          <a href="#deviations">Review deviations ↓</a>
        </div>
      </section>

      <section className="task-outcome" aria-labelledby="task-outcome-title">
        <div>
          <p className="section-number">Requested task</p>
          <h2 id="task-outcome-title">Authority and observed outcome</h2>
          <p>{receipt.authority.task}</p>
        </div>
        <div>
          <p className="section-number">Observed outcome</p>
          <EvidenceClaim
            text={receipt.copy.outcome.text}
            label="Open outcome evidence"
            eventIds={receipt.copy.outcome.eventIds}
            findingIds={[]}
            onOpen={props.onOpenEvidence}
            compact
          />
        </div>
      </section>

      <section className="metric-ledger" aria-label="Receipt counts">
        {(
          [
            ["Events", metrics.events],
            ["Systems", metrics.systems],
            ["State changes", metrics.stateChanges],
            ["External transfers", metrics.externalTransfers],
            ["Approvals", metrics.approvals],
            ["Errors", metrics.errors],
            ["Findings", metrics.findings],
          ] as Array<[string, number]>
        ).map(([label, value]) => (
          <div key={label}><strong>{value}</strong><span>{label}</span></div>
        ))}
      </section>

      <section className="attention-section" aria-labelledby="attention-title">
        <div className="section-heading">
          <div>
            <p className="section-number">Manager queue</p>
            <h2 id="attention-title">What deserves attention</h2>
          </div>
          <p>Ordered by severity, then event sequence.</p>
        </div>
        {attention.length === 0 ? (
          <div className="clean-state">
            <span aria-hidden="true">✓</span>
            <div>
              <strong>No deterministic findings.</strong>
              <p>The supplied trace stayed within this authority envelope. Review evidence before recording a disposition.</p>
            </div>
          </div>
        ) : (
          <ol className="attention-list">
            {attention.map((finding) => (
              <li key={finding.findingId}>
                <span className={`severity severity-${finding.severity}`}>{finding.severity}</span>
                <div><strong>{finding.label}</strong><p>{finding.description}</p></div>
                <button
                  type="button"
                  onClick={(event) => props.onOpenEvidence(event, finding.label, finding.eventIds, [finding.findingId])}
                >Evidence ↗</button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <HumanActionSummaryPanel
        summary={humanSummary}
        onOpen={props.onOpenEvidence}
      />

      <section id="activity" className="receipt-section" aria-labelledby="activity-title">
        <SectionTitle number="02" title="Activity timeline" detail="Stable chronological order · unknown values remain visible" id="activity-title" />
        <ol className="timeline">
          {receipt.events.map((event) => (
            <TimelineEvent
              key={event.eventId}
              event={event}
              findings={findingsByEvent.get(event.eventId) ?? []}
              onOpen={props.onOpenEvidence}
            />
          ))}
        </ol>
      </section>

      <section id="movement" className="receipt-section" aria-labelledby="movement-title">
        <SectionTitle number="03" title="Systems and data movement" detail="Every edge has a complete text equivalent below" id="movement-title" />
        <SystemMap receipt={receipt} onOpen={props.onOpenEvidence} />
      </section>

      <section id="deviations" className="receipt-section deviations-section" aria-labelledby="deviations-title">
        <SectionTitle number="04" title="Deviations and coverage" detail="Deterministic rules only" id="deviations-title" />
        <div className="deviation-layout">
          <div className="finding-stack">
            {receipt.findings.length === 0 ? (
              <div className="empty-findings"><strong>No deviations found.</strong><p>Parser warnings and coverage still remain visible.</p></div>
            ) : receipt.findings.map((finding) => (
              <FindingCard key={finding.findingId} finding={finding} onOpen={props.onOpenEvidence} />
            ))}
          </div>
          <aside className="coverage-panel">
            <p className="section-number">Evidence coverage</p>
            <strong>{receipt.coverage.accountedRawEvents}/{receipt.coverage.rawEvents}</strong>
            <p>{formatCoverageSummary(receipt.coverage)}</p>
            <dl>
              <div><dt>Mapped</dt><dd>{receipt.coverage.mapped}</dd></div>
              <div><dt>Metadata-only</dt><dd>{receipt.coverage.metadataOnly}</dd></div>
              <div><dt>Unparsed</dt><dd>{receipt.coverage.unparsed}</dd></div>
              <div><dt>Canonical</dt><dd>{receipt.coverage.canonicalEvents}</dd></div>
            </dl>
            {receipt.warnings.length > 0 ? (
              <div className="warning-list"><strong>Parser warnings</strong><ul>{receipt.warnings.map((warning) => <li key={`${warning.pointer}-${warning.message}`}>{warning.pointer}: {warning.message}</li>)}</ul></div>
            ) : (
              <p className="no-warning">No parser warnings.</p>
            )}
          </aside>
        </div>
      </section>

      <section className="receipt-section generated-section" aria-labelledby="generated-title">
        <SectionTitle number="05" title="Cited receipt copy" detail="Select any statement to inspect its evidence" id="generated-title" />
        <div className="generated-copy-grid">
          <div>
            <h3>Notable actions</h3>
            {receipt.copy.notableActions.length === 0 ? <p>No notable deviations were generated.</p> : (
              <ul>{receipt.copy.notableActions.map((action, index) => (
                <li key={`${action.text}-${index}`}>
                  <EvidenceClaim
                    text={action.text}
                    label={`Open notable action ${index + 1} evidence`}
                    eventIds={action.eventIds}
                    findingIds={action.findingIds}
                    onOpen={props.onOpenEvidence}
                    compact
                  />
                </li>
              ))}</ul>
            )}
          </div>
          <div>
            <h3>Limitations</h3>
            {receipt.copy.limitations.length === 0 ? <p>No additional assessment limitations were generated.</p> : (
              <ul>{receipt.copy.limitations.map((limitation, index) => (
                <li key={`${limitation.text}-${index}`}>
                  <EvidenceClaim
                    text={limitation.text}
                    label={`Open limitation ${index + 1} evidence`}
                    eventIds={limitation.eventIds}
                    findingIds={[]}
                    onOpen={props.onOpenEvidence}
                    compact
                  />
                </li>
              ))}</ul>
            )}
          </div>
        </div>
      </section>

      <section id="integrity" className="receipt-section" aria-labelledby="integrity-title">
        <SectionTitle number="06" title="Integrity record" detail="Reproducibility context, not proof of trusted capture" id="integrity-title" />
        <IntegrityStrip receipt={receipt} />
      </section>

      <section id="disposition" className="disposition-section" aria-labelledby="disposition-title">
        <div>
          <p className="section-number">Human review · separate from verdict</p>
          <h2 id="disposition-title">Record a manager disposition.</h2>
          <p>Changing this state will not alter the verdict, findings, or evidence.</p>
        </div>
        <fieldset className="disposition-options">
          <legend className="sr-only">Reviewer disposition</legend>
          {DISPOSITIONS.map((item) => (
            <label key={item.value}>
              <input
                type="radio"
                name="reviewerDisposition"
                value={item.value}
                checked={receipt.reviewerDisposition === item.value}
                onChange={() => props.onDisposition(item.value)}
              />
              <span><strong>{item.label}</strong><small>{item.description}</small></span>
            </label>
          ))}
        </fieldset>
        <div className="export-panel">
          <p>Validated JSON includes canonical evidence, findings, authority, copy, coverage, integrity, and disposition.</p>
          <button className="primary-button" type="button" onClick={props.onDownload}>Download receipt JSON</button>
          <p className="export-status" aria-live="polite">{props.exportStatus}</p>
        </div>
      </section>
    </div>
  );
}

function EvidenceClaim(props: {
  text: string;
  label: string;
  eventIds: string[];
  findingIds: string[];
  onOpen: OpenEvidence;
  compact?: boolean;
}) {
  return (
    <div className={props.compact ? "evidence-claim compact" : "evidence-claim"}>
      <p>{props.text}</p>
      <button
        type="button"
        aria-label={props.label}
        onClick={(event) => props.onOpen(event, props.text, props.eventIds, props.findingIds)}
      >
        Evidence <span aria-hidden="true">↗</span>
      </button>
    </div>
  );
}

function HumanActionSummaryPanel(props: {
  summary: HumanActionSummary;
  onOpen: OpenEvidence;
}) {
  return (
    <section
      id="human-summary"
      className="receipt-section human-summary-section"
      aria-labelledby="human-summary-title"
    >
      <SectionTitle
        number="01"
        title="What the run did"
        detail="Every canonical action, translated into plain language"
        id="human-summary-title"
      />
      <div className="human-summary-qualifier">
        <strong>Read this as an evidence summary, not a surveillance claim.</strong>
        <p>
          Based on the supplied trace and authority envelope. “No observed activity” means no
          supplied event referenced that item; it does not prove activity was absent outside this
          trace.
        </p>
      </div>

      <div className="human-summary-highlights">
        <section aria-labelledby="accessed-title">
          <div className="human-summary-subhead">
            <p className="section-number">Accessed or targeted</p>
            <h3 id="accessed-title">Systems and named data</h3>
          </div>
          {props.summary.systems.length === 0 ? (
            <p className="summary-empty">No system name was supplied by any canonical event.</p>
          ) : (
            <ol className="system-summary-list">
              {props.summary.systems.map((system) => (
                <li key={system.systemId}>
                  <div className="system-summary-heading">
                    <code>{system.systemId}</code>
                    <span>{formatPlainList(system.boundaries)} boundary</span>
                  </div>
                  <p>
                    {system.eventIds.length} observed {system.eventIds.length === 1 ? "action" : "actions"}
                    {" · "}{formatSystemRoles(system.roles)}
                    {" · "}{formatPlainList(system.operations)}
                  </p>
                  <p>
                    {system.dataCategories.length > 0
                      ? `Named data: ${formatPlainList(system.dataCategories.map(formatIdentifier))}.`
                      : "No data category was supplied for these events."}
                  </p>
                  <div className="system-summary-footer">
                    <span>{formatPlainList(system.statuses)} status</span>
                    <button
                      type="button"
                      onClick={(event) =>
                        props.onOpen(
                          event,
                          `Observed activity for ${system.systemId}`,
                          system.eventIds,
                        )
                      }
                    >
                      Evidence ↗
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="no-observed-panel" aria-labelledby="untouched-title">
          <div className="human-summary-subhead">
            <p className="section-number">No observed activity</p>
            <h3 id="untouched-title">What can be called untouched here</h3>
          </div>
          <ul>
            {props.summary.noObservedActivity.map((item, index) => (
              <li key={`${item.text}-${index}`}>
                <p>{item.text}</p>
                <button
                  type="button"
                  aria-label={`Review trace evidence for no-observed-activity statement ${index + 1}`}
                  onClick={(event) =>
                    props.onOpen(event, item.text, item.eventIds)
                  }
                >
                  Review trace ↗
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="work-summary" aria-labelledby="work-summary-title">
        <div className="work-summary-heading">
          <div>
            <p className="section-number">Work performed or attempted</p>
            <h3 id="work-summary-title">All actions in order</h3>
          </div>
          <p>
            Completed work and incomplete attempts stay distinct. Missing quantities and data
            categories remain visible as missing.
          </p>
        </div>
        <ol>
          {props.summary.actions.map((action) => (
            <li key={action.eventId}>
              <span className="work-sequence">{String(action.sequence).padStart(2, "0")}</span>
              <div>
                <p>{action.text}</p>
                <span className={`status status-${action.status}`}>{action.status}</span>
              </div>
              <button
                type="button"
                onClick={(event) =>
                  props.onOpen(
                    event,
                    `Plain-language action ${action.eventId}`,
                    [action.eventId],
                  )
                }
              >
                Canonical + raw ↗
              </button>
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
}

function formatIdentifier(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\bid\b/gi, "ID")
    .replace(/\bkb\b/gi, "KB");
}

function formatPlainList(values: string[]): string {
  if (values.length < 2) return values[0] ?? "unknown";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function formatSystemRoles(roles: Array<"source" | "destination">): string {
  const labels = roles.map((role) =>
    role === "source" ? "used as a source" : "used as a destination",
  );
  return formatPlainList(labels);
}

function TimelineEvent(props: {
  event: CanonicalEvent;
  findings: Finding[];
  onOpen: OpenEvidence;
}) {
  const event = props.event;
  return (
    <li className={`timeline-event operation-${event.operation} ${event.stateChange ? "is-state-change" : ""}`}>
      <div className="timeline-index"><span>{String(event.sequence).padStart(2, "0")}</span></div>
      <div className="timeline-main">
        <div className="timeline-topline">
          <span className="operation-label">{event.operation}</span>
          <time dateTime={event.timestamp}>{event.timestamp}</time>
          <span className={`status status-${event.status}`}>{event.status}</span>
        </div>
        <h3>{event.actorId} <span>· {event.actorType}</span></h3>
        <dl className="event-details">
          <div><dt>System path</dt><dd>{formatSystemPath(event)}</dd></div>
          <div><dt>Boundary</dt><dd>{event.destinationBoundary}</dd></div>
          <div><dt>Resource</dt><dd>{event.resourceType ?? "unknown"}</dd></div>
          <div><dt>Data</dt><dd>{event.dataCategories.length > 0 ? event.dataCategories.join(", ") : "unknown"}</dd></div>
          <div><dt>Quantity</dt><dd>{event.quantity ? `${event.quantity.value} ${event.quantity.unit}` : "unknown"}</dd></div>
          <div><dt>State change</dt><dd>{event.stateChange ? "Yes" : "No"}</dd></div>
        </dl>
        {props.findings.length > 0 ? (
          <div className="event-findings" aria-label={`${props.findings.length} linked findings`}>
            {props.findings.map((finding) => <span key={finding.findingId}>{finding.ruleId}</span>)}
          </div>
        ) : null}
      </div>
      <button
        className="event-evidence-button"
        type="button"
        onClick={(trigger) => props.onOpen(
          trigger,
          `${event.operation} event ${event.eventId}`,
          [event.eventId],
          props.findings.map((finding) => finding.findingId),
        )}
      >Canonical + raw ↗</button>
    </li>
  );
}

function SystemMap(props: { receipt: ReceiptResult; onOpen: OpenEvidence }) {
  const edges = buildSystemEdges(props.receipt.events);
  const systemsByBoundary = groupSystemsByBoundary(
    props.receipt.events,
    props.receipt.authority,
  );

  return (
    <div className="system-map-wrap">
      <p className="map-instruction">
        Four boundary columns follow. Scroll horizontally on narrow screens; the external boundary
        is marked with an exclamation point and a red rule.
      </p>
      <div className="system-map" aria-hidden="true">
        <div className="agent-node"><span>Agent</span><strong>{props.receipt.run.agent.name ?? props.receipt.run.agent.id}</strong></div>
        {(["local", "internal", "external", "unknown"] as const).map((boundary) => (
          <div className={`boundary-column boundary-${boundary}`} key={boundary}>
            <h3>{boundary} boundary</h3>
            {systemsByBoundary[boundary].length > 0 ? systemsByBoundary[boundary].map((system) => (
              <span className="system-node" key={system}>{system}</span>
            )) : <span className="empty-boundary">No named destination</span>}
          </div>
        ))}
      </div>
      <div className="edge-table-wrap">
        <h3>Text equivalent: every observed edge</h3>
        <div className="responsive-table" role="region" aria-label="System and data movement edges" tabIndex={0}>
          <table>
            <thead><tr><th>Event</th><th>From</th><th>Operation</th><th>To</th><th>Boundary</th><th>Known data / quantity</th><th>Evidence</th></tr></thead>
            <tbody>
              {edges.map((edge) => (
                <tr key={edge.eventId}>
                  <td><code>{edge.eventId}</code></td>
                  <td>{edge.from}</td>
                  <td>{edge.operation}</td>
                  <td>{edge.to}</td>
                  <td><span className={`boundary-text boundary-text-${edge.boundary}`}>{edge.boundary}</span></td>
                  <td>{edge.detail}</td>
                  <td><button type="button" onClick={(event) => props.onOpen(event, `Movement for ${edge.eventId}`, [edge.eventId])}>Open ↗</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FindingCard(props: { finding: Finding; onOpen: OpenEvidence }) {
  const finding = props.finding;
  return (
    <article className="finding-card">
      <div className="finding-meta">
        <span className={`severity severity-${finding.severity}`}>{finding.severity}</span>
        <code>{finding.ruleId}</code>
        <span>{finding.findingId}</span>
      </div>
      <h3>{finding.label}</h3>
      <p>{finding.description}</p>
      <dl>
        <div><dt>Policy path</dt><dd>{finding.policyPath ?? "Not applicable"}</dd></div>
        <div><dt>Event IDs</dt><dd>{finding.eventIds.join(", ") || "No event citation"}</dd></div>
      </dl>
      <button type="button" onClick={(event) => props.onOpen(event, finding.label, finding.eventIds, [finding.findingId])}>
        Inspect canonical + raw ↗
      </button>
    </article>
  );
}

function IntegrityStrip({ receipt }: { receipt: ReceiptResult }) {
  const integrity = receipt.integrity;
  const items: Array<[string, string]> = [
    ["SHA-256", integrity.sha256],
    ["Exact bytes", integrity.byteLength.toLocaleString()],
    ["Input format", integrity.inputFormat],
    ["Adapter", `${integrity.adapterName} ${integrity.adapterVersion}`],
    ["Authority schema", integrity.authoritySchemaVersion],
    ["Policy", integrity.policyId],
    ["Canonical schema", integrity.canonicalEventSchemaVersion],
    ["Receipt schema", integrity.receiptSchemaVersion],
    ["Generated", integrity.generatedAt],
    ["Copy source", integrity.generationSource],
    ...(integrity.generationSource === "granite"
      ? [
          ["Model", integrity.modelId],
          ["Model API", integrity.modelApiVersion],
        ] as Array<[string, string]>
      : []),
  ];
  return (
    <dl className="integrity-grid">
      {items.map(([label, value]) => (
        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
      ))}
    </dl>
  );
}

function EvidenceDrawer({
  request,
  build,
  synthetic,
  closeButtonRef,
  onClose,
}: {
  request: EvidenceRequest;
  build: SuccessfulBuild;
  synthetic: boolean;
  closeButtonRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const { receipt } = build;
  const citedFindings = request.findingIds
    .map((findingId) => receipt.findings.find((finding) => finding.findingId === findingId))
    .filter((finding): finding is Finding => Boolean(finding));
  const expandedEventIds = [...new Set([
    ...request.eventIds,
    ...citedFindings.flatMap((finding) => finding.eventIds),
  ])];
  const citedEvents = expandedEventIds
    .map((eventId) => receipt.events.find((event) => event.eventId === eventId))
    .filter((event): event is CanonicalEvent => Boolean(event));

  return (
    <div className="drawer-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <aside
        className="evidence-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="evidence-title"
      >
        <header>
          <div>
            <p className="section-number">Evidence drawer</p>
            <h2 id="evidence-title">{request.title}</h2>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close evidence drawer">Close ×</button>
        </header>
        <div className="drawer-source-note">
          <strong>{synthetic ? "Synthetic sample evidence" : "User-provided evidence"}</strong>
          <span>Canonical record first · exact retained raw object second</span>
        </div>
        <div className="drawer-content">
          {citedFindings.length > 0 ? (
            <section aria-labelledby="cited-findings-title">
              <h3 id="cited-findings-title">Cited findings</h3>
              {citedFindings.map((finding) => (
                <article className="drawer-finding" key={finding.findingId}>
                  <strong>{finding.label}</strong>
                  <span>{finding.ruleId} · {finding.severity}</span>
                  <p>{finding.description}</p>
                </article>
              ))}
            </section>
          ) : null}
          {citedEvents.length === 0 ? <p>No resolvable event citation was supplied for this claim.</p> : citedEvents.map((event) => {
            const rawObject = resolveRawPointer(build.retainedSource.rawDocument, event.rawPointer);
            return (
              <section className="evidence-pair" key={event.eventId} aria-labelledby={`canonical-${event.eventId}`}>
                <div className="evidence-record-heading">
                  <div><span>Canonical event</span><h3 id={`canonical-${event.eventId}`}>{event.eventId}</h3></div>
                  <code>{event.rawPointer}</code>
                </div>
                <pre tabIndex={0}>{JSON.stringify(event, null, 2)}</pre>
                <div className="evidence-record-heading raw-heading">
                  <div><span>Retained raw object</span><h3>{event.sourceEventId ?? "Source ID unknown"}</h3></div>
                  <code>{event.rawPointer}</code>
                </div>
                {rawObject === undefined ? (
                  <p className="raw-missing">Raw object could not be resolved from the retained pointer.</p>
                ) : (
                  <pre tabIndex={0}>{JSON.stringify(rawObject, null, 2)}</pre>
                )}
              </section>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

function SectionTitle(props: { number: string; title: string; detail: string; id: string }) {
  return (
    <div className="receipt-section-title">
      <span>{props.number}</span>
      <div><h2 id={props.id}>{props.title}</h2><p>{props.detail}</p></div>
    </div>
  );
}

function ErrorSummary(props: {
  error: { message: string; issues?: Array<{ path: string; message: string }> };
}) {
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    errorRef.current?.focus();
  }, [props.error.message]);

  return (
    <div ref={errorRef} className="error-summary" role="alert" tabIndex={-1}>
      <strong>{props.error.message}</strong>
      {props.error.issues && props.error.issues.length > 0 ? (
        <ul>{props.error.issues.slice(0, 6).map((issue, index) => (
          <li key={`${issue.path}-${index}`}><code>{issue.path}</code>: {issue.message}</li>
        ))}</ul>
      ) : null}
    </div>
  );
}

function formatSystemPath(event: CanonicalEvent): string {
  if (event.sourceSystem && event.destinationSystem) {
    return `${event.sourceSystem} → ${event.destinationSystem}`;
  }
  if (event.sourceSystem) return `${event.sourceSystem} → ${event.actorId}`;
  if (event.destinationSystem) return `${event.actorId} → ${event.destinationSystem}`;
  return "unknown → unknown";
}
