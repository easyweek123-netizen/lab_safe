---
frozen: true
updated: 2026-10-30
---

# Epics

Delivery order, top to bottom. Frozen by `/epics`; changes only through `/change-request`. Live statuses: `node .claude/tools/board.mjs`.

| ID  | Epic | Goal | Covers | Depends on | Status |
| --- | ---- | ---- | ------ | ---------- | ------ |
| E01 | [Foundation](E01-foundation/epic.md) | A running, tested empty app on the developer's machine with every tooling command | NFR6, NFR2 | none | done |
| E02 | [Accounts and access](E02-accounts-access/epic.md) | People sign up, log in, get approved; admins manage roles | US6, US10, US14, NFR4, NFR5 | E01 | done |
| E03 | [Write and submit a safety page](E03-write-submit-page/epic.md) | A contributor submits a complete page that stays hidden | US7, R3, R4, R5 | E02 | done |
| E04 | [Review and publish](E04-review-publish/epic.md) | An admin reviews a page; approved pages become public | US3, US4, US9, US11, US12, R1 | E03 | planned |
| E05 | [Page updates and deletion](E05-updates-deletion/epic.md) | Published pages can be safely updated and removed | US8, US13, R6 | E04 | planned |
| E06 | [Search and filters](E06-search-filters/epic.md) | Students find the right page within 3 seconds | US1, US2, NFR1, NFR3, NFR2 | E04 | planned |
| E07 | [AI safety assistant](E07-ai-assistant/epic.md) | Grounded, cited answers from approved pages | US5, R2 | E04 | planned |
| E08 | [Deployment](E08-deployment/epic.md) | A free, shareable link to the finished app; release checks | none | E05, E06, E07 | planned |

## Coverage

Every MUST requirement of the PRD appears in exactly one epic.

| Requirement | Epic |
| ----------- | ---- |
| US1, US2 | E06 |
| US3, US4 | E04 |
| US5 | E07 |
| US6 | E02 |
| US7 | E03 |
| US8 | E05 |
| US9, US11, US12 | E04 |
| US10, US14 | E02 |
| US13 | E05 |
| R1 | E04 |
| R2 | E07 |
| R3, R4, R5 | E03 |
| R6 | E05 |
| NFR1, NFR3 | E06 |
| NFR4, NFR5 | E02 |
| NFR6 | E01 |
| NFR2 (mobile) | Cross-cutting: E01 sets up the 375 px tests, every UI epic checks it, E06 does the final check |

**Impact metrics by epic:** M1, M2 and M5 in E06; M3 in E03, E04, E05 and E06, and finally in E08; M6 in E07; M4 in E08.
