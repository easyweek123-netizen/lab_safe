---
status: approved
updated: 2026-10-29
---

# LabSafe PRD

Source brief: [LabSafe_Required_Features.pdf](../../LabSafe_Required_Features.pdf). This PRD is the single source of requirements; if it and the brief disagree, the PRD wins and the difference is listed in §7.

## 1. Problem and desired impact

**In the user's words:** *"We want to build a safety app where contributors can upload the safety instructions for chemistry lab instruments and chemicals. We need to identify correct data hierarchy and structure so we cover all aspects important in lab. We are particularly conscious about how to structure information so we dont miss out details which are important in chemistry lab environment i.e. hazard level etc. Since i am not a chemistry expert, i shall rely on you about what factors to consider. Also students should be able to find safety instruction under 3 sec. No Instruction should be visible to students without admin approval"*

**Stated precisely:**

1. **Complete structure.** Every instrument has one safety page with the same fixed structure, based on university equipment SOP templates and the GHS hazard system. The structure cannot be submitted with a safety-critical part missing. Those parts are the hazard level, the hazards, the protective equipment, the training required, the emergency steps, the location of the emergency equipment, and who to call.
2. **Fast.** From submitting a search, the correct safety page is fully displayed within **3 seconds** (p95, system time).
3. **Approval first.** Unapproved content never reaches a student by any route: search, page link, photo link, or the AI assistant. While a page is being updated, students keep seeing the last approved version.

Chemical pages are not part of this release. Chemicals appear only through an instrument's hazards: the "Chemical exposure" hazard type and the optional GHS pictograms.

## 2. Personas

| Persona | Context | Job to be done |
| --- | --- | --- |
| **Student (Ali)**, "User" | First-year or visitor, often on a phone at the bench. No account. | Find the page in seconds; see at a glance how dangerous the instrument is, what to wear, and what to do in an emergency. |
| **Contributor (Sara)** | Lab member with an admin-approved account. Knows the instrument, not the software. | Write or improve a page without forgetting anything important; see whether it was accepted. |
| **Admin** | Lab lead or teacher, responsible for lab safety. | Admit trusted contributors, check every page before students see it, remove old instruments, share the admin role. |

## 3. Research

**University lab SOP templates (Berkeley, Stanford, UTSA).** *We borrow* their fixed sections (hazards, PPE, emergency steps with a phone number and the location of the eyewash, shower and extinguisher, required training) and putting the emergency contact on the first screen. *We avoid* long forms and signature pages. Sources: [Berkeley](https://ehs.berkeley.edu/publications/standard-operating-procedure-sop-template-general), [Stanford](https://ehs.stanford.edu/wp-content/uploads/SOP-template.docx), [UTSA](https://research.utsa.edu/compliance/_documents/_LabSafety/SOP%20Guidance%20UTSA%202023.pdf).

**Equipment SOP templates (UMBC, Nazarbayev University).** *We borrow* hazards that go beyond chemicals (electrical, moving parts, pressure, heat) and machine-specific training before first use. *We avoid* industrial lock-out procedures. Sources: [UMBC](https://safety.umbc.edu/wp-content/uploads/sites/507/2026/04/SOP-Template-Tools-Equipment-Machinery.docx.pdf), [NU](https://regulations.nu.edu.kz/bitstream/123456789/482/1/Standard%20Operating%20Procedure%20Template%20for%20laboratory%20equipment.pdf).

**GHS labels and the 16-section SDS.** *We borrow* the 9 GHS pictograms as a fixed list, and the idea of one overall severity word (GHS uses "Danger" or "Warning"), which becomes our hazard level. *We avoid* full hazard and precautionary statement catalogues, which belong to chemical pages (OUT). Sources: [Illinois DRS](https://www.drs.illinois.edu/SafetyLibrary/ChemicalHazardClassification), [Columbia](https://research.columbia.edu/sites/default/files/content/EHS/Lab%20Safety/GHSFlyer1.pdf).

**NFPA 704 fire diamond.** *We borrow* a small severity scale you can read at a glance, and never show severity by colour alone. *We avoid* its four separate 0–4 ratings, which are too fine-grained for contributors who are not safety experts. Source: [NFPA 704](https://en.wikipedia.org/wiki/NFPA_704).

**PubChem Laboratory Chemical Safety Summary.** *We borrow* one consistent layout for every entry, so readers always know where to look. *We avoid* external data links (PubChem linking is CAN DO). Source: [Cornell library](https://physicalsciences.library.cornell.edu/database/lcss-laboratory-chemical-safety-summary/).

**Chemwatch / GoldFFX SDS portals.** *We borrow* search by name, then filter, and easy read access. *We avoid* inventory modules and requiring a login just to read. Source: [Univ. of Melbourne](https://safety.unimelb.edu.au/safety-topics/chemical-safety/chemwatch).

**Confluence approval workflows (Comala).** *We borrow* this pattern: the approved version stays live at the same URL, and an edit becomes a draft that viewers never see, even through search, until it is approved. *We avoid* multi-stage workflows. Source: [Comala docs](https://appfire.atlassian.net/wiki/spaces/SUPPORT/pages/2021359631/Managing+draft+and+published+content+visibility+in+the+Comala+Document+Management+app+Data+Center).

**Grounded documentation assistants (kapa.ai).** *We borrow* answering only from our own pages, citing every answer, and saying "I don't know" when the pages don't cover a question. *We avoid* analytics dashboards. Source: [kapa.ai](https://www.kapa.ai/library/how-to-reduce-hallucinations-in-a-documentation-chatbot).

**Nielsen response-time limits.** Results within 1 s keep the user's flow of thought, and 10 s is where attention drifts. Our 3 s end-to-end target sits well inside that range. Source: [NN/g](https://www.nngroup.com/videos/3-response-time-limits-interaction-design/).

## 4. Requirements

### 4.1 What a safety page contains

Fields marked ✓ are required before a page can be submitted (R3).

**Identity**

| Field | Req. | Notes |
| --- | --- | --- |
| Name | ✓ | e.g. "Rotary evaporator"; searchable |
| Photo | ✓ | One JPEG or PNG, ≤ 5 MB |
| Manufacturer, model | | Searchable |
| Category | ✓ | Fixed list (§4.2) |
| Lab room | ✓ | Fixed list |
| Short description | ✓ | What it does, 1–3 sentences |
| Responsible person | ✓ | Name and contact (email or phone extension) |

**Risk at a glance**

| Field | Req. | Notes |
| --- | --- | --- |
| Hazard level | ✓ | Low / Medium / High (R5). Badge with word and icon, never colour alone |
| Training required before first use | ✓ | Yes/no, and who gives it |

**Hazards and protection**

| Field | Req. | Notes |
| --- | --- | --- |
| Hazard types | ✓ | One or more from §4.2, each with a short note on how it arises. Or explicitly "No significant hazards" |
| GHS pictograms | | Zero or more, for chemicals typically used with the instrument |
| PPE items | ✓ | One or more from §4.2, each with an optional note (e.g. "nitrile, ≥ 0.11 mm"). Or explicitly "No PPE beyond standard lab attire" |

**Guidelines (always in this order)**

| Section | Req. | What the contributor is prompted to cover |
| --- | --- | --- |
| Before use | ✓ | Training, inspection, PPE, ventilation, setup |
| Safe operation | ✓ | Steps, operating limits (temperature, pressure, speed), clean-up and waste, normal shutdown |
| Do NOT | ✓ | Prohibited actions, incompatible materials, known misuse |
| Emergency & first aid | ✓ | Emergency shutdown; fire, spill, skin or eye contact, inhalation, injury |

**Emergency info**

| Field | Req. | Notes |
| --- | --- | --- |
| Emergency phone number | ✓ | Shown at the top of the Emergency section |
| Nearest emergency equipment | ✓ | Eyewash, safety shower, fire extinguisher, spill kit, first-aid kit, emergency stop: each one a location or "not applicable" |

**System:** last-approved date and approver, set automatically on approval.

### 4.2 Fixed lists (R4)

- **Hazard types:** Electrical · Hot surface / heat · Cryogenic / extreme cold · High pressure / compressed gas · Vacuum / implosion · Fire / flammable vapour · Chemical exposure (toxic, corrosive, irritant) · UV radiation · Laser · Ionizing radiation (X-ray) · Strong magnetic field · Moving or rotating parts · Glass breakage / sharps · Noise · Biological
- **PPE:** Safety glasses · Splash goggles · Face shield · Lab coat · Flame-resistant lab coat · Chemical-resistant gloves · Heat-resistant gloves · Cryogenic gloves · Cut-resistant gloves · Laser safety eyewear · UV-protective eyewear · Hearing protection · Respirator · Closed-toe shoes
- **GHS pictograms:** Explosive · Flammable · Oxidizing · Compressed gas · Corrosive · Toxic (skull) · Harmful/irritant (exclamation mark) · Health hazard · Environmental hazard
- **Categories:** Heating & thermal · Separation & evaporation · Analytical & spectroscopy · Pressure & vacuum · Cooling & cryogenic · Mixing & centrifugation · Ventilation & containment · Other
- **Lab rooms:** set once in the initial data

### 4.3 User stories

Priority: MUST = built and accepted · SHOULD = only if time allows, via `/change-request` · OUT = not built.

**Student**

| ID | Requirement | Persona | Priority | Product-level acceptance |
| --- | --- | --- | --- | --- |
| US1 | Search instruments by name | Student | MUST | Public search, no login. Matches name, manufacturer or model, regardless of case. Each result shows name, photo, room and hazard badge. A clear "no results" message when nothing matches. |
| US2 | Filter by category, lab room, hazard type, PPE and hazard level | Student | MUST | Filters combine with each other and with search; the number of active filters is shown; one click clears all. |
| US3 | Open a safety page | Student | MUST | Shows every §4.1 field. On a 375 px phone, the hazard level, training, hazards, PPE and emergency number are visible without scrolling. |
| US4 | Read the four guideline sections | Student | MUST | Before use · Safe operation · Do NOT · Emergency & first aid, always in that order. The Emergency section shows the phone number and the emergency equipment locations. |
| US5 | Ask the AI assistant | Student | MUST | Answers come only from approved pages and link to them. An uncovered question gets "I don't know". Every answer shows "Always check the safety page and ask the responsible person." |

**Contributor**

| ID | Requirement | Persona | Priority | Product-level acceptance |
| --- | --- | --- | --- | --- |
| US6 | Sign up and wait for approval | Contributor | MUST | After sign-up the user sees "waiting for approval" and cannot create pages until approved. A rejected account can never create content. |
| US7 | Add a new safety page | Contributor | MUST | The form covers §4.1. Missing required fields are named. A submitted page shows as "pending" and is invisible to the public. |
| US8 | Suggest an update | Contributor | MUST | The contributor edits a copy of the page. Students see the old version until approval, then the new version with a new approval date. |
| US9 | See my submissions' status | Contributor | MUST | Lists every new page and update as pending, approved or rejected. A rejected item shows the admin's note and can be fixed and resubmitted. |

**Admin**

| ID | Requirement | Persona | Priority | Product-level acceptance |
| --- | --- | --- | --- | --- |
| US10 | Approve or reject sign-ups | Admin | MUST | A list of pending sign-ups; approve or reject each one. |
| US11 | One list of pending pages and updates | Admin | MUST | Oldest first, each marked "new" or "update", with the contributor and the date. |
| US12 | Preview, then approve or reject with a note | Admin | MUST | The preview looks exactly like the public page; for an update, the live version can be opened next to it. A rejection needs a note. Approval publishes immediately. |
| US13 | Delete a page | Admin | MUST | After confirmation, the page is gone from search, its URL shows "not found", and the assistant no longer uses it. |
| US14 | Make or remove admins | Admin | MUST | An approved contributor can be promoted and an admin demoted. The last admin cannot be demoted. |

### Rules

| ID | Rule | Priority | Product-level acceptance |
| --- | --- | --- | --- |
| R1 | Nothing is published without admin approval | MUST | Anonymous visitors get "not found" for the URL or photo of any pending, rejected or draft content. Text that exists only in a pending update is never found by search or the assistant. |
| R2 | One shared hourly AI message limit for the whole site | MUST | Once the limit is reached (configurable, default 100 per hour), the assistant says "try again later" until the hour resets. |
| R3 | A page cannot be submitted incomplete | MUST | Every ✓ field in §4.1 is required. "No significant hazards" and "No PPE beyond standard lab attire" must be chosen explicitly. |
| R4 | Fixed lists only | MUST | Hazards, PPE, pictograms, categories and rooms come only from §4.2. Free text is allowed only in the notes. Editing the lists in the app is OUT. |
| R5 | Hazard level definitions | MUST | **High:** misuse can cause serious injury or death, or training is needed before first use (high voltage, cryogens, pressure vessels, class 3B/4 lasers, X-ray). **Medium:** misuse can cause an injury that needs first aid or medical care (hot surfaces, glass under vacuum, corrosive splashes). **Low:** minor risk with standard lab PPE. The definitions are shown next to the field. A page with training required cannot be Low. |
| R6 | At most one pending update per page | MUST | While an update is pending, others see "an update is awaiting review" and cannot start another one. |

### Non-functional

| ID | Requirement | Priority | Acceptance |
| --- | --- | --- | --- |
| NFR1 | Speed: from search to page fully shown ≤ 3 s, and results ≤ 1 s (p95) | MUST | M1 and M2 met |
| NFR2 | Mobile: usable at 375 px wide, with no horizontal scrolling | MUST | Browser tests run at 375 px and at desktop width |
| NFR3 | Accessibility: WCAG 2.1 AA basics; hazard information never by colour alone | MUST | M5 met; pictograms have alt text |
| NFR4 | Security: hashed passwords; every role check on the server; contributors edit only their own drafts | MUST | Tests show that students, pending contributors and contributors are refused every admin action and every action on someone else's draft |
| NFR5 | Privacy (GDPR): accounts store only name, email and password hash; no tracking cookies | MUST | Only strictly necessary cookies; no other personal data stored |
| NFR6 | Interface in English | MUST | All text is English |

## 5. Impact metrics

| ID | Metric | Target | When |
| --- | --- | --- | --- |
| M1 | Search submitted → correct page fully shown | ≤ 3 s (p95) | Search epic and release |
| M2 | Search response time | ≤ 1 s (p95) | Search epic and release |
| M3 | Unapproved content visible to the public | 0 leaks | Every epic touching publishing, search or the assistant, and release |
| M4 | Approved pages with every required field | 100% | Release |
| M5 | Lighthouse accessibility, mobile | ≥ 90 | Public pages epic and release |
| M6 | Assistant grounded in approved pages | see below | Assistant epic and release |

**How each metric is measured:**

- **M1 and M2 (the user's "under 3 seconds" goal).** An automated timed Playwright test runs on the `pnpm e2e` stack with at least 50 seeded pages. It runs 20 queries and opens the top result each time. It records the time from submit until the results appear (M2) and the time until the page has finished rendering (M1).
- **M3 (the user's "no visibility without approval" goal).** Automated tests act as an anonymous visitor against pending, rejected and updated pages. They try search, the page URL, the photo URL and an assistant question.
- **M4 (the user's "don't miss important details" goal).** A database query over approved pages at release, plus the automated tests for R3.
- **M5.** A Lighthouse run against the `pnpm qa:serve` copy, on the search page and on one safety page.
- **M6.** A scripted set of 20 questions against seeded data: 15 that the pages answer and 5 that they don't. The target is at least 14 of 15 citing the right approved page, 5 of 5 answering "I don't know", and 0 answers citing an unapproved page. The result is recorded in the epic's `qa.md`.

## 6. Out of scope

- **Chemical safety pages** (CAS number, hazard and precautionary statements, storage, SDS). Decided by the user on 2026-10-29; they can be added later through `/change-request`.
- Every CAN DO item from the brief: QR stickers, specs table, manual PDF, safety quiz, booking, out-of-service status, PubChem linking, change history, printable briefing, saved chat history, other languages, Google login.
- Password reset and all email notifications.
- Editing the fixed lists in the app; more than one photo per page; annual-review reminders.

## 7. Assumptions, risks, open questions

**Deliberate differences from the brief**

- The brief's "instruments and chemicals" is narrowed to instruments only.
- A **hazard level** field (R5) and a hazard-level filter in US2 are new. This answers the user's hazard-level concern.
- A page has more structure than brief §5: training required, a note per hazard, optional GHS pictograms, a note per PPE item, the emergency phone number and the emergency equipment locations.
- New rules R3 to R6.
- Search also matches manufacturer and model.

**Assumptions**

- About 20 to 100 instruments; performance is measured with at least 50 seeded pages.
- The first admin comes from the setup data.
- A forgotten password is resolved by an admin outside the app.
- An admin may approve their own submission, because a small lab may have only one admin.

**Risks**

- *Wrong AI safety advice.* Mitigation: answers come only from approved pages, always with a citation and the "check the page" note; M6 is measured.
- *The hazard level is a judgement call.* Mitigation: the R5 definitions and the admin's review.
- *AI cost and availability.* Mitigation: the R2 limit; search works without the assistant.
- *One developer, about 4 weeks.* Mitigation: strict OUT; SHOULD items only through `/change-request`.

**Open questions**

- Should an admin be prevented from approving their own work (four-eyes rule)? Current choice: no.
- What are the real lab rooms? Current choice: placeholders in the initial data, replaced before the demo.

## 8. Acceptance log

*(empty; `/epic-done` appends one entry per epic)*

## 9. Changes

*(empty; applied change requests are listed here)*
