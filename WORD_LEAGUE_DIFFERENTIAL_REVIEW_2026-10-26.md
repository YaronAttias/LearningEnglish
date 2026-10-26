> Remediation update, 2026-10-26: Both findings below have now been fixed locally. Independent opt-out cookie and post-await client guards prevent late starts from restoring sharing; calendar-day arithmetic fixes chart, period and retention boundaries. Full suite: 107/107 passing. Added four regression tests covering delayed response/JSON, server cookie ordering, both DST transitions and all ranges. Updated review probes now assert the corrected behavior and pass. The remainder records the original pre-fix review. Production authentication boundary was not re-certified.

# Word League — Differential review, 2026-10-26

## Executive summary

Review of both commits made today (Asia/Jerusalem), including the learning app and visitor administration screen. Baseline `1fb03c7`; final `7222b16`; intermediate `0f707ff`. Working tree was initially clean.

| Severity | Confirmed findings |
|---|---:|
| Critical | 0 |
| High | 0 |
| Medium / P2 | 2 |
| Low | 0 |

**Overall risk: MEDIUM. Recommendation: CONDITIONAL — address the opt-out race before treating the privacy control as reliable; fix calendar arithmetic before relying on chart totals.**

103 existing tests passed, with zero failures or skips. Additional executable probes reproduce both findings. No production source files were changed during review.

## What changed

Timeline: `1fb03c7` (previous day, local-only learning) → `0f707ff` (11:28, server tracking and protected admin) → `7222b16` (12:33, automatic browser identities and retired personal links).

25 changed files: +954/-112 text lines, including two binary screenshots. All 23 text files were reviewed; screenshots are existing QA evidence, not independently revalidated visual coverage. Generated TAP/JSON reports were inspected as test evidence rather than application code.

| Files | Risk / review |
|---|---|
| worker/index.mjs | HIGH: authentication boundary, signatures, public registration, report validation, retention, deletion |
| dist/usage.js | HIGH: automatic identity, opt-out, network requests and activity measurement |
| drizzle/0000_usage.sql, 0001_automatic_visitors.sql, meta/_journal.json | HIGH: persistent identities, schema migration, retained legacy records |
| scripts/build-worker.cjs, .openai/hosting.json | HIGH: asset allowlist and transition from static hosting to Worker |
| dist/app.js | MEDIUM: answer and completion hooks in practice and penalties |
| dist/admin.js | MEDIUM: reporting, filtering, chart, revoke/delete actions |
| dist/admin.html, admin.css, index.html | LOW to MEDIUM: management UI, script loading, privacy disclosure |
| package.json, .gitignore, README.md | Configuration, operation and documentation review |
| tests/usage.test.cjs, usage-db.cjs, usage-server.cjs, delivery.test.cjs, run.cjs | Coverage, test adapter and build checks |
| tests/reports/LATEST.md, latest.json, latest.tap | Prior execution evidence |
| tests/reports/browser/usage-admin-desktop.png, usage-automatic-desktop.png | Binary evidence; visual QA not rerun |

## Confirmed findings

### [P2 / MEDIUM] A pending start response overrides a later cross-tab opt-out

**Location:** dist/usage.js:71-76; related storage listener at lines 81-83.
**Introduced:** `7222b16`. **Confidence:** HIGH for client race; production persistence depends on response/cookie ordering.

`start()` checks `stopped` only before awaiting the network request. While it waits, a storage event from another tab can call `disable()` and set `stopped = true`. When the old start response arrives, the success branch unconditionally sets `state.enabled = true`, restores the sharing notice and reveals the stop button. The periodic loop chooses `flush()` whenever enabled; `flush()` does not check `stopped`.

Reproduction:
1. Open tab B while its automatic start response remains pending; interact once.
2. Stop sharing in tab A. B receives the OFF storage event and disables tracking.
3. Deliver B's earlier successful start response.
4. Advance the clock 15 seconds and blur B: it sends a report despite the local opt-out flag.

The probe confirms both re-enabling and an actual client report attempt. It does not claim that a correctly retained server `off` cookie accepts the report: it returns 403. However, a start response generated before opt-out also carries a valid signed Set-Cookie; if that response arrives after the forget response, it can replace the `off` cookie. The server forget endpoint does not revoke the identity. That ordering can undermine the cookie defense as well.

**Impact:** privacy preference can be contradicted until the page reloads or receives a rejection. Ordinary multi-tab use can trigger it; no attacker privileges are needed.

**Fix:** after every await in start, and immediately before enabling, recheck stopped and the OFF preference. Make flush return when stopped. To prevent an in-flight start Set-Cookie from undoing server opt-out, persist opt-out/revocation server-side or use an independent opt-out cookie that start never overwrites. Preserve normal learning behavior.

**Coverage gap:** current tests cover stored opt-out on reload and successful starts independently; none delays start across a storage opt-out event. One start implementation, one immediate invocation and one interval invocation; one flush implementation with four call sites (blur/focus listener, visibility listener, pagehide, interval). Effect reaches all four learning answer/completion hook sites in dist/app.js.

### [P2 / MEDIUM] DST arithmetic duplicates dates and inflates chart activity

**Location:** dist/admin.js:54-56. Related cutoff/retention calculation: worker/index.mjs:83-86,168.
**Introduced:** `0f707ff`; retained in `7222b16`. **Confidence:** HIGH.

The chart subtracts multiples of 86,400,000 milliseconds from the current instant, then formats the results in Asia/Jerusalem. A local calendar day can span 25 hours. Consequently two offsets can resolve to the same local date.

Reproduction with a frozen instant `2026-10-26T23:30:00+02:00` and seven-day range:
- Actual chart dates: 21,22,23,24,25,25,26 October.
- Expected dates: 20,21,22,23,24,25,26 October.
- With one minute on 24 October and two minutes on 25 October, the displayed bars sum to five minutes instead of three, even though the summary uses the actual three-minute aggregate.

The server uses the same elapsed-time approach to calculate its lower bound. At that instant the seven-day cutoff also advances to 21 October, excluding 20 October. Retention can similarly shift by a calendar day near clock transitions.

**Impact:** missing dates, duplicated daily activity and disagreement between the chart and headline totals for ordinary owner use around DST. All 7/30/90-day modes share this code; no write access is required.

**Fix:** derive today's Jerusalem calendar date once, then add/subtract calendar days using a timezone-independent date representation (for example UTC arithmetic on the already extracted year/month/day). Use the same calendar helper for chart dates, API period bounds and retention. Add fixed-instant spring/fall transition cases.

**Coverage gap:** existing admin test verifies the number of columns for a 30-day view, not their dates or summed values. renderChart has one direct production caller, load; all three range options are affected.

## Test coverage and validation

Executed on Node v24.21.0:

```powershell
node scripts/build-worker.cjs
node --test --test-concurrency=1 tests/app.test.cjs tests/delivery.test.cjs tests/integrated.test.cjs tests/shootout.test.cjs tests/usage.test.cjs
node tests/reports/review-probes-2026-10-26.cjs
```

- Existing suite: 103/103 passed; duration about 16.7 seconds.
- Worker artifact built with 14 explicit assets, 4,352,545 bytes.
- Probe: pending start overrides cross-tab opt-out and triggers a report attempt.
- Probe: DST chart repeats 25 October and omits 20 October.
- Additional local concurrency check: 12/20 simultaneous reports accepted, matching the configured limit under this SQLite adapter. This is not proof of race-free production D1 limiting: its count check and batch are separate awaited operations.
- No line/branch coverage instrumentation was run; a numerical code-coverage percentage would be misleading.

Saved execution output: tests/reports/review-2026-10-26.tap. Saved executable reproductions: tests/reports/review-probes-2026-10-26.cjs. Probe assertions confirm the present defects; they must be inverted into regression expectations when fixing the code.

## Security boundaries and blast radius

Baseline before today had no tracking server. Invariants for the addition: only the owner reads/deletes usage; public clients report only for signed identities; personal answer text stays local; opted-out browsers stop reporting; retries do not increment totals twice.

| Function / path | Direct production callers / entry points | Assessment |
|---|---:|---|
| isOwner | 2 | Admin API prefix and admin page aliases both checked |
| learner | 3 | Start, status, report; signature/version/revocation/source validation |
| signingKey | 3 | Token signing, verification, deterministic browser-ID derivation |
| makeToken | 1 | Automatic start response |
| sameOrigin | 1 shared gate | All HTTP mutation routes |
| WordUsage.answer / complete hooks | 2 each | Practice and penalty game |
| renderChart | 1 | Shared by all report periods |

Counts exclude function declarations and tests; they are static call sites rather than dynamic user counts. No change has more than five direct callers. Shared Worker routing nevertheless affects every served request.

Checked prepared SQL binding, strict mutation fields and size bounds, cookie flags, signature verification, retired legacy links, source filtering, revoke/version guards, transactional deduplication, explicit asset serving and source-file non-disclosure. Admin data uses textContent rather than HTML interpolation. No confirmed unauthorized admin data access was found in the reviewed local scope.

Public clients can intentionally fabricate activity within limits; this is explicitly documented as outside the measurement's guarantees. Automatic identity is per browser, not verified per person. Legacy records remain stored but hidden by source filtering; their deletion requires a known ID/API or database administration rather than the current listing. These are operational limitations, not presented as newly discovered exploits.

## Historical context

Examined both same-day diffs, prior baseline, git blame for changed reporting paths and removed enrollment logic, and history searches for authorization/revocation patterns.

- `0f707ff` added the worker, signed learner links and chart arithmetic.
- `7222b16` removed owner-generated links and public token enrollment, returned 410 for the old endpoint, changed the cookie name, required automatic source when validating learners, and added a source migration. The new deterministic seed flow prevents claiming dashboard IDs directly.
- The owner authorization checks remain present. Removed label/token validation belongs to retired routes, rather than an exposed route that lost its validation.
- No evidence of a previously fixed CVE/security check being reintroduced was found. The opt-out issue is new in the automatic initialization path; the chart issue dates to today's first commit.

## Recommendations

1. Fix the opt-out race and cookie ordering; add a delayed-start multi-tab regression test.
2. Replace elapsed-time day arithmetic with calendar-day arithmetic and test both DST transitions.
3. Before declaring production auth verified, exercise owner, anonymous and other-account access through the actual Sites dispatch, including attempted spoofed identity headers. Worker authorization depends on that trusted dispatch stripping/injecting headers; local header fixtures cannot certify it.
4. If strict production burst ceilings are required, enforce the report rate decision and insert atomically, then verify on D1 under overlapping requests.

## Methodology, limitations and confidence

FOCUSED review for a medium-size repository (65 tracked files, including test evidence/assets). Examined all changed text, full changed application/server functions, unchanged one-hop learning/penalty dependencies through tests, both commit deltas and history, static call sites, and concrete adversarial/privacy scenarios. No external dependency security audit was performed.

No production requests, production deletion, deployments or secret inspection were performed. Sites runtime authentication, real D1 concurrency and migrations, native browser cookies, mobile layout and physical devices were not exercised. DOM-based probes use mocked network timing; SQLite integration tests use a local D1-shaped adapter. The two existing screenshots were not used to claim fresh visual validation. Confidence is HIGH for the two reproduced code defects and MEDIUM for overall production security because the hosting identity boundary was not tested.
