# DunDrAI Roadmap

DunDrAI is a real-time multiplayer D&D platform with AI-driven Dungeon Masters and party members. This is a living, scannable index of implementation phases — for full architectural detail (stack choices, ADRs 1-8, diagrams), see [`project-plan.md`](./project-plan.md). This file tracks *what's next*, not *why*.

**Status:** Phase 3 (Real-Time Session Backbone) — ✅ done. Next up: Phase 4 (Character Sheets & Dice Roller).

---

## Phase 0 — Foundation & Repo Hygiene

**Goal:** Get the repo into a working, installable, version-controlled state before any feature code lands.

**Done:**
- Nested `server/.git` removed (single repo)
- `client/` and `server/` dependencies installed
- `.env.example` added to both `client/` and `server/`
- Stub FSD/module folders created (`client/src/{widgets,entities,shared}`, `server/src/{auth,user,game-session,ai,prisma}`)
- Supabase project created; real env vars wired into `client/.env.local` and `server/.env`

**Remaining:**
- Initialize Prisma schema + run first migration (`server/prisma/schema.prisma`) — rolls into Phase 2
- Commit this scaffolding work to git (currently uncommitted since "Initial commit")

**Primary files/modules:** `server/prisma/`, `client/.env.example`, `server/.env.example`

**Depends on:** nothing (starting point)

---

## Phase 1 — Auth ✅ DONE

**Goal:** Let a user sign up/log in via Supabase Auth on the client, and let NestJS verify their identity on every request.

**Done:**
- Supabase Auth client flows (sign up, log in, log out, session refresh) in `client/`
- NestJS guard/strategy to verify Supabase JWTs
- Lazy user-creation on first authenticated request per ADR 8
- Real Supabase keys wired into `client/.env.local` / `server/.env`

**Primary files/modules:** `client/src/features/` (auth forms), `client/src/shared/` (Supabase client instance), `server/src/auth/`

**Depends on:** Phase 0 (Supabase project must exist)

---

## Phase 2 — Core Data Models ✅ DONE

**Goal:** Define the persistent schema all other features write to and read from.

**Done:**
- Prisma schema covering `User`, `CampaignSession`, `CharacterSheet`, `ChatMessage`, `GameStateLog` per the ER diagram in `project-plan.md` (+ `SessionStatus`/`SenderType` enums, cascade deletes)
- Prisma Client module wired into Nest DI
- Migration `core_data_models` applied to Supabase Postgres
- `packages/shared` (`@dnd/shared`) created with Zod schemas per ADR 3 (`CreateLobbySchema`, `CharacterSheetSchema`, `SendChatMessageSchema`), consumed by the server as a `file:` dependency
- Zod-backed DTO classes (`nestjs-zod` `createZodDto`) in `server/src/game-session/dto/` + global `ZodValidationPipe` in `main.ts`
- DTO/pipe test specs; server tests and eslint green

**Primary files/modules:** `server/prisma/schema.prisma`, `server/src/prisma/`, `packages/shared/src/`, `server/src/game-session/dto/`

**Depends on:** Phase 0 (Supabase/Prisma init), Phase 1 (User model needs to match auth identities)

---

## Phase 3 — Real-Time Session Backbone ✅ DONE

**Goal:** Stand up the Socket.io gateway that carries all in-game events, with authenticated, recoverable connections.

**Done:**
- Socket.io gateway (`GameSessionGateway`) with handshake auth middleware per ADR 2 (verifies the Supabase JWT via `TOKEN_VERIFIER`, lazily provisions the user per ADR 8, disconnects at token expiry so the client reconnects with a refreshed JWT)
- Connection State Recovery on the server + Zustand `sessionStorage`-persisted session store on the client per ADR 6 (persists only `sessionId` + `lastMessageAt`; rejoin fetches messages via `since`)
- REST vs WebSocket split per ADR 1: `POST/GET /sessions` for lobby setup; `session:join` / `chat:send` over WS with ack envelopes (`AckResponse<T>`), payloads parsed with shared Zod schemas per ADR 3
- Shared WS contract in `packages/shared/src/ws-events.ts` (`WS_EVENTS`, `JoinSessionSchema`, wire payload types)
- Lobby create/join flows, LobbyPage + SessionPage (FSD pages layer lives in `client/src/views/` — `src/pages/` would activate the legacy Next.js Pages Router)
- Jest specs for service/gateway/store/hooks; protocol-level E2E verified (two clients, broadcast, catch-up)

**Primary files/modules:** `server/src/game-session/`, `packages/shared/src/ws-events.ts`, `client/src/features/` (lobby, session-chat), `client/src/shared/` (socketClient, sessionStore), `client/src/views/` (LobbyPage, SessionPage)

**Depends on:** Phase 1 (handshake auth needs JWT verification), Phase 2 (`CampaignSession` model must exist)

---

## Phase 4 — Character Sheets & Dice Roller

**Goal:** Give players a persistent character HUD and a trustworthy way to roll dice inside the shared chat feed.

**Key deliverables:**
- Character sheet CRUD (create/update stats, HP, inventory)
- Character HUD widget on the client
- Server-side verified polyhedral dice roller (d4/d6/d8/d10/d12/d20/d100 + modifiers, e.g. `2d6 + 3`)
- Dice roll results integrated into the chat feed

**Primary files/modules:** `server/src/game-session/` (dice logic), `server/src/user/` (character sheet persistence), `client/src/widgets/` (CharacterHUD), `client/src/features/` (DiceRoller)

**Depends on:** Phase 2 (`CharacterSheet` model), Phase 3 (WS events to broadcast rolls/updates)

---

## Phase 5 — AI Orchestration

**Goal:** Let AI agents act as DM or party members, narrating and mutating game state through structured, validated output.

**Key deliverables:**
- `AIService` wrapper with Gemini SDK integration per ADR 4 (`@google/genai`)
- Structured JSON output parsing for state mutations (inventory, HP, quests)
- DM-mode vs party-member-mode agent prompting
- `GameStateLog` writes reflecting AI-driven state changes

**Primary files/modules:** `server/src/ai/`, `server/src/game-session/` (turn evaluation triggers), `server/prisma/schema.prisma` (`GameStateLog`)

**Depends on:** Phase 2 (`GameStateLog`/`CharacterSheet` models), Phase 3 (broadcasting AI messages over WS), Phase 4 (AI must read/mutate character state)

---

## Phase 6 — Deployment & Ops

**Goal:** Ship a live, publicly reachable version of the platform on the chosen hosting topology.

**Key deliverables:**
- Vercel deployment (frontend) + Render deployment (backend) per ADR 5
- `/health` endpoint on the backend
- Render wake-up ping + "Waking up the Tavern" wait-room UX per ADR 7
- GitHub Actions CI: lint, test, build on PRs

**Primary files/modules:** `server/src/` (health controller), `client/src/pages/` (wait-room page), `client/src/app/` (homepage wake-up ping), `.github/workflows/`

**Depends on:** Phases 0-5 (needs a functioning app to deploy)

---

## Phase 7 — Polish / V1 Launch

**Goal:** Harden what's built and ship V1 without scope creep.

**Key deliverables:**
- Jest test coverage pass (NestJS) + React Testing Library coverage pass (Next.js)
- Re-confirm non-goals stay out of scope: no voice/video, no graphical VTT, no automated 5e rules engine
- README / onboarding docs for local dev setup

**Primary files/modules:** `server/src/**/*.spec.ts`, `client/src/**/*.test.tsx`, `README.md`

**Depends on:** Phases 0-6
