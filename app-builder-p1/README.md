# App Builder P1 review prototype

This is the Vite + React port of the App Builder P1 prototype. It keeps the original UI and interactions, compiles to ordinary static HTML/CSS/JavaScript in `dist/`, and preserves both review-comment modes.

| URL | Review storage | Intended use |
| --- | --- | --- |
| `/html-commnet/app-builder-p1/` | Open GitHub Issues and screenshot files on the `data` branch | Public GitHub Pages review |
| `/html-commnet/app-builder-p1/?mode=local` | `local-comments/comments.json` and `local-comments/assets/` | Private local iteration |

## Requirements

- Node.js 20.19+ on the Node 20 release line, or Node.js 22.12+ (Node.js 22 LTS is recommended)
- Python 3 for local comment storage

## Install and develop

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173/html-commnet/app-builder-p1/` for GitHub comment mode.

For local comments, one command starts Vite and the Python comment server:

```bash
npm run dev:local
```

Open `http://127.0.0.1:5173/html-commnet/app-builder-p1/?mode=local`. Vite proxies comment and screenshot requests to the Python server on port 8791.

If port 8791 is already occupied, choose another port for both processes:

```bash
PORT=8792 LOCAL_COMMENTS_PORT=8792 npm run dev:local
```

## Comment behavior

The React overlay in `src/comments/` owns the comment button, element highlighting, anchored pins, comment bubbles, screenshot paste/preview, and storage adapters.

- GitHub mode can read public comments without credentials. Adding a comment asks the reviewer for a GitHub token with Issues write and Contents write access. The token and reviewer name remain in that browser's local storage under `hc_tok` and `hc_name`; they are never committed to the project.
- GitHub screenshots are written to `comment-assets/app-builder-p1/` on the `data` branch and linked from the related issue.
- Local mode never calls GitHub. The Python server writes comments and screenshots beneath the gitignored `local-comments/` directory.
- Resolving a local comment deletes its JSON entry and associated local screenshots. Public GitHub comments are resolved through their linked issue on GitHub.
- Stable `data-comment-anchor` attributes and legacy selector fallbacks keep pins attached while the UI changes or navigates between app screens.

### Pull public review comments for Copilot

From `app-builder-p1/`, run:

```bash
npm run comments:pull
```

This reads the currently open `[APP-BUILDER-P1]` GitHub issues and creates a local, gitignored `review-comments/` folder containing normalized JSON, a readable Markdown summary, and downloaded screenshots. The public repository can be read without a token; set `GH_TOKEN` or `GITHUB_TOKEN` only if GitHub rate limits the request.

Ask the coding agent to read `review-comments/README.md` and `github-open-comments.json`, inspect every local screenshot, match `target.commentAnchor` first and `target.selector` second, implement and test the fixes, and leave the issues open until the deployed result is verified.

## Project structure

- `src/components/` contains the small React layout components.
- `src/templates/` contains the exact prototype markup, split by editor and phone section.
- `src/prototype/` contains the interaction runtime split by feature: navigation, bindings, branding, widgets, rewards, reordering, and setup.
- `src/comments/` contains the comment overlay and its GitHub/local adapters.
- `src/styles/` contains ordered CSS modules; `index.css` is the single style entrypoint.
- `local-comment-server.py` provides the local JSON/image API and can directly serve a compiled `dist/` build.

The visual markup remains deliberately stable for parity with the original prototype. New behavior should go into the relevant feature module instead of growing one global JavaScript file.

## Build and preview

```bash
npm run build
npm run preview
```

The production files are written to `dist/`. Preview them at `http://127.0.0.1:4173/html-commnet/app-builder-p1/`.

To run local comments against the production build:

```bash
npm run preview:local
```

Then open `http://127.0.0.1:4173/html-commnet/app-builder-p1/?mode=local`.

You can also serve the compiled build and local API directly from Python:

```bash
npm run build
python3 local-comment-server.py
```

Then open `http://127.0.0.1:8791/html-commnet/app-builder-p1/?mode=local`.

## GitHub Pages

`vite.config.js` sets the repository base path to `/html-commnet/app-builder-p1/`. The repository-root workflow in `.github/workflows/deploy-pages.yml` installs locked dependencies, builds this app, preserves the repository's other static prototypes, and overlays `dist/` at the public `app-builder-p1/` path before deploying the complete Pages artifact.

In the repository's **Settings → Pages**, set **Source** to **GitHub Actions**. The expected public URL is `https://galcohen-ctrl.github.io/html-commnet/app-builder-p1/`. If the repository or folder name changes, update both `base` in `vite.config.js` and the repository setting in `src/comments/config.js`.

No `gh-pages` package, deployment branch, or `npm run deploy` command is required.
