# AI Generated Games Prototype · GitHub Pages Review Handoff

## Onboarding Prompt (paste into a fresh conversation)

This is the AI Games prototype (Loyalty Games AI / CE-3999). **Only work inside**
`Product_Strategy/Roadmap_2026/AI generated games/AI Games GitHub Pages Review/` — do not
touch the canonical file one level up (`AI Generated Games - Prototype.html`) unless
explicitly asked to mirror a fix there.

**Local server:** start with `python3 local-comment-server.py` (not plain `http.server`) —
but check first if it's already running (`lsof -i :8790`). It serves the prototype at
`http://127.0.0.1:8790/index.html?mode=local` and adds a small write API for the comment
overlay.

**Comment workflow:** reviewer comments (added via the on-page "Add comment" button in
local mode) save to `local-comments/comments.json`; pasted screenshots save as real image
files in `local-comments/assets/`. Read `comments.json` and check any referenced
screenshots for each comment, use `target.selector`/`target.context` to find the right
element, fix the prototype accordingly, then delete the resolved comment via DELETE
`/api/local-comments/<id>` once fixed. Validate every change with Playwright before saying
anything is done. Bump the `?v=` cache-busting query param on index.html's script/style
tags whenever you edit prototype.js/styles.css/github-comments.js — current versions are
`styles.css?v=20260715c`, `prototype.js?v=20260715e`, `github-comments.js?v=20260714d`.
Browser cache silently serves stale JS otherwise — confirm real changes loaded via
`window.fnName.toString()` checks in Playwright, not just visual screenshots.

There's also a public GitHub Issues mode (no query param, `galcohen-ctrl/html-commnet`
repo) for teammate feedback — don't confuse the two; never push to `main` unless
explicitly told to.

For broader context, read any `.md` files in this folder and in the parent
`AI generated games/` folder first.

## Current State of the Prototype (as of 2026-07-15)

- Screens 3 (Generate+Config) and 4 (Games table) were merged into one screen,
  `#s-config`. Nav is now `1·Empty, 2·Scrape+Gaps, 3·Generate+Games, 4·Home card, 5·Arena,
  6·Play+states` — there is no separate "games table screen" anymore.
- Each game card has a lifecycle: **Draft → Ready → On (Active)**, with **Paused** as a
  side-state from On.
  - **Draft**: header shows "Save configuration" next to the grey "Draft" chip, always
    enabled. Clicking it saves immediately (no modal) and moves the game to **Ready**.
  - **Ready**: header shows a green "Turn on game" button next to the blue "Ready" chip.
    There is **no footer Save button in Ready state** — any field edits made while Ready
    are persisted automatically when "Turn on game" is clicked (via `saveConfigValues()`
    called inside `askActivate()`), so nothing is lost.
  - **On/Active**: header shows "Use in Campaign" + "Pause". No save button appears in the
    header. If the merchant edits any field, a "Save changes" button appears in the
    **bottom-right footer** of that card (hidden by default, shown via
    `markConfigDirty()`); clicking it shows a short one-line confirmation ("The updated
    configuration will affect all existing and future eligible Members") before applying.
  - **Paused**: unchanged — footer "Save changes" button always visible (not gated).
- Turning on a game opens a Campaign-first handoff modal (`showCampaignHandoff()`): two
  numbered steps (1. define audience — example "$100 spent in last 3 months" + apply
  eligibility tag, 2. send message with the game deep link), followed by one compact
  "Como handles the rest" line explaining automatic Gift delivery + auto-untagging after
  the win limit. No technical Rule cards are shown to the merchant.
- The Reward field was renamed to "Gift" and uses a Como-style "Send Benefit" picker
  (search, Type/Status filters, Gifts list, "Create Gift" placeholder link) instead of a
  plain `<select>`.
- Game cards in the list now each have their own spacing (12px margin) and shadow
  (`0 2px 8px`), not a flat divider-line list.
- The "LOCAL MODE" badge is positioned top-left (not centered) so it doesn't cover the nav
  bar.
- Full backend/developer flow documentation (ownership boundaries, state model, Campaign
  distribution, access checks, win/Gift processing, `submitEvent` field mapping,
  pause/resume, multi-Campaign reuse) lives in `AI-GAMES-CAMPAIGN-INTEGRATION-FLOWS.md` in
  this same folder, with separate Mermaid diagrams per scenario — keep it in sync if you
  change related UI behavior.
- The config-screen "Game" phone preview is now a REAL playable game (an iframe), not a
  mocked emoji board. `games/` in this folder is a symlink to the standalone
  `vapiano-games` project (`~/Documents/very----shit-projects/ai-games-copy-for-html-demo/vapiano-games`),
  kept outside this repo so it isn't duplicated or accidentally pushed to GitHub Pages —
  replace the symlink with real copied files before ever pushing this folder to `main`.
  g1/g2/g3 are Vapiano Loop (snake), Pasta Pairing (memory), Menu Tower (tower-jump).
  Each real game's own `theme.json` (`content.title`/`meta.pageTitle`) is the source of
  truth for in-game copy; saving a renamed "Game name" calls `POST /api/game-theme`
  (new endpoint in `local-comment-server.py`, path-validated against traversal) to patch
  that file, then reloads the iframe. Real games `postMessage({type:'GAME_OVER', reason})`
  on completion; prototype.js catches that and swaps the iframe for Como's own branded
  win/lose screen showing the merchant's actually-configured Gift, instead of the game's
  own generic completion overlay. See repo memory for full details and known gaps
  (score/wins not yet synced to `theme.json`; games are still Vapiano-branded, not
  reskinned to match the demo "Pancake Parlour" merchant).

## What This Folder Is

This is the GitHub Pages-compatible review version of the AI Generated Games prototype.

Active files:

- `index.html` — split prototype markup
- `styles.css` — prototype UI styles
- `prototype.js` — prototype behavior and screen navigation
- `comment-overlay.css` — inline commenting UI styles
- `github-comments.js` — GitHub-backed inline commenting logic + local-mode comment client
- `local-comment-server.py` — local dev server (port 8790) with a small write API for the
  local-mode comment overlay; serves the prototype at `http://127.0.0.1:8790/index.html`
- `local-comments/` — `comments.json` + `assets/` for local-mode reviewer comments and
  pasted screenshots
- `AI Generated Games - Prototype.backup-single-file-20260709.html` — exact backup of the original single-file prototype

The original file in the parent folder was not edited.

> Note: the "Validation Completed" section below describes an earlier plain
> `http.server` setup used before `local-comment-server.py` and `?mode=local` existed.
> Use `local-comment-server.py` going forward — see the onboarding prompt above.

## GitHub Repo

Target repo:

`https://github.com/galcohen-ctrl/html-commnet`

Recommended GitHub Pages URL after push:

`https://galcohen-ctrl.github.io/html-commnet/ai-games-review/`

## Comment Architecture

The prototype is static and works on GitHub Pages. There is no local server.

Comments are stored as GitHub Issues in `galcohen-ctrl/html-commnet`.

Screenshots pasted into a comment are uploaded to the repo's `data` branch under:

`comment-assets/ai-generated-games/`

Save order:

1. Create the GitHub issue first.
2. Upload pasted screenshots to the `data` branch using the new issue number in the filename.
3. Patch the issue body with the final screenshot links.

This avoids orphan screenshot files if issue creation fails.

The issue body embeds structured JSON in an HTML comment:

```html
<!-- hc:comment
{
  "version": 3,
  "project": "ai-generated-games",
  "page": "prototype",
  "screen": "table",
  "name": "Reviewer",
  "comment": "Comment text",
  "target": {
    "selector": "#s-table .grow-row:nth-of-type(2)",
    "context": "Short Stack Panic",
    "relativeX": 0.5,
    "relativeY": 0.5,
    "fallbackClientX": 500,
    "fallbackClientY": 300
  },
  "images": [
    {
      "path": "comment-assets/ai-generated-games/c_...",
      "url": "https://raw.githubusercontent.com/galcohen-ctrl/html-commnet/data/comment-assets/ai-generated-games/c_..."
    }
  ]
}
-->
```

The structured JSON is the source of truth for the new comment overlay. The readable Markdown below it is for humans.

`github-comments.js` paginates through open issues in batches of 100, then filters to `[PROTOTYPE]` issues for this project.

## Pin Anchoring

New comments are anchored to elements, not page coordinates:

- `target.selector` identifies the DOM element
- `target.relativeX` and `target.relativeY` store the click position inside that element
- Pins are recalculated on scroll, resize, screen changes, and DOM mutations

Old issues that only have `Coordinates: x=..., y=...` still render as legacy fallback pins.

## Required Reviewer GitHub Token

Do not embed a token in the code.

Each reviewer should paste a fine-grained GitHub PAT into the setup modal.

Required repository access:

- Repository: `galcohen-ctrl/html-commnet` only
- Permissions:
  - **Issues: Read and write**
  - **Contents: Read and write**
  - Metadata read is automatic

Why:

- Issues write creates comments
- Issues read loads existing open comments
- Contents write uploads pasted screenshots to the `data` branch
- Contents read lets GitHub resolve file metadata for uploaded assets

## Existing Workflow

The repo has `.github/workflows/export-comments.yml`.

It runs when issues change and writes open `[PRD]` / `[PROTOTYPE]` issues to `comments.json` on the `data` branch. This avoids redeploying GitHub Pages on every comment.

This new overlay still creates `[PROTOTYPE]` issues, so the existing workflow continues to pick them up.

Screenshots are also stored on the `data` branch. This is intentional and does not conflict with the workflow because the workflow only stages `comments.json`.

The workflow was hardened with a `git pull --rebase origin data` + retry loop before pushing, so a screenshot commit on the `data` branch should not cause a non-fast-forward failure.

## Redeploy Policy

GitHub Pages is configured as a legacy branch deployment from:

- branch: `main`
- path: `/`

Reviewer comments should **not** change `main`.

Expected behavior:

- Creating/editing/closing issues may run `.github/workflows/export-comments.yml`.
- That workflow commits only `comments.json` on the `data` branch.
- Pasted screenshots are uploaded only to the `data` branch under `comment-assets/ai-generated-games/`.
- None of the above should redeploy the GitHub Pages prototype.

Pages should redeploy only when Copilot/developer work is complete and prototype source files are intentionally pushed to `main`.

If comments ever cause redeploys again, first check whether Pages source was changed away from `main` `/`, or whether a new workflow deploys Pages on issue events or `data` branch pushes.

## How Copilot Should Read Comments

Preferred:

1. Open GitHub Issues in `galcohen-ctrl/html-commnet`.
2. Filter open issues with:
   - title starts with `[PROTOTYPE]`
   - issue body JSON has `"project": "ai-generated-games"`
   - or label `ai-games`
3. For each issue, read the `hc:comment` JSON block.
4. Use:
   - `screen`
   - `target.selector`
   - `target.context`
   - `comment`
   - `images[].url`

Fallback:

Read `comments.json` from the `data` branch. It contains issue bodies, so the same `hc:comment` JSON can be parsed from each body.

## How Copilot Should Clear Comments After Fixing

Do not edit the GitHub Pages HTML to clear comments.

After implementing requested fixes:

1. Close the relevant GitHub issues for this prototype.
2. Only close issues where:
   - title starts with `[PROTOTYPE]`
   - body JSON has `"project": "ai-generated-games"` or label is `ai-games`
3. Leave unrelated `[PRD]` or other prototype issues alone.
4. Optional cleanup: remove unused screenshot files from the `data` branch under `comment-assets/ai-generated-games/`.

The workflow will update `data/comments.json` after issues are closed.

## Validation Completed

Local static server:

```bash
cd "/Users/galcohen/Documents/Gal-PM-work/Product_Strategy/Roadmap_2026/AI generated games/AI Games GitHub Pages Review"
python3 -m http.server 8790
```

Validated with Playwright:

- split page loads with no runtime errors
- exact single-file backup and split page match across:
  - initial Empty screen
  - Scan screen
  - Member Home screen
- comment setup modal opens
- JavaScript syntax checks pass for `prototype.js` and `github-comments.js`

## Important Constraints

- Keep scripts as classic scripts, not ES modules. The prototype still uses inline `onclick` handlers that depend on global functions from `prototype.js`.
- Keep `github-comments.js` loaded after the comment overlay DOM in `index.html`.
- Do not commit tokens.
- Do not store screenshots on `main`; they should go to the `data` branch through the Contents API.
- Do not remove the backup file unless Gal explicitly asks.

## Open Follow-Ups (pending Jira tickets)

Notes from reviewer comments that aren't prototype bugs — carry these into the real
tickets when they're written, then remove the item from this list.

- **Security review — brand-asset file upload ("📂 Browse files", Empty screen):**
  check with Doron (Hub 2 dev lead) on the security implications and file size
  limits for merchant-uploaded brand assets, then make sure this is captured on the
  correct Jira user story.
- **Reuse the AI SDK feedback component ("🎮 Request new games for your brand"
  fake-door modal, Generate+Games screen):** when this is actually built, it should
  reuse the same AI feedback component already available in the AI SDK rather than
  a new bespoke one.
