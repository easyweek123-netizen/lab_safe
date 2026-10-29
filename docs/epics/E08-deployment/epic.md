---
id: E08
title: Deployment
status: planned
covers: []
depends_on: [E05, E06, E07]
branch:
updated: 2026-10-29
---

# E08 Deployment

## Goal

The finished app runs at a free, shareable link for the teammates and the professor.

Requirements: no new requirement. It delivers the hosting decided in the design (D13) and runs the release checks.

## Scope

- A multi-stage `Dockerfile` (one Node 24 image that serves the API and the web app); migrations run at container start.
- Deployment to Render (free web service) with Neon (free Postgres 15, `sslmode=require`), deploying automatically on a push to `master`.
- Production configuration: secure cookies, the bootstrap admin, the Groq key, and `AI_HOURLY_LIMIT` tuned for Groq's free limits.
- A short deployment guide in the repository (which settings to set where, and how to wake the app before a demo).
- Release checks:
  - **M4:** every approved page has every required field, checked by a query against production.
  - **M3:** a final leak check on the deployed link.
  - A smoke test of the key journeys on the deployed link.

## Out of scope

Custom domains, paid tiers, monitoring.

## Exit criteria

Each one can be checked by the user, in a browser or by running a command.

- [ ] The Render link opens LabSafe over HTTPS, and `/api/health` reports OK.
- [ ] On the deployed link: an anonymous search finds a published page; the assistant answers with a source link; the bootstrap admin can log in.
- [ ] Pending content is "not found" on the deployed link (M3).
- [ ] The M4 query reports 100% complete pages.
- [ ] Pushing to `master` redeploys automatically.

## Stories

| ID  | Story | Type | Covers | Status |
| --- | ----- | ---- | ------ | ------ |

## Change requests

## Verification

<!-- architect, /epic-done: **GREEN** | **RED** · YYYY-MM-DD, then evidence bullets -->

## Open questions

- The user needs a Render account and a Neon project, and puts the secrets in Render's settings. Agents never handle them.

## Changes
