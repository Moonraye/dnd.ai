# DunDrAI Roadmap

DunDrAI is a real-time multiplayer D&D platform with AI-driven Dungeon Masters and party members. This is a living, scannable index of implementation phases — for full architectural detail (stack choices, ADRs 1-8, diagrams), see [`project-plan.md`](./project-plan.md). This file tracks _what's next_, not _why_.

**Status:** Phases 1–5 — ✅ done. Next up: Phase 6 (Deployment & Ops).

---

## Phase 0 — Foundation & Repo Hygiene ✅ DONE

**Goal:** Get the repo into a working, installable, version-controlled state before any feature code lands.

**Done:**

- Nested `server/.git` removed (single repo)
- `client/` and `server/` dependencies installed
- `.env.example` added to both `client/` and `server/`
- Stub FSD/module folders created (`client/src/{widgets,entities,shared}`, `server/src/{auth,user,game-session,ai,prisma}`)
- Supabase project created; real env vars wired into `client/.env.local` and `server/.env`
- Prisma schema initialized + first migration applied (landed in Phase 2)
- Scaffolding committed to git

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

- Prisma schema covering `User`, `CampaignSession`, `CharacterSheet`, `ChatMessage`, `GameStateLog` per the ER diagram in `project-plan.md`
- Prisma Client module wired into Nest DI
- Initial migration applied to Supabase Postgres

**Primary files/modules:** `server/prisma/schema.prisma`, `server/src/prisma/`

**Depends on:** Phase 0 (Supabase/Prisma init), Phase 1 (User model needs to match auth identities)

---

## Phase 3 — Real-Time Session Backbone ✅ DONE

**Goal:** Stand up the Socket.io gateway that carries all in-game events, with authenticated, recoverable connections.

**Done:**

- Socket.io gateway with WebSocket handshake auth per ADR 2
- Connection State Recovery on server + Zustand `sessionStorage` cache on client per ADR 6
- REST vs WebSocket action split per ADR 1 (lobby creation over REST, game-loop events over WS)
- Lobby creation and join flows

**Primary files/modules:** `server/src/game-session/`, `client/src/features/` (lobby, connection), `client/src/store/` (Zustand session store), `client/src/pages/` (LobbyPage, SessionPage)

**Depends on:** Phase 1 (handshake auth needs JWT verification), Phase 2 (`CampaignSession` model must exist)

---

## Phase 4 — Character Sheets & Dice Roller ✅ DONE

**Goal:** Give players a persistent character HUD and a trustworthy way to roll dice inside the shared chat feed.

**Key deliverables:**

- Character sheet CRUD (create/update stats, HP, inventory)
- Character HUD widget on the client
- Server-side verified polyhedral dice roller (d4/d6/d8/d10/d12/d20/d100 + modifiers, e.g. `2d6 + 3`)
- Dice roll results integrated into the chat feed

**Primary files/modules:** `server/src/game-session/` (dice logic), `server/src/user/` (character sheet persistence), `client/src/widgets/` (CharacterHUD), `client/src/features/` (DiceRoller)

**Depends on:** Phase 2 (`CharacterSheet` model), Phase 3 (WS events to broadcast rolls/updates)

---

## Phase 5 — AI Orchestration ✅ DONE

**Goal:** Let AI agents act as DM or party members, narrating and mutating game state through structured, validated output.

**Done:**

- `AiService` wrapper with Gemini SDK integration per ADR 4 (`@google/genai`); `AiOrchestrationService` turn evaluator
- Structured JSON output parsing for state mutations (inventory, HP, quests, NPCs, summary), validated against `AiResponseSchema`
- Turn triggers on chat/dice events, rate-limited through `AiTurnScheduler` (per-session 15s cooldown + trailing debounce) so bursts don't fan out into paid Gemini calls
- `GameStateLog` writes reflecting AI-driven state changes, exposed to the client over WS (join ack + `STATE_LOG_UPDATED` broadcast) and surfaced in the read-only **Campaign Journal** widget
- AI-write Zod schemas bounded (`AiStateUpdateSchema`) to close the AUDIT SEC-3 surface before AI writes went routine
- Companion-spawn UI (Spawn AI DM / AI Player) in the CharacterHud

**Deferred to Phase 7 (polish):**

- Replace the fragile `name.includes('dm')` DM-vs-player detection with an explicit sheet flag
- Distinct chat styling / Markdown rendering for `AI_DM` / `AI_PLAYER` messages
- Split the orchestration service into DM-mode vs party-member-mode prompting paths
- **DM kickoff narration on spawn** — have a freshly spawned AI DM open the scene instead of waiting for the first human message

**Primary files/modules:** `server/src/ai/`, `server/src/game-session/` (turn evaluation triggers), `server/prisma/schema.prisma` (`GameStateLog`), `client/src/widgets/campaign-journal/`

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
- AI-orchestration polish deferred from Phase 5: explicit DM/player flag on AI sheets (replace `name.includes('dm')`), distinct AI message styling + Markdown rendering, DM-mode vs party-member-mode prompt split, and DM kickoff narration on spawn

**Primary files/modules:** `server/src/**/*.spec.ts`, `client/src/**/*.test.tsx`, `README.md`

**Depends on:** Phases 0-6
