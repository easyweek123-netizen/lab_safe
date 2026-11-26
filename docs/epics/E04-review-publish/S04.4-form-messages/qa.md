# QA: S04.4

## Run 1 · 2026-11-26 · verdict: PASS

`pnpm e2e`: 72 passed

| Check | Role | Result | Screenshot |
| --- | --- | --- | --- |
| AC1 fix form: PDF renamed .jpg → "Only JPEG or PNG photos are accepted." next to the photo, in the polite live region, in the description of "Change photo" with the hint; old photo stays | contributor | ✅ | — |
| AC1 edit form and new-page form (after an upload), same | contributor | ✅ | — |
| AC1 no photo shown (new form): hint and message stay on the file input | contributor | ✅ | — |
| AC2 server 400 `photoId`, link "Photo" → focus on "Change photo" (fix, edit, new) | contributor | ✅ | — |
| AC2 no photo shown: link "Photo" → focus on the file input | contributor | ✅ | — |
| AC3 offline submit/save/resubmit, then refused photo → only the photo message, old alert gone (fix, edit, new) | contributor | ✅ | — |
| AC3 offline, then a successful upload → old alert gone (fix, edit, new) | contributor | ✅ | — |
| AC4 offline alert text on all three forms; 401 on save/submit/resubmit and on photo upload says "Your session has ended. Log in again in another tab, then try again here."; no "submit again" in `apps/web/src` | contributor | ✅ | — |
| Keyboard: Tab from Name reaches "Change photo" (visible 2px outline), described by hint + message; Enter opens the file chooser | contributor | ✅ | — |
| 375 px, no sideways scroll, with the message shown (fix, edit, new) | contributor | ✅ | — |
| Browser console: only the errors the checks provoke (415, 401, 400, offline); nothing else | contributor | ✅ | — |

Notes: the 400 and 401 answers were simulated with request interception; offline with the browser's offline switch. The accessible description was read from `aria-describedby`; no screen reader was used.

No bugs.
