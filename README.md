# DunDrAI (dnd.ai)

DunDrAI is a real-time web platform for playing Dungeons & Dragons, supporting collaborative play between humans and AI models (such as Gemini 2.5 Flash). AI agents can act as either the Dungeon Master (DM) or fellow party members.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router) · TypeScript · Tailwind CSS · Zustand |
| Backend | NestJS · Socket.IO · Prisma 7 |
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Auth (JWT, verified server-side) |
| AI | Google Gemini via `@google/genai` |
| Validation | Zod schemas shared between client and server (`@dnd/shared`) |
| Localization | Custom i18n (English/Ukrainian), client language switch + per-campaign AI DM language pin |

## Repository Layout

```
├── client/            # Next.js app (Feature-Sliced Design in src/)
│   └── src/
│       ├── app/       # App Router routes (thin, delegate to views/)
│       ├── views/     # Page-level UI (HomePage, LobbyPage, SessionPage)
│       ├── widgets/   # Major layout pieces (Header, CharacterHUD, ...)
│       ├── features/  # Interactive features (auth, DiceRoller, language, ...)
│       ├── entities/  # Business domain entities
│       └── shared/    # Supabase client, Zustand stores, i18n dictionaries, UI kit
├── server/            # NestJS API + WebSocket gateway
│   ├── prisma/        # Prisma schema and migrations
│   └── src/
│       ├── auth/      # Supabase JWT guard and token verifiers
│       ├── user/      # User provisioning (lazy creation, ADR 8)
│       ├── prisma/    # Prisma client Nest module
│       ├── game-session/  # DTOs; Socket.IO gateway (Phase 3)
│       └── ai/        # Gemini integration (Phase 5)
└── packages/
    └── shared/        # @dnd/shared — Zod schemas + shared TS types
```

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (Postgres + Auth)

### 1. Environment

Copy the example env files and fill in your Supabase credentials:

```bash
cp client/.env.example client/.env.local
cp server/.env.example server/.env
```

`server/.env` needs `DATABASE_URL` (use the **session pooler / port 5432** connection string for migrations), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`. `client/.env.local` needs the Supabase URL and anon key.

### 2. Install

```bash
cd packages/shared && npm install   # builds dist/ via prepare
cd ../../server && npm install
cd ../client && npm install
```

### 3. Database

```bash
cd server
npx prisma migrate dev    # apply migrations
npx prisma generate       # regenerate client (output: src/generated/prisma)
```

### 4. Run

```bash
# Terminal 1 — backend on :3001
cd server && npm run start:dev

# Terminal 2 — frontend on :3000
cd client && npm run dev
```

## Testing & Linting

```bash
# Server
cd server && npm test && npm run lint

# Client
cd client && npm test && npm run lint
```

## Data Model

Five Prisma models back the platform (see `server/prisma/schema.prisma`):
`User` (mirrors Supabase Auth identities, lazily created), `CampaignSession`
(includes a `language` field, chosen at lobby creation and immutable, that
pins the AI DM's replies to English or Ukrainian for the whole campaign),
`CharacterSheet` (JSON stats/inventory, optional `aiProvider`/`aiModel` for
AI-controlled characters), `ChatMessage`, and `GameStateLog` (one-to-one AI
campaign memory per session).

Request validation uses Zod schemas from `@dnd/shared`, exposed to NestJS as
DTO classes via `nestjs-zod` with a global `ZodValidationPipe`.

## Branching Model (git flow)

- `main` — stable releases
- `dev` — integration branch; all work merges here first
- `feat/*` — feature branches cut from `dev`, merged back with `--no-ff`

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for implementation phases (Phases 0-5 complete:
foundation, auth, core data models, real-time backbone, character sheets/dice,
AI orchestration — Phase 6 deployment/ops up next) and
[project-plan.md](./project-plan.md) for full architectural detail and ADRs.
