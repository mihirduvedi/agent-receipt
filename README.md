# Agent Receipt

Agent Receipt turns a raw AI-agent execution trace and a declared authority envelope into an evidence-linked review receipt. It helps an AI operations manager decide whether to accept a run, investigate it, or reject its output.

The core product rule is:

> Rules establish what happened relative to authority; Granite explains the verified result to a human.

This repository is in active MVP implementation. The deterministic evidence pipeline, Granite/fallback boundary, and complete receipt orchestration are implemented; the manager-facing interface remains in progress. The product requirements and trust contracts are frozen in [docs/PRD.md](docs/PRD.md).

## Deadline and MVP

- Hackathon: IBM SkillsBuild AI Builders Challenge with IBM Bob
- Track: Wildcard — Build Intelligent Systems for the Future of Work
- Submission deadline: August 31, 2026 at 11:59 PM ET / 8:59 PM PT
- Required deliverables: public GitHub repository, working prototype, README, project page, and public video no longer than three minutes
- Required workflow: IBM Bob is the primary development tool and every teammate completes the required IBM SkillsBuild Bob learning activity

Live rules can change. Recheck the [challenge platform](https://aibuilderschallenge-bobhub.bemyapp.com/) and [official rules](https://res.cloudinary.com/ideation/image/upload/q_100,f_pdf,dpr_auto/id-ibm-skillsbuil-3eec69/pkqvg8j3q3a4teedy1kd.pdf) before submission.

## Input parser behavior

The MVP accepts one UTF-8 Agent Receipt Native Trace v1 JSON document up to 2 MiB. Duplicate JSON property names follow the platform's standard `JSON.parse` behavior: the last value is retained. Inputs should not rely on duplicate names, and the committed synthetic fixtures contain none.

## Start locally

Requirements: Node.js 24 and npm 11.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Run the complete local verification gate with:

```bash
npm run verify
```

## Open in GitHub Codespaces

The repository contains a committed `.devcontainer/devcontainer.json` that provisions Node.js 24, installs dependencies with `npm ci`, forwards port 3000, and configures the editor for TypeScript, ESLint, Prettier, and Vitest.

After this folder is pushed to GitHub:

1. Open the repository on GitHub.
2. Select **Code → Codespaces → Create codespace on main**.
3. Wait for `npm ci` to finish.
4. Run `npm run dev` in the Codespace terminal.
5. Open the forwarded port when GitHub offers it.

IBM Bob IDE is a standalone application, not a Codespaces extension. For a Bob-primary workflow, either clone the same GitHub repository in IBM Bob IDE or install Bob Shell manually in the Codespace terminal. See [docs/IBM_BOB_WORKFLOW.md](docs/IBM_BOB_WORKFLOW.md).

## Environment variables

Copy `.env.example` to `.env.local` only when live Granite integration begins. Never commit credentials.

| Variable | Purpose |
|---|---|
| `WATSONX_API_KEY` | Server-only IBM Cloud API key |
| `WATSONX_PROJECT_ID` | watsonx.ai project identifier |
| `WATSONX_URL` | Regional watsonx.ai service URL |
| `WATSONX_MODEL_ID` | Granite model verified as available to the team |
| `GRANITE_MODE` | `live` for watsonx.ai; `fallback` for deterministic prose |

## Project documents

- [Product requirements](docs/PRD.md)
- [IBM Bob and other AI tools workflow](docs/IBM_BOB_WORKFLOW.md)
- [AI assistance log](docs/AI_ASSISTANCE_LOG.md)

## Current limitations

Agent Receipt is an audit aid, not a compliance certification, tamper-proof log, enforcement system, or source of hidden chain-of-thought. Its conclusions apply only to the supplied trace and authority envelope.
