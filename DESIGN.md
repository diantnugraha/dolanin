---
name: Dolanin
description: Katalog terkurasi hotel dan villa murah per kota; papan tujuan yang hangat dan flat.
colors:
  jingga: "#F26B3A"
  biru-laut: "#0E8C8C"
  biru-laut-tua: "#0A6B6B"
  kuning-senja: "#FFC24B"
  malam: "#1F2A37"
  pasir: "#FFF6EC"
  putih: "#FFFFFF"
  tint-jingga: "#FFEFE8"
  tint-laut: "#E3F4F4"
  laut-ink: "#073F3F"
  senja-ink: "#5A3D00"
  whatsapp: "#25D366"
  whatsapp-ink: "#063D1C"
  abu: "#6B7280"
  abu-pasir: "#575E6B"
  garis: "#EFE3D5"
  input-stroke: "#DDD5CB"
  error: "#B42318"
  error-ink: "#8A2F0B"
  admin-canvas: "#FAF8F5"
  series-pesan: "#F26B3A"
  series-wa: "#00918F"
  series-other: "#C9C2B8"
  chart-grid: "#EEEAE4"
  chart-text: "#52514E"
  delta-good-bg: "#E5F3EA"
  delta-good-ink: "#17663A"
typography:
  display:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  display-desktop:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "56px"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    letterSpacing: "-0.02em"
  headline-desktop:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 700
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  section:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    letterSpacing: "-0.01em"
  card-title:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  body-small:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1
  caption:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.5
  price:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
    fontFeature: "\"tnum\""
  price-large:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
    fontFeature: "\"tnum\""
  kpi:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
    fontFeature: "\"tnum\""
rounded:
  highlight: "8px"
  inner: "12px"
  card: "16px"
  panel: "20px"
  sheet: "24px"
  pill: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
  "14": "56px"
  "16": "64px"
components:
  button-primary:
    backgroundColor: "{colors.jingga}"
    textColor: "{colors.malam}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "11px 18px"
  button-primary-dock:
    backgroundColor: "{colors.jingga}"
    textColor: "{colors.malam}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
    height: "46px"
  button-whatsapp:
    backgroundColor: "{colors.whatsapp}"
    textColor: "{colors.whatsapp-ink}"
    rounded: "{rounded.pill}"
    padding: "12px 18px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.biru-laut-tua}"
    rounded: "{rounded.pill}"
    padding: "11px 24px"
  button-dark:
    backgroundColor: "{colors.malam}"
    textColor: "{colors.putih}"
    rounded: "{rounded.pill}"
    padding: "12px 18px"
  button-ghost:
    backgroundColor: "{colors.putih}"
    textColor: "{colors.malam}"
    rounded: "{rounded.pill}"
    padding: "12px 18px"
  icon-button:
    backgroundColor: "{colors.putih}"
    textColor: "{colors.malam}"
    rounded: "{rounded.pill}"
    size: "40px"
  chip:
    backgroundColor: "{colors.putih}"
    textColor: "{colors.malam}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "8px 12px"
  chip-selected:
    backgroundColor: "{colors.tint-laut}"
    textColor: "{colors.laut-ink}"
    rounded: "{rounded.pill}"
    padding: "8px 12px"
  chip-sort:
    backgroundColor: "{colors.malam}"
    textColor: "{colors.pasir}"
    rounded: "{rounded.pill}"
    padding: "8px 12px"
  type-segment:
    backgroundColor: "{colors.putih}"
    textColor: "{colors.abu-pasir}"
    rounded: "{rounded.pill}"
    padding: "4px"
  type-segment-active:
    backgroundColor: "{colors.malam}"
    textColor: "{colors.pasir}"
    rounded: "{rounded.pill}"
    padding: "8px 4px"
  promo-stamp:
    backgroundColor: "{colors.kuning-senja}"
    textColor: "{colors.senja-ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  type-tag:
    backgroundColor: "{colors.tint-laut}"
    textColor: "{colors.laut-ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "2px 9px"
  card-listing:
    backgroundColor: "{colors.putih}"
    textColor: "{colors.malam}"
    rounded: "{rounded.card}"
    padding: "12px 14px 14px"
  city-tile:
    backgroundColor: "{colors.tint-laut}"
    rounded: "{rounded.card}"
  city-plate:
    backgroundColor: "{colors.pasir}"
    textColor: "{colors.malam}"
    rounded: "{rounded.inner}"
    padding: "8px 10px"
  wa-block:
    backgroundColor: "{colors.malam}"
    textColor: "{colors.pasir}"
    rounded: "{rounded.card}"
    padding: "20px"
  booking-card:
    backgroundColor: "{colors.putih}"
    rounded: "{rounded.panel}"
    padding: "24px"
  action-dock:
    backgroundColor: "{colors.putih}"
    padding: "12px 16px 16px"
  input-search:
    backgroundColor: "{colors.putih}"
    textColor: "{colors.malam}"
    rounded: "{rounded.pill}"
    padding: "10px 16px"
  input-field:
    backgroundColor: "{colors.putih}"
    textColor: "{colors.malam}"
    rounded: "{rounded.inner}"
    padding: "11px 12px"
  kpi-tile:
    backgroundColor: "{colors.putih}"
    textColor: "{colors.malam}"
    typography: "{typography.kpi}"
    rounded: "{rounded.card}"
    padding: "18px 20px"
  admin-sidebar:
    backgroundColor: "{colors.malam}"
    textColor: "#C9D0D9"
    padding: "22px 14px"
---

# Design System: Dolanin

## Overview

**Creative North Star: "Papan Tujuan" (the destination board)**

Dolanin reads like a warm, sunlit departure board for a local trip: the city comes first, as a real photograph on a rounded tile with a small solid Pasir plate naming it, and everything after that is a short, honest list of cheap places to stay. The ground is warm sand (Pasir), the ink is night (Malam), and colour is spent deliberately: Jingga marks prices and the main action, Biru laut marks direction, cities and selection, Kuning senja marks promos and the one highlighted word in a headline. Nothing glows, nothing is frosted, nothing fades: every colour is flat.

Density is phone-first and calm. Cards sit on white with a sand-coloured hairline, corners are generously rounded, and every action is a pill. The path to Pesan or WhatsApp is always on screen: a sticky white dock on phones, a sticky booking card on desktop. The CMS shares the same palette and pill vocabulary but trades the sand ground for a quieter off-white canvas and a Malam sidebar.

The owner's rejections are binding and visual: no colour gradients of any kind (scrims included), no glass or blur, no emoji used as icons, and nothing that reads as a generic AI template.

**Key Characteristics:**
- Flat colour only; text over photos sits on solid panels, never on a gradient scrim.
- Poppins at 400 to 700 everywhere, tight negative tracking on large sizes, tabular figures on every number.
- 16px cards, 12px inner corners, pill buttons, chips and tags.
- Jingga is the price-and-action colour; text and icons on Jingga are Malam.
- Real photographs and vertical 9:16 video carry the imagery; no illustration.
- Light theme only.

## Colors

A warm, sun-and-sea palette on a sand ground: one hot accent for money and action, one sea accent for direction, one sunset yellow for promotion.

### Primary
- **Jingga Dolan** (#F26B3A): prices (always 20px/700 or larger), the Pesan button, the "in" of the wordmark on light grounds, the curator avatar disc, and the Pesan series in the dashboard. Labels and icons placed on it are Malam, by owner decision.

### Secondary
- **Biru Laut** (#0E8C8C): focus rings, checkbox fill, outline-button strokes, selected-chip borders, info icons. Not used for small text on light grounds.
- **Biru Laut Tua** (#0A6B6B): every text link and outline-button label on light grounds ("Lihat semua", breadcrumbs, reset, load more), the "Semua kota" tile, the CMS toggle in its on state, success text.
- **Tint Laut** (#E3F4F4) with **Laut Ink** (#073F3F): selected filter chips, type tags, city code badges, and the placeholder colour behind loading photos.

### Tertiary
- **Kuning Senja** (#FFC24B): promo stamps, the flat highlight behind a key word in a headline ("hemat"), text selection, the CMS cover tag, the "in" of the CMS wordmark on Malam, and the CMS sidebar focus ring. Text on it is **Senja Ink** (#5A3D00) or Malam.

### Neutral
- **Pasir** (#FFF6EC): the site ground, the city plate, the catalog banner plate, the mobile detail sheet, and text on Malam surfaces.
- **Putih** (#FFFFFF): cards, the action dock, the booking card, inputs, segment tracks, chips, icon buttons, filter sheet.
- **Malam** (#1F2A37): all primary text and icons, active segment and sort pills, the WhatsApp help block, the CMS sidebar, toasts. At 72% opacity it forms the round controls and duration pills over media; at 50% it is the dialog backdrop.
- **Abu Pasir** (#575E6B): secondary text on Pasir (sublines, plate metadata, catalog counts, footer, crumbs).
- **Abu** (#6B7280): secondary text on white only (card locations, struck-through prices, price units, notes, CMS hints).
- **Garis** (#EFE3D5): the single hairline for card borders, header and dock rules, segment tracks and chips.
- **Input Stroke** (#DDD5CB): the slightly stronger stroke on CMS form fields and the login field.
- **Error** (#B42318) for field errors and invalid strokes; **Error Ink** (#8A2F0B) on Tint Jingga (#FFEFE8) for the login error box.
- **WhatsApp** (#25D366) with **WhatsApp Ink** (#063D1C): every Chat WhatsApp button and the header WA pill, nowhere else.
- **Admin Canvas** (#FAF8F5): the CMS main area behind white cards.

### Dashboard series
- **Pesan** (#F26B3A), **WA** (#00918F), **Lainnya** (#C9C2B8): the validated chart set. Grid lines use #EEEAE4, chart labels #52514E, positive deltas #17663A on #E5F3EA, flat deltas Malam on #F3EFEA.

### Named Rules
**The Flat Sun Rule.** Every colour is a solid fill. No gradients anywhere, including scrims, fades, and image overlays; no glass, no backdrop blur.

**The Malam on Jingga Rule.** Text and UI icons on a Jingga fill are always Malam (#1F2A37), never white.

**The Price Voice Rule.** Jingga text is reserved for prices, and a Jingga price is never smaller than 20px at weight 700.

**The Two Greys Rule.** Secondary text on Pasir is Abu Pasir (#575E6B); Abu (#6B7280) is used only on white.

## Typography

**Display Font:** Poppins (with system-ui, sans-serif), loaded through next/font at 400, 500, 600, 700
**Body Font:** Poppins (same family)

**Character:** One friendly geometric sans does every job. Hierarchy comes from weight (700 for display and prices, 600 for titles and buttons, 500 for chips and labels, 400 for running text) and from tight negative tracking at large sizes.

### Hierarchy
- **Display** (700, 32px mobile / 56px desktop, 1.15 / 1.12, -0.02em / -0.03em): the landing question, left-aligned, two lines on a 390px phone, balanced wrapping on desktop.
- **Headline** (700, 28px mobile / 40px desktop, -0.02em): catalog page titles; the catalog banner plate uses 22px/600 on phones and 34px/700 on desktop.
- **Title** (600, 22px, 1.25, -0.01em): listing name on the detail page, city name on the catalog plate.
- **Section** (600, 18px mobile / 28px desktop): section headings such as the promo row; 16px/600 inside detail sections and CMS cards.
- **Card title** (600, 15px card / 14px row / 16px desktop, 1.3): listing names on cards; single-line ellipsis in row layout.
- **Body** (400, 14px; 17px for the desktop landing subline): sublines are capped at 32ch mobile and 38ch desktop.
- **Body small** (400, 13px, 1.65): curator notes, help text, CMS descriptions.
- **Label** (500 to 600, 12 to 13px, line-height 1): chips, segments, links, buttons in compact spots.
- **Caption** (600, 11px): promo stamps, type tags, city codes, duration pills. 11px is the floor; no text is set smaller.
- **Price** (700, 20px; 28px on the detail page and booking card, tabular figures): always Jingga, with an 11px Abu unit and a 12px struck-through original price.

### Named Rules
**The 11px Floor Rule.** No text is smaller than 11px, and 11px is used only for short tags and units.

**The Tabular Money Rule.** Every price, count, KPI and table figure uses tabular numerals.

**The Senja Mark Rule.** At most one key word per headline gets a flat Kuning senja highlight: a solid rounded block (8px radius, 10px on desktop) behind the text, padded 6px (8px desktop) horizontally, cloned across line breaks, never covering the descenders of the line above.

## Layout

Phone first at 390px; desktop is an extension at a single breakpoint of 1024px. Content sits in a centred wrap of 1200px max with 20px side padding (40px from 1024px). Spacing follows a 4px grid; the recurring steps are 4, 8, 12, 16, 20, 24, 32, 40, 56 and 64px, with 12px the default gap between cards on phones and 16 to 20px on desktop.

- **Landing:** on phones, a 64px header bar (logo, search and WA icon buttons), the display headline, the type segment, then a 2-column city board of 4:5 photo tiles with 12px gaps, then a horizontally scrolling promo row of 220px cards with scroll snap. On desktop, a 5/7 hero grid with 56px gap holds the headline beside a 3x2 city board; promos become a 4-column grid.
- **Catalog:** on phones, a full-bleed 176px city banner with an overlapping Pasir plate, sticky filter chips, and a single-column list of row cards. On desktop, a 240px banner with 20px radius, a sticky 270px white filter sidebar and a 3-column card grid.
- **Detail:** on phones, a sticky media hero (4:5 photo gallery, or 9:16 video capped to the screen minus the dock), an info sheet with a 24px top radius sliding over it, and a sticky action dock at the bottom of the page column. On desktop, breadcrumb, title row, a media mosaic (video as a tall tile) and a sticky 380px booking card with a 40px column gap.
- **CMS:** a 232px Malam sidebar beside an off-white main area (28px 36px padding), collapsing to a top bar below 800px. Forms use a content column plus a 340px sticky side column, stacking below 1100px.

### Named Rules
**The Always-Reachable Rule.** On every detail view the Pesan and WhatsApp actions stay on screen: the sticky dock on phones, the sticky booking card on desktop.

## Elevation & Depth

The system is flat. Depth comes from tone (white cards on Pasir, a Pasir plate on a photo, Malam blocks among light ones) and from the Garis hairline, not from shadows. The few shadows that exist are soft, low and Malam-tinted, and only on things that physically sit above other content: the mobile detail sheet rising over the hero, popover menus, chart tooltips, and small CMS controls.

### Shadow Vocabulary
- **Sheet lift** (`box-shadow: 0 -8px 24px -12px rgba(0, 0, 0, 0.35)`): the detail info sheet as it slides over the sticky media hero.
- **Popover** (`box-shadow: 0 4px 16px rgba(31, 42, 55, 0.12)`): CMS row action menus.
- **Tooltip** (`box-shadow: 0 6px 16px -6px rgba(31, 42, 55, 0.25)`): dashboard chart tooltips.
- **Control nub** (`box-shadow: 0 1px 3px rgba(31, 42, 55, 0.12)`): the selected option of a CMS segmented control and the toggle knob.

### Named Rules
**The Solid Plate Rule.** Text that names or prices something over a photograph sits on a solid panel (the Pasir city plate, the Pasir banner plate). Small round controls and duration pills over media use Malam at 72% opacity with no blur. A darkening scrim or gradient is never used.

## Shapes

Soft and friendly, never sharp. Cards and photo tiles use a 16px radius; larger panels (desktop booking card, desktop banner, filter sheet top, WA block on desktop) use 20px; the mobile detail sheet uses 24px on its top corners. Thumbnails, plates inside tiles, inputs, media cells and tooltips use 12px. Every button, chip, tag, stamp, segment and search field is a full pill (999px). Strokes are 1px Garis for containment and 1.5px Biru Laut for outline actions. Icons are Tabler outline at a 1.5 to 1.75 stroke, sized 14 to 20px in UI and up to 32px in empty states.

## Components

### Buttons
Round, warm, and unmistakable; the colour tells you where the button goes.
- **Shape:** full pill (999px), weight 600, 14px (15px on desktop booking actions).
- **Primary (Pesan):** Jingga fill, Malam label and icon; 11px 18px in dialogs, 46px tall with 22px side padding in the dock, full width with 16px padding in the booking card.
- **WhatsApp:** WhatsApp green fill with WhatsApp Ink label; a 40 to 46px circle on phones, a labelled pill on desktop.
- **Outline:** transparent with a 1.5px Biru Laut stroke and Biru Laut Tua label, for "Lihat semua kota", load more, and price-range apply.
- **Dark / Ghost (CMS):** Malam fill with white label for primary CMS actions; white with a 1px stroke for secondary ones. Disabled buttons drop to 60% opacity.
- **Icon button:** 40px white circle with a 1px Garis stroke and a Malam icon; over media it becomes a Malam 72% circle with a white icon.
- **Focus:** a 2px Biru Laut outline offset 2px on every interactive element (Kuning senja inside the Malam CMS sidebar).

### Chips
- **Style:** white pill, 1px Garis stroke, 12px/500 Malam label, 8px 12px padding; filter chips scroll horizontally on phones.
- **State:** selected is Tint Laut with a Biru Laut stroke and Laut Ink label; the active sort chip is Malam with Pasir text.

### Type segment
A white pill track (4px inset, Garis stroke) holding Semua / Hotel / Villa; the active option is a Malam pill with Pasir text, the rest Abu Pasir. Full width on phones, inline from 1024px. The catalog sort control follows the same pattern.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** white on Pasir, 1px Garis border, no shadow.
- **Listing card:** vertical (132px photo, 4:3 on desktop) or row (112px square thumbnail with 12px radius, 8px padding); name, location with a pin icon, then the price pinned to the bottom. A promo stamp sits at the photo's top-left.
- **Internal Padding:** 12px 14px 14px for card bodies; 16px to 24px for panels.

### City tile (signature)
A 4:5 real photograph with 16px radius on a Tint Laut placeholder, a Tint Laut city-code badge at top-left (11px/700, 0.06em tracking) and a solid Pasir plate at the bottom (12px radius) carrying the city name in 14px/600 and "mulai Rp..." plus the listing count in 11px Abu Pasir. On desktop hover the photo scales to 1.04 over 0.5s (cubic-bezier(0.16, 1, 0.3, 1)). Tapping a tile grows it into the catalog banner through a shared-element view transition; the transition is switched off under reduced motion. The "Semua kota" tile is solid Biru Laut Tua with Pasir text.

### Promo stamp and type tag
- **Promo stamp:** Kuning senja pill, Senja Ink 11px/600 label, 3px 10px padding, pinned 8px from the photo's top-left.
- **Type tag:** Tint Laut pill, Laut Ink 11px/600 label, 2px 9px padding.

### Price tag
Jingga 20px/700 with -0.01em tracking and tabular figures; an 11px Abu "/malam" unit; an optional 12px Abu struck-through original price above. 28px in the detail price box and booking card.

### Action dock and booking card
- **Action dock (phones):** white bar, Garis top rule, sticky at the bottom of the page column; price at left, a WhatsApp circle and a Pesan pill at right. Hidden from 1024px.
- **Booking card (desktop):** white, 20px radius, 24px padding, sticky 24px from the top; price and promo stamp, full-width Pesan then WhatsApp pills, and a 12px Abu note with an info icon.

### WhatsApp help block
A Malam panel (16px radius, 20px radius on desktop) with a Pasir heading, #D9DEE5 supporting text and a WhatsApp pill; stacks on phones, sits in a row on desktop.

### Inputs / Fields
- **Site search:** white pill with a Garis stroke, 16px text on phones (no zoom), a search icon at left on desktop.
- **CMS fields:** white, 1px Input Stroke, 12px radius, 11px 12px padding, 14px text; labels 13px/500 above, hints 12px Abu below.
- **Focus:** 2px Biru Laut outline with the border turning Biru Laut.
- **Error:** Error stroke and a 12px/500 Error message below; disabled controls at 60% (40% for small icon controls).

### Navigation
- **Site header:** Pasir bar with a Garis bottom rule, 64px tall (76px desktop). Wordmark "dolan" in Malam with "in" in Jingga beside the pin icon; search and WA as icon buttons on phones, an inline search pill and labelled WA pill on desktop. On the phone detail page the header gives way to controls on the media hero.
- **CMS sidebar:** Malam column, #C9D0D9 items in 14px/500 with 12px-radius rows; hover #26323F, current page #2C3949 with white text.

### Dashboard
White KPI tiles (16px radius, 18px 20px padding) with a 10px colour key, a 30px/600 tabular value (52px for the lead tile) and a pill delta chip; line and bar charts in the validated series colours with 4px-rounded bar ends, white tooltips with the tooltip shadow, and a "lihat sebagai tabel" disclosure for every chart.

## Do's and Don'ts

### Do:
- **Do** set every surface on Pasir (#FFF6EC) or white, with Malam (#1F2A37) text, light theme only.
- **Do** keep Jingga (#F26B3A) for prices and the Pesan action, and put Malam labels and icons on it.
- **Do** render prices at 20px/700 or larger with tabular figures.
- **Do** use Biru Laut Tua (#0A6B6B) for text links and outline-button labels on light grounds, and Biru Laut (#0E8C8C) for strokes, fills and focus rings.
- **Do** use Abu Pasir (#575E6B) for secondary text on Pasir and Abu (#6B7280) only on white.
- **Do** round cards to 16px and make every button, chip and tag a pill.
- **Do** place names and prices over photos on a solid Pasir plate.
- **Do** use Tabler outline icons at 1.5 to 1.75 stroke.
- **Do** keep spacing on the 4px grid.
- **Do** use the dashboard series colours exactly: Pesan #F26B3A, WA #00918F, other #C9C2B8.

### Don't:
- **Don't** use any gradient, including scrims and photo fades.
- **Don't** use glass, frosted panels or backdrop blur.
- **Don't** use emoji as icons.
- **Don't** put white text or UI icons on Jingga (the Pasir brand pin inside the Jingga curator disc is the logo mark, not a UI icon).
- **Don't** set any text below 11px.
- **Don't** use the WhatsApp green for anything except WhatsApp actions.
- **Don't** add a dark theme.
- **Don't** lean on shadows for hierarchy; keep them for elements that sit above other content.
