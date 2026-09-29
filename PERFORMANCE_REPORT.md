# CyberSave Mobile — End-to-End Performance Audit & Optimization Report

Date: 2026-09-29
Scope: `cybersave-mobile` (React Native) + `cybersave-backend` (NestJS / Prisma / MongoDB) — the full mobile request path: Mobile → API client → network → auth/guards → controller → service → DB/external services → response → state → UI.

> **Honesty note on numbers:** this session ran without an attached Android emulator/device, so live on-device timing could not be captured. The table in §10 contains **analytical worst-case timings derived from code inspection** (configured timeouts, request counts, query shapes — all verifiable in the code cited). To get true measured numbers, run the app with the new `[CyberPerf]` dev interceptor (§15) and read the per-request logs. No number below is claimed as a live measurement.

---

## 1. Root causes of slowness (verified in code)

| # | Root cause | Where | Why it hurts |
|---|---|---|---|
| RC1 | **Wallet endpoint rebuilds entire history on every GET** | `cybersave-backend/src/wallet/wallet.service.ts` (old) | Loaded ALL wallet transactions + ALL applications (each with full `formData` JSON blob) + ALL refund requests unbounded, merged + sorted in memory, on every wallet screen focus / add-money / transactions open. Grows linearly with user history. |
| RC2 | **Sequential candidate-host fallbacks with long timeouts** | `cybersave-mobile/src/api/client.ts` — `createApplicationApi`, `uploadSupportProofApi`, `submitFeedbackApi` | POST/submit loops tried hosts one-by-one with 5–8s timeouts each. A dead first candidate stalled every submission by up to 6–8s before the request even reached a live host. |
| RC3 | **Blocking non-critical side-effects inside the critical transaction** | `applications.service.ts createApplication` | Response awaited an extra `user.findUnique` + **Twilio SMS round-trip** + audit-log write + one sequential `documentUpload.create` per document before returning. The application was already durably persisted — the citizen just waited on notifications. |
| RC4 | **Redundant follow-up GET after payment** | mobile `PaymentGateway`/`PaymentPortal` flows | After server-side verification succeeded, the app created the application and the success screen derived state locally — but the pattern encouraged an extra `GET /applications` refresh (via cache invalidation + 8s poll); `POST /payment/verify` returned only `{success,message}`. |
| RC5 | **Aggressive polling of the heaviest list endpoint** | `ApplicationsScreens.tsx` | `setInterval(4000)` re-fetched the full applications list (with service/user/profile/refund joins) every 4s per open screen, *on top of* 5 socket listeners that already push the same updates. |
| RC6 | **Unbounded list queries + over-fetching** | `applications.service.ts getUserApplications` | `findMany` with no `take` and `include: { service: true, user: { include: { profile: true } }, refundRequests: true }` — full rows including `formData`/`documents` JSON blobs for every application ever created. |
| RC7 | **No timeouts on some mutation calls** | `client.ts` — `uploadAvatarApi`, `addMoneyApi`, `createSupportTicketApi` fallback | Used bare `apiClient` 15s default with no tighter budget; several flows could hang the UI spinner for 15s+ per candidate. |
| RC8 | **Duplicate/simultaneous requests** | screens calling `fetchUserProfileApi` on mount of review screens; wallet screen refetch on every focus; detail screen refetch on mount | Pre-existing SWR cache existed for services/apps/docs/profile/notifications but **not** for wallet or application-by-id; rapid back-and-forth navigation re-issued identical GETs. |
| RC9 | **Redundant blocking metadata writes during submission flow** | `UploadDocumentsScreen.handleContinue` | Awaited `uploadDocumentApi` × N (one POST per document) before navigating to review — pure duplicate of what the final application POST persists authoritatively. |
| RC10 | **Feedback submission retried uploads and raced double-taps** | `ProfileScreens.tsx handleSubmitFeedback` | No in-flight guard (double-tap = duplicate feedback); a retry re-uploaded the same base64 screenshot to Cloudinary. |
| RC11 | **Missing indexes for hot paths** | `prisma/schema.prisma` | Application queries filter `userId` + sort `submittedAt desc` (every list fetch) and look up `razorpayOrderId` (payment verify) — only standalone `userId`/`status` indexes existed. |
| RC12 | *(found, fixed)* **Wallet credited on cancelled Razorpay checkout** | `AddMoneyScreen` | Any Razorpay error (incl. user cancel) set `paymentSuccess = true` → false success + wallet credit. Security/reliability, not perf, but blocking to ship. |

## 2. Files changed

**Mobile (`cybersave-mobile`, commits `bb0af4d` + `2fe5242`, push blocked — repo missing on GitHub):**
- `src/api/client.ts` — `[CyberPerf]` dev instrumentation; parallel-reachability probe + single-destination POST for application submit; parallel-probe + retry-once upload path; parallel feedback submit; wallet cache (30s TTL + dedup + `invalidateWalletCache`); application-by-id cache (20s TTL); `verifyRazorpayPaymentApi` accepts `{userId}` context.
- `src/screens/cybersave/AddMoneyScreen.tsx` — ref-based double-tap guard across all payment exit paths; verify-with-context; wallet cache invalidation; **cancel ≠ credit** fix.
- `src/screens/cybersave/ServiceApplicationScreens.tsx` — ref-based double-tap guards on both payment screens; verify-with-context; document-metadata save made fire-and-forget.
- `src/screens/cybersave/ProfileScreens.tsx` — feedback double-submission guard + uploaded-image reuse (no re-upload on retry).
- `src/screens/cybersave/ApplicationsScreens.tsx` — poll 4s → 15s with in-flight overlap guard.

**Backend (`cybersave-backend`, inside parent repo commit `704a7f3`, pushed):**
- `src/payment/payment.controller.ts` — `/payment/verify` now returns the matching application snapshot (best-effort enrichment; verification logic untouched, still 100% server-side).
- `src/applications/applications.service.ts` — create: SMS/audit non-blocking, vault writes via one `createMany`; list: `take(100)` + lean selects.
- `src/wallet/wallet.service.ts` — rewritten: bounded + lean queries, synthetic-history rebuild skipped once real transactions exist, `addMoney` parallelized.
- `prisma/schema.prisma` — `@@index([userId, submittedAt(sort: Desc)])`, `@@index([razorpayOrderId])` on Application (prisma generate verified).

## 3. APIs optimized
`GET /wallet` (RC1, RC8), `POST /applications` (RC2, RC3), `GET /applications` (RC6), `GET /applications/:id` (RC8 client-side), `POST /payment/verify` (RC4), `POST /support/feedback` (RC2, RC10), `POST /support/upload` (RC2, RC7).

## 4. Database queries/indexes
- Composite index `Application(userId, submittedAt desc)` — matches the exact `where userId IN (…) orderBy submittedAt desc` shape every list fetch uses (prevents in-memory sorts over unbounded scans as the collection grows).
- Index `Application(razorpayOrderId)` — payment-verify lookup now O(log n).
- Wallet: 1 count + 1 upsert + ≤50 txns (vs. 3 unbounded full-collection queries + full merges before).
- Application list: `take(100)`, `service`/`user`/`refundRequests` reduced to needed columns; `formData` no longer serialized for list rows.

## 5. Cloudinary improvements
- Parallel origin probing before every backend upload path (dead-host stall eliminated).
- One transient-failure retry (timeout/network only — never on 4xx).
- Duplicate-upload prevention for feedback screenshots (cached URL reused on retry).
- **Deliberately unchanged:** image dimensions/quality caps (`maxWidth: 1200`, `quality 0.7–0.8` were already set at picker level — documents stay readable; no server-side transformations were found to tune).
- Honest gap: uploads are still one-shot per document (the UI is one-file-per-slot); multi-image parallel batching would only matter if a screen ever uploads several files at once.

## 6. Payment-flow improvements
- Server-side verification untouched and still mandatory (security preserved).
- `verifyRazorpayPaymentApi` now passes user context; backend verify response carries the authoritative application snapshot → the mobile client can complete the flow without an extra GET when the application row already exists.
- Double-tap `Pay` impossible (ref guard held through every exit path, including cancel and error).
- Wallet top-up: cancelled checkout no longer credits money (RC12 fix); balance cache invalidated after credit.

## 7. Application-submission improvements
- Critical path = single authoritative `POST /applications` (persist-then-respond, unchanged semantics — no false success).
- Non-critical work moved off the critical path: Twilio SMS, audit log, vault `createMany` (all logged, none awaited).
- Candidate-host discovery parallelized (~1.8s probe worst case, usually <300ms) instead of sequential 6s-per-host fallback.
- Document-metadata duplication during `UploadDocuments → Review` made fire-and-forget.

## 8. Feedback improvements
- Parallel submission across candidate hosts; created feedback object returned directly (no follow-up fetch).
- Double-submission guard; screenshot uploaded once and reused on retry.

## 9. Caching / deduplication changes
- Existing SWR cache (`cachedFetch`) extended to: wallet (`wallet_<id>`, 30s), application detail (`app_<id>`, 20s).
- New `invalidateWalletCache()` called from `addMoneyApi` (mutation-aware invalidation; never allows stale data to override authoritative state after mutations — application/feedback mutations already invalidated `apps_`/relevant keys).
- In-flight dedup already covered those keys automatically via `inFlightRequests`.

## 10. Before/after timings (analytical worst cases from code inspection — not live measurements)

| Flow | Before (worst case) | After (worst case) | Improvement | Bottleneck fixed |
|---|---|---|---|---|
| Wallet fetch (heavy user, 200 apps / 300 txns) | 4 unbounded queries + full merge every call | 2 bounded queries, ≤50 rows, cached 30s + dedup | Large & improving with data size | RC1, RC8 |
| Application submit (primary host dead, 6s timeout each) | up to ~12s before reaching live host | ~1.8s probe + live POST | up to ~10s saved | RC2 |
| Application create response (with SMS RTT ~300–800ms + N doc inserts) | SMS + audit + N sequential inserts awaited | persisted → respond; side-effects fire-and-forget | SMS RTT + N×insert saved per submit | RC3 |
| Upload proof (dead host first) | 6–8s per dead candidate | 1.8s probe + retry-once | up to ~6s saved | RC2, RC7 |
| Payment verify → app state | verify + (encouraged) follow-up GET | single authoritative response | 1 round-trip removed | RC4 |
| Applications screen idle traffic | full list every 4s per screen | every 15s, no overlap, socket-driven | ~73% fewer polls | RC5 |
| Feedback submit (dead host first) | 5s per dead candidate | parallel | up to ~5s saved | RC2 |
| List payload | unbounded rows incl. `formData` blobs | take(100) + lean selects | smaller payloads, bounded memory | RC6 |

**Measure it for real:** run the app in dev — every `apiClient` request now logs `[CyberPerf] GET /wallet → 200 in 142ms (18.3 KB)` style lines (dev builds only, zero production overhead).

## 11. Tests performed
- `npx tsc --noEmit` — mobile: **pass** (after fixing an edit artifact), backend `npx nest build`: **pass**, `npx prisma generate`: **pass**.
- `npm test` (mobile jest): fails on a **pre-existing** infra issue (`react-redux` ESM transform in `__tests__/App.test.tsx`) — unrelated to these changes; no test exercises the modified code paths.
- `npm run lint`: fails on a **pre-existing** ESLint plugin/config incompatibility (`@typescript-eslint/no-unused-expressions` load error at `App.tsx`) — also unrelated.
- Could not be done in this session (no device/emulator): end-to-end payment with real Razorpay checkout, real Cloudinary upload from device, live `[CyberPerf]` numbers.

## 12. Remaining bottlenecks (next candidates)
1. **`getBlockedList`-style resolution logic in `createApplication`** — falls back to `findFirst` user / creates users/services when ids don't resolve; fine at low volume, worth tightening with stricter DTOs later.
2. **Application list has no server-side pagination** for the mobile client (`take(100)` bounds it, but a `page` param would cap payloads further).
3. **Cloudinary direct-upload path** still posts the base64 data URI in a JSON body (bigger payload than multipart binary); switching to `FormData` binary upload would cut upload bytes.
4. **Wallet screen** still refetches on every focus — now cheap (cache), but a socket-driven invalidation would be tighter.
5. **Mobile repo remote missing** (`Repository not found`) — commits `bb0af4d`/`2fe5242` are local only; push as soon as the GitHub repo exists.
6. **Vercel backend deploy is stale** — backend perf fixes (wallet bounding, single-response verify, indexes) only go live after redeploy; the composite indexes additionally require `prisma db push`/migrate against Atlas.
