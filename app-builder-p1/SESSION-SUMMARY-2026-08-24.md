# App Builder P1 (guided-flow) — Session Summary

**Date:** 2026-08-24
**Project:** `App Builder P1 guided-flow/` — the Vite + React port of the Como App Builder P1 review prototype
**Local dev URL:** `http://127.0.0.1:5174/html-commnet/` (GitHub comment mode) · add `?mode=local` for the local comment server
**Target repo/branch:** `galcohen-ctrl/html-commnet` → branch `feature/app-builder-p1-vite-migration`, subfolder `app-builder-p1/`

---

## 1. What this project is

A no-backend, interactive **spec prototype** of the future Como App Builder editor (NOT production code). Two surfaces bound together:

- **Left = config panel** (`#config-panel`) — the merchant's editing surface, driven by a sidebar stepper (business → branding → home → rewards → locations → menu → more → publish).
- **Right = live phone preview** (`#app-shell`) — reflects config changes instantly via CSS-var / class-toggle / DOM updates.

Behavior is split by feature under `src/prototype/` and wired by `initPrototype()` in `src/prototype/index.js`. Markup is split by feature under `src/templates/` and injected via `?raw` imports + `StaticMarkup`. Styles are ordered CSS modules under `src/styles/` (single entrypoint `index.css`).

---

## 2. What we did this session

### 2a. Bug fixes to the existing "Add widget" + reorder flow
- **Added widget landed in the wrong place.** New widgets were inserted between the "Click + to add" hint and the "Add widget" button. Fixed `buildWidgetRow` to insert *above* the hint so the hint stays anchored to the button.
- **Skeletons drifted out of order on the phone.** `reorderPhoneWidgets` only moved real `[data-widget]` elements, never their `.gf-skel-widget` skeleton placeholders — so a newly added widget rendered above the skeletons. Fixed the reorder pass to move each widget's skeleton alongside it.
- **Couldn't drag rows that were toggled off.** `initReorderable` gated dragging on `.cp-widget-row.on`. Loosened it so any row (on or off) can be reordered — merchants often plan layout before turning widgets on.

### 2b. Online-ordering widgets (the main feature — "Ships 1–3")
Added a full **online-ordering focus** to the Home step with four new widgets, all gated behind the native online-ordering integration.

**Preset + gating**
- `applyGoalPreset('ordering')` now seeds the four ordering widgets + Profile & Loyalty. Merchants can drag-reorder everything freely (positions are NOT fixed) — **except the Menu Reels chip**, which is pinned to the top of the phone.
- The four ordering widget rows are **gated**: while online ordering is not connected, each row shows a lock icon, dims to 62% opacity, and shows a "Connect online ordering to enable" tooltip on hover.
- Clicking a locked row opens the **Online Ordering setup wizard** (settings modal → provider chooser). A `window.orderingWizardOrigin` value (`home-widget:<key>`) records where the merchant came from.
- When the wizard finishes (`como:ordering` event, `reason === 'saved'`), gating clears, the specific widget the merchant clicked **auto-toggles ON**, the view returns to the Home step, and the row scrolls into view.

**The four widgets** (each follows the existing config-row → level-2 drill → level-3 edit → phone-template → skeleton pattern):
- **Order Again** — hero/strip card of the member's last order (image, meta, reorder CTA). Layout, show-image, show-meta, copy, and fallback controls.
- **Top Items** — horizontal carousel/grid of bestsellers pulled from the ordering menu. Add/remove/reorder items, per-item edit, show-price / see-all toggles.
- **Menu Categories** — 2- or 3-column tile grid of menu categories. Add/remove, per-category edit, columns + show-count controls.
- **Menu Reels** — TikTok-style vertical video. A floating **chip** (pinned top-of-phone, ✕ dismiss) opens a **half-sheet modal** with swipe-up/down between reels, per-reel autoplay seconds, per-reel expiration date, and a CTA overlay. Includes a "Test cold-launch open" preview button and an automatic cold-launch open ~800 ms after load when enabled.

**Mock data** lives in `src/data/orderingMock.js` (Unsplash CDN images + Pixabay MP4 URLs).

### 2c. Loyalty card reorder fix
`.loyalty-card` on the phone used `data-widget="stats"` while its config row used `data-widget-toggle="profile"`, so reorder passes never moved it — it drifted to the bottom. Changed the loyalty card to `data-widget="profile"` (same key as its `.greet-row` sibling) and made `reorderPhoneWidgets` use `querySelectorAll` so all elements sharing a key move together.

### 2d. Config panel sticky-footer bug (fields hidden behind "Save and continue")
The `.cp-step-foot` was `position: sticky` *inside* the scrolling `.config-panel`, so scrolled-down fields ended up hidden underneath it on many steps. Fixed by restructuring: `.config-panel` (scrolling) and `.cp-step-foot` (always visible) are now siblings inside a new `.config-column` flex-column wrapper — the footer sits **outside** the scroll area. Verified across all 8 wizard steps.

### 2e. Ordering-widget toggles did nothing
The config toggles (`Show item image`, `Show order date + location`, `Show price`, `Show "See all" link`, plus `mc-toggle-count`, `mr-toggle-autoopen`, `mr-toggle-dismiss`) carry the `.toggle` class, so the shared `wireToggle` in `bindings.js` already flips `.on`. My handlers *also* flipped it — netting to no change. Removed the redundant `this.classList.toggle('on')` from all 7 handlers so they only read the state the shared handler set. (This is the established pattern used elsewhere, e.g. menu-source `data-web-opt` toggles.)

---

## 3. Files changed

**Created**
- `src/data/orderingMock.js`
- `src/prototype/orderingWidgets.js`
- `src/templates/config/order-again.html`
- `src/templates/config/top-items.html`
- `src/templates/config/menu-categories.html`
- `src/templates/config/menu-reels.html`
- `src/templates/phone/reels-modal.html`
- `src/styles/15-ordering-widgets.css`

**Modified**
- `src/prototype/index.js` — register `initOrderingWidgets`
- `src/prototype/coreNavigation.js` — ordering preset seeds new widgets (respects gating)
- `src/prototype/reordering.js` — skeleton-aware reorder; multi-element per key; reels chip is fixed-slot
- `src/prototype/promoWidgets.js` — add-widget row insert position fix
- `src/prototype/settingsModal.js` — expose `window.isOrderingConnected`
- `src/prototype/bindings.js` — (unchanged logic; referenced by the toggle fix)
- `src/templates/config/home-master.html` — 4 new gated widget rows
- `src/templates/phone/home.html` — reels chip + 3 phone widgets + 4 skeleton blocks; loyalty card `data-widget` fix
- `src/components/ConfigPanel.jsx` — import new drills; `.config-column` footer restructure
- `src/components/PhonePreview.jsx` — inject reels modal
- `src/styles/03-config-panel.css` — `.config-column` layout
- `src/styles/13-guided-flow.css` — non-sticky `.cp-step-foot`
- `src/styles/index.css` — import `15-ordering-widgets.css`

---

## 4. Architecture notes (for whoever continues this)

- **Gating check:** `window.isOrderingConnected()` (exposed by `settingsModal.js`). Body gets `.oo-connected` when true; gated rows use `.cp-oo-widget.locked`.
- **Wizard origin routing:** locked-row click → capture-phase listener in `orderingWidgets.js` sets `window.orderingWizardOrigin = 'home-widget:<key>'` and calls `window.openSettings('online-ordering','chooser')`. On `como:ordering { reason:'saved' }` the origin is consumed (auto-toggle + navigate + scroll) then cleared.
- **Reels chip is pinned:** its config row has `.cp-fixed-slot` (excluded from drag + from `reorderPhoneWidgets`); the phone chip `.phone-reels-chip` is `position:absolute; top:6px`.
- **Toggle convention:** config toggles carry `.toggle`; the shared `wireToggle` flips `.on`. Feature handlers must only *read* `this.classList.contains('on')` — never flip it again.

**Known nits**
- Pixabay MP4 URLs may 404 depending on CDN state; the poster image still renders. Swap URLs in `orderingMock.js` before a demo if needed.
- Config toggles that sit on a bare `.toggle` span (not wrapped in `<label>/<button>`) anchor comments to the enclosing region rather than the individual toggle — this matches all pre-existing toggles, not a regression.

---

## 5. How to push to GitHub

> This folder is **not** a git repo on its own. The content ships into the `galcohen-ctrl/html-commnet` repo, branch `feature/app-builder-p1-vite-migration`, subfolder `app-builder-p1/`.

```bash
# 1. Clone (or reuse an existing clone) of the target repo
git clone https://github.com/galcohen-ctrl/html-commnet.git
cd html-commnet

# 2. Check out the feature branch (it already exists on the remote)
git fetch origin
git checkout feature/app-builder-p1-vite-migration

# 3. Sync the guided-flow contents into app-builder-p1/ — EXCLUDE build/install/local artifacts
rsync -av --delete \
  --exclude node_modules \
  --exclude dist \
  --exclude local-comments \
  --exclude .DS_Store \
  "/Users/galcohen/Documents/Gal-PM-work/Product_Strategy/Roadmap_2026/App Builder Project/App Builder P1 guided-flow/" \
  ./app-builder-p1/

# 4. Also copy this summary into the same subfolder (see section 6)
cp "/Users/galcohen/Documents/Gal-PM-work/Product_Strategy/Roadmap_2026/App Builder Project/App Builder P1 guided-flow/SESSION-SUMMARY-2026-08-24.md" \
  ./app-builder-p1/

# 5. Commit + push
git add app-builder-p1
git commit -m "App Builder P1: online-ordering widgets, reorder/footer/toggle fixes"
git push origin feature/app-builder-p1-vite-migration
```

**Caveats to verify before assuming a deploy:**
- The local `deploy-pages.yml` triggers on **push to `main`** + `workflow_dispatch`, and builds from the **repo root** (`npm ci` / `npm run build` / upload `dist`). If the app lives in `app-builder-p1/`, the repo-root workflow must either `cd app-builder-p1` before building, or a workflow must exist at the **repo root** `.github/workflows/` (GitHub ignores workflows in subfolders).
- Pushing to a **feature branch** will not trigger a `main`-gated deploy. Confirm the repo's **Settings → Pages** source and the actual root workflow. If needed, run the workflow via **workflow_dispatch**, or open a PR to `main`.
- `vite.config.js` sets `base: '/html-commnet/'`. If Pages serves the app from a different path (e.g. a subfolder), the `base` and the comment `repository`/`page` in `src/comments/config.js` must match, or assets and comment calls will 404.

---

## 6. Instructions for the agent reading this summary

**You must:**

1. **Push this project** to `galcohen-ctrl/html-commnet`, branch `feature/app-builder-p1-vite-migration`, subfolder `app-builder-p1/` (section 5). **Also push this summary `.md` into that same branch/subfolder.**

2. **Watch the GitHub Action deploy.** After pushing, monitor the Actions tab for the Pages build/deploy. If the feature branch doesn't auto-deploy (see caveats), trigger `workflow_dispatch` or confirm the Pages source. Grab the deployed public URL from the Action output (expected shape: `https://galcohen-ctrl.github.io/html-commnet/`).

3. **Test PUBLIC comments end-to-end** on the deployed site (default GitHub mode — do NOT use `?mode=local`):
   - Add a comment; when prompted, supply a GitHub token with **Issues: write** and **Contents: write**. Confirm the comment is created (a GitHub Issue) and reappears on reload.
   - **Attach a screenshot to a comment** and confirm it uploads to `comment-assets/app-builder-p1/` on the `data` branch and renders back in the comment bubble.

4. **Verify comment RELATIVITY (not sticky/global):**
   - Pins must anchor to **their actual target element** and move/scroll with it — they must NOT float sticky above everything.
   - Pins must **hide when their target isn't on screen** (e.g. a comment on a Home-step field must not appear on the Rewards step). Navigate between sidebar steps and confirm pins show only on the right screen.
   - **Tooltip-specific test:** hover a control that reveals a tooltip/help text, then comment on that specific tooltip message text only. The comment bubble number must attach to **that specific text element**, not the whole panel/region.

5. **Verify the NEW components all support relative comments.** (Early in this work, the wizard redesign had components missing anchor scoping, so pins appeared on ALL screens and lost relativity — do not let that regress.) Explicitly test adding a comment on each of these and confirm the pin is relative and screen-scoped:
   - **Phone preview (Home):** Order Again card (+ its Reorder button), Top Items cards (+ "See all"), Menu Categories tiles, Menu Reels chip, and inside the **Reels half-sheet modal** (title, CTA button).
   - **Config panel (Home step drills):** Order Again / Top Items / Menu Categories / Menu Reels drills and their fields (radios, toggles, inputs, per-item level-3 editors).
   - **The four gated widget rows** in the Home widget list (locked state + tooltip).
   - Confirm each new phone widget carries a `data-widget` and each config drill carries a `data-detail` (these feed the anchor system's screen-scoped selectors), and that they live inside the existing `data-comment-anchor` regions (`phone-screen`, `config-home`). If any new element produces a global/sticky pin, add a page-scoped `data-comment-anchor` or ensure it sits inside one.

**How the anchor system works (reference):** `src/comments/anchors.js` → `chooseCommentAnchor` prefers a specific control/content element (`button`, `input`, `label`, `p`, `li`, `.cp-widget-row`, `.cp-detail`, `.cp-radio-group`, …), then a durable `[data-comment-anchor]`, then the nearest meaningful block. `selectorForElement` builds a **screen-scoped** unique selector (using `data-widget` / `data-detail` and the enclosing `.app-page[data-page]` / `#cp-*`). `findCommentTarget` returns `null` when a stored selector doesn't match on the current screen, which is what keeps pins from leaking across screens.
