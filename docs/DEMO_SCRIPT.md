# Agent Receipt three-minute judge demo

Target length: 2 minutes 58 seconds. Record at 1280 × 720 or higher. Keep the browser zoom at 100%, hide personal bookmarks and notifications, and use only the repository's synthetic fixtures.

## Shot plan and narration

### 0:00–0:18 — The accountability gap

**Show:** Landing page, then select **Expected run**.

**Say:**

“An AI agent can report success while leaving its manager with a harder question: did it do only what I authorized? Agent Receipt reviews a completed run against a manager-declared authority envelope and turns the supplied evidence into a decision-ready receipt.”

### 0:18–0:42 — Exact evidence and declared authority

**Show:** Continue to the authority step. Briefly point to systems, operations, restricted data, egress, volume, and approvals. Build the receipt.

**Say:**

“The source bytes are preserved and hashed before normalization. Authority is confirmed separately; it is never inferred from what the agent happened to do. Every raw record must be mapped, kept as metadata-only, or marked unparsed.”

### 0:42–0:55 — A clean receipt

**Show:** Clean verdict, three-of-three coverage, then open **Policy checks** and scan the nine no-finding outcomes.

**Say:**

“This expected run stays within the supplied envelope. All nine policy checks are recorded, including the ones with no finding. That means no deviation from explicit supplied facts, not that the trace is complete. Granite cannot change any outcome, and the credential-free fallback keeps the review usable.”

### 0:55–1:23 — The overreaching run

**Show:** Start a new review, select **Overreaching run**, continue, and build. Open **Policy checks**, then land on the verdict and incident brief.

**Say:**

“Now the same task includes an external spreadsheet attempt with an unknown outcome, a retry, and an unapproved customer-email send. The ledger shows six deviating checks beside three that produced no finding. Twelve findings become two cited incidents without hiding the full policy record.”

### 1:23–1:45 — Evidence, not a risk score

**Show:** Open one incident's evidence, point to the finding, canonical event, and retained raw object, then close the drawer.

**Say:**

“This is not an unexplained risk score. Every material claim opens into its deterministic finding, normalized event, and retained source object. Unknown stays unknown, including the first spreadsheet attempt.”

### 1:45–2:03 — Make the model boundary visible

**Show:** Open **AI boundary**, point to the fallback or Granite status, the three deterministic gates, and the omitted-field list. Expand the JSON only if the recording remains readable.

**Say:**

“The interface shows exactly what Granite can receive. Raw event bodies, source pointers, and policy comparison values stay out. Granite may select up to five known finding IDs; deterministic code renders the cited text or falls back safely.”

### 2:03–2:18 — Recovery without hidden execution

**Show:** Open **Recovery plan**, scan the required-authority and reversibility labels, then use the decision section to download the complete evidence packet.

**Say:**

“Agent Receipt proposes cited follow-up steps, but it never executes them. The complete packet includes a Recovery Plan v1 artifact that is citation-closed and SHA-256-bound to this receipt. Current state stays unknown, execution authority was not granted, and approval is required.”

### 2:18–2:38 — Refuse to overclaim

**Show:** Start a new review with **Incomplete OTLP run**, build it, then open **Evidence gaps** and the unparsed source record.

**Say:**

“A trustworthy reviewer also needs to know when the evidence is not enough. This OTLP run accounts for all three source spans, but one material action lacks an explicit operation and the run has no terminal status. Agent Receipt refuses a clean or violation verdict, names the evidence needed, and still opens the exact raw-only span.”

### 2:38–2:55 — Carry and verify the complete handoff

**Show:** Switch to **Verify an export** and choose **Verify evidence packet**. Point to PASS, the three-artifact summary, and the manifest, receipt-replay, and recovery-binding gates.

**Say:**

“One file now carries the manager brief, validated receipt, and cited recovery plan. The browser-only verifier hashes the exact packet, replays all three artifacts, then reruns the receipt and recovery binding. It proves internal consistency, not who created the file or whether the trace was complete.”

### 2:55–2:58 — Close

**Show:** Integrity strip or README architecture section.

**Say:**

“IBM Bob built the trust-critical foundation. Granite adds a bounded runtime layer. Agent Receipt shows what the evidence proves, where it stops, and whether the complete handoff still agrees with itself.”

## Recording checks

- Keep the final cut at or below three minutes, including title and end cards.
- Make the pointer movement slow enough to follow and remove dead time between the two fixtures.
- Ensure the policy outcome register, evidence drawer, AI boundary labels, Evidence Gap ledger, packet summary, verifier gates, and export status are legible at the uploaded resolution.
- Do not show `.env.local`, browser autofill, terminal history, account dashboards, private repository controls, or real traces.
- Add captions and verify them manually against the spoken words.
- Upload publicly, then test playback and all project links while signed out.
