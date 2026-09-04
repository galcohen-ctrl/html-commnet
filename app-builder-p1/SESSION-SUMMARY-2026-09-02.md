# App Builder P1 — Session Summary (2026-09-02) · Nanai + Celia feedback build

Follow-up to `SESSION-SUMMARY-2026-08-31.md` (read that first for the architecture mental model — two state layers, body-class state machine, widget system, guided-flow steps. None of it changed).

This session turned the **usability session with Nanai Toure (CSM) + Celia De Leon (design)** into a dispositioned list of 26 items, and implemented every approved one.

- **Runs at:** http://localhost:5174/html-commnet/app-builder-p1/ (`npm run dev`)
- **Status:** all items below are live on the local dev server. `npm run build` passes. **Not deployed** — the public site still shows the older build.
- **Reload note:** hard-reload between tests. HMR detaches the prototype's vanilla-JS listeners, so a hot update can make hold-to-adjust and drag-reorder look broken when they aren't.

---

## How to use this doc for review

Every item is written the same way: **what was asked → what shipped → where to see it → `Comments:`**.

Open a new chat with this file attached and go item by item. For each one, either write your note on the `Comments:` line or say the item number and what you want changed. Items are grouped by where they live in the product, not by the original feedback numbering, but the original IDs are kept so they map back to the session list.

---

## A · Setup steps (1–3)

### Step 1 restructure — Business details
**Asked:** Step 1 was carrying too much. Country, "What best describes your business?", and the industry chips don't change anything the merchant can see, so they read as a form to get through rather than a first step that builds something.
**Shipped:** Step 1 is now **Business name + App tagline + Logo upload** — only the three things that change the phone preview. Country, business type and industry chips are gone. `validateStep('business')` requires the name only. Logo here is a plain upload; position and size still live in Branding, and the help text says so.
**Ripple:** the Step-2 **"Recommended"** badge on the ordering cards is removed — it was derived from business type, which no longer exists.
**Where:** Step 1.
**Comments:**

### #2 · Tagline copy
**Asked:** unclear what the tagline is and where it shows up.
**Shipped:** label is **"App tagline"** in both Business details and Branding, with help text: *"One short line shown under your business name on the home screen. Write it as a sentence, not keywords."* Branding's copy points back to Business details so it's obviously the same field.
**Where:** Step 1, and Branding → App header.
**Comments:**

### #23 · Two fonts (Title + Body)
**Asked:** one font control isn't enough, and there were two different font controls in the panel doing the same job.
**Shipped:** new **Typography** section with a **Title font** row and a **Body font** row (Sans-serif / Serif / Mono / Rounded / Slab). The duplicate font-library control is removed. `applyFontFamily(font, role)` writes `--p-font-title` and `--p-font-body` separately, so headings and body text in the preview really do diverge.
**Where:** Branding → Typography.
**Comments:**

### T-C · Navigation & header background colour
**Asked:** no way to colour the bottom nav or the top header.
**Shipped:** colour control in Advanced branding bound to `--p-nav-bg`, mirrored to `--p-header-bg` as you type so both update together.
**Where:** Branding → Advanced branding options.
**Comments:**

### #3 · "Connect & load" → progressive disclosure
**Asked:** the button said "Connect & load" but nothing visibly loaded, and the display options were sitting there before there was anything to display.
**Shipped:** CTA renamed **"Add & preview"**. The webview display options stay hidden until a preview actually succeeds, so the panel grows as the merchant makes progress instead of presenting everything cold.
**Where:** Step 2 → Link your ordering website; also Menu → webview.
**Comments:**

### #4 · Change-focus routing bug
**Asked:** changing the app focus dumped you somewhere unexpected.
**Shipped:** **root cause** — after confirming a focus change, `coreNavigation` called `goToPage(state.page)`, which is a *full* navigation and drags the sidebar to Home. Replaced with `restoreEditorPosition()`, which reads `window.getCurrentStep()` and puts you back on the step you were actually on.
**Where:** Home or Branding → change app focus → confirm.
**Comments:**

---

## B · Home screen & widgets

### #7 · Promo card tap behaviour
**Asked:** unclear what part of a promo card is tappable, and the Button text field showed even when there was no button.
**Shipped:** two halves. (a) In the L3 card editor, **Tap action = None hides the Button text field**. (b) The button only renders when it has text, and when a button exists **only the button is tappable** (`pc-tappable`) — with no button, the whole card takes the tap action.
**Where:** Home → Promo cards → open a card.
**Comments:**

### #6.5 · Profile & Social open in the third panel
**Asked:** drilling into Profile or Social replaced the widget list, so you lost your place.
**Shipped:** both are in `L3_DRILLS` and route through `openL3Panel`, so they open in the **third panel** with the Home widget list still visible behind them — same as the other drills.
**Where:** Home → Profile, Home → Social.
**Comments:**

### #9 · Social links — X and custom
**Asked:** the social list was missing X, and there was no way to add anything not on the list.
**Shipped:** **X** added, plus **"Add custom link"** (name + URL + generic icon).
**Where:** Home → Social.
**Comments:**

### T-F · Real brand icons
**Asked:** the social icons were emoji.
**Shipped:** real brand SVGs for Instagram, Facebook, TikTok, X and YouTube.
**Where:** Home → Social, and the social widget in the preview.
**Comments:**

---

## C · Screens (Rewards · Locations · Menu · More)

### #5 · QR code wording and wiring
**Asked:** "Show loyalty card" is the wrong name for what it does.
**Shipped:** renamed **"Show QR code"**, the loyalty-card button now actually navigates the preview to the QR page, and there's an optional **wallet-pass toggle**.
**Where:** Rewards → loyalty card settings.
**Comments:**

### #12 · Multiple punch cards
**Asked:** merchants run more than one punch card at a time; the preview only ever showed one.
**Shipped:** the Rewards preview shows a **second punch card** (Lunch Club) beneath the first. `layoutRewardsStage()` now moves **all** matching `[data-rw-tile]` elements, so ordering holds with more than one.
**Caveat:** the second card is **illustrative only** — editing the Punch Card tile updates the first card. Real multi-card data would come from Hub.
**Where:** Rewards, punch card on.
**Comments:**

### #13 · Punch card CTA
**Asked:** the punch card had a button that shouldn't be there.
**Shipped:** punch card renders with no CTA (`btnText` empty).
**Where:** Rewards preview.
**Comments:**

### #15 · Locations display toggles
**Asked:** no control over what the Locations screen shows.
**Shipped:** display toggles for **search, chips, opening hours, and navigate**. The old redundant toggle was removed.
**Deferred as agreed:** dynamic hours and favourite-location.
**Where:** Locations step.
**Comments:**

### #17 + T-A · Manual menu is informational
**Asked:** the manual menu items had a "+" that looked like add-to-cart, implying ordering when there is none.
**Shipped:** the `pm-add` "+" buttons are removed and items are non-clickable. The manual menu now reads as a menu you look at, not one you order from.
**Where:** Menu → Build manually.
**Comments:**

### T-B · Menu source order
**Asked:** the chooser led with the least likely option.
**Shipped:** reordered to **Use online ordering → Link a webview → PDF → Build manually**.
**Where:** Menu step, first screen.
**Comments:**

### #19 · More — list vs grid
**Asked:** the More screen only had one layout.
**Shipped:** **grid / list** layout switch, driven by a `more-list` body class.
**Where:** More step.
**Comments:**

### #20 · Hidden screens
**Asked:** hiding a screen left it in the phone preview.
**Shipped:** a hidden screen **leaves the phone preview** (and falls back to Home if it was the active page) but **stays in the left nav** so you can still configure it and turn it back on.
**Where:** any screen → visibility toggle.
**Comments:**

### #21 · Screen reorder + rename
**Asked:** merchants should be able to order and name their own screens.
**Shipped, two parts:**
- **Drag-reorder** in the left nav. **Home is pinned first** (your call); Rewards, Locations, Menu and More reorder freely. Dropping a screen reorders the **phone bottom nav** and **renumbers steps 4–8**.
- **Rename** — hover a screen's config title, click the pencil, type. The new name updates the phone nav label and the sidebar label, and the **original name shows underneath in smaller text** so you never lose the reference.
- More's **"Everything else"** subtitle is editable.
**Where:** left nav (drag), each screen's config panel header (rename).
**Comments:**

---

## D · Global

### #25 · QR preview from the header
**Asked:** no way to open the preview on a real phone.
**Shipped:** a **"Phone preview"** button with a QR icon in the **top-left of the global header** → modal with a QR code and the line *"Scan with your phone camera to walk through the app the way a member would, before you publish anything."*
**Where:** top bar, always visible.
**Comments:**

### #14 · Footer label + #14b publish gating
**Asked:** "Continue" doesn't say that anything is saved; and publishing with incomplete steps shouldn't be silently allowed *or* hard-blocked.
**Shipped:** footer says **"Save & continue"**. Publish is **warn-but-allow** — an explicit confirm dialog naming what's incomplete, and you can proceed anyway.
**Where:** every step footer; Review & publish.
**Comments:**

---

## E · Publish

### #26 · App submission copy
**Asked:** the submission step read as if the merchant has to handle Apple/Google technical work themselves, which isn't true — Como and the CSM do it.
**Shipped:** softened entry copy — the technical parts are prepared with the Como team and the merchant approves.
**Still open:** the full **merchant-facing vs internal** split of this step is waiting on Nanai's written feedback.
**Where:** Review & publish.
**Comments:**

---

## F · New capability — in-preview image adjust (#8)

The biggest item, and the only one gated on a prototype. Approved after five rounds at
`../prototypes/image-adjust-experience.html` (throwaway, local only).

**Asked:** merchants upload images that don't fit the frame, and the answer shouldn't be a separate cropping screen or a set of "dynamic dimensions" fields.

**Shipped:** a shared component wired into every image in the phone preview at once.

| Interaction | Behaviour |
|---|---|
| **Enter** | Press and hold an uploaded image for **~0.85s** — a purple ring fills as you hold, cursor becomes a bold pencil |
| **Adjust** | Frame glows. **Drag** to pan. **Scroll** to zoom (direction-based, ~4.5% a step). **Rotate** via slider, ⇧+scroll, or two-finger twist |
| **Crop** | Subtle scissors chip top-right of the image, expands to "Crop" on hover. Box starts at the **full image** with 8 edge + corner handles. **500ms after adjusting, the kept region auto-zooms to fit** (iOS-style) |
| **Apply** | **Rasterizes to canvas** — a real crop that survives zooming back out, not a transform trick. Falls back to a transform reframe if the canvas is tainted |
| **Undo** | The image source itself is in undo history, so undo restores the pre-crop image |
| **Discovery** | A light coach mark appears **outside** the phone on the left, once, the first time you upload |

**Covers:** promo card images, rewards tiles, image banners, rewards blocks, and the logo.
**Does not cover:** the menu hero thumbnail that lives in the **config panel** — the component is scoped to images rendered inside the phone preview. Easy to extend if you want it.
**Browser note:** two-finger twist is Safari-only (Chrome doesn't emit that gesture). Slider and ⇧+scroll are the fallback everywhere.

**Where:** upload an image anywhere, then press and hold it in the preview.
**Comments:**

---

## Deferred, blocked, dropped

| ID | Item | Status |
|---|---|---|
| #1 | Industry chips move to submission | **Blocked** — needs Nanai's real submission form |
| #6 | Progress journey | **P3** |
| #24 | Background image | **P2** — Nanai sending use-case examples |
| #26 | Full merchant-vs-internal submission split | **Waiting** on Nanai's written feedback |
| #10 | Loyalty scheme in setup | **Dropped** |
| #16 | Reorder the setup steps | **Dropped** — order stays Business → Online ordering → Branding |
| #22 | Custom icons | **Dropped** |
| #15b | Dynamic hours, favourite location | **Deferred** |

---

## What a future session needs to know (new architecture)

Additions to the mental model in the 08-31 summary:

**`src/prototype/imageAdjust.js` + `src/styles/19-image-adjust.css` (new)**
- `TARGET_SELECTOR` = `.pc-card-img.has-upload, .rw-img, .hb-img, .app-top-header .brand-mark.has-logo, .rw-block-banner`.
- Listens for `pointerdown` **delegated on `#app-shell`**, deliberately — the preview re-renders constantly, so direct listeners would be lost.
- `open()` injects a temporary `<img>` layer plus the crop box into the target, and a fixed tools panel next to the phone.
- `finish()` **bakes the result back as `backgroundImage`**, which is why every existing renderer keeps working with no changes.
- A MutationObserver on `#app-shell` fires the one-time coach mark on the first background-image change.
- To add a new upload point: add its selector to `TARGET_SELECTOR`. Nothing else.

**Screen reorder / rename (`productExperience.js`)**
- `initScreenReorder` + `syncScreenOrder` — reorders `#bottom-nav` and renumbers steps 4–8. Home is pinned by skipping it in the sortable set.
- `initScreenRenaming` + `applyScreenName` — injects a hover pencil into `.cp-page-title`; writes the phone nav label, the sidebar label, and a `.side-lbl-orig` element carrying the original name.

**New body class:** `more-list` (More screen list layout).
**New global:** `window.getCurrentStep()` — exposed by `guidedFlow.js` so other modules can restore editor position without a full `goToPage()`.

---

## Known risks to watch while reviewing

- The image-adjust tools panel is positioned off `#device-frame` — check it lands beside the phone at your window size.
- `.brand-mark` is only ~40px, so adjusting the **logo** is fiddly by design. Worth deciding whether the logo should use this at all.
- The second punch card is illustrative; the editor only drives the first.
- Reordering screens renumbers the sidebar live — confirm that reads as intentional rather than as a glitch.

---

## Next steps

1. **Your review** — comment on the items above.
2. **Deploy** (not started) — sync `src/` + `public/` into `before augost/html-commnet-vite-migration/app-builder-p1/`, leave the root files at the remote's version (the local ngrok `allowedHosts` and `ws` dep break `npm ci`), build, commit only `app-builder-p1/src` + `public`, push, then verify the live URL.
3. **Back to Nanai** for #1, #24 and the #26 split.
