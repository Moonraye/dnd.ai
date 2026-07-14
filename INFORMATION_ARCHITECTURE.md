# DunDrAI — Information Architecture

_The structural skeleton of the product: routes, navigation, content hierarchy, and user journeys. Pairs with `DESIGN_BRIEF.md` (visual + layout direction). Reflects the redesigned target state._

---

## 1. Site map

```
/                        Landing            public
├── /login               Sign in            public (redirect → /lobby if authed)
├── /signup              Sign up            public (redirect → /lobby if authed)
├── /lobby               Campaign browser   auth-gated (→ /login)
│     └── (Dialog) Create Campaign
└── /session/[id]        Game table         auth-gated (→ /login)
      └── (gate) Forge your hero            character-gated (no sheet → creation)
```

Five routes, two of them dynamic-free auth pages, one dynamic (`[id]`). No nested layouts today; one root layout wraps everything (`client/src/app/layout.tsx`).

### Route → composition

| Route | Renders | FSD view |
|---|---|---|
| `/` | Landing hero | inline in `app/page.tsx` |
| `/login`, `/signup` | Split-screen auth | inline + `features/auth` |
| `/lobby` | Campaign card grid + create Dialog | `views/lobby` |
| `/session/[id]` | 3-column VTT (or hero-forge gate) | `views/session` |

---

## 2. Access-control layers (gating order)

A user passes through up to three gates before reaching gameplay:

```
1. AUTH GATE        authStore.status
                    loading → skeleton
                    unauthenticated → redirect /login
                    authenticated → continue
                        │
2. SESSION JOIN     socket join (useSessionSocket)
                    idle/connecting → "Connecting…"
                    error → error banner + Retry
                    joined → continue
                        │
3. CHARACTER GATE   needsCharacter = isKnown && !myCharacter
                    true → full-screen "Forge your hero" (blocks table)
                    false → the game table
```

- **Auth** is enforced per-page (`LobbyPage`, `SessionPage` redirect to `/login`). Login/signup redirect *out* to `/lobby` when already authed.
- **Session join** and **character** gates are specific to `/session/[id]`.
- Roles & caps enforced within a session: **1 DM + up to `MAX_PLAYERS_PER_SESSION` (5) players** (`countSessionRoles`, `@dnd/shared`).

---

## 3. Navigation model

Three tiers, matching the app-shell decision (shared top bar off the table, immersive session on it).

### 3.1 Global (top bar) — landing / auth / lobby
- **Left:** logo / display wordmark → `/`.
- **Right:** theme toggle; auth state — signed out → `Sign in` / `Sign up`; signed in → username + user menu (`DropdownMenu`) with Sign out.

### 3.2 Contextual — session header (immersive)
The session screen does **not** show the global bar. Its own compact header:
- **Left:** session title, `← Back to lobby`.
- **Right:** connection pill (green/amber/red), user/theme controls, and (mobile) the panel trigger.

### 3.3 In-session panel navigation
- **Left rail:** party roster · turn slot (presentational) · session controls (Spawn AI DM/Player, invite/leave).
- **Right column:** `Sheet | Journal` segmented control (Tabs).
- **Center:** the narrative log + input; dice tray toggled by a d20 button.
- **Mobile:** bottom toolbar (`Party · Sheet · Journal`) opens each panel as a drawer/bottom-sheet; the DM log is the only always-visible surface.

### Navigation graph

```
        ┌──────────── / (landing) ────────────┐
        │              │                        │
     /signup        /login                  (CTA) Play
        └──────┬───────┘                        │
               ▼                                 │
            /lobby  ◄──────────────── Back to lobby
               │  (Join / Create→session)        ▲
               ▼                                  │
        /session/[id] ── leave ───────────────────┘
               │
        (no sheet) → Forge your hero → table
```

---

## 4. Content hierarchy

### 4.1 Domain entities & relationships

```
User (Supabase identity)
  └── owns → Character sheet   (one per session, per user)
Session / Campaign
  ├── has → Characters[]       (party; roles: DM | player; may be AI)
  ├── has → Chat messages[]    (DM narration | player | OOC | system/dice)
  ├── has → Campaign state log (AI story memory)
  └── caps: 1 DM + ≤5 players
Dice roll → produces → system message (DiceRollCard) in the log
```

### 4.2 Per-screen content priority (what dominates the eye)

| Screen | Primary | Secondary | Tertiary |
|---|---|---|---|
| Landing | Value prop + play CTA | Atmosphere | Auth links |
| Auth | The form | Reassurance/tagline panel | Cross-link (login↔signup) |
| Lobby | Campaign cards (join) | Create button | Empty/loading states |
| Char creation | Identity + ability scores | Inventory | Confirm/enter |
| **Session** | **DM narrative log** | Character sheet · party | Journal · dice · controls |

### 4.3 Session content model — the message log

The center log is the product's core content stream. Message archetypes (visually distinct per `DESIGN_BRIEF.md`):

| Kind | Source | Treatment |
|---|---|---|
| **Scene / narration** | AI DM | Full-width prose, display/serif, no bubble |
| **Player message** | Human/AI player | Compact bubble |
| **OOC / table talk** | Player | Compact bubble (muted) |
| **Dice roll** | System | `DiceRollCard` (indigo) |

### 4.4 Right-column content (tabbed)
- **Sheet:** name · HP bar · ability tiles · inventory editor (personal only).
- **Journal (read-only AI memory):** story-so-far · active quests · NPCs · established canon.

### 4.5 Left-rail content
- **Party roster:** each member — name · HP · presence.
- **Turn slot:** presentational (party presence / DM present-absent / connection).
- **Session controls:** Spawn AI DM (disabled if DM exists) · Spawn AI Player (disabled at cap) · invite/leave.

---

## 5. User journeys

### J1 — New visitor → first game (primary funnel)
```
/ (landing)
  → CTA "Play"
  → /signup  (create account)
  → /lobby   (auto-redirect after auth)
  → Create Campaign (Dialog)  OR  Join a campaign card
  → /session/[id]
  → Forge your hero (character gate)
  → the table (play loop → J4)
```

### J2 — Returning player
```
/ or /login → (auth) → /lobby → Join card → /session/[id]
  → sheet exists → straight to the table
```

### J3 — Host sets up an AI-run table
```
/lobby → Create Campaign → /session/[id] → Forge hero
  → left rail: Spawn AI DM
  → left rail: Spawn AI Player ×N (up to cap)
  → begin play
```

### J4 — Core play loop (in-session)
```
Read DM scene prose (center log)
  → act:  type message  |  /roll or d20 tray  |  edit sheet (HP/inventory)
  → AI DM responds (new scene) ; journal updates (quests/NPCs/canon)
  → repeat
```

### J5 — Reconnect / resume (ADR 6)
```
Reload mid-game
  → sessionStore rehydrates {sessionId, lastMessageAt}
  → socket rejoins, refetches messages since lastMessageAt
  → log restored without full reload
```

### J6 — Sign out
```
Any screen with top bar / session header → user menu → Sign out
  → authStore → unauthenticated → redirect /login
```

---

## 6. Entry & exit points

| Entry | Lands on | Notes |
|---|---|---|
| Cold visit | `/` | Public |
| Deep link to `/session/[id]` unauthed | → `/login` | Then should return to session (post-auth) |
| Deep link to `/lobby` unauthed | → `/login` | Auth gate |
| Already authed hits `/login`/`/signup` | → `/lobby` | Redirect out |

| Exit | Trigger |
|---|---|
| Leave table | `← Back to lobby` / leave control → `/lobby` |
| Sign out | User menu → `/login` |
| Connection lost | Error banner + Retry (stays on route) |

---

## 7. Responsive IA (session)

| Breakpoint | Structure | Panel access |
|---|---|---|
| Desktop | 3 columns (rail · log · sheet) | All visible |
| Tablet | 2 columns (rail collapses) | Rail via icons/drawer |
| Phone | 1 column (log only) | Bottom toolbar → Party / Sheet / Journal drawers |

The **DM narrative log is the constant** across every breakpoint; everything else is progressively disclosed.

---

## 8. State vocabulary (drives what the UI shows)

| Store / source | States | Consumed by |
|---|---|---|
| `authStore.status` | loading · authenticated · unauthenticated | route gates, top bar |
| `joinStatus` (`useSessionSocket`) | idle · connecting · joined · error | session header pill, disabled inputs |
| `needsCharacter` | true / false | character gate |
| `sessionStore` | messages · characters · stateLog · lastMessageAt | log, party, journal, resume |
| roles (`countSessionRoles`) | dms · players (+caps) | turn slot, spawn-button disabled states |

---

## 9. Not in the IA (explicit non-goals)

- **Live turn order / initiative tracking** — the turn slot is presentational; no per-turn routing or turn-state model in this scope.
- No profile/settings route, no campaign-detail route outside the session, no in-app notifications center — all future surfaces if introduced.
