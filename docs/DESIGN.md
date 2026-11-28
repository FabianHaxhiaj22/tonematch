# Design: "Atelier"

The visual design chosen in M6 (D-034, SPEC §13): a Paris-atelier catalogue look. Ivory paper, ink, champagne gold, fine hairline rules, generous white space. Elegant and calm; the photo and the result are the stars.

The single source for colours is `src/app/globals.css`. This page explains them; if the two disagree, the CSS wins and this page needs updating.

## Colour tokens

Defined as `--tm-*` custom properties (light by default, dark under `prefers-color-scheme: dark`) and exposed to Tailwind with `@theme inline` as `bg-bg`, `text-ink`, `border-line`, `text-accent` and so on.

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#f8f4ee` | `#151210` | Page background |
| `surface` | `#fffdf9` | `#1e1a17` | Cards, upload panel |
| `sunken` | `#efe8dd` | `#110e0c` | Bands (privacy promise, gemstones) |
| `ink` | `#1e1a17` | `#f3ece2` | Text; primary button fill |
| `muted` | `#5f554c` | `#b9ac9c` | Secondary text, control borders |
| `line` | `#dccfbd` | `#3a322b` | Hairlines (decorative) |
| `accent` | `#7e5f26` | `#d4b172` | Eyebrows, emphasis, links, active states |
| `on-ink` | `#f8f4ee` | `#151210` | Text on the ink button |
| `focus` | `#7e5f26` | `#d4b172` | Focus ring (2 px, 3 px offset) |
| `gold-a`, `gold-b` | `#b8924a`, `#ecd9a8` | `#8c6e37`, `#d9bc80` | Metallic hairline gradients (decorative) |

### Contrast (WCAG 2.2 AA)

`tests/unit/design/tokens.test.ts` parses `globals.css` and fails the build if any pair below drops under its minimum. Values computed with `contrastRatio()` from `src/lib/color`:

| Pair | Use | Light | Dark | Needs |
|---|---|---|---|---|
| `ink` on `bg` | Body text | 15.77:1 | 15.91:1 | ≥ 4.5:1 |
| `ink` on `surface` | Text on cards | 17.01:1 | 14.73:1 | ≥ 4.5:1 |
| `ink` on `sunken` | Text on bands | 14.20:1 | 16.40:1 | ≥ 4.5:1 |
| `muted` on `bg` | Secondary text | 6.63:1 | 8.39:1 | ≥ 4.5:1 |
| `muted` on `surface` | Secondary text on cards | 7.15:1 | 7.77:1 | ≥ 4.5:1 |
| `muted` on `sunken` | Secondary text on bands | 5.97:1 | 8.65:1 | ≥ 4.5:1 |
| `accent` on `bg` | Accent text, links | 5.40:1 | 9.18:1 | ≥ 4.5:1 |
| `accent` on `surface` | Accent on cards | 5.82:1 | 8.50:1 | ≥ 4.5:1 |
| `accent` on `sunken` | Accent on bands | 4.86:1 | 9.46:1 | ≥ 4.5:1 |
| `on-ink` on `ink` | Primary button label | 15.77:1 | 15.91:1 | ≥ 4.5:1 |
| `focus` on `bg` | Focus ring | 5.40:1 | 9.18:1 | ≥ 3:1 |
| `focus` on `sunken` | Focus ring on bands | 4.86:1 | 9.46:1 | ≥ 3:1 |

`line`, `gold-a` and `gold-b` are decorative: nothing depends on seeing them (cards are also separated by their surface colour), so they have no contrast requirement. Never use them for text or for the only boundary of a control.

## Typography

- **Display: Cormorant Garamond** (variable, normal + italic) for headings, the result label and large numbers. **24 px and up only**: its hairline strokes get too thin below that. Italic + `accent` marks emphasis ("*that love your skin*").
- **Body: Jost** (variable) for everything else: text, buttons, labels.
- Eyebrows and labels: the `eyebrow` utility (12 px, weight 500, 0.22 em tracking, uppercase), usually in `accent`.
- Both fonts load through `next/font/google` (`src/app/fonts.ts`): downloaded at build time and served from our own domain, so no request reaches Google. The `latin` subset includes Albanian ç and ë.

| Role | Size | Font |
|---|---|---|
| Landing h1 | `clamp(44px, 7vw, 88px)`, line height 1 | Display |
| Section h2 | `clamp(32px, 4vw, 48px)` | Display |
| Card / step h3 | 26 px, weight 500 | Display |
| Lede | 18 px | Body, `muted` |
| Body | 15–16 px | Body |
| Small print, hints | 13 px | Body, `muted` |

## Layout

- Content width 1200 px (`CONTAINER` in `src/components/layout/container.ts`), side gutters **16 px on phones**, 48 px from 768 px. Single-task pages (photo step, quiz) use `CONTAINER_NARROW` (768 px).
- No horizontal scrolling at 360 px (e2e-tested).
- Sections are separated by `line` hairlines or a full-width `sunken` band; the `gold-rule` utility is for the few places that deserve a metallic divider.

## Components

- **Primary button:** `ink` fill, `on-ink` label, square corners, 14 px uppercase with 0.14 em tracking, at least 48 px tall.
- **Outline button:** same shape as the primary, `ink` 1 px border and `ink` label on the page background. For the second of two real choices ("Analyse anyway" next to "Choose another photo").
- **Secondary action:** an underlined `accent` text link-button, at least 44 px tall.
- Class strings for all three live in `src/components/ui/buttons.ts` (`BUTTON_PRIMARY`, `BUTTON_OUTLINE`, `BUTTON_TEXT`), so they work on `<button>`, `<Link>` and `<label>`.
- **Quality report** (`/analyze`): each warning is a `surface` row with a `line` border, a small `accent` diamond icon, the title in body weight 500 and the tip in `muted`. Blocking reasons and failures sit under an `accent` left rule, like upload errors. Privacy notes ("removed from this page") use the lock icon in `muted` small print.
- **Analysis status:** a 1 px `line` track with an `accent` sweep (decorative, `aria-hidden`), the stage in the display font at 28 px with an ellipsis, notes in `muted` below; the slow-connection note gets the `accent` left rule. All text is in one `role="status"` region.
- **Upload panel:** `surface` with a `line` border and an inner dashed hairline; turns `accent` while a file is dragged over it. Errors appear under it with an `accent` left rule and are announced (`role="alert"`).
- **Gold card** (`gold-card` utility): `surface` on the padding box, a fine `gold-a → gold-b` gradient on the 1 px border, 16 px radius. Used for the style categories on the results page (one card per category: rings, earrings, necklaces, bracelets).
- **Language switch:** a pill with EN / SQ; the active language is `ink`-filled. Each button's accessible name is "EN English" / "SQ Shqip" (visible code + full name, WCAG 2.5.3).
- **Focus:** one global style, `2px solid var(--tm-focus)`, offset 3 px.

## Motion

Fades and gentle rise-ins only (D-038): content fades in while rising 8 px, over 0.45 s with an ease-out curve (`cubic-bezier(0.22, 1, 0.36, 1)`); items shown together (the warnings) stagger by 70 ms. Tokens in `src/components/motion/config.ts`.

- Built on Motion with `LazyMotion` (features load as a separate chunk) inside `<MotionRoot>`; use `<Reveal>` rather than raw `m` components.
- **Reduced motion:** with `prefers-reduced-motion: reduce` nothing animates, not even the fade. CSS animations use `motion-safe:`, and the global rule in `globals.css` shortens any that slip through.
- **First paint is never invisible:** server-rendered content shows at once; only views that appear later animate (`appear={false}` on the first view).
- No parallax, scaling, bouncing or looping motion except the progress sweep while analysing.

## Imagery

- No faces or people anywhere in the UI except the user's own photo preview. The landing artwork is abstract: three interlocking metal rings on a skin-tone arch (`HeroArt.tsx`), hidden from assistive tech.
- Metal gradients for illustrations live in `src/components/brand/metals.ts`. Recommendation swatches come from `src/data/metals.json`, never from the illustration colours.
- Logo: two interlocking rings, skin (ink) meets metal (gold). `Logo.tsx` in the header, `src/app/icon.svg` as the favicon (adapts to dark browser UI), `src/app/apple-icon.png` (180 px, from `scripts/render-apple-icon.ts`).

## Theme

Light by default, dark when the system prefers it. The header's theme button (sun / moon / monitor icon for the current choice) opens a gold-card panel with Light, Dark and System; an explicit choice wins over the system and is remembered (D-037). Never hard-code colours in components: use the tokens, so both themes and the forced variants work.

## Motion

Almost none: colour transitions and the tips chevron. Everything is cut to ~0 ms under `prefers-reduced-motion: reduce`, and smooth scrolling is only on when motion is allowed.

## History

Three directions were mocked up for M6 (landing + results, mobile + desktop, light + dark) and reviewed outside the repo: **Atelier** (chosen), **Écrin** (dark velvet, Bodoni Moda + Manrope) and **Terra** (sand and clay, Fraunces + Instrument Sans). See D-034 for why.
