# App Builder P1 — Session Summary (2026-08-30 → 2026-08-31)

> **Superseded in part:** see `SESSION-SUMMARY-2026-09-02.md` for the Nanai + Celia feedback build. The architecture below is still accurate; Step 1, the ordering "Recommended" badge, the menu-source order and the footer label have since changed.

Complete handoff notes for the guided-flow prototype. Everything below was implemented in the **`App Builder P1 guided-flow`** project and verified live in the browser.

- **Runs at:** http://localhost:5174/html-commnet/app-builder-p1/ (`npm run dev`, base path `/html-commnet/app-builder-p1/`)
- **Status:** all changes are live on the local dev server. **Not yet deployed** to GitHub Pages — the public site (https://galcohen-ctrl.github.io/html-commnet/app-builder-p1/) still shows the older build.
- **Note:** a fresh load shows the welcome modal every time. That is intentional — the draft is cleared on init.

---

## How the code works — mental model

### Two independent state layers
1. **Guided flow** (`guidedFlow.js`) — owns the **sidebar step highlight**, the **config panel** shown in `.config-column`, and the **footer Back/Continue** buttons. Uses `flow.current` as the source of truth.
2. **Phone preview** — a separate DOM tree under `#app-shell`. Its active page is `.app-page.active` and its bottom nav highlight is `#bottom-nav .nav-item.active`. Changed via `window.goToPage()` in `coreNavigation.js`.

**Critical:** `window.goToPage()` also mutates the config-panel `cp-page` display AND the sidebar highlight. It's a "full navigation" call. When you want to change **only** the phone preview (e.g., after a step-2 sub-action), use the local `showPhonePage(target)` helper in `menuSource.js` — it only touches `.app-page.active` and `#bottom-nav`, leaving guided-flow state alone.

### Widget system (Home phone page)
- Every widget on the Home phone page has `data-widget="<key>"` (e.g. `profile`, `promo-cards`, `social`, `menu-reels`, `order-again`, `top-items`, `menu-categories`).
- Toggling is via `.hidden-slot` class controlled by the config-panel row `.toggle` state.
- `applyGoalPreset(name)` in `coreNavigation.js` enables/disables widgets from a preset list — `blank`, `loyalty`, `ordering`. **The ordering preset used to include `menu-reels`; it was removed** so reels stays off by default and only appears when the merchant explicitly enables it.
- Widget **DOM order** is enforced by `reorderPhoneWidgets()` in `reordering.js` — it reads the config-panel row order and moves phone widgets to match. Widgets not in the config panel drift to the bottom, so **any decorative element that must sit at a specific position needs an explicit pin** (see `.webview-cta-card` pin after profile).

### Body-class state machine
The prototype uses **body classes** as its main state broadcast channel. Key classes:

| Class | Meaning | Owner |
|---|---|---|
| `phone-preview-blank` | Step 1 before any edit — hides everything on the phone home page, shows the "Your app preview" placeholder | `guidedFlow.js goToStep` |
| `phone-header-only` | Only the top header (business name + logo) visible on the phone; other widgets hidden | `guidedFlow.js`, `orderingSetup.js` on hover-leave |
| `on-step-online-ordering` | Sidebar is on step 2. Hides the reels chip globally in the preview. | `guidedFlow.js goToStep` |
| `oo-mode-native` \| `oo-mode-webview` \| `oo-mode-skip` | Which ordering mode is committed/previewed | `orderingSetup.js applyMode` |
| `oo-connected` | Native ordering provider is actually connected (unlocks ordering widgets) | `orderingSetup.js applyMode` + `settingsModal.js` |
| `oo-webview-from-step2` | Merchant is inside the webview URL setup, but arrived from step 2 (not from Menu step). Hides Include-Menu chrome, kicker, top return banner. Swaps the Back/Continue footer for a single "Back to Online ordering" button. | `menuSource.js openWebviewSetup` |
| `menu-slot-webview` | The "Menu" bottom-nav tab has been renamed to "Order" (webview mode) | `coreNavigation.js setMenuSlotMode` |
| `focus-loyalty` \| `focus-ordering` \| `focus-blank` | Legacy focus preset applied | `guidedFlow.js reflectFocus` |

### Guided-flow steps
Defined in `guidedFlow.js`:
```
STEPS = [business, online-ordering, branding, home, rewards, locations, menu, more, publish]
```
- Steps 1–3 are **setup** (config panel = form). Steps 4–8 are **screen** editors. Step 9 is **publish**.
- `validateStep(key)` decides which steps count as done. Step Home has a special guard: `homeVisited` must be true — otherwise the initial `applyGoalPreset('blank')` at boot would seed profile + promo-cards and trip the "any widget on" check, so Home would appear ✓ on a fresh load.
- `businessEdited` tracks whether the merchant has typed anything in Step 1 fields. Controls whether Step 2 keeps the blank/header-only preview.

### Ordering step 2 — hover/commit model
- Merchant sees 3 radio-style cards: In-app ordering (native), Link your ordering website (webview), Not yet (skip).
- **Hover** an option: previews the mode (applies preset, sets body classes, removes `phone-header-only`). Leaving the option restores whatever was committed, or `phone-header-only` if nothing was committed.
- **Click** an option: commits it. Removes `phone-header-only`. Triggers side effects:
  - Native → opens the settings-modal provider wizard (via `openSettings('online-ordering', 'chooser')`)
  - Webview → calls `openWebviewSetup({ fromOrdering: true })` in `menuSource.js`
  - Skip → nothing extra
- `window.getOrderingMode()` is exposed so `guidedFlow.js` can decide whether to re-apply `phone-header-only` when navigating back to step 2.

### Webview from step 2 — the special path
When the merchant clicks "Link your ordering website" in step 2:
1. `commit('webview')` in `orderingSetup.js` runs, which calls `ctx.openWebviewSetup({ fromOrdering: true })`.
2. `openWebviewSetup` in `menuSource.js`:
   - Adds `body.oo-webview-from-step2`
   - **Swaps `cp-page` display** so `#cp-menu` is shown, `#cp-online-ordering` hidden — but does NOT call `window.goToStep('menu')`, so the sidebar highlight stays on Online ordering.
   - Shows the `.ms-screen[data-ms="webview"]` sub-panel inside `#cp-menu`.
3. CSS in `11-menu-source.css` (scoped by `body.oo-webview-from-step2`):
   - Hides `.px-menu-simple`, the Include-Menu screen switch, the `.ms-kicker`, and the top `#ms-webview-return` banner.
   - **Forces** `#cp-menu > .ms-screen[data-ms="webview"] { display: block !important }` — needed because the default rule `#cp-menu > .ms-screen{display:none !important}` requires `.px-show-advanced` on `#cp-menu`.
   - Hides `.cp-step-back` and `.cp-step-next` in the footer.
   - Shows `#gf-oo-return-btn` (a purple "Back to Online ordering" button) in the footer.
4. Merchant enters URL, clicks **Connect & load**:
   - 1-second loader on both `#ms-webview-connect` and `#gf-oo-return-btn` (spinner + "Connecting…" + disabled).
   - After 1 second: both go green (`.is-success` class), connect button label becomes "Reconnect & load", the `.ms-status` "Looks good — page reachable and secure (https)" chip is shown, and `showPhonePage('menu')` navigates the phone preview to the Order webview view (browser chrome + rendered menu).
5. Merchant clicks **Back to Online ordering** in the footer:
   - Validates the URL field — empty → red error under the field ("Please enter your ordering URL before returning."), no navigation.
   - Valid → removes `oo-webview-from-step2`, calls `showPhonePage('home')` to send phone back to Home, then `window.goToStep('online-ordering')` to swap the config panel back.

### Tooltip system
Two tooltip systems in the codebase, don't confuse them:
1. **`.oo-tip-btn`** in the ordering cards — JS-driven bubble. Hover/focus shows a `.oo-tip-bubble` div inserted next to the button. Uses `<span role="button" tabindex="0">` NOT `<button>` because the parent `.oo-opt` is already a `<button>` (nested buttons is invalid HTML and was breaking the flex layout).
2. **`.ms-info`** in the menu-source panel — pure CSS via `::after` pseudo-element. Hover shows the tooltip. **Critical fix:** the global `.config-column button { min-height: 44px }` rule was stretching these 14×14 info dots to 14×44. Fixed with a high-specificity selector `.ms-info, .config-column button.ms-info { min-height: 14px }`.

---

## What changed in this session (grouped by concern)

### 1. Fresh-refresh state bugs
- **Home step (4) auto-marked ✓** — `applyGoalPreset('blank')` at init seeded profile+promo-cards, so `validateStep('home')` returned true on a page you'd never visited. Fixed with `homeVisited` flag in `guidedFlow.js`; validation now requires `homeVisited && activeHomeWidgetCount() > 0`.
- **Draft persistence** was cleared on init (a change from the previous session) — this is intentional, don't restore it.

### 2. Business step (1) — blank phone until edit
- Added `body.phone-preview-blank` + `.phone-blank-placeholder` element in `phone/home.html` (dashed-border icon, "Your app preview / Start filling in your details to see your app come to life"). Styled in `03-config-panel.css`.
- Typing any business field (name, headline, business type) fires `revealPhonePreview()` in `guidedFlow.js` — sets `businessEdited = true`, removes `phone-preview-blank`, adds `phone-header-only`.
- `phone-header-only` shows only the top `.app-top-header` and `.category-badge`; everything else hidden.

### 3. Ordering step (2) — full UX rework
**Card copy** — `templates/config-online-ordering.html`:
- "Native integration" → **"In-app ordering"**. Desc shortened. Provider list ("Deliverect, Olo, DoorDash…") moved to tooltip.
- "Web view" → **"Link your ordering website"**. Adds "Members stay logged in automatically" (SSO) to desc. Tooltip explains the seamless-screen behavior + full-control settings.
- "Not yet" — unchanged.
- Muted `.oo-unlocks` group (strike-through Order Again / Top Items / Menu Categories) **removed** from the webview card — user found it discouraging.
- ⓘ tooltip button positioned **next to the card title** (in `.oo-opt-head`), not inside the note text.
- Tooltips: `<span role="button" tabindex="0">` (not `<button>` — was breaking layout by nesting inside the outer `.oo-opt` button).
- **Hover** shows tooltip bubble; **leave** dismisses. Click no longer needed.

**Preview behavior** — `orderingSetup.js`:
- Initial state on step 2 (no mode committed): phone stays in `phone-header-only` (only top section shown).
- `mouseenter` an option: removes `phone-header-only`, applies preset preview (shows widgets).
- `mouseleave`: re-adds `phone-header-only` if no mode committed, or restores the committed mode's preview.
- Commit: removes `phone-header-only` permanently for that mode.

**Reels chip** — global fix in `18-ordering-setup.css`:
```css
body.on-step-online-ordering .phone-reels-chip { display: none !important; }
```
Combined with removing `menu-reels` from the `ordering` preset widgets in `coreNavigation.js`, the reels chip stays off unless the merchant explicitly enables it in Home step's widget toggles.

**Outcome box fix** — the "Loyalty leads your home screen" green banner was showing as a blank green box because `.oo-outcome` sets `display: flex` which beats the `hidden` attribute. Added `.oo-outcome[hidden]{display:none}` in `18-ordering-setup.css`.

### 4. Webview CTA card in phone preview
When `body.oo-mode-webview`, a purple gradient CTA appears directly below the loyalty card:
- "Order online · Hungry? Order in seconds · Delivery or pickup — earn points on every order · [Order now →]"
- Element in `phone/home.html` (`.webview-cta-card` with `data-widget="webview-cta"`).
- Styled in `18-ordering-setup.css`.
- Positioning: `reorderPhoneWidgets()` in `reordering.js` special-cases the `profile` key to pin `[data-widget="webview-cta"]` right after the profile widgets (which include the loyalty card).

### 5. Sidebar stays on Step 2 when webview clicked
- `openWebviewSetup({ fromOrdering: true })` in `menuSource.js` swaps the config panel to `#cp-menu` WITHOUT calling `window.goToStep('menu')`.
- Clean panel view: hides Include-Menu switch, kicker, top return banner. See §"Webview from step 2 — the special path" above.

### 6. Footer "Back to Online ordering" with validation
- New button `#gf-oo-return-btn` in `ConfigPanel.jsx` footer with spinner + label.
- CSS in `11-menu-source.css`: default `display: none`; when `body.oo-webview-from-step2`, hides `.cp-step-back` and `.cp-step-next`, shows the return button.
- Click handler in `menuSource.js`:
  - Empty URL → sets `aria-invalid`, adds `.cp-input-error`, populates `#ms-webview-url-error` with "Please enter your ordering URL before returning."
  - Valid URL → removes body class, `showPhonePage('home')`, `window.goToStep('online-ordering')`.
- URL error `<div class="gf-field-error" id="ms-webview-url-error">` added to `config-menu.html`, right under the URL input.

### 7. Connect & load — loading and success states
Both `#ms-webview-connect` and `#gf-oo-return-btn` share the loading/success visuals:
- `setConnectState(state)` + `setReturnState(state)` in `menuSource.js` toggle `is-loading` / `is-success` classes and swap the label.
- CSS in `11-menu-source.css`:
  - `.ms-btn.is-loading, .gf-oo-return-btn.is-loading` — lighter purple, cursor progress, `.ms-btn-spinner` shown, `.ms-btn-ic`/`svg` hidden
  - `.ms-btn.is-success, .gf-oo-return-btn.is-success` — green background (uses `--ok` var)
- `.ms-btn-spinner` element added in `menuSource.js` init (for connect button) and in `ConfigPanel.jsx` (for return button).
- On click: both go to loading for 1 second (`setTimeout(1000)`), then success. Connect label becomes "Reconnect & load". Typing in URL resets both back to idle.

### 8. Phone jumps to Order webview on connect success
- New helper `showPhonePage(target)` in `menuSource.js` — swaps only `.app-page.active` and `#bottom-nav .nav-item.active` (does NOT touch config panel or sidebar).
- Called with `'menu'` after 1-second connect timeout completes (only when `state.fromOrdering`).
- Called with `'home'` when merchant clicks Back to Online ordering.
- The phone's Menu tab was already re-labeled to "Order" by `setMenuSlotMode('webview')` when the merchant committed the webview mode in step 2.

---

## Gotchas — hard-won lessons

- **Nested `<button>` inside `<button>` breaks layout in Chrome.** Use `<span role="button" tabindex="0">` for inline pseudo-buttons inside a larger button.
- **`.config-column button { min-height: 44px }` is a global sledgehammer** that stretches any button in the config panel. Always check for it when styling small icon buttons in `.config-column`. Override with high specificity or `min-height: <smaller>` on a more specific selector.
- **`[hidden]` attribute doesn't work if CSS forces `display: flex/block`** on the same element. Always add `.class[hidden]{display:none}` if `.class` sets a display.
- **`applyGoalPreset('blank')` runs at init** and seeds `profile` + `promo-cards` on. This trips any widget-count validator. Guard step validation with an explicit "have I visited this step?" flag.
- **Unicode `'` and `—` in files** can trip `replace_string_in_file` because tools may normalize them differently. If a replacement fails and the diff looks identical, fall back to a Python heredoc (`python3 << 'PYEOF' ... PYEOF`) via terminal — I did this successfully during the session.
- **`reorderPhoneWidgets()` pushes any element not in the config panel to the bottom.** For decorative widgets (like `.webview-cta-card`), you must pin them explicitly in the reorder loop, tied to a widget key that IS in the config panel.
- **`window.goToPage()` is a "full navigation" call** — it mutates phone active page, sidebar highlight, AND config panel display. For phone-only transitions from within a step-2 sub-action, use `showPhonePage(target)` in `menuSource.js` instead.
- **`.ms-screen` visibility requires `#cp-menu.px-show-advanced`.** The rule `#cp-menu > .ms-screen{display:none !important}` blocks a naïve override. When entering webview config from ordering, add an explicit `body.oo-webview-from-step2 #cp-menu > .ms-screen[data-ms="webview"]{display:block !important}`.
- **Preview draft persistence** — the initial change (reset-on-refresh) means every reload starts from a fresh state with the welcome modal. Don't try to "restore" this — it's intentional.
- **Config panel `cp-page` display is toggled by `showSetupPage(key)`** in `guidedFlow.js`. If you manually set `cp-page.style.display` (like `openWebviewSetup` does), it'll be overwritten the next time the merchant clicks a sidebar step. That's fine because the sidebar step also resets `flow.current`.
- **Body classes are the state broadcast layer.** Don't try to track state with JS-only variables that other modules need to read. Add a body class and CSS scope off of it. This makes it easy for CSS (which can't run JS) to react.

---

## File map — where things live

### Prototype JS
| File | Owns |
|---|---|
| `src/prototype/guidedFlow.js` | Step navigation, sidebar highlight, footer Back/Continue, business-field bindings, phone-header-only management, publish readiness |
| `src/prototype/orderingSetup.js` | Step 2 hover/commit for the 3 ordering cards, tooltip JS, `window.getOrderingMode()` |
| `src/prototype/menuSource.js` | Menu tab config panel: webview URL entry, PDF upload, online-ordering integration, manual builder. `openWebviewSetup`, connect loader/success, `showPhonePage` helper, URL validation |
| `src/prototype/coreNavigation.js` | `goToPage`, `setMenuSlotMode` (renames Menu tab to Order/QR), `applyGoalPreset`, sidebar collapse, template presets |
| `src/prototype/reordering.js` | `reorderPhoneWidgets` — drives phone widget order from config panel row order. Pins `.webview-cta-card` after profile |
| `src/prototype/promoWidgets.js` | Promo cards CRUD + phone rendering |
| `src/prototype/rewards.js` + `rewardsBlocks.js` | Rewards page editor |
| `src/prototype/settingsModal.js` | Provider settings, ordering-connection state, `window.isOrderingConnected` |
| `src/prototype/draftPersistence.js` | Draft save/restore (cleared at init by design) |

### Templates
| File | Contains |
|---|---|
| `src/templates/config-online-ordering.html` | The 3 ordering cards for step 2 |
| `src/templates/config-menu.html` | Menu source screens: chooser, webview, PDF, oo-integration, oo-custom, oo-connected, manual (build-method/categories/items) |
| `src/templates/phone/home.html` | Phone home page: header, empty canvas, phone-blank-placeholder, greet-row, loyalty-card, **webview-cta-card**, promo cards, social, ordering widgets, reels chip |
| `src/templates/phone/bottom-nav.html` | 5-tab bottom nav — 4th tab (`#nav-menu-slot`) label swaps between "Menu"/"Order"/"QR Code" |
| `src/templates/welcome-modal.html` | First-visit modal ("Build an app your customers want to return to") |

### Components
| File | Contains |
|---|---|
| `src/components/ConfigPanel.jsx` | Config-panel scaffold. **Contains the footer with Back, Continue, and the new `#gf-oo-return-btn`.** |

### Styles (numbered by load order)
| File | Contains |
|---|---|
| `01-editor-topbar.css` | Top bar |
| `03-config-panel.css` | Config-panel wrapper, hidden-slot util, empty-canvas, **phone-blank-placeholder** |
| `11-menu-source.css` | Menu-source screens. **Big session-2 additions:** `body.oo-webview-from-step2` rules, `.ms-info` fix, `.gf-oo-return-btn` styles, `.ms-btn.is-loading/.is-success` + spinner, `.ms-input.cp-input-error` |
| `13-guided-flow.css` | Sidebar steps, footer bar, `.gf-field-error` |
| `14-hover-ghost.css` | Widget ghost preview (previously in the deleted skeleton stylesheet) |
| `15-ordering-widgets.css` | Ordering widgets on the phone, `.phone-reels-chip.hidden/.dismissed` |
| `17-product-experience.css` | Product experience toggles, `.px-menu-simple`, `.px-menu-preview-note` |
| `18-ordering-setup.css` | Step-2 cards (`.oo-opt`, `.oo-tip-btn`, `.oo-tip-bubble`, `.oo-outcome`, `.oo-unlocks`), `body.on-step-online-ordering .phone-reels-chip { display: none }`, `.webview-cta-card` |

---

## Full end-to-end flow (for testing)

**Step 1 → Step 2 → Webview → Connect → Return** happy path:
1. Open app → welcome modal → "Start building" → **Step 1** (Business details). Phone shows blank placeholder.
2. Type business name → phone reveals with **only header** (business name + logo initials).
3. Click sidebar **Step 2** (Online ordering) → phone stays in header-only. 3 cards shown.
4. Hover "In-app ordering" → phone shows native preview (loyalty + ordering widgets, no reels).
5. Leave hover → phone reverts to header-only.
6. Click "Link your ordering website":
   - Config panel swaps to the clean webview URL entry (no Include-Menu chrome, no kicker, no top banner).
   - Sidebar stays on Step 2.
   - Phone shows Home with the purple "Order online / Hungry? Order in seconds" CTA card under the loyalty card.
   - Footer shows a single **Back to Online ordering** button.
7. Clear URL → click Back → **red error** "Please enter your ordering URL before returning." No navigation.
8. Type URL → click **Connect & load** → both buttons show **spinner + "Connecting…"** for 1 second.
9. After 1s → both buttons **green**. Connect label → "Reconnect & load". Success chip appears. Phone jumps to the **Order** page (browser chrome + rendered menu). "Order" tab in bottom nav highlighted.
10. Click **Back to Online ordering** → phone returns to Home; config panel goes back to Step 2 cards. Sidebar still on Step 2. "Link your ordering website" card shows a green "Menu connected" chip.
11. Continue → Step 3 Branding, etc.

---

## Open items / possible next steps

- **Deploy** — none of this is on GitHub Pages yet. Publishing = sync `src/` + `public/` into the deploy clone (`before augost/html-commnet-vite-migration/app-builder-p1/`) and push (workflow builds on push). Verify the live URL before closing anything.
- **"App focus" recap card** still exists on the Home / Branding steps. Was left in place; remove if PM wants that too.
- **Dead CSS**: `.px-import-*`, `.preview-edit-*`, `body.preview-edit-mode` rules from a previous session no longer match anything. Harmless.
- **`hoverSnapshot`** in `orderingSetup.js` — a previous refactor left it as an unused variable in the current hover flow. Cleanable.
- **"Not yet" (skip) mode on step 2** — no phone preview change beyond loyalty widgets. Could add a small "Add ordering later" nudge card on the phone.
- **Bundle**: after any deploy, verify the reordering pin for `.webview-cta-card` still works — it depends on `data-widget-toggle="profile"` being present as a config row.
- **Persistence**: current draft is cleared on refresh. If the PM wants to change that, the toggle is in `draftPersistence.js`.
