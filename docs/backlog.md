# Backlog

Status flow: `todo` → `spec` (spec written, awaiting user approval) → `approved` → `building` → `review` (handoff written, awaiting user merge) → `merged`.

Only the user sets `approved`. Only `/post-merge` sets `merged`.

| # | Feature | Covers | Status | Spec | Handoff |
|---|---|---|---|---|---|
| 000 | Scaffold, quality gates, Claude files, seed admin | n/a | review | n/a | [000](handoff/000-scaffold.md) |
| 001 | Clickable mockup: real routes and components on MSW mock data, for team/professor sign-off | all UI | todo | | |
| 002 | Auth: sign up, login/logout, pending state; admin approves/rejects sign-ups; grant/revoke admin | US6, US10, US14 | todo | | |
| 003 | Create safety page (photo + all fields) → pending; "My submissions" with status and reason | US7, US9 | todo | | |
| 004 | Admin review queue (new + updates), preview as students see it, approve / reject with note | US11, US12, R1 | todo | | |
| 005 | Public safety page view (photo, hazards, PPE, responsible person, last-approved date, 4 guideline sections) | US3, US4 | todo | | |
| 006 | Search by name + filters (category, lab room, hazard, PPE), no login | US1, US2 | todo | | |
| 007 | Suggest update to an existing page; the live version stays until approved | US8 | todo | | |
| 008 | Delete page (soft delete, admin) | US13 | todo | | |
| 009 | AI assistant: librarian with search/get tools, cites links, says "I don't know", global hourly limit | US5, R2 | todo | | |
| 010 | Hardening: seed real instruments, a11y pass, prod Docker build, README / demo script | n/a | todo | | |
