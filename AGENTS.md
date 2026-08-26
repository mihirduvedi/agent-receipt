# Agent Receipt Team Standards

## Product boundary

Build the six-day MVP defined in `docs/PRD.md`. The primary user is an AI operations manager reviewing a completed run. Do not widen the product into live interception, enforcement, general observability, compliance certification, or chain-of-thought capture.

## Trust invariants

- Preserve exact raw input bytes and compute their SHA-256 before normalization.
- Account for every raw event as mapped, metadata-only, or unparsed.
- Keep policy evaluation and verdict computation deterministic.
- Treat missing fields as unknown; never ask a model to infer them.
- Send only minimized, redacted facts to Granite from a server-only route.
- Reject generated claims without valid event/finding citations.
- Keep the deterministic fallback fully usable without credentials or network access.
- Qualify conclusions as based on the supplied trace and authority envelope.

## Engineering rules

- TypeScript strict mode and Zod at all external boundaries.
- Add focused tests for every changed trust-critical behavior.
- Run `npm run verify` before declaring a slice complete.
- Separate automated evidence from manual, visual, deployed, and accessibility checks.
- Never commit `.env*`, credentials, real personal data, or private logs.
- Keep changes inside the current daily slice and follow the PRD cut order.

## IBM Bob evidence

IBM Bob must be the primary development tool for hackathon implementation. Record material AI-assisted sessions honestly in `docs/AI_ASSISTANCE_LOG.md`; do not attribute another tool’s work to Bob.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
