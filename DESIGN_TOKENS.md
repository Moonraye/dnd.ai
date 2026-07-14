# DunDrAI — Design Tokens

_Foundational design-system variables: color, typography, spacing, radius, elevation, motion — with paired **light + dark** values. Single source of truth for `client/src/app/globals.css` (`@theme`) and `shared/ui`. Pairs with `DESIGN_BRIEF.md`._

---

## 0. Principles

1. **Two token layers.** _Primitives_ (raw palette scales — constant) → _Semantic/role tokens_ (`bg`, `surface`, `fg`, `primary`… — theme-switchable). Components consume **only semantic tokens**, never raw scales.
2. **Dark-first, both themes.** `:root` holds light defaults; `[data-theme="dark"]` overrides. The theme provider sets `data-theme` on `<html>` (default dark; first visit respects `prefers-color-scheme`).
3. **Reserved semantics are load-bearing.** green/amber/red = **HP & status**; indigo = **dice**. Never reuse these for brand/UI accent.
4. **Accent = violet (primary) + ember/orange (secondary).** Ember is orange-leaning specifically to stay distinct from status-amber.

### 0.1 Palette identity — "Candle & Grimoire" _(refined in F1 under the frontend-design skill)_

The original draft used near-black `#0a0a0f` + Tailwind's stock violet/zinc — which is the generic "dark + one bright accent" AI-default look. Grounded in the subject (a spellbook opened at a candlelit table), the **shipped** palette is deliberately more specific:

- **Ink, not black.** Dark ground is violet-tinted ink `#0d0b16`, so the dark theme reads *arcane* rather than generic-dark.
- **Dusty lavender text.** Muted text is `#a89fc4` (a desaturated lavender), not neutral grey.
- **Luminous primary.** Dark-mode violet is a brighter, glowing `#9d7bff` carried on **dark ink** text (`#150c2e`) for a premium, higher-contrast button.
- **Ember counterpoint.** Warm torchlight `#f6851f` as the second accent — two intentional accents, not one-on-black.

The values below and in §10 reflect this shipped identity. Authoritative implementation: `client/src/app/globals.css`.

---

## 1. Primitive palette (raw scales — theme-independent)

### Violet — primary accent
| step | hex |
|---|---|
| 50 | `#f5f3ff` |
| 100 | `#ede9fe` |
| 200 | `#ddd6fe` |
| 300 | `#c4b5fd` |
| 400 | `#a78bfa` |
| 500 | `#8b5cf6` |
| 600 | `#7c3aed` |
| 700 | `#6d28d9` |
| 800 | `#5b21b6` |
| 900 | `#4c1d95` |
| 950 | `#2e1065` |

### Ember — secondary accent (orange, distinct from status-amber)
| step | hex |
|---|---|
| 50 | `#fff7ed` |
| 100 | `#ffedd5` |
| 200 | `#fed7aa` |
| 300 | `#fdba74` |
| 400 | `#fb923c` |
| 500 | `#f97316` |
| 600 | `#ea580c` |
| 700 | `#c2410c` |
| 800 | `#9a3412` |
| 900 | `#7c2d12` |
| 950 | `#431407` |

### Zinc — neutrals
| step | hex |
|---|---|
| 50 | `#fafafa` |
| 100 | `#f4f4f5` |
| 200 | `#e4e4e7` |
| 300 | `#d4d4d8` |
| 400 | `#a1a1aa` |
| 500 | `#71717a` |
| 600 | `#52525b` |
| 700 | `#3f3f46` |
| 800 | `#27272a` |
| 900 | `#18181b` |
| 950 | `#09090b` |

### Reserved semantic hues (do not use for UI accent)
| role | light | dark |
|---|---|---|
| HP full / success — green | `#16a34a` | `#22c55e` |
| HP mid / warning — amber | `#d97706` | `#f59e0b` |
| HP low / danger — red | `#dc2626` | `#ef4444` |
| Dice — indigo | `#6366f1` | `#818cf8` |

---

## 2. Semantic (role) tokens — light + dark

These are what components reference (`bg-[--color-surface]`, etc.).

_Shipped "Candle & Grimoire" values (match `client/src/app/globals.css`)._

| Token | Role | Light | Dark |
|---|---|---|---|
| `--color-bg` | Page background (ink) | `#f6f4fb` | `#0d0b16` |
| `--color-bg-subtle` | Recessed areas | `#eeebf6` | `#141026` |
| `--color-surface` | Card / panel | `#ffffff` | `#181329` |
| `--color-surface-raised` | Elevated (dialog, popover) | `#ffffff` | `#211a37` |
| `--color-overlay` | Backdrop scrim | `rgb(28 24 48 /.45)` | `rgb(6 4 14 /.72)` |
| `--color-border` | Hairline dividers | `#e4e0f0` | `#2c2544` |
| `--color-border-strong` | Emphasis borders | `#cfc8e4` | `#3f3660` |
| `--color-fg` | Primary text | `#1c1830` | `#f2eefb` |
| `--color-fg-muted` | Secondary text (lavender) | `#575074` | `#a89fc4` |
| `--color-fg-subtle` | Tertiary / placeholder | `#847ba0` | `#6f668c` |
| `--color-primary` | Brand accent (arcane violet) | `#6d3aed` | `#9d7bff` |
| `--color-primary-hover` | | `#5b28d6` | `#b6a0ff` |
| `--color-primary-active` | | `#4c1fb8` | `#8663f0` |
| `--color-primary-fg` | Text/icon on primary | `#ffffff` | `#150c2e` |
| `--color-primary-subtle` | Tinted primary surface | `#ece5fd` | `#241a44` |
| `--color-accent` | Secondary accent (ember) | `#d9660a` | `#f6851f` |
| `--color-accent-hover` | | `#bd530a` | `#ff9c3d` |
| `--color-accent-fg` | Text/icon on accent | `#ffffff` | `#1c0f04` |
| `--color-ring` | Focus ring | `#6d3aed` | `#b6a0ff` |
| `--color-success` | HP full / positive | `#128a53` | `#3fca7d` |
| `--color-warning` | HP mid / caution | `#c47f16` | `#f5b53f` |
| `--color-danger` | HP low / error | `#d63d47` | `#f2555a` |
| `--color-danger-fg` | Text on danger | `#ffffff` | `#1a0406` |
| `--color-dice` | Dice accent (moonstone) | `#5566e6` | `#8aa2ff` |
| `--color-dice-subtle` | Dice card surface | `#ecebfd` | `#1c1b42` |

**HP bar mapping:** ratio > 50% → `--color-success`; 20–50% → `--color-warning`; < 20% → `--color-danger`. Track = `--color-border`.

**Message archetype mapping (session log):**
- DM scene prose → `--color-fg` on `--color-bg`, display font, left accent bar `--color-primary`.
- Player bubble → `--color-surface` + `--color-border`.
- OOC bubble → `--color-bg-subtle` + `--color-fg-muted`.
- Dice card → `--color-dice-subtle` + `--color-dice` border.

---

## 3. Typography

### Families
| Token | Stack | Use |
|---|---|---|
| `--font-sans` | `var(--font-geist-sans), system-ui, sans-serif` | Body / UI |
| `--font-display` | `var(--font-display), Georgia, serif` | Headings, logo, session titles, DM scene prose |
| `--font-mono` | `var(--font-geist-mono), ui-monospace, monospace` | Dice, ability scores, HP counts |

### Type scale (`font-size` / `line-height`)
| Token | Size | Line height | Typical use |
|---|---|---|---|
| `text-xs` | `0.75rem` (12) | `1rem` | Labels, pills, captions |
| `text-sm` | `0.875rem` (14) | `1.25rem` | Secondary UI, chat meta |
| `text-base` | `1rem` (16) | `1.5rem` | Body, chat, DM prose |
| `text-lg` | `1.125rem` (18) | `1.6` | Lead paragraph, panel titles |
| `text-xl` | `1.25rem` (20) | `1.4` | Section headings |
| `text-2xl` | `1.5rem` (24) | `1.3` | Card titles |
| `text-3xl` | `1.875rem` (30) | `1.2` | Page headings |
| `text-4xl` | `2.25rem` (36) | `1.15` | Display / forge title |
| `text-5xl` | `3rem` (48) | `1.1` | Hero (landing) |
| `text-6xl` | `3.75rem` (60) | `1.05` | Hero XL |

### Weights & tracking
| Token | Value |
|---|---|
| `--font-weight-normal` | `400` |
| `--font-weight-medium` | `500` |
| `--font-weight-semibold` | `600` |
| `--font-weight-bold` | `700` |
| `--tracking-tight` | `-0.02em` (display headings) |
| `--tracking-normal` | `0` |
| `--tracking-wide` | `0.02em` |
| `--tracking-caps` | `0.08em` (eyebrow / small-caps labels) |

Display headings: `--font-display`, `600`, `--tracking-tight`. Eyebrow labels: `text-xs`, uppercase, `--tracking-caps`, `--color-fg-muted`.

---

## 4. Spacing

Base unit **`0.25rem` (4px)**. Linear 4-based scale.

| Token | rem | px |
|---|---|---|
| `space-0` | 0 | 0 |
| `space-1` | 0.25 | 4 |
| `space-2` | 0.5 | 8 |
| `space-3` | 0.75 | 12 |
| `space-4` | 1 | 16 |
| `space-5` | 1.25 | 20 |
| `space-6` | 1.5 | 24 |
| `space-8` | 2 | 32 |
| `space-10` | 2.5 | 40 |
| `space-12` | 3 | 48 |
| `space-16` | 4 | 64 |
| `space-20` | 5 | 80 |
| `space-24` | 6 | 96 |

**Conventions:** panel padding `space-4`; card padding `space-6`; inter-panel gap `space-6`; inline control gap `space-2`; section rhythm `space-8`. Left rail / right column fixed width `20rem` (320px); session content gap `space-6`.

---

## 5. Border radius

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | `0.25rem` (4) | Inputs, small chips |
| `--radius-md` | `0.5rem` (8) | Default panels, buttons |
| `--radius-lg` | `0.75rem` (12) | Cards, dialogs |
| `--radius-xl` | `1rem` (16) | Hero surfaces, drawers |
| `--radius-2xl` | `1.5rem` (24) | Feature/marketing blocks |
| `--radius-full` | `9999px` | Pills, HP bar, avatars |

---

## 6. Borders & elevation

### Border widths
| Token | Value |
|---|---|
| `--border-width` | `1px` (hairline default) |
| `--border-width-strong` | `2px` (focus, active tab underline) |

### Shadows (dark-tuned; both themes)
| Token | Light | Dark |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(24,24,27,.06)` | `0 1px 2px rgba(0,0,0,.5)` |
| `--shadow-md` | `0 4px 12px rgba(24,24,27,.08)` | `0 6px 18px rgba(0,0,0,.55)` |
| `--shadow-lg` | `0 12px 32px rgba(24,24,27,.12)` | `0 16px 40px rgba(0,0,0,.65)` |
| `--glow-primary` | `0 0 0 1px var(--color-primary), 0 0 16px rgba(124,58,237,.25)` | `0 0 0 1px var(--color-primary), 0 0 22px rgba(139,92,246,.35)` |

`--glow-primary` is the signature "arcane" treatment — use sparingly for focus rings on key CTAs, active turn, and hover on primary surfaces.

### Focus ring (a11y — every interactive element)
`outline: var(--border-width-strong) solid var(--color-ring); outline-offset: 2px;` — never remove without an equivalent visible replacement.

---

## 7. Z-index layers

| Token | Value | Use |
|---|---|---|
| `--z-base` | `0` | Normal flow |
| `--z-dropdown` | `1000` | Menus, popovers, dice tray |
| `--z-sticky` | `1100` | Sticky headers, input bar |
| `--z-header` | `1200` | App top bar / session header |
| `--z-overlay` | `1300` | Backdrop scrim |
| `--z-modal` | `1400` | Dialog, mobile drawer/bottom-sheet |
| `--z-toast` | `1500` | Notifications |
| `--z-tooltip` | `1600` | Tooltips (always on top) |

---

## 8. Breakpoints

Tailwind default scale; session-screen column behavior noted.

| Token | Min width | Session layout |
|---|---|---|
| `sm` | `640px` | 1-col |
| `md` | `768px` | → **2-col** (rail collapses to drawer) |
| `lg` | `1024px` | 2-col |
| `xl` | `1280px` | → **3-col** full-bleed VTT |
| `2xl` | `1536px` | 3-col |

Below `md`: **1-col** (DM log + bottom toolbar drawers). No horizontal body scroll at any width; wide content scrolls inside its own `overflow-x` container.

---

## 9. Motion

| Token | Value | Use |
|---|---|---|
| `--duration-fast` | `120ms` | Hovers, small toggles |
| `--duration-base` | `200ms` | Most transitions, tabs |
| `--duration-slow` | `320ms` | Drawers, dialogs, page-level |
| `--ease-out` | `cubic-bezier(0.2, 0, 0, 1)` | Enter |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Move/resize |

Respect `prefers-reduced-motion: reduce` — drop transforms/opacity transitions to near-instant.

---

## 10. Implementation — Tailwind v4 (`globals.css`)

Drop-in skeleton. The **switchable layer** uses short names (`--bg`, `--fg`…) that flip on `[data-theme]`; `@theme inline` then maps each Tailwind token (`--color-bg`…) to that live var. Using distinct names is required — mapping `--color-bg: var(--color-bg)` would be circular and must be avoided.

> **Status:** This block shows the **F2 target** (explicit `[data-theme]` switching, for the provider + toggle). **F1 already shipped** the token layer in `client/src/app/globals.css` using `@media (prefers-color-scheme: dark)` as the interim switch, with the **Candle & Grimoire** values from §2 (not the placeholder hexes below). F2 swaps the media query for `[data-theme]` and keeps the same values. Treat `globals.css` + §2 as authoritative for values.

```css
@import "tailwindcss";

/* dark applies when <html data-theme="dark"> */
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

/* ---- switchable layer: light defaults (short names) ---- */
:root {
  --bg: #faf9fb;
  --bg-subtle: #f2f1f5;
  --surface: #ffffff;
  --surface-raised: #ffffff;
  --overlay: rgba(24, 24, 27, 0.45);
  --border: #e6e4ec;
  --border-strong: #d3d0dc;
  --fg: #1a1922;
  --fg-muted: #57545f;
  --fg-subtle: #85818f;
  --primary: #7c3aed;
  --primary-hover: #6d28d9;
  --primary-active: #5b21b6;
  --primary-fg: #ffffff;
  --primary-subtle: #ede9fe;
  --accent: #ea580c;
  --accent-hover: #c2410c;
  --accent-fg: #ffffff;
  --ring: #7c3aed;
  --success: #16a34a;
  --warning: #d97706;
  --danger: #dc2626;
  --danger-fg: #ffffff;
  --dice: #6366f1;
  --dice-subtle: #eef2ff;
  --shadow-md: 0 4px 12px rgba(24, 24, 27, 0.08);
}

/* ---- switchable layer: dark overrides ---- */
[data-theme="dark"] {
  --bg: #0a0a0f;
  --bg-subtle: #111017;
  --surface: #16151d;
  --surface-raised: #1e1c26;
  --overlay: rgba(6, 6, 10, 0.72);
  --border: #2a2833;
  --border-strong: #3a3745;
  --fg: #f4f3f7;
  --fg-muted: #a6a3b2;
  --fg-subtle: #6f6c7e;
  --primary: #8b5cf6;
  --primary-hover: #a78bfa;
  --primary-active: #7c3aed;
  --primary-fg: #ffffff;
  --primary-subtle: #2e1065;
  --accent: #f97316;
  --accent-hover: #fb923c;
  --accent-fg: #1a0f07;
  --ring: #a78bfa;
  --success: #22c55e;
  --warning: #f59e0b;
  --danger: #ef4444;
  --danger-fg: #ffffff;
  --dice: #818cf8;
  --dice-subtle: #1e1b4b;
  --shadow-md: 0 6px 18px rgba(0, 0, 0, 0.55);
}

/* ---- map Tailwind tokens → live switchable vars ---- */
@theme inline {
  --color-bg: var(--bg);
  --color-bg-subtle: var(--bg-subtle);
  --color-surface: var(--surface);
  --color-surface-raised: var(--surface-raised);
  --color-overlay: var(--overlay);
  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-fg: var(--fg);
  --color-fg-muted: var(--fg-muted);
  --color-fg-subtle: var(--fg-subtle);
  --color-primary: var(--primary);
  --color-primary-hover: var(--primary-hover);
  --color-primary-active: var(--primary-active);
  --color-primary-fg: var(--primary-fg);
  --color-primary-subtle: var(--primary-subtle);
  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-accent-fg: var(--accent-fg);
  --color-ring: var(--ring);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-danger: var(--danger);
  --color-danger-fg: var(--danger-fg);
  --color-dice: var(--dice);
  --color-dice-subtle: var(--dice-subtle);

  --font-sans: var(--font-geist-sans), system-ui, sans-serif;
  --font-display: var(--font-display), Georgia, serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;

  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-2xl: 1.5rem;
}

/* base */
body {
  background: var(--color-bg);
  color: var(--color-fg);
  font-family: var(--font-sans);
}
```

With this, `bg-surface`, `text-fg-muted`, `border-border`, `text-primary`, `ring-ring`, etc. become real Tailwind utilities that re-theme instantly when `data-theme` flips.

**Provider contract:** the theme provider (see `DESIGN_BRIEF.md` §Stage 1) sets `document.documentElement.dataset.theme = "dark" | "light"`, persists to `localStorage`, and initializes from `prefers-color-scheme` on first visit (default dark). `--font-display` is registered in `layout.tsx` via `next/font/google` alongside Geist.

---

## 11. Usage rules

- Components reference **semantic tokens only** (`--color-*`, `--radius-*`, `--font-*`). No raw hex, no raw scale steps in component code.
- Any new color must enter here first as a primitive **and** a semantic role before use.
- Contrast: body text ≥ 4.5:1, large text/UI ≥ 3:1 in **both** themes — verify when adding/altering `--color-fg*` or accents.
- Keep the reserved hues (green/amber/red = HP/status, indigo = dice) out of general UI.
