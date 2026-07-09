# AI Generated Games Prototype · GitHub Pages Review Handoff

## What This Folder Is

This is the GitHub Pages-compatible review version of the AI Generated Games prototype.

Active files:

- `index.html` — split prototype markup
- `styles.css` — prototype UI styles
- `prototype.js` — prototype behavior and screen navigation
- `comment-overlay.css` — inline commenting UI styles
- `github-comments.js` — GitHub-backed inline commenting logic
- `AI Generated Games - Prototype.backup-single-file-20260709.html` — exact backup of the original single-file prototype

The original file in the parent folder was not edited.

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
