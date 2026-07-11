# Project Audit — dnd.ai

**Date:** 2026-07-11 · **Scope:** `client/` (Next.js 16), `server/` (NestJS 11), `packages/shared/` (Zod), repo config.
**Branch audited:** `feat/phase-3-realtime-backbone` (including untracked Phase-4 files on disk).

## Summary

The hand-written code is unusually clean: no `TODO`/`FIXME`, no `any`, no `@ts-ignore`, no leftover `console.log`, no XSS sinks (`dangerouslySetInnerHTML`), strict FSD layering on the client, identity always derived from the verified JWT on the server, and dice rolled server-side with a CSPRNG. The problems found are **architectural and hardening gaps**, not sloppy code.

**Severity legend:** 🔴 High · 🟠 Medium · 🟡 Low · ℹ️ Info

### Top 5 priorities

1. **SEC-1** — No session membership model: anyone with a session UUID gets full access.
2. **SEC-2** — Zero rate limiting, including the paid Gemini endpoint (cost-abuse vector).
3. **SEC-3** — Unbounded fields in shared Zod schemas (DoS / DB bloat) — fix before Phase 5 AI writes.
4. **PERF-1..3** — The slow page load: fully client-rendered SPA that renders a blank screen behind a serial auth → socket → join waterfall.
5. **BUG-1** — Joining a long session returns the **oldest** 100 messages instead of the most recent.

---

## 🔐 Security

### SEC-1 🔴 Any authenticated user can join any session

**Where:** `server/src/game-session/game-session.gateway.ts:85-113` (`onJoinSession`)

`JOIN_SESSION` fetches the session by id and calls `socket.join()` with **no membership, invitation, or ownership check**. The ack then returns the full session state, all character sheets, and up to 100 chat messages. There is no concept of "participant" in the data model at all — knowing (or brute-guessing via a leaked link) a session UUID grants read access, chat access, and dice-roll access to a stranger's game.

**Impact:** Unauthorized access to private game content; impersonation-adjacent chat in someone else's session.
**Fix:** Add a `SessionMember` (or participant) relation in Prisma. On `JOIN_SESSION`, either verify membership or implement an explicit join/invite flow (invite code, creator approval, or open/closed lobby flag). Apply the same check to `listSessionSheets` and REST endpoints that take a `sessionId`.

### SEC-2 🔴 No rate limiting anywhere (Gemini endpoint = cost abuse)

**Where:** whole server — no `@nestjs/throttler`, no `helmet` in `server/package.json`; worst on `server/src/ai/ai.controller.ts:12-17` (`POST /ai/character-draft`).

Every REST route, the WS gateway, and the AI endpoint are auth-gated but unbounded. A single authenticated user can loop `POST /ai/character-draft` and burn Gemini quota/money, or flood chat/dice events. The AI call also sets no output-token cap in its `config` (`server/src/ai/ai.service.ts:43-47`), only `responseMimeType`.

**Impact:** Denial of wallet (LLM billing), chat spam, DB write floods.
**Fix:** Add `@nestjs/throttler` globally (e.g., 10 req/min default), a much stricter per-user limit on `/ai/*` (e.g., 5/min + daily cap), a `maxOutputTokens` in the Gemini config, and a simple per-socket event rate limit in the gateway (chat/dice per second). Add `helmet` while at it.

### SEC-3 🔴 Unbounded inputs in shared Zod schemas

**Where:** `packages/shared/src/validation.ts`

| Line | Field | Problem |
|---|---|---|
| `:21` | `InventoryItemSchema.name` | `z.string().min(1)` — no `.max()`; megabyte-scale item names accepted |
| `:31`, `:60` | `inventory` array (create + update) | no `.max()` on array length — unbounded JSON persisted to `CharacterSheet` |
| `:33-34` | `aiProvider` / `aiModel` | `z.string().min(1)` — no `.max()` |
| `:28-29`, `:58-59` | `hpCurrent` / `hpMax` | only lower bounds; both accept `Number.MAX_SAFE_INTEGER` (the `hpCurrent <= hpMax` refine doesn't cap either) |

Everything else is properly bounded (lobby title max 80, chat max 2000, AI prompt max 500, ability scores 1–30), so these are the outliers.

**Impact:** DoS / DB bloat via giant payloads; broadcast amplification (an oversized sheet is re-emitted to the whole room on every update). This becomes more dangerous in Phase 5 when AI output is written through the same schemas.
**Fix:** `name: .max(60)`, `inventory: .max(50)` items, `aiProvider/aiModel: .max(100)`, `hpCurrent/hpMax: .max(9999)` (or similar sane caps).

### SEC-4 🟠 CORS fail-open when `CLIENT_URL` is unset

**Where:** `server/src/main.ts:11` and `server/src/game-session/game-session.gateway.ts:46`

```ts
app.enableCors({ origin: process.env.CLIENT_URL ?? true });
```

If `CLIENT_URL` is missing in a production environment, **any origin is reflected** for both REST and WebSocket. The code comments say "lock it down via CLIENT_URL in prod", i.e., safety depends on an env var nobody validates. Mitigated by Bearer-only auth (no cookies → no classic CSRF), but a malicious site could still use a token it obtained otherwise, and it invites misconfiguration.

**Fix:** Fail closed: in production (`NODE_ENV === 'production'`), throw at bootstrap if `CLIENT_URL` is unset instead of defaulting to `true`.

### SEC-5 🟠 JWT verified without `issuer`/`audience` checks

**Where:** `server/src/auth/verifiers/hs256-token.verifier.ts:22-24`, `server/src/auth/verifiers/jwks-token.verifier.ts:23`

`jwtVerify` is called with only `{ algorithms: ['HS256'] }` (or nothing but the JWKS). Any token validly signed by the configured key/project is accepted regardless of its `iss`/`aud` claims. For Supabase this should be pinned to your project issuer (`https://<ref>.supabase.co/auth/v1`) and `aud: 'authenticated'`.

**Impact:** Token-confusion: any JWT the same key ever signs for another purpose would pass; weakens defense-in-depth.
**Fix:** Pass `{ issuer, audience }` options to both `jwtVerify` calls.

### SEC-6 🟠 Recovered sockets skip re-authentication for up to 2 minutes

**Where:** `server/src/game-session/game-session.gateway.ts:48-52`

```ts
connectionStateRecovery: { maxDisconnectionDuration: 2 * 60 * 1000, skipMiddlewares: true }
```

A dropped socket resumes with its old `socket.data.user` without re-running the auth middleware. This is a documented tradeoff (ADR 6 comment), but within the window a revoked/expired token keeps a live session. The `scheduleExpiryDisconnect` timer partially covers expiry — but the timer itself dies with the old server-side socket on disconnect (`socket.on('disconnect', () => clearTimeout(timer))` at `:258`), and it is **not re-armed on recovery** because recovered connections skip the middleware that schedules it. A token can therefore outlive its `exp` on a recovered socket.

**Fix:** In `handleConnection`, when `socket.recovered` is true, re-check token expiry (re-read `handshake.auth.token`, `decodeJwt`, re-arm the disconnect timer, and disconnect if already expired).

### SEC-7 🟡 Prompt-injection surface in the AI service

**Where:** `server/src/ai/ai.service.ts:45`

User text is concatenated directly after the schema instructions: `contents: \`${SCHEMA_INSTRUCTIONS}${prompt}\``. The blast radius is currently well-fenced — the output is `JSON.parse`d, re-validated against `CharacterSheetSchema`, `aiProvider`/`aiModel` are force-nulled, and nothing is persisted — so this is informational today. It becomes real in Phase 5 when model output starts mutating `GameStateLog`.

Also: on parse failures the **full raw model output is logged** (`ai.service.ts:63,79`) — user-influenced content in logs; keep, but truncate.

**Fix (Phase 5 prep):** Use the SDK's `systemInstruction` for the schema rules and pass the user prompt as the user turn; keep validating every model output against strict Zod schemas before any DB write; truncate logged raw output.

### SEC-8 🟡 Supabase access token in `localStorage`

**Where:** `client/src/shared/api/supabaseClient.ts:18` (default `createClient` storage)

Supabase-js persists the session (access + refresh token) in `localStorage` by default, which is readable by any XSS payload. The client currently has **no XSS sink** (all chat/dice content renders as React text nodes — verified), so risk is residual, but it's worth knowing the trust model: one future `dangerouslySetInnerHTML` away from token theft.

**Fix (optional hardening):** Accept as the standard Supabase SPA tradeoff, or move to `@supabase/ssr` with cookie-based sessions later. At minimum, never render user content as HTML.

### SEC-9 🟡 Config loose ends

- `SUPABASE_SERVICE_ROLE_KEY` is declared in `server/.env.example:6` but **never referenced in code** — dead config that invites someone to populate a high-value secret for no reason. Remove the line until actually needed.
- `.mcp.json` (committed) embeds the Supabase project ref in the MCP URL (`project_ref=lpybw…`). Semi-public identifier, low risk — just be aware it's in history.
- ✅ Verified clean: no secrets committed (`git ls-files` shows only the blank `server/.env.example`); `.env*` properly gitignored; CodeRabbit PAT in `.mcp.json` uses env interpolation, not a literal.

### Security positives (keep these)

- User identity (sender, creator, sheet owner) is always taken from the **verified token**, never from the client payload (`game-session.gateway.ts:130-136,160-167,204-213`).
- Dice notation is validated server-side (bounded: max 100-char notation, max 50 dice, max 10 terms) and rolled with `crypto.randomInt`. Client cannot forge rolls.
- Every WS payload is `safeParse`d against shared Zod schemas; REST uses a global `ZodValidationPipe`.
- Persisted client store keeps only `sessionId` + `lastMessageAt` — no tokens or PII in `sessionStorage` (`sessionStore.ts:96-99`).

---

## 🐢 Slow page load — root cause

The complaint "the page is loading long" is architectural, not one bug. Two things to know first:

> **PERF-0 ℹ️ Measure with a production build.** If you're judging speed under `npm run dev` (Turbopack: unminified, compile-on-demand), a large part of the slowness is dev-mode overhead. Baseline with `npm run build && npm run start` before optimizing further. The findings below apply to prod too, just less dramatically.

### PERF-1 🔴 First paint is gated behind a 5-step serial waterfall

Load flow for `/session/[id]`:

1. Download + hydrate the JS bundle (the page's server component renders **no data**, only `await params`).
2. `AuthProvider` mounts → async `supabase.auth.getSession()` → until it resolves, `authStatus === 'loading'`.
3. **The entire page renders `null` meanwhile** — `client/src/views/session/ui/SessionPage.tsx:40` (`if (authStatus !== 'authenticated') return null;`), same in `LobbyPage.tsx:17`. The user stares at a blank screen for the whole auth round-trip.
4. Socket connects — and its `auth` callback performs a **second** `getSession()` (`client/src/shared/api/socketClient.ts:17-22`), serializing another async token read into every handshake.
5. `emitWithAck(JOIN_SESSION)` (5s timeout) — only when the ack returns does `joinStatus` become `joined`; until then inputs are disabled and the title says "Loading session…".

**Fixes, in impact order:**
1. **Render a skeleton instead of `null`** at `SessionPage.tsx:40` / `LobbyPage.tsx:17` — cheapest fix, removes the "broken blank page" feeling entirely.
2. Cache the session token so the socket `auth` callback doesn't re-await `getSession()` (read from the auth store populated in step 2, falling back to `getSession()` only when empty).
3. Longer-term: server-render the session shell (title, layout) and stream it; keep only chat/socket parts client-side.

### PERF-2 🟠 Everything is `'use client'` — zero SSR payload

Every view, widget, and feature is a client component; the only server components (`app/session/[id]/page.tsx`, `app/page.tsx`, `layout.tsx`) render no data. The app is effectively a SPA served by Next.js: users pay for download + hydration + client-side fetching on every cold load. This is a deliberate-looking tradeoff for a realtime app, but the shell (headers, lobby list initial data) could be RSC-rendered.

### PERF-3 🟠 Per-message O(n log n) work in the store

**Where:** `client/src/shared/store/sessionStore.ts:61-73` (`addMessages`)

Every incoming message (including each of up to 100 catch-up messages) rebuilds a `Set` of all known ids and **re-sorts the entire messages array**. With a long history this churns CPU and triggers a full list re-render each time.

**Fix:** Messages arrive in order from the server — append, and only sort when a batch is actually out of order (compare `fresh[0].createdAt` with the current tail). Keep the known-ids `Set` in the store instead of rebuilding it.

### PERF-4 🟠 Chat list: no virtualization, no memoization, animated scroll on every change

**Where:** `client/src/features/session-chat/ui/ChatWindow.tsx`

- `:58-61` — every store update re-renders and re-maps **all** messages; `MessageRow` is not wrapped in `React.memo`.
- `:47-49` — `scrollIntoView({ behavior: 'smooth' })` runs on every `messages` change, including initial history hydration, where it smooth-scrolls through the whole backlog.

**Fix:** `React.memo(MessageRow)`; use `behavior: 'auto'` (instant) for the initial hydration and `smooth` only for single live messages; add virtualization (e.g., `@tanstack/react-virtual`) once histories grow past a few hundred messages.

### PERF-5 🟡 `CharacterHud` stringifies inventory every render

**Where:** `client/src/widgets/character-hud/ui/CharacterHud.tsx:27-30`

`JSON.stringify(myCharacter.inventory)` is used as an effect dependency key and runs on every render of an always-mounted (at `lg`) widget. Minor, but it's the kind of hidden per-render cost that adds up.

**Fix:** Depend on `myCharacter.updatedAt` (or a version counter) instead of stringifying.

---

## 🐛 Bugs / correctness

### BUG-1 🔴 Fresh join returns the *oldest* 100 messages, not the recent ones

**Where:** `server/src/game-session/game-session.service.ts:86-98` (`getMessagesSince`)

With no `since` cursor (a brand-new join into an existing session), the query is `orderBy: { createdAt: 'asc' }, take: 100` — the **first 100 messages ever written**. In any session with >100 messages a new joiner sees ancient history and silently misses everything current; the constant is even named `RECENT_MESSAGES_LIMIT`. There is also no pagination for older history.

**Fix:** For the no-cursor case query `orderBy: { createdAt: 'desc' }, take: 100` and reverse in memory. Add a cursor param for "load older" later.

### BUG-2 🟠 Race condition on "one character per user per session"

**Where:** `server/src/user/character-sheet.service.ts:40-61` + `server/prisma/schema.prisma:51-67`

The rule is enforced with `count(...)` then `create(...)` — a classic check-then-act race. Two concurrent `createSheet` calls both see `existing === 0` and both insert. Nothing at the DB layer prevents it: `CharacterSheet` has indexes on `sessionId` and `userId` but **no `@@unique([userId, sessionId])`**.

**Fix:** Add a partial/compound unique constraint (for human sheets, `@@unique([userId, sessionId])` — AI sheets have `userId = null`, which Postgres treats as distinct, so the constraint is safe) and catch the `P2002` Prisma error as the "already exists" path.

### BUG-3 🟠 Broad catches mask real errors

**Where:** `server/src/game-session/game-session.gateway.ts`

- `:110-112` — the whole `onJoinSession` body is wrapped in `catch { return { error: 'Session not found' } }`. A DB outage, a Prisma bug, anything → the user is told the session doesn't exist and nothing is logged.
- `:236-238` — every token-verification failure collapses to `'Unauthorized'` with the underlying error discarded (hard to debug env/key issues; you already hit this once with the ES256/JWKS problem in memory).
- `:249-251` — if `decodeJwt` throws in `scheduleExpiryDisconnect`, the expiry disconnect is silently skipped: a socket whose token can't be decoded stays connected forever.

**Fix:** Log the caught error (`this.logger.warn/error`) in all three places; in `onJoinSession`, distinguish `NotFound` from unexpected errors.

### BUG-4 🟠 Disconnect leaves the UI in a permanent "Connecting…" state

**Where:** `client/src/features/session-chat/model/useSessionSocket.ts:66`

`onDisconnect` sets `joinStatus` back to `'connecting'`; if reconnection never succeeds (server down, token invalid), the user sits at "Connecting…" with disabled inputs forever — no timeout, no error state, no retry button.

**Fix:** Listen to `connect_error` / `reconnect_failed` and flip to the `error` state with a retry affordance after N attempts.

### BUG-5 🟡 Minor connect/join double-fire window

**Where:** `useSessionSocket.ts:70-89` — the mount effect both registers `onConnect` and calls `join()` if `socket.connected` is already true; a `connect` firing in between produces a double `JOIN_SESSION`. Server-side `socket.join()` is idempotent, so the harm is a duplicated ack round-trip. Note and keep, or guard with a `joining` flag.

### BUG-6 🟡 `key={index}` on editable inventory rows

**Where:** `client/src/widgets/character-hud/ui/CharacterHud.tsx:103`

Inventory rows are keyed by array index while being editable/deletable — deleting a middle item can leave stale input state on the wrong row.

**Fix:** Give inventory items a stable id (client-generated `crypto.randomUUID()` on add) and key on it.

---

## 🧹 Kludges & repo hygiene

### KLUDGE-1 🟠 Generated Prisma client committed to git

`server/src/generated/prisma/**` (13 tracked files) is machine-generated by `npx prisma generate`, yet committed — it shows up as modified in almost every diff (see current `git status`), is a merge-conflict magnet, and bloats reviews.
**Fix:** Add `server/src/generated/` to `.gitignore`, `git rm -r --cached server/src/generated`, and rely on `prisma generate` in the build (add it to a `postinstall`/`prebuild` script).

### KLUDGE-2 🟠 Not a real workspace monorepo

There is no root `package.json` / workspace config; `client` and `server` consume `@dnd/shared` via `file:../packages/shared` and the README instructs running `npm install` three times. No unified lint/test/build, no CI. Also: `@types/node` is `^24` on the server but `^20` on the client, and no package pins `engines`.
**Fix:** Add a root `package.json` with `workspaces: ["client", "server", "packages/*"]`, hoist scripts (`npm run test --workspaces`), align `@types/node`, add `"engines": { "node": ">=20" }`. This also unblocks Phase 6 CI.

### KLUDGE-3 🟠 In-memory Socket.IO state won't survive restart or scale-out

Rooms and `socket.data` live in one Node process with the default in-memory adapter; broadcasts (`gateway.ts:141,185,215`) only reach sockets on the same instance. A deploy restart drops all room membership (partly cushioned by the 2-min recovery window); running two instances silently splits rooms.
**Fix (Phase 6):** `@socket.io/redis-adapter` (or sticky single-instance deployment as an explicit, documented constraint).

### KLUDGE-4 🟡 `ws-events.ts` payload interfaces are hand-written, not Zod-derived

`packages/shared/src/ws-events.ts:46-87` (`SessionSummary`, `ChatMessagePayload`, `CharacterSheetPayload`) are plain interfaces that can silently drift from the Prisma/DB shape, unlike everything else in the package (which is `z.infer<>`). Output-only, so not an injection risk — a maintenance risk.

### KLUDGE-5 🟡 FSD encapsulation leak

`client/src/widgets/character-hud/ui/CharacterHud.tsx:12` imports `@/features/character-sheet/model/standardArray` — a feature's internal path — instead of the feature's public `index.ts`. The only layering violation found; export it from the feature's index.

### KLUDGE-6 🟡 Large body of finished work is uncommitted

`ROADMAP.md` marks Phase 4 ✅ done, but the Phase-4 files (`server/src/game-session/dice.service.ts`, `server/src/user/character-sheet.*`, `client/src/features/dice-roller/`, `client/src/features/character-sheet/`, `client/src/widgets/character-hud/`, `packages/shared/src/dice.ts`, the AI module, a migration) exist only as **untracked/modified files** on the `feat/phase-3-realtime-backbone` branch. One disk failure or careless `git clean` loses a phase of work, and the branch name no longer matches its content.
**Fix:** Commit (ideally as a separate `feat/phase-4-*` branch/PR) before anything else in this audit.

---

## 🧪 Test-coverage gaps

Existing tests are decent (8 server specs, 8 client tests), but the riskiest paths are the untested ones:

| Gap | Why it matters |
|---|---|
| `server/src/auth/verifiers/jwks-token.verifier.ts` — **no spec** (only the HS256 verifier is tested) | This is the **production** auth path (per memory, ES256/JWKS is what your Supabase project actually uses) |
| `packages/shared` has **no test runner at all** — `dice.ts` parser untested in its own package | The parser is the DoS boundary for dice input; its limits (max 50 dice, 10 terms) deserve direct tests |
| `client`: `useSessionSocket`, `ChatWindow`, `useAuthListener`, entire `shared/api/` (`httpClient`, `socketClient`, `supabaseClient`), `authStore` | The connect/join/recover lifecycle is the most complex client logic and has zero coverage |
| Gateway authorization behaviors (join-before-chat, ownership) exist, but there's no test for the *missing* membership check (SEC-1) — write it when the feature lands | Locks in the fix |

---

## ✅ Recommended fix order

1. **Commit the uncommitted Phase-4 work** (KLUDGE-6) — everything else builds on a safe baseline.
2. **BUG-1** (oldest-100 messages) — one-line query fix, user-visible correctness.
3. **SEC-3** (Zod `.max()` bounds) — trivial diffs, closes the DoS surface before Phase 5.
4. **PERF-1 fix #1 + #2** (skeleton instead of `null`; reuse cached token in socket auth) — biggest perceived-speed win for the least code. Then re-measure with a prod build (PERF-0).
5. **SEC-2** (`@nestjs/throttler` + AI endpoint cap + `maxOutputTokens`) — must land before Phase 5 makes LLM calls routine.
6. **SEC-1** (session membership model) — needs a schema migration; design it alongside Phase 5 since AI participants will need a membership concept anyway.
7. **BUG-2** (`@@unique` constraint) + **SEC-4** (fail-closed CORS) + **SEC-5** (iss/aud) + **BUG-3** (log caught errors) — small hardening batch.
8. **PERF-3/4** (store append + memoized rows + scroll behavior) — before sessions get long.
9. **KLUDGE-1/2** (ignore generated Prisma, root workspace) — alongside Phase 6 CI setup.
