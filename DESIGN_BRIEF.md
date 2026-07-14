# DunDrAI — Design Brief

_Full-app layout & design-system redesign. Source of truth for the visual + structural direction. This is a **layout + design-system** effort; it deliberately adds no new backend/socket features._

---

## 1. Why this exists

The frontend (`client/`, Next 16 · React 19 · Tailwind v4, FSD layers under `client/src/`) currently renders **unstyled**. `client/src/app/globals.css` is 0 bytes and no stylesheet does `@import "tailwindcss";` or declares a `@theme` — so in Tailwind v4 **none of the utility classes the app uses are generated**. There is also no `shared/ui/` primitive layer (every component hand-writes Tailwind and repeats the same panel token), no theme provider, and the in-game session screen crams four concerns into a single 320px sidebar.

**Goal:** fix the pipeline, ship a cohesive dark + light "restrained arcane" design system with an owned component library, and re-lay-out every screen — centered on a virtual-tabletop (VTT) session screen that gives the AI DM's narration center stage.

---

## 2. Art direction

**Restrained arcane, dark-first.** A premium game-client feel — atmospheric but with clean, highly legible reading surfaces (the app is chat-heavy and real-time). Atmosphere comes from typography, a confident accent, and subtle glow/texture — **not** skeuomorphism (no parchment, no ornate frames).

- **Themes:** dark **and** light. Real theme provider + in-app toggle. Tokens as paired CSS variables; default dark, respect `prefers-color-scheme` on first visit, persist choice.
- **Palette:** **violet** primary (buttons, links, focus rings, heading glow) + **ember/amber** secondary highlight (crits, active turn, CTAs).
  - **Reserved semantics — do not repurpose:** green / amber / red = HP & status; indigo = dice.
- **Typography:**
  - Body / UI → **Geist Sans** (max legibility for the scrolling log).
  - Major headings / logo / session titles → one **display face** (e.g. Cinzel / Cormorant SC).
  - Numbers (dice, ability scores, HP counts) → **Geist Mono**.
- **Surfaces:** elevated cards/panels with subtle borders + soft shadow/glow, replacing the repeated inline `rounded-md border border-zinc-300 dark:border-zinc-700`.

---

## 3. Component layer

**shadcn/ui-style** — Radix primitives + owned, Tailwind-styled components in `client/src/shared/ui/`. We own every file, so the arcane restyle is just editing tokens; Radix gives accessible Dialog / Drawer / Dropdown / Tabs / Tooltip for free.

Primitives to build: `Button`, `Card`/`Panel`, `Input`, `Textarea`, `Dialog`, `Drawer`/Sheet, `Tabs`/`SegmentedControl`, `Tooltip`, `DropdownMenu`, `Badge`/`Pill`, `ScrollArea`. Add `class-variance-authority` + `clsx`/`tailwind-merge` (`cn` helper) and the needed `@radix-ui/react-*` deps.

---

## 4. App shell

Shared **top bar** on landing / auth / lobby (logo/display wordmark, nav, user menu, theme toggle). The **session screen stays immersive** with its own compact header — the game table shouldn't spend vertical space on global nav the player doesn't need mid-combat.

---

## 5. Screens

### 5.1 Landing + auth
- **Landing:** real marketing hero — headline, subcopy, primary CTA, CSS atmosphere (gradient / subtle noise / display type). **No external art assets.**
- **Auth (login/signup):** split-screen — form on one side, atmospheric CSS panel (tagline) on the other. Forms rebuilt on `shared/ui`.

### 5.2 Lobby
- Responsive **grid of campaign cards** (title, DM/player count, status → Join).
- **Create Campaign** button opens a **Dialog** (not an always-open inline form). Reuse `useLobbyList`, `useCreateLobby`.

### 5.3 Character-creation gate
- Themed **full-screen, single-step "forge your hero"** (name, HP, ability tiles, inventory). Still **gates table entry**. Arcane treatment, but one focused screen — no wizard.

### 5.4 Session screen — 3-column full-bleed VTT
Drop `max-w-6xl`; go full width.

```
┌───────────────┬────────────────────────────┬──────────────────┐
│  LEFT RAIL    │      CENTER (hero)          │   RIGHT COLUMN   │
│               │                             │  [ Sheet | Journal ]
│ Party roster  │  DM narrative log           │                  │
│  (name/HP/    │   · DM = scene prose        │  Character sheet │
│   presence)   │   · players/OOC = bubbles   │   (HP, abilities,│
│ Turn slot*    │   · dice = DiceRollCard     │    inventory)    │
│ Session ctrls │                             │   — or —         │
│  (Spawn AI    │  ── input bar ──────────    │  Campaign Journal│
│   DM/Player,  │   [d20] collapsible dice    │  (story/quests/  │
│   invite/     │   tray · /roll command      │   NPCs/canon)    │
│   leave)      │                             │                  │
└───────────────┴────────────────────────────┴──────────────────┘
```

- **DM narration** renders full-width as **"scene" prose** (display/serif, ambient, no bubble); player/OOC = compact bubbles; dice = restyled `DiceRollCard`. One log, two archetypes → "the story" vs "the table talk" is instantly legible.
- **Dice:** collapsible tray opened from a **d20 button on the input bar**; `/roll` command kept. No permanent height cost to the hero log.
- **Turn/initiative slot\*:** designed in the left rail but **presentational only** — fed by data that already exists (party presence, DM present/absent via `countSessionRoles`, connection status). **No new WS/store plumbing** in this effort; real turn logic is a follow-up.
- **Reorg:** party roster + `Spawn AI DM` / `Spawn AI Player` controls move **out of** `CharacterHud` **into** the left rail. Right column becomes a clean **personal sheet only**.
- **Campaign Journal:** a **tab in the right column** via a `Sheet | Journal` segmented control.

**Responsive:** desktop 3-col → tablet 2-col (rail collapses) → **phone** = full-width DM log + **bottom toolbar** (`Party · Sheet · Journal`) opening each as a Radix drawer/bottom-sheet (replaces the hand-rolled `hudOpen` overlay). Story stays center on every size. No horizontal body scroll at any width.

---

## 6. Rollout — foundation-first, easiest → hardest

Each stage independently shippable and verifiable.

1. **Foundation** — wire Tailwind (`globals.css` `@import` + `@theme` tokens, paired light/dark), add display font, theme provider + toggle, build `shared/ui` primitives.
2. **App shell + landing/auth** — shared top bar (rebuild `widgets/header`), hero landing, split-screen auth.
3. **Lobby** — card grid + create Dialog.
4. **Session screen** (largest, depends on every primitive) — 3-col VTT, DM scene prose, dice tray, left rail, tabbed right column, responsive collapse.

---

## 7. Reuse (don't rebuild)

- All data/logic hooks unchanged: `useSessionSocket`, `useMyCharacter`, `useUpdateCharacter`, `useRollDice`, `useLobbyList`, `useCreateLobby`, auth hooks, `useSessionStore`.
- `countSessionRoles` / `MAX_PLAYERS_PER_SESSION` (`@dnd/shared`) for party/turn slot + caps.
- `HpBar`, `PartyStrip` reused (re-homed to the left rail).

## 8. Critical files

- **Pipeline/theme:** `client/src/app/globals.css`, `client/src/app/layout.tsx`, new `client/src/shared/ui/*`, new theme provider.
- **Shell/public:** `client/src/widgets/header/ui/Header.tsx`, `client/src/app/page.tsx`, `client/src/app/{login,signup}/page.tsx`, `client/src/features/auth/ui/*`.
- **Lobby:** `client/src/views/lobby/ui/LobbyPage.tsx`, `client/src/features/lobby/ui/{LobbyList,CreateLobbyForm}.tsx`.
- **Session:** `client/src/views/session/ui/SessionPage.tsx`, `client/src/widgets/character-hud/ui/{CharacterHud,PartyStrip,HpBar}.tsx`, `client/src/widgets/campaign-journal/ui/CampaignJournal.tsx`, `client/src/features/session-chat/ui/{ChatWindow,ChatInput}.tsx`, `client/src/features/dice-roller/ui/DiceRollerPanel.tsx`, `client/src/entities/dice/ui/DiceRollCard.tsx`, `client/src/features/character-sheet/ui/CharacterCreationForm.tsx`.

## 9. Verification

- `cd client && npm run dev` → confirm styles render at all (they currently do not).
- Theme toggle works in dark **and** light across every screen; persists across reload; correct first-visit default.
- Flow: landing → signup/login (split-screen) → lobby (card grid + create Dialog) → session.
- Session desktop: 3 columns; DM scene prose vs player bubbles; d20 opens/closes dice tray; `/roll` posts a `DiceRollCard`; `Sheet | Journal` tab switches the right column; party + AI-spawn in left rail; Spawn AI DM disabled when DM exists, Spawn AI Player disabled at party cap.
- Session responsive: tablet 2-col → phone full-width log + bottom toolbar drawers. No horizontal body scroll.
- Character-creation gate: join without a sheet → themed full-screen forge → drops into the table.
- `npm run test` + `npm run build` pass; update tests coupled to old markup (`CharacterHud.test.tsx`, `DiceRollerPanel.test.tsx`).

---

## Notes / open risks

- Introduces new deps: Radix + `class-variance-authority` + `tailwind-merge`.
- Turn indicator is **presentational**; wiring live turn state is out of scope (follow-up).
- Component tests asserting on old markup will need updating alongside the redesign.
