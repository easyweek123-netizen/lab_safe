# LabSafe: Requirements

Source of truth: [course/LabSafe_Required_Features.pdf](course/LabSafe_Required_Features.pdf). This file restates it with stable IDs, which specs, tests and reviews reference. If the two disagree, the PDF wins; flag the conflict to the user and don't guess.

**Scope rule:** build only REQUIRED features (US1–US14, R1–R2). CAN DO items (below) are out of scope unless the user explicitly asks for one.

## Product
A website where each of our lab's instruments has a **safety page** (photo, hazards, protective gear, safe-use guidelines, emergency steps). Anyone can search the pages or ask an AI assistant about them.

## Roles
| Role | Who | Account |
|---|---|---|
| **User** | Any student or visitor. Searches, reads, asks the AI assistant. | None needed |
| **Contributor** | Lab member with an **approved** account. Adds and updates safety pages. | Email + password, admin-approved |
| **Admin** | Lab lead or teacher. Approves contributors and safety pages. | Contributor account promoted to admin |

## User stories

### User (anonymous)
- **US1**: Search instruments by name, to find the one I'm about to use quickly.
- **US2**: Filter by category, lab room, hazard type and protective gear.
- **US3**: Open a safety page showing photo, hazards, protective gear, responsible person and last-approved date.
- **US4**: Read the guidelines split into four sections: **Before use · Safe operation · Do NOT · Emergency & first aid**.
- **US5**: Ask the AI assistant questions and get answers that **link to the source page**. If the assistant doesn't know, it **says so instead of guessing**.

### Contributor
- **US6**: Sign up with email and password; start contributing once an admin approves my account.
- **US7**: Add a new safety page with a photo and all fields.
- **US8**: Suggest an update to an existing page. **The current version stays visible until my update is approved.**
- **US9**: See whether each of my submissions is pending, approved or rejected, with the reason if rejected.

### Admin
- **US10**: Approve or reject new contributor sign-ups.
- **US11**: See all pending safety pages **and** updates in one list.
- **US12**: Preview a submission as students would see it, then approve it or reject it with a note.
- **US13**: Delete pages for instruments no longer in the lab.
- **US14**: Make other users admins, or remove that role.

## Rules
- **R1**: Nothing is published without admin approval.
- **R2**: The AI assistant has **one shared hourly message limit for the whole site**. Once it's reached, the assistant says "try again later".

## Safety page fields
- Name, photo, manufacturer/model, category, lab room, description, responsible person
- Hazards (GHS hazard system), protective gear (PPE)
- Guidelines: Before use, Safe operation, Do NOT, Emergency & first aid
- System: last-approved date
- The structure follows common university equipment-safety templates (MIT, UC Berkeley, Univ. of Washington) and GHS.

## AI assistant behaviour
Works "like a librarian who may only answer from our shelves": it searches our pages, reads them and cites them. No answer without a source; no general chemistry knowledge presented as fact.

## Out of scope: CAN DO (build only if requested)
QR stickers · technical specs table · manual PDF · safety quiz / "I have read this" · instrument booking · out-of-service status · PubChem linking · change history · printable briefing · saved chat history · other languages · Google login.

## Process (from the doc)
Features agreed → **clickable mockups** approved → ~4 weeks of development → admins, contributors and users test the site.

## Decisions taken during setup (see docs/adr/)
- Pending contributors **can log in** (so they see "awaiting approval"), but every contributor action is refused until they're approved.
- First admin is seeded from env (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`). The last remaining admin can't be demoted.
- Delete (US13) is a **soft delete**; the page disappears from the public site and search.
- At most **one pending revision per instrument** at a time.
- Hazards use the 9 GHS pictograms; PPE is a fixed list (see `packages/shared`).
- LLM provider: **undecided**. Everything runs against a deterministic fake provider until feature 009 picks one.
