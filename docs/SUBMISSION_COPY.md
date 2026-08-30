# Agent Receipt submission copy

## Project name

Agent Receipt

## Submission video

https://drive.google.com/file/d/1a6-qbUImL2ZFOYaWq4reeaHr3TRfzV1U/view?usp=sharing

## Short project description (90/100 characters)

Evidence-linked receipts showing whether an AI agent stayed within its assigned authority.

## About

Agent Receipt turns a completed AI-agent run into an evidence-linked review of what the agent did versus what it was allowed to do. It preserves the supplied trace, accounts for every raw event, applies deterministic policy checks, and lets managers open each material conclusion into its supporting evidence. IBM Granite explains only minimized, redacted, verified facts; code decides the verdict, and a deterministic fallback keeps the review usable without credentials or network inference.

## The issue

When an AI agent reports that a task is complete, managers still need to know whether it stayed within the authority they approved. Raw logs are dense, fragmented, and built for developers; they rarely reconcile observed actions with permitted systems, operations, data movement, limits, and approvals. A run can appear successful while contacting the wrong system, moving data beyond an approved boundary, or leaving critical evidence gaps. Accountable humans are left choosing between blind trust and time-consuming manual log inspection.

## Our solution

Agent Receipt converts a supplied JSON execution trace and a manager-defined authority envelope into an evidence-linked post-run receipt. It hashes the exact input bytes, accounts for every raw event, normalizes only reviewer-confirmed facts, and runs deterministic checks across systems, operations, egress, data rules, volume, approvals, retries, errors, and trace sufficiency. Every material conclusion links back to canonical and retained raw evidence. IBM Granite receives only a minimized, recursively redacted fact bundle and may explain verified findings, but code—not the model—decides the verdict. Invalid citations are rejected, and a deterministic fallback keeps the complete workflow usable without credentials or network access.

## Evidence boundary

All conclusions are qualified as based on the supplied trace and the declared authority envelope. Agent Receipt does not claim compliance certification, live enforcement, or objective truth about activity absent from the supplied evidence.
