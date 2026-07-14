# AI Companions — Design & Task Plan

_Plan of record from the 2026-07-14 grilling interview. Three phases, each independently shippable and tested. Do not start a phase until the previous one has landed._

**Effort:** S ≈ ½ day · M ≈ 1 day · L ≈ 2+ days

---

## Decision record (agreed, do not relitigate)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Who edits/deletes a companion | **Summoner or session host** (host = `CampaignSession.creatorId`) |
| 2 | Edit scope | **Name + new `persona` field + stats/HP/inventory** |
| 3 | Creation | **Both**: keep one-click quick-summon (default persona) and add a custom "Create companion" form |
| 4 | Delete semantics | **Hard delete** + SYSTEM chat message "<Name> has left the party" + `CHARACTER_DELETED` broadcast |
| 5 | AI DM | Editable/deletable **by host only** (persona edit = campaign tone control) |
| 6 | `/whisper` privacy | **Truly private content**; rest of the room sees placeholder _"A whispers to B…"_; AI DM context gets only the placeholder; a companion remembers whispers it participated in |
| 7 | `/say` vs `/shout` | `/say to @X`: public, **only target replies** (DM silent, no chime-ins). `/shout to @X`: public + target replies **and DM may react** |
| 8 | Target syntax | **@mention autocomplete** in ChatInput; client sends resolved `targetId` — no server-side name parsing. Aliases `/w`, `/s` |
| 9 | Valid targets | **Companions + AI DM + human players** (whisper to human = private chat, no AI call) |
| 10 | Reply guarantee | **Guaranteed but queued** through `AiTurnScheduler` (never dropped, never quota-bypassing); client shows "<Name> is thinking…" |
| 11 | Interactivity scope | All four: dice rolls, relationship memory, banter, self-initiate — **in that order** |
| 12 | Phasing | A (management) → B (chat commands) → C (interactivity), each shipped |
| 13 | Companion dice | **AI-initiated**: response schema gains optional `diceRolls`; server executes via existing dice service as SYSTEM dice messages |
| 14 | Quota guardrails | Banter: 1 AI→AI hop max, ≤1 per human message. Initiate: after ~3 min silence, once per silence, only with a human connected. Hard cap ~10 unprompted calls/session/hour. Constants in `packages/shared/src/session-limits.ts` |

**Standing facts that shaped the design**
- AI sheets have `userId: null`; `@@unique([userId, sessionId])` forbids reusing `userId` for ownership → new `ownerId` column.
- No delete endpoint exists; the only sheet update path is owner-only human HP/inventory.
- Chat is room-broadcast only; AI reads the last 40 messages raw; the only slash command is client-side `/roll`.
- Untargeted messages keep today's behavior (DM replies; companions by name-mention or 20% chime).

---

## Phase A — Companion management

- [ ] **A1 · Schema: ownership + persona** — _S_
  Prisma migration: `ownerId String? @db.Uuid` (+ relation, index) and `persona String?` on `CharacterSheet`. Backfill: existing AI sheets get `ownerId = session.creatorId`. Extend `CharacterSheetPayload` / Zod schemas in `packages/shared`.
  **Files:** `server/prisma/schema.prisma`, `packages/shared/src/*`.

- [ ] **A2 · Edit + delete endpoints with permission checks** — _M_
  `PATCH /sessions/:id/characters/:sheetId` (name, persona, hpMax/hpCurrent, stats, inventory) and `DELETE …/:sheetId`. Guard: requester is `ownerId` **or** session host; DM sheets host-only; human sheets remain owner-only via the existing path. Delete = hard delete + SYSTEM "left the party" message + `CHARACTER_DELETED` WS event (add to `WS_EVENTS`). Reuse role-cap helpers (rename guard: an edit must not rename a companion into a second "DM").
  **Files:** `server/src/game-session/character-sheet.controller.ts`, `server/src/user/character-sheet.service.ts`, gateway, `packages/shared`.

- [ ] **A3 · Persona in the AI prompt** — _S_
  Include each AI participant's `persona` in the orchestration context; when the responding agent has a persona, instruct Gemini to stay in that voice.
  **Files:** `server/src/ai/ai-orchestration.service.ts`.

- [ ] **A4 · Client: manage companions UI** — _M_
  Party roster rows gain Edit/Dismiss affordances (shown only when permitted). Edit dialog (name, persona textarea, stats, HP). "Create companion" form beside quick-summon in `SessionControls` (default persona on quick-summon). Roster reacts live to `CHARACTER_DELETED`.
  **Files:** `client/src/widgets/session-rail/*`, new `features/companion-management/*`, `client/src/shared/store/sessionStore.ts`.

## Phase B — Targeted chat commands

- [ ] **B1 · Message visibility model** — _M_
  `ChatMessage` gains `visibility` (`PUBLIC` | `WHISPER`) + `recipientId`/`recipientName`. Whisper emit: sender + recipient (if human) get content; room gets placeholder event. Catch-up history filters per requester. Placeholder rendered as _"A whispers to B…"_.
  **Files:** schema, gateway, `packages/shared`, `ChatWindow`.

- [ ] **B2 · @mention autocomplete + command parsing in ChatInput** — _M_
  `/say to @X`, `/shout to @X`, `/whisper to @X` (aliases `/s`, `/w`). Typing `@` after a verb opens a roster picker; the client sends `{ command, targetId, text }`. Unknown command / unresolved target → inline error, message not sent.
  **Files:** `client/src/features/session-chat/*`.

- [ ] **B3 · Targeted AI replies, guaranteed + queued** — _L_
  Gateway routes targeted messages: pin the target sheet as responder in orchestration (skip DM-priority/mention/20% selection). `/say`: DM suppressed. `/shout`: target replies, DM may also react. Whisper to AI: reply comes back as a whisper to the sender; whisper context is included only in that companion's prompts; DM/others see placeholders only. Queue through `AiTurnScheduler` so no targeted message is dropped; emit a "thinking" indicator event.
  **Files:** `server/src/game-session/game-session.gateway.ts`, `server/src/ai/ai-orchestration.service.ts`, `server/src/ai/ai-turn-scheduler.service.ts`.

## Phase C — Interactivity (order: C1 → C2 → C3 → C4)

- [ ] **C1 · AI-initiated dice rolls** — _M_
  Response schema gains optional `diceRolls: [{ characterName, notation, reason }]`; server validates notation, executes via `DiceService`, posts standard SYSTEM dice messages, feeds results into the same turn's narration where feasible (or the next).
- [ ] **C2 · Relationship memory** — _M_
  Per-companion attitude ledger toward each player (GameStateLog-style), updated from turns, injected into that companion's prompt.
- [ ] **C3 · Companion banter (1 hop)** — _M_
  Relax the AI→AI reply guard: exactly one AI may respond to an AI message, max once per human message. Guarded by the quota caps.
- [ ] **C4 · Companions initiate** — _L_
  Scheduler hook: after ~3 min room silence (≥1 human connected), one companion may speak unprompted; once per silence; respects the session hourly cap.
- [ ] **C0 · Quota constants** — _S_ (rides with C3/C4)
  `BANTER_MAX_HOPS = 1`, `INITIATE_SILENCE_MS`, `MAX_UNPROMPTED_CALLS_PER_HOUR = 10` in `packages/shared/src/session-limits.ts`.

---

## Delivery order

```
A1 → A2 → A3 → A4   (ship Phase A)
B1 → B2 → B3        (ship Phase B)
C1 → C2 → C3 → C4   (ship Phase C; C0 rides along)
```
