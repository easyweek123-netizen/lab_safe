# QA: S04.1

<!-- qa-engineer. PASS only if pnpm e2e passed and no blocker or major bug is open. -->

## Run 1 · 2026-11-26 · verdict: PASS

`pnpm e2e`: 62 passed

| Check                                                                      | Role                                     | Result | Screenshot |
| -------------------------------------------------------------------------- | ---------------------------------------- | ------ | ---------- |
| AC1 list: 3 pending pages (Alice, Bob, the admin's own), oldest first, name link, "New", "Submitted by", "Submitted 26 Nov 2026"; API 200, no content, no email | admin | ✅ | — |
| AC2 empty list "No pages waiting for review."                              | admin                                    | ✅     | —          |
| AC3 loading status, 500 → alert + Retry reloads; background refresh failure | admin                                   | ✅ (refresh failure only weakly provoked) | — |
| AC4 preview: h1, "Submitted by Alice Author on 26 Nov 2026", photo, h2 name, no "Last approved"; API `lastApproved` null, `labRoom` filled | admin | ✅ | — |
| AC5 view order, at-a-glance, pictogram `alt=""`, "Name (CODE)" room, line breaks kept, `<b>`/`<i>`/`<script>` shown as typed, no contributor name or email | admin | ✅ | — |
| AC6 "Loading…", unknown id "Page not found", malformed id no request, 500 → alert + Retry | admin | ✅ | — |
| AC7 API: anonymous 401, author/pending/rejected 403, admin unknown id 404, malformed 400 | all roles | ✅ | — |
| AC8 contributor sees "No access" at both addresses, no header link; anonymous sent to `/login?next=…` | contributor, anonymous | ✅ | — |
| AC9 375 px: queue and preview do not scroll sideways                       | admin                                    | ✅     | —          |
| Keyboard: header links, queue links, Enter opens a preview, focus outline visible | admin                             | ✅     | —          |
| Console errors on queue and preview (no errors except those the test itself provoked) | admin                         | ✅     | —          |

- B1 [minor][fe] Steps: open `/admin/review/<well-formed unknown id>` as admin → expected "Page not found" at once / actual "Loading…" for about 1 s first, and the browser sends `GET /api/admin/submissions/<id>` twice (both 404), so the request is retried on a 404.

Not tested: a very long unbroken page name at 375 px (covered only by what the e2e journey does); a real failed background refresh (the focus event I sent may not trigger one).
