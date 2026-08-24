# App Builder P1 review prototype

This is the Vite + React port of the App Builder P1 prototype. It keeps the original UI and interactions, compiles to ordinary static HTML/CSS/JavaScript in `dist/`, and preserves both review-comment modes.

| URL | Review storage | Intended use |
| --- | --- | --- |
| `/html-commnet/` | Open GitHub Issues and screenshot files on the `data` branch | Public GitHub Pages review |
| `/html-commnet/?mode=local` | `local-comments/comments.json` and `local-comments/assets/` | Private local iteration |

## Requirements

- Node.js 20.19+ on the Node 20 release line, or Node.js 22.12+ (Node.js 22 LTS is recommended)
- Python 3 for local comment storage

## Install and develop

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173/html-commnet/` for GitHub comment mode.

For local comments, one command starts Vite and the Python comment server:

```bash
npm run dev:local
```

Open `http://127.0.0.1:5173/html-commnet/?mode=local`. Vite proxies comment and screenshot requests to the Python server on port 8791.

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

The production files are written to `dist/`. Preview them at `http://127.0.0.1:4173/html-commnet/`.

To run local comments against the production build:

```bash
npm run preview:local
```

Then open `http://127.0.0.1:4173/html-commnet/?mode=local`.

You can also serve the compiled build and local API directly from Python:

```bash
npm run build
python3 local-comment-server.py
```

Then open `http://127.0.0.1:8791/html-commnet/?mode=local`.

## GitHub Pages

`vite.config.js` sets the repository base path to `/html-commnet/`. The workflow in `.github/workflows/deploy-pages.yml` installs locked dependencies, builds `dist/`, uploads it as the Pages artifact, and deploys it on pushes to `main` or manual dispatch.

In the repository's **Settings → Pages**, set **Source** to **GitHub Actions**. The expected public URL is `https://galcohen-ctrl.github.io/html-commnet/`. If the repository name changes, update both `base` in `vite.config.js` and the repository setting in `src/comments/config.js`.

No `gh-pages` package, deployment branch, or `npm run deploy` command is required.
