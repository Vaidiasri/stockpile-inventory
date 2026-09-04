# Product

## Register

product

## Users

Stock controllers and warehouse supervisors at a small-to-mid distributor. The
scene that drives every decision here: a stock controller at 7am in a Surat
warehouse office — corrugated roof, one high window, a fluorescent tube, a
clipboard in one hand and a laptop on a steel desk. They are reconciling a
delivery against a purchase order before the day's dispatch starts.

The job to be done is never "browse the inventory". It is one of four things:
*is this item in stock and how many*, *record what just moved*, *what needs
reordering today*, and *who changed this number and why*. Every screen is
judged on how fast it answers one of those.

Two consequences:

- **Light is the default theme.** They work beside paper under daylight and
  fluorescent light. Dark mode exists for the night shift, as a choice, not as
  the default.
- **They are interrupted constantly.** State lives in the URL so a half-filtered
  view survives a reload, a shared link, and the back button.

## Product Purpose

Replace the spreadsheet that a distributor tracks stock in, with something that
cannot silently drift: stock status is derived, never typed; stock cannot go
negative; and every movement is attributable to a person and a reason.

Success is a controller trusting the number on screen enough to not go and
count the shelf.

## Brand Personality

Precise, industrial, warehouse-native. Three words: **exact, weathered,
unhurried.**

Not a generic admin panel that happens to hold products — a tool that reads as
built by people who have stood in a warehouse. Voice is plain and specific:
"Only 25 in stock, so you cannot remove 99", never "Invalid quantity". Numbers
are the loudest thing on any screen; chrome is quiet so they can be.

The identity anchor is **patina teal** — verdigris on oxidised bronze. Aged
metal, not hi-vis. It carries "industrial" without shouting it.

## Anti-references

- **Generic shadcn / Vercel demo.** The untouched zero-chroma black-and-white
  default, which is exactly what this project shipped with. It signals
  scaffolded, not designed.
- **Purple-gradient AI SaaS.** Violet gradients, glassmorphic cards, glowing
  hero metrics.
- **Hi-vis safety orange and terminal green.** The second-order reflex for
  "industrial" and "warehouse". Avoided deliberately: both are the obvious
  answer once corporate blue has been rejected, and safety amber would collide
  with what amber already means here (low stock).
- **Enterprise ERP density for its own sake.** Dense is good; illegible is not.

## Design Principles

1. **The number is the interface.** Quantities, prices and counts get the
   typographic weight. Labels, chrome and decoration recede. Tabular figures
   everywhere a number can change.

2. **Three hues are already spoken for.** In stock, low stock and out of stock
   own green, amber and red. No fourth decorative hue may resemble them, and
   status is never signalled by colour alone — the words always ship with it.

3. **Truth comes from the database, and the UI says so.** Derived values look
   derived (read-only, explained). When the database refuses something, the
   interface repeats the real reason rather than inventing a friendlier one.

4. **State belongs in the URL.** Filters, sorts and pages are links. Shareable,
   reloadable, back-button-correct. No client store for something the address
   bar already holds.

5. **Earned familiarity over invention.** Native `<select>` over a JS combobox,
   standard table over a virtualised grid, real links over click handlers. The
   tool should disappear into the task.

## Accessibility & Inclusion

WCAG 2.2 AA, verified numerically rather than eyeballed:

- Body text ≥ 4.5:1; large text and UI components ≥ 3:1. Every token pair is
  checked in both themes.
- Colour is never the only carrier of meaning — stock states pair hue with text.
- Visible focus on every interactive element; keyboard reachable in DOM order.
- `prefers-reduced-motion: reduce` has a real alternative for every transition,
  not just a disabled animation.
- Touch targets ≥ 44px on touch pointers, where a warehouse user is on a phone
  beside the racking.
