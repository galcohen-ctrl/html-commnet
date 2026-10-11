# Comment relay (Google Apps Script)

Lets anyone comment on the App Builder prototypes with only their name or email.
The GitHub token stays in Apps Script; the browser never sees it.

```
prototype page --(POST meta + screenshots, text/plain)--> Apps Script web app
Apps Script --(GITHUB_TOKEN)--> GitHub: create issue, upload screenshots to data branch
prototype page <-- issue JSON -- Apps Script        (pins still load from the public GitHub API)
```

## What the relay enforces (`Code.gs`)
- Only pages listed in `ALLOWED_PAGES` (`app-builder-p1`, `app-builder-vision`).
- It builds the issue title, labels and body itself: `[<PAGE>] …`, labels `web-comment` + page, the same `hc:comment` block the overlay parses.
- Name required (max 80 chars), comment max 3000, up to 3 screenshots (PNG/JPG/WEBP/GIF, 5 MB each) written only to `comment-assets/<page>/` on the `data` branch.
- `@mentions` are broken in the visible text; `<`/`>` are escaped inside the JSON block.
- Rate cap: 40 comments per 10 minutes overall, 15 per name.

## Setup
1. Create a **fine-grained PAT** for `galcohen-ctrl/html-commnet` only: Repository permissions **Issues: Read and write**, **Contents: Read and write**.
2. In the Apps Script project: Project Settings > Script properties > add `GITHUB_TOKEN` = the PAT.
3. Paste `Code.gs`, save, then Deploy > New deployment > Web app: Execute as **Me**, Who has access **Anyone**. Approve the permission prompt.
4. Put the `/exec` URL in `relayUrl` in `src/comments/config.js` of both prototypes and publish.

To update the code later: edit, save, then Deploy > Manage deployments > edit the existing deployment > Version: New version (keeps the same URL).

Test locally: `GET <exec URL>` returns `{"ok":true,"service":"html-commnet comment relay",...}`.
