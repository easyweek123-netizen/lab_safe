---
id: E07
title: AI safety assistant
status: planned
covers: [US5, R2]
depends_on: [E04]
branch:
updated: 2026-10-29
---

# E07 AI safety assistant

## Goal

Students can ask a safety question and get an answer taken only from approved pages, with a link to the page, or an honest "I don't know".

Requirements: US5, R2.

## Scope

- The `LlmProvider` interface; the OpenAI-compatible provider (gpt-oss-120b on Groq); `FakeLlmProvider` for all automated tests.
- The two tools: `search_safety_pages` and `get_safety_page`.
- Server-side checking of the sources; at most 3 tool rounds; a 15 s time-out.
- The site-wide hourly limit (R2), and "try again later" for both the limit and provider errors.
- The assistant panel with the "check the safety page" note.
- `pnpm eval:assistant`, the 20-question check for M6, run locally with the user's Groq key in `.env`.

## Out of scope

Chat history and follow-up questions; production configuration (E08).

## Exit criteria

Each one can be checked by the user, in a browser or by running a command.

- [ ] Locally, with a Groq key, asking "Which gloves do I need for the rotary evaporator?" answers from that page and links to it.
- [ ] A question that no page covers gets "I don't know".
- [ ] With `AI_HOURLY_LIMIT=2`, the third question in the hour gets "try again later".
- [ ] `pnpm eval:assistant` meets the M6 targets: at least 14 of 15 answerable questions cited correctly, 5 of 5 unanswerable ones declined, and no citation of an unapproved page.
- [ ] `pnpm verify` and `pnpm e2e` pass.

## Stories

| ID  | Story | Type | Covers | Status |
| --- | ----- | ---- | ------ | ------ |

## Change requests

## Verification

<!-- architect, /epic-done: **GREEN** | **RED** · YYYY-MM-DD, then evidence bullets -->

## Open questions

- The user needs a free Groq API key in `.env` before the M6 check can run locally.

## Changes
