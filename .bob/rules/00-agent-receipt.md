# Agent Receipt rules

Read `AGENTS.md` and the relevant section of `docs/PRD.md` before planning or editing.

- Do not invent product behavior outside the approved PRD.
- Rules establish findings; Granite only explains verified facts.
- No raw event may be silently dropped.
- Unknown is a valid value and must remain visible.
- Do not add live integrations, authentication, a database, a policy language, or PDF export during P0 work.
- Propose focused verification and run `npm run verify` after implementation.
- Update `docs/AI_ASSISTANCE_LOG.md` only with accurate tool usage and executed checks.
