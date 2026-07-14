# DunDrAI Redesign — Task Breakdown

_Ordered, categorized vertical slices derived from `DESIGN_BRIEF.md`, `INFORMATION_ARCHITECTURE.md`, and `DESIGN_TOKENS.md`. Each slice is independently shippable and verifiable. Follow the order; dependencies are noted._

**Legend:** 🟥 Foundation (enabling) · 🟦 Public/shell · 🟩 Lobby · 🟪 Session · ⬛ Cross-cutting
**Effort:** S ≈ ½ day · M ≈ 1 day · L ≈ 2+ days

**Definition of done (every slice):** renders in **both** themes · no horizontal body scroll · keyboard-focusable with visible ring · `npm run build` + `npm run test` pass · uses **semantic tokens only** (no raw hex in components).

> **PROGRESS:** ✅ **All slices complete** — F1–F4 · S1–S3 · L1–L2 · G1–G7 · X. Tests green (57), build clean. E2E-verified in Chrome: dark/light toggle + persistence, hero typing scene, split-screen auth, lobby grid + create dialog, and the 3-column VTT session (immersive header, left rail with party/summon, center DM-voice log + d20 composer, Sheet|Journal tabs) with no horizontal scroll. Deps hoisted to repo-root node_modules. Palette = "Candle & Grimoire" (DESIGN_TOKENS.md §0.1). Display font = Cormorant Garamond.
>
> **Session epic notes:** DM narration renders as Cormorant scene prose (violet rule + ember eyebrow) — the read-aloud voice from the landing carried into play. Party + AI-spawn moved from CharacterHud into a new `widgets/session-rail`; `HpBar` promoted to `shared/ui`; `PartyStrip`→`PartyRoster` (test ported). Responsive collapse (3-col → drawers + bottom toolbar) implemented via Tailwind breakpoints; live phone-width capture wasn't possible (extension screenshots at fixed width), desktop verified. Dice tray + full session flow (joined socket, character gate, live chat) need the NestJS backend + DB running to exercise end-to-end.

---

## Epic F — Foundation 🟥 (unblocks everything)

- [x] **F1 · Wire the Tailwind pipeline + base tokens** — _S_ ✅ done
  Filled `client/src/app/globals.css`: `@import "tailwindcss"`, switchable token layer, `@theme inline` map, base styles (display headings, focus ring, reduced-motion). Palette refined under the **frontend-design** skill to the **"Candle & Grimoire"** arcane identity (violet-tinted ink ground, dusty-lavender muted text, luminous violet primary, ember counterpoint) — see `DESIGN_TOKENS.md` §0.1.
  **Interim:** dark is driven by `prefers-color-scheme` (F2 swaps in the explicit `[data-theme]` provider + toggle).
  **Verified:** `npm run build` compiles clean; CSS output 0→24KB with default utilities emitted and both theme token sets present; dev server serves HTTP 200 with tokens. Visual screenshot pending (browser extension not connected).
  **Files:** `client/src/app/globals.css`.
  **Depends:** — (done first)

- [x] **F2 · Theme provider + toggle + display font** — _M_ ✅ done
  Added `features/theme` (`ThemeProvider` context, `ThemeToggle` sun/moon, `themeInitScript` pre-hydration setter, `applyTheme`/`readTheme`). Wired into `layout.tsx`; switched tokens from `prefers-color-scheme` to explicit `[data-theme]` + a `@custom-variant dark` so existing `dark:` utilities follow the toggle. Display face = **Cormorant Garamond** (`--font-display-face`), a high-contrast grimoire serif — deliberately not the Cinzel cliché.
  **Verified (E2E in Chrome):** toggle flips both themes live; choice persists across reload (localStorage); Cormorant headings render; `suppressHydrationWarning` on `<html>` clears the `data-theme` hydration mismatch (console clean); all 57 tests pass (fixed `Header.test.tsx` to wrap in `ThemeProvider`).
  **Files:** `client/src/features/theme/*`, `client/src/app/layout.tsx`, `client/src/app/globals.css`, `client/src/widgets/header/ui/Header.tsx`, `client/src/widgets/header/ui/Header.test.tsx`.
  **Depends:** F1

- [x] **F3 · UI-kit primitives — batch 1 (core)** — _M_ ✅ done
  Installed `class-variance-authority`, `clsx`, `tailwind-merge`; added `cn()` at `shared/lib/cn.ts`. Built `Button` (6 variants × 4 sizes, cva), `Input`, `Textarea`, `Card` + `Panel`, `Badge` (7 semantic variants) in `shared/ui/`, all consuming semantic tokens; focus rings come from the global `:focus-visible` rule (not cleared).
  **Verified:** `npm run build` compiles (token opacity modifiers `bg-accent/15` and `shadow-[var(--shadow-md)]` generate). Visual proof rides along in S1 (Button in Header) / S2 (Card, Button on landing).
  **Files:** `client/src/shared/lib/cn.ts`, `client/src/shared/ui/*`, `client/package.json`.
  **Depends:** F1 (F2 for theme QA)

- [x] **F4 · UI-kit primitives — batch 2 (Radix overlays)** — _M_ ✅ done
  Installed `@radix-ui/react-{dialog,dropdown-menu,tabs,tooltip}`; built themed `Dialog` (+Title/Description), `Drawer` (right/bottom sheet on Radix Dialog), `Tabs` (segmented-control style), `Tooltip`, `DropdownMenu` (+Item/Label/Separator) in `shared/ui/`, all on semantic tokens with the token z-index layers. (ScrollArea deferred — native `overflow-y-auto` suffices; add if needed.)
  **Verified:** `npm run build` typechecks (fixed a strict-index type error in `Drawer`). Focus-trap / Esc / keyboard nav come from Radix; exercised for real in L2 (Dialog), S1 (DropdownMenu), G5 (Tabs), G7 (Drawer).
  **Files:** `client/src/shared/ui/{Dialog,Drawer,Tabs,Tooltip,DropdownMenu}.tsx`, `index.ts`, `client/package.json`.
  **Depends:** F3

---

## Epic S — App shell & public screens 🟦

- [x] **S1 · Shared top bar** — _M_ ✅ done
  Rebuilt `widgets/header` on primitives: display-serif wordmark, `buttonVariants` sign-in/up links, authenticated **user menu** via `DropdownMenu` (email label + Sign out, reusing `useSignOut`), `ThemeToggle`, frosted `bg-bg/80 backdrop-blur` bar — all semantic tokens. (Auth pages get their own chrome in S3.)
  **Verified (E2E in Chrome):** wordmark renders in Cormorant; user-menu dropdown opens with email label + Sign out (Radix focus-trap/Esc working); all 57 tests pass (updated `Header.test.tsx` mock to `useSignOut` + closed-menu assertion).
  **Files:** `client/src/widgets/header/ui/Header.tsx`, `Header.test.tsx`.
  **Depends:** F2, F3, F4

- [ ] **S2 · Landing hero** — _M_
  Rebuild `app/page.tsx`: headline, subcopy, primary CTA → signup/lobby, CSS atmosphere (gradient/texture/display type). No external art.
  **Delivers:** real first impression (J1 funnel entry).
  **Verify:** hero responsive; CTA routes correctly; both themes.
  **Files:** `client/src/app/page.tsx`.
  **Depends:** F3, S1

- [ ] **S3 · Split-screen auth** — _M_
  Rebuild login/signup as split-screen (form + atmospheric CSS panel) on `Input`/`Button`/`Card`. Keep auth hooks unchanged.
  **Delivers:** themed sign-in/up (J1/J2).
  **Verify:** sign up → redirect `/lobby`; already-authed on `/login` → `/lobby`; error states styled.
  **Files:** `client/src/app/{login,signup}/page.tsx`, `client/src/features/auth/ui/*`.
  **Depends:** F3, S1

---

## Epic L — Lobby 🟩

- [ ] **L1 · Campaign card grid** — _M_
  `views/lobby/ui/LobbyPage.tsx` + `features/lobby/ui/LobbyList.tsx` → responsive grid of `CampaignCard` (title, DM/player count, status, Join). Reuse `useLobbyList`.
  **Delivers:** "browse tables" surface (IA §5.2).
  **Verify:** grid reflows sm→lg; empty + loading states; Join routes to `/session/[id]`.
  **Files:** `client/src/views/lobby/ui/LobbyPage.tsx`, `client/src/features/lobby/ui/LobbyList.tsx`.
  **Depends:** F3, S1

- [ ] **L2 · Create Campaign dialog** — _S_
  Move `CreateLobbyForm` into a `Dialog` triggered by a prominent button. Reuse `useCreateLobby`.
  **Delivers:** create flow that doesn't crowd the list (J3 entry).
  **Verify:** dialog opens/closes; create → new session appears/navigates.
  **Files:** `client/src/features/lobby/ui/CreateLobbyForm.tsx`, `LobbyPage.tsx`.
  **Depends:** F4, L1

---

## Epic G — Session / game table 🟪 (largest; slice-by-slice)

- [ ] **G1 · Session shell + 3-col scaffold** — _L_
  Replace `SessionPage` container: drop `max-w-6xl`, full-bleed 3-col grid, immersive compact header (reuse `joinStatus` pill, `retry`, `needsCharacter` gate). Columns themed but may hold current components initially.
  **Delivers:** the VTT skeleton (IA §5.4) on desktop.
  **Verify:** 3 columns at ≥xl; header/pill/error banner work; join + character gate intact.
  **Files:** `client/src/views/session/ui/SessionPage.tsx`.
  **Depends:** F3, F4

- [ ] **G2 · Center log — message archetypes** — _M_
  `ChatWindow`: DM narration → full-width scene prose (display, accent bar); player/OOC → bubbles; restyle `DiceRollCard`. Token mapping per `DESIGN_TOKENS.md` §2.
  **Delivers:** "story vs table-talk" legibility — the product's core surface.
  **Verify:** each archetype visually distinct in both themes; log scrolls independently.
  **Files:** `client/src/features/session-chat/ui/ChatWindow.tsx`, `client/src/entities/dice/ui/DiceRollCard.tsx`.
  **Depends:** G1

- [ ] **G3 · Input bar + collapsible dice tray** — _M_
  `ChatInput` on primitives; d20 button toggles a collapsible `DiceRollerPanel` tray above input; keep `/roll` (`onRollCommand`/`useRollDice`).
  **Delivers:** dice without permanent height cost (IA §5.4).
  **Verify:** d20 opens/closes tray; typed `/roll` posts a `DiceRollCard`; disabled when not `joined`.
  **Files:** `client/src/features/session-chat/ui/ChatInput.tsx`, `client/src/features/dice-roller/ui/DiceRollerPanel.tsx`.
  **Depends:** G1 (G2 for result rendering)

- [ ] **G4 · Left rail — party + controls + turn slot** — _M_
  New `widgets/session-rail`: party roster (reuse `PartyStrip`, `HpBar`), **presentational** turn slot (party presence / DM present-absent via `countSessionRoles` / connection), session controls — **move** Spawn AI DM/Player out of `CharacterHud`.
  **Delivers:** de-crammed session-level controls (IA §4.5). _No new WS/store plumbing._
  **Verify:** Spawn AI DM disabled when DM exists; Spawn AI Player disabled at cap; party updates live.
  **Files:** new `client/src/widgets/session-rail/*`, `client/src/widgets/character-hud/ui/*`.
  **Depends:** G1

- [ ] **G5 · Right column — sheet + Journal tabs** — _M_
  Slim `CharacterHud` to personal sheet only (name, `HpBar`, ability tiles, inventory). Add `Sheet | Journal` `Tabs`/segmented control hosting `CampaignJournal`.
  **Delivers:** de-crammed right column (IA §4.4).
  **Verify:** HP ±/inventory edits persist; tab switch works and remembers within session.
  **Files:** `client/src/widgets/character-hud/ui/CharacterHud.tsx`, `client/src/widgets/campaign-journal/ui/CampaignJournal.tsx`.
  **Depends:** G1, G4 (controls already moved out)

- [ ] **G6 · Character-creation gate** — _M_
  Themed full-screen single-step "forge your hero"; ability grid as stat tiles; still gates entry.
  **Delivers:** atmospheric first-join (J1).
  **Verify:** join without sheet → forge; completing drops into the table.
  **Files:** `client/src/features/character-sheet/ui/CharacterCreationForm.tsx`, `SessionPage.tsx`.
  **Depends:** F3, G1

- [ ] **G7 · Session responsive + mobile drawers** — _L_
  Desktop 3-col → tablet 2-col (rail collapses) → phone 1-col (DM log) + bottom toolbar (`Party · Sheet · Journal`) opening Radix drawers. Replace hand-rolled `hudOpen` overlay.
  **Delivers:** first-class mobile table (IA §7, tokens §8 breakpoints).
  **Verify:** at md and <md widths; each drawer opens/traps focus/closes; no horizontal scroll.
  **Files:** `SessionPage.tsx`, `client/src/widgets/session-rail/*`.
  **Depends:** G1–G5

---

## Epic X — Cross-cutting / hardening ⬛

- [ ] **X1 · Update tests coupled to old markup** — _S_ (do alongside each session slice)
  Fix assertions on changed DOM: `CharacterHud.test.tsx`, `DiceRollerPanel.test.tsx`, and any snapshot/role queries.
  **Depends:** the slice each test covers.

- [ ] **X2 · Accessibility pass** — _M_
  Contrast ≥4.5:1 body / ≥3:1 large in both themes; visible focus rings everywhere; dialog/drawer focus traps; `prefers-reduced-motion` honored.
  **Depends:** S/L/G complete.

- [ ] **X3 · Token & dead-style cleanup** — _S_
  Complete the `@theme inline` map; remove leftover inline `dark:` variants and one-off tokens now covered by semantic tokens.
  **Depends:** all screens migrated.

---

## Suggested delivery order (critical path)

```
F1 → F2 → F3 → F4        (foundation)
  → S1 → S2 → S3         (shell + public)
  → L1 → L2              (lobby)
  → G1 → G2 → G3 → G4 → G5 → G6 → G7   (session)
  → X2 → X3              (hardening; X1 rides along)
```

Each arrow is a shippable PR. Foundation is the only hard gate; within Epics S/L the slices can parallelize once F4 lands.
