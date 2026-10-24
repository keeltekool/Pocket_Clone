---
version: alpha
name: Pocket Clone
description: Warm paper reading room — cream page, ink text, one terracotta accent, Fraunces serif titles over Source Sans 3 body text.
colors:
  primary: "#C85A3B"
  cream: "#FAF7F2"
  cream-dark: "#F0EBE3"
  warm-white: "#FFFDFB"
  ink: "#2C2825"
  ink-soft: "#4A4542"
  ink-muted: "#7A7570"
  ink-faint: "#B5B0A8"
  terracotta: "#C85A3B"
  terracotta-soft: "#D97B5F"
  terracotta-glow: "rgba(200, 90, 59, 0.12)"
  terracotta-pale: "#F5E6E0"
  danger: "#B8463A"
  danger-soft: "rgba(184, 70, 58, 0.1)"
  scrim: "rgba(44, 40, 37, 0.4)"
typography:
  hero:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "56px"
    fontWeight: 300
    lineHeight: 1.6
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "28px"
    fontWeight: 500
    lineHeight: 1.6
    letterSpacing: "-0.01em"
  title-sm:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "24px"
    fontWeight: 500
    lineHeight: 1.6
    letterSpacing: "-0.01em"
  heading:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: 1.6
  subheading:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "18px"
    fontWeight: 500
    lineHeight: 1.6
  card-title:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.4
  lede:
    fontFamily: "Source Sans 3, -apple-system, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: "Source Sans 3, -apple-system, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  button:
    fontFamily: "Source Sans 3, -apple-system, sans-serif"
    fontSize: "16px"
    fontWeight: 600
  label:
    fontFamily: "Source Sans 3, -apple-system, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  label-strong:
    fontFamily: "Source Sans 3, -apple-system, sans-serif"
    fontSize: "15px"
    fontWeight: 500
  small:
    fontFamily: "Source Sans 3, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  small-strong:
    fontFamily: "Source Sans 3, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 500
  meta:
    fontFamily: "Source Sans 3, -apple-system, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.6
  micro:
    fontFamily: "Source Sans 3, -apple-system, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.6
  overline:
    fontFamily: "Source Sans 3, -apple-system, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.6
    letterSpacing: "0.08em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  2xl: "64px"
  page-max: "1400px"
  sidebar: "240px"
  form-max: "340px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.warm-white}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "16px 40px"
  button-primary-hover:
    backgroundColor: "{colors.terracotta-soft}"
  button-ghost:
    textColor: "{colors.ink-muted}"
    typography: "{typography.small-strong}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-ghost-hover:
    backgroundColor: "{colors.warm-white}"
    textColor: "{colors.ink}"
  text-field:
    backgroundColor: "{colors.warm-white}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "16px 24px"
  text-field-placeholder:
    textColor: "{colors.ink-faint}"
  text-field-focus:
    backgroundColor: "{colors.warm-white}"
    textColor: "{colors.ink}"
  checkbox:
    textColor: "{colors.ink-muted}"
    typography: "{typography.small}"
  error-note:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    typography: "{typography.small}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  nav-item:
    textColor: "{colors.ink-soft}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  nav-item-hover:
    backgroundColor: "{colors.terracotta-glow}"
  nav-item-active:
    backgroundColor: "{colors.terracotta-pale}"
    textColor: "{colors.terracotta}"
  nav-header:
    textColor: "{colors.ink-faint}"
    typography: "{typography.overline}"
    padding: "16px 16px 8px"
  nav-add:
    textColor: "{colors.ink-muted}"
    typography: "{typography.small}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  nav-add-hover:
    backgroundColor: "{colors.terracotta-glow}"
    textColor: "{colors.terracotta}"
  count-pill:
    backgroundColor: "{colors.cream-dark}"
    textColor: "{colors.ink-faint}"
    typography: "{typography.micro}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  row-card:
    backgroundColor: "{colors.warm-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 0 8px 16px"
  row-card-title:
    textColor: "{colors.ink}"
    typography: "{typography.card-title}"
  row-card-title-hover:
    textColor: "{colors.terracotta}"
  row-card-meta:
    textColor: "{colors.ink-muted}"
    typography: "{typography.meta}"
  row-card-date:
    textColor: "{colors.ink-faint}"
    typography: "{typography.micro}"
    width: "100px"
  row-thumb:
    backgroundColor: "{colors.cream-dark}"
    rounded: "{rounded.sm}"
    width: "80px"
    height: "56px"
  row-thumb-mobile:
    width: "70px"
    height: "50px"
  select-chip:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.micro}"
    rounded: "{rounded.sm}"
    padding: "6px 10px"
  select-chip-hover:
    backgroundColor: "{colors.cream-dark}"
  popover:
    backgroundColor: "{colors.warm-white}"
    rounded: "{rounded.md}"
    width: "180px"
  option:
    textColor: "{colors.ink-soft}"
    typography: "{typography.meta}"
    padding: "8px 16px"
  option-hover:
    backgroundColor: "{colors.cream}"
  option-selected:
    backgroundColor: "{colors.terracotta-glow}"
    textColor: "{colors.terracotta}"
  option-add:
    textColor: "{colors.terracotta}"
  delete-button:
    textColor: "{colors.ink-faint}"
    rounded: "{rounded.sm}"
    size: "36px"
  delete-button-hover:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
  context-menu:
    backgroundColor: "{colors.warm-white}"
    rounded: "{rounded.md}"
    padding: "4px"
    width: "140px"
  menu-item:
    textColor: "{colors.ink-soft}"
    typography: "{typography.small}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  menu-item-hover:
    backgroundColor: "{colors.cream}"
  menu-item-danger:
    textColor: "{colors.danger}"
  menu-item-danger-hover:
    backgroundColor: "{colors.danger-soft}"
  filter-button:
    backgroundColor: "{colors.warm-white}"
    textColor: "{colors.ink-soft}"
    typography: "{typography.label-strong}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  bottom-sheet:
    backgroundColor: "{colors.warm-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
  sheet-scrim:
    backgroundColor: "{colors.scrim}"
  sheet-close:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.full}"
    size: "32px"
  sheet-item:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "16px"
  sheet-item-active:
    backgroundColor: "{colors.terracotta-pale}"
    textColor: "{colors.terracotta}"
  empty-state-title:
    textColor: "{colors.ink-soft}"
    typography: "{typography.heading}"
  empty-state-hint:
    textColor: "{colors.ink-faint}"
    typography: "{typography.label}"
---

# Design System: Pocket Clone

## Overview

A warm, quiet reading room. Everything sits on cream paper with a barely-there terracotta texture, text is warm ink rather than black, and a single terracotta accent marks what is active or actionable. Titles are set in Fraunces, a soft optical-size serif that gives the list the feel of a printed contents page; everything functional (labels, fields, buttons, meta) is Source Sans 3.

The page is one long list: a header with the serif title and a quiet outlined action, a 240px sidebar of filters with counts, a wide URL field with a solid terracotta button, and a stack of row cards. On phones the sidebar folds into a filter button and a bottom sheet. Light only.

## Colors

### Accent
- **Terracotta** `#C85A3B` (`primary`): primary buttons, the active filter row's text, selected options, the "create" option, focus outlines, checkbox accent, the spinner arc, and the card title on hover.
- **Terracotta soft** `#D97B5F`: hover of primary buttons; the focused field border; the dashed add row on hover.
- **Terracotta pale** `#F5E6E0`: ground of the active filter row (sidebar and sheet) and text selection.
- **Terracotta glow** `rgba(200, 90, 59, 0.12)`: hover ground of filter rows and add rows, the selected option ground, the 4px focus ring around fields, and the soft ellipse behind the login hero.

### Paper and ink
- `cream #FAF7F2` is the page. `warm-white #FFFDFB` is every surface that sits on it: fields, cards, menus, the sheet, and the text colour on terracotta.
- `cream-dark #F0EBE3` is the one line colour (card borders, field borders, header rule, dividers) and the quiet fill for thumbnails, count pills and chip hover.
- Text runs in four steps: `ink #2C2825` (titles, field text), `ink-soft #4A4542` (filter names, options, menu items, empty-state title), `ink-muted #7A7570` (lede, meta, quiet buttons, chips), `ink-faint #B5B0A8` (placeholders, dates, counts, overline headers, resting delete icon).

### Functional
- `danger #B8463A` on `danger-soft rgba(184, 70, 58, 0.1)`: error notes, destructive menu items, delete hover. There are no success or warning colours.
- `scrim rgba(44, 40, 37, 0.4)`: the backdrop behind the bottom sheet.

The page background also carries two faint terracotta radial washes (3% at 20%/30%, 2% at 80%/70%) so the paper never reads as flat digital white.

## Typography

- **Fraunces** (display, weights 300 and 500) carries titles only. Its optical-size axis follows the size: at the login hero (`clamp(2.5rem, 8vw, 3.5rem)`: 56px on desktop, 40px on phones; weight 300, -0.02em, a faint terracotta text shadow) it is thin and high-contrast; at 16px card titles it is sturdier. The header title is 28px/500 (24px on phones), the empty-state line 20px/500, the sheet title 18px/500, card titles 16px/500 at 1.4 line height, clamped to two lines.
- **Source Sans 3** (ui, weights 400, 500, 600) carries everything else: 18px lede under the hero, 16px body and fields, 16px/600 primary buttons, 15px filter rows, 14px quiet buttons and menu items, 13px/500 lowercase meta (the source domain under a card title), 12px dates, counts and chips, 11px/600 uppercase overline headers at 0.08em tracking.
- Text inherits a 1.6 line height; controls (buttons, inputs) keep the browser's normal line height, which sets their height together with the padding.
- No bold display weights, no italics, no all-caps except the overline.

## Layout

- **Shell:** content max 1400px, centred, padded 24px on the sides, 24px top and 64px bottom on desktop; 16px all round on phones.
- **Header:** title left, quiet outlined action right, padding 16px above and 40px below the title, a 1px `cream-dark` rule, then 24px to the content (phones: 8px / 24px / 16px).
- **Body:** a 240px sidebar (16px top padding) and the main column side by side with a 40px gap. The sidebar order: "all" row with count, divider, overline header, one row per group with count and a hover-only options button, a dashed add row.
- **Main column:** the URL field and its button in one row (16px gap), 40px of space, then the card list with 8px between cards.
- **Row card:** a two-column grid (content, actions). Content is itself a grid of 80px thumbnail, flexible title/meta column, and a 100px right-aligned date column, 8px gaps, padded 8px top and bottom and 16px on the left. The actions column (group chip, delete) has 16px right padding.
- **Login:** the hero title, lede and a 340px form sit at the top of the page inside a 40px inset, centred horizontally, text centred. The form stacks the field, the checkbox row and the full-width button with 16px gaps.
- **Below 768px:** the sidebar disappears and a filter button (current filter + chevron) sits above the URL field; the field and button stack and the button goes full width; cards drop the date column and shrink the thumbnail to 70×50; the chip keeps only its folder icon and chevron; actions stack vertically and the delete icon shows without hover. Filters open in a bottom sheet.
- The first rows of the list must show above the fold at 1440×900 and at 375×812.

## Elevation & Depth

Resting surfaces are flat: warm-white on cream separated by a 1px `cream-dark` border, never a shadow. Depth appears only on interaction and for floating layers:
- Card hover: lift 2px, border darkens to `ink-faint`, `shadow-card-hover` (`0 16px 40px rgba(44,40,37,0.1), 0 6px 12px rgba(44,40,37,0.05)`).
- Primary button hover: lift 1px, `shadow-md`.
- Options menu: `shadow-lg`. Chip popover: `0 10px 40px rgba(0,0,0,0.15)`.
- Bottom sheet: slides up over a 40% ink scrim, no shadow.

Motion uses one curve, `cubic-bezier(0.22, 1, 0.36, 1)`: the login fades up 12px over 0.8s, the main view fades in over 0.6s, cards slide up 16px over 0.4s staggered 50ms each, errors shake for 0.4s, the sheet slides in over 0.3s. Hover transitions run 0.15–0.3s.

## Shapes

Soft, small radii. 6px for everything that sits inside a surface: filter rows, chips, quiet buttons, menu items, thumbnails, delete buttons, error notes. 10px for the surfaces and big controls: fields, primary buttons, cards, menus, the filter button, sheet rows, count pills. 14px only for the bottom sheet's top corners. The sheet's close button is the one circle. Borders are 1px, except fields and the quiet outlined button (1.5px) and the add row (1.5px dashed).

## Components

- **Primary button:** terracotta, warm-white 16px/600 text, 10px radius, 16px × 40px padding. Hover: terracotta-soft, lift 1px, `shadow-md`; press returns to rest; disabled at 70% opacity. In the login form it is full width with a faint white top sheen on hover.
- **Quiet button:** transparent with a 1.5px `cream-dark` border, `ink-muted` 14px/500, 6px radius, 8px × 16px. Hover: warm-white fill, `ink-faint` border, `ink` text.
- **Text field:** warm-white, 1.5px `cream-dark` border, 10px radius, 16px × 24px padding, 16px text, `ink-faint` placeholder. Focus: border `terracotta-soft` plus a 4px `terracotta-glow` ring, no outline. Disabled at 60%.
- **Checkbox row:** native checkbox in terracotta accent, 8px gap, 14px `ink-muted` label.
- **Error note:** `danger` 14px text on `danger-soft`, 6px radius, centred, shakes in.
- **Filter row (sidebar):** 15px `ink-soft` name, count pill on the right, 8px × 16px, 6px radius. Hover: `terracotta-glow`. Active: `terracotta-pale` ground with the name in terracotta 600. Editable rows add a dots button (16px icon, 4px padding) that appears on row hover and tints `cream-dark` under the pointer.
- **Count pill:** 12px `ink-faint` on `cream-dark`, 2px × 8px, 10px radius.
- **Overline header:** 11px/600 uppercase, 0.08em, `ink-faint`, 16px 16px 8px padding. **Divider:** 1px `cream-dark`, 8px × 16px margin.
- **Add row:** full width, 1.5px dashed `cream-dark`, 6px radius, 14px `ink-muted` text left-aligned. Hover: border terracotta-soft, ground glow, text terracotta.
- **Row card:** see Layout. Thumbnail on a `cream-dark` ground (shown while an image loads or when there is none), image zooms to 105% on card hover. Title 16px Fraunces, turns terracotta on hover. Meta 13px/500 lowercase `ink-muted`. Date 12px `ink-faint`. A removing card dims to 50% and shrinks to 98%.
- **Group chip:** `cream` ground, 1px `cream-dark` border, 6px radius, 6px × 10px (4px × 8px on phones), 12px `ink-muted`: 14px folder icon, label (max 80px, ellipsis, hidden on phones), 10px chevron. Hover: `cream-dark` ground, `ink-faint` border. Opens a popover 4px below, right-aligned: warm-white, 1px border, 10px radius, min 180px, max 280px tall with scroll. Options are 13px `ink-soft` rows, 8px × 16px, hover `cream`; the selected one is terracotta 500 on glow; the last "create" row sits under a divider in terracotta 500.
- **Delete button:** 36px square (32px on phones), 6px radius, 18px trash icon in `ink-faint`. Hidden until card hover on desktop. Hover: `danger-soft` ground, `danger` icon, scale 1.1.
- **Options menu:** warm-white, 1px border, 10px radius, `shadow-lg`, min 140px, 4px padding; items 14px `ink-soft` with a 14px icon, 8px gap, 8px × 16px, 6px radius, hover `cream`; the destructive item is `danger`, hover `danger-soft`.
- **Filter button (phones):** warm-white, 1px border, 10px radius, 8px × 16px, 15px/500 `ink-soft` with a 12px `ink-muted` chevron. Hover border `ink-faint`.
- **Bottom sheet:** full-width warm-white panel from the bottom, 14px top corners, max 70% of the viewport. Header: 24px padding, 18px Fraunces title, 32px round close button (`cream`, hover `cream-dark`), 1px rule below. Rows: 16px padding, 10px radius, 16px text, count pill right; hover `cream`; active `terracotta-pale` with terracotta 600 text.
- **Empty state:** centred, 64px × 24px padding: a 20px Fraunces `ink-soft` line and a 15px `ink-faint` hint.
- **Loading:** 18px ring spinner (2px `cream-dark`, terracotta top arc, 0.8s) beside 15px `ink-muted` text.
- **Login hero:** see Layout and Typography; the ground is cream with a 600×400px terracotta-glow ellipse centred at 50%/40%. The field is focused on arrival.
- **Focus:** keyboard focus draws a 2px terracotta outline 2px out; mouse focus draws none.

## Do's and Don'ts

- Do keep terracotta for the one thing that is active or actionable in a region; everything else is ink on paper.
- Do set titles in Fraunces and nothing else; labels, meta and controls stay in Source Sans 3.
- Do separate surfaces with the 1px `cream-dark` border; keep resting cards and fields flat.
- Do keep the warm palette end to end: warm-white instead of pure white, ink instead of black.
- Don't add shadows to resting surfaces or nest a card inside a card.
- Don't introduce new accent hues or status colours; extend with the ink steps and the terracotta spectrum.
- Don't use bold display weights or larger radii; the softness comes from the serif and the 6/10px corners.
- Don't drop the phone composition: filter button and bottom sheet below 768px, stacked URL form, icon-only chip.
