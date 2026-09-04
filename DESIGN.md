# Design

Visual system for Stockpile. Strategy and audience live in [PRODUCT.md](PRODUCT.md).

## Theme

**Light by default, dark supported.** Driven by the scene in PRODUCT.md: work
happens beside paper under daylight and fluorescent light, so the default
surface is paper-bright. Dark mode is a real, maintained theme for the night
shift, selected via `next-themes` (`light` / `dark` / `system`).

**Colour strategy: Restrained.** Tinted neutrals carry the surface; one brand
hue carries under 10% of it (primary actions, active nav, focus, data bars).
Three semantic hues are reserved for stock state and are never used
decoratively.

## Colour

OKLCH throughout. Every pair below is verified with a contrast script, not
estimated; the numbers in brackets are measured ratios.

### Neutrals and brand

| Role | Light | Dark | Notes |
| --- | --- | --- | --- |
| `--background` | `oklch(1 0 0)` | `oklch(0.16 0.008 215)` | Light is **pure** white. Character comes from primary and type, never from a tinted surface — warmth or coolness in both brand *and* background is the cliché. |
| `--card` / surface | `oklch(0.978 0.004 195)` | `oklch(0.205 0.01 215)` | Panels, cards, dialogs. |
| `--sidebar` | `oklch(0.967 0.006 195)` | `oklch(0.185 0.01 215)` | The second neutral layer, one step cooler and deeper than content. |
| `--foreground` (ink) | `oklch(0.21 0.015 210)` | `oklch(0.965 0.004 210)` | Carries the brand hue at low chroma. [17.7:1 / 17.5:1] |
| `--muted-foreground` | `oklch(0.505 0.014 210)` | `oklch(0.735 0.014 210)` | Deliberately darker than the shadcn default, which failed at 4.34:1 on a muted surface. [5.8:1 on bg, 5.3:1 on sidebar] |
| `--primary` | `oklch(0.52 0.105 190)` | `oklch(0.72 0.12 190)` | **Patina teal** — verdigris on oxidised bronze. [5.1:1 as text on bg] |
| `--primary-foreground` | `oklch(1 0 0)` | `oklch(0.16 0.02 200)` | White on the saturated fill, per Helmholtz-Kohlrausch. [5.1:1] |
| `--border` | `oklch(0.906 0.008 200)` | `oklch(0.32 0.012 210)` | |
| `--ring` | `oklch(0.62 0.09 190)` | `oklch(0.66 0.1 190)` | Focus. [3.5:1 vs bg, clears the 3:1 UI bar] |

Neutrals are tinted 0.004–0.015 chroma toward the brand hue (195–215°) — cool,
because the brand is cool. Not default-tinted warm.

### Semantic stock state

Hue is the *second* signal; the label is the first. Each state has a text
colour and a tint background, both AA in both themes.

| State | Hue | Light text / tint | Dark text / tint |
| --- | --- | --- | --- |
| In stock | 152 | `oklch(0.46 0.11 152)` / `oklch(0.95 0.03 152)` [5.9:1] | `oklch(0.8 0.13 152)` / `oklch(0.28 0.045 152)` [8.1:1] |
| Low stock | 72–82 | `oklch(0.47 0.105 72)` / `oklch(0.955 0.045 82)` [6.1:1] | `oklch(0.83 0.13 82)` / `oklch(0.3 0.05 82)` [8.0:1] |
| Out of stock | 25 | `oklch(0.505 0.17 25)` / `oklch(0.955 0.03 25)` [5.5:1] | `oklch(0.75 0.15 25)` / `oklch(0.3 0.06 25)` [5.9:1] |

Brand teal (190°) sits 38° from in-stock green, 118° from low-stock amber and
165° from out-of-stock red. Teal never appears as a pill, so shape and position
disambiguate it from a status chip even at similar lightness.

**No second accent hue.** Restrained means one brand colour, and three hues
already carry mandatory meaning here. A fourth would compete with the
semantics rather than add identity.

## Typography

One family — **Geist Sans**, already in the project. Product UI does not need a
display pairing; a well-tuned sans carries headings, labels, data and body.
**Geist Mono** for SKUs and identifiers only, where character disambiguation
matters.

Fixed rem scale, not fluid: users view at consistent DPI, and a clamp-sized
heading that shrinks inside a panel looks worse, not better. Ratio ~1.2.

| Token | Size / line-height | Use |
| --- | --- | --- |
| `text-2xl` | 1.5rem / 1.2, weight 600, `-0.02em` | Page title (one per screen) |
| `text-base` | 1rem / 1.5, weight 600 | Card and section titles |
| `text-sm` | 0.875rem / 1.43 | Body, table cells, labels |
| `text-xs` | 0.75rem / 1.33 | Meta, timestamps, hints |
| `--text-metric` | 1.75rem / 1.1, weight 600, `tabular-nums` | Dashboard figures |

`tabular-nums` on every number that can change — quantities, prices, counts,
balances — so digits do not reflow between renders. `text-wrap: balance` on
page titles.

## Spacing & layout

4px base. Tailwind's scale, restricted to `1 · 1.5 · 2 · 3 · 4 · 6 · 8 · 12`;
no arbitrary values. Page padding `p-4` mobile → `p-6` from `sm`. Section gap
`gap-6`, intra-card gap `gap-4`, label-to-control `gap-1.5`.

Responsive behaviour is **structural**, not fluid: the sidebar collapses to a
drawer below `lg`, table columns drop by breakpoint priority (SKU at `md`,
category at `lg`, updated at `xl`), and wide tables scroll inside their own
`overflow-x-auto` container so the page body never scrolls sideways.

Radius `--radius: 0.625rem` (unchanged). Elevation is carried by border plus
surface shift, not shadow; one `shadow-xs` step on raised controls only.

## Motion

150–250ms, `ease-out` with exponential curves. Motion conveys state change,
feedback or arrival — never decoration, and never an orchestrated page-load
sequence, because users load into a task.

| Token | Value |
| --- | --- |
| `--ease-out-quart` | `cubic-bezier(0.25, 1, 0.5, 1)` |
| `--dur-fast` | `120ms` (hover, focus) |
| `--dur-base` | `180ms` (dialogs, disclosure) |
| `--dur-slow` | `240ms` (list arrival) |

Every transition has a `prefers-reduced-motion: reduce` alternative that is a
crossfade or an instant state change, not a broken one. Reveals enhance an
already-visible default — content is never gated behind a class-triggered
transition, which would ship blank in a headless render.

## Components

shadcn/ui (Base UI primitives), owned in-repo under `src/components/ui`. Extend
those; do not introduce a parallel vocabulary.

- Every interactive element ships default, hover, focus-visible, active,
  disabled and, where async, loading.
- Loading is a **skeleton** matching the real layout (`loading.tsx` per route),
  never a centred spinner.
- Empty states teach the interface and offer the next action; they never say
  just "No data".
- Dropdowns are native `<select>` (`NativeSelect`) — keyboard accessible for
  free, OS picker on mobile, zero client JS.
- Errors are repeated from the server verbatim where the server knows best, and
  attached to the field that caused them.

## Bans for this project

- No gradient text, no glassmorphism, no side-stripe borders, no hero-metric
  template.
- No colour-only status.
- No hardcoded colour values in components — tokens only, so both themes stay
  correct.
- No amber or safety-orange as a brand accent; amber means low stock here.
