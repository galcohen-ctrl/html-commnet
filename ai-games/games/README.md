# Vapiano JSON Games

Three standalone HTML5 mini-games themed from the Vapiano Australia crawl. Open `index.html` from a local web server; each game fetches its own `theme.json` at runtime, so opening it directly as `file://` will not load the theme in most browsers.

```bash
cd vapiano-games
npx serve .
```

## What a painter agent changes

Each game folder contains one `theme.json`. This is the only merchant-specific file an agent normally needs to update:

- `css`: CSS custom property values. The game HTML uses these for all visual styling.
- `content`: visible copy, labels, and image choices.
- `assets`: merchant image paths. Keep paths relative to the JSON file.
- `gameplay`: small, clearly named tuning values. This includes win/loss contracts such as `timeLimitSeconds`, `scoreTarget`, `scorePerLanding`, and `airJumps`; changing these alters difficulty, not layout code.
- `agentHints`: explicit constraints and intent for future agents.

Keep the JSON valid. Use local, crawl-produced assets where possible. Asset paths currently point to the small, curated copy at the root of this folder so each game works as a portable bundle.

## Games

- `memory/`: Pasta Pairing, with move counter, timer, score, keyboard and touch support.
- `snake/`: Vapiano Loop, a wrapping snake game: crossing any edge returns the player at the opposite edge.
- `tower-jump/`: Menu Tower, an auto-bounce climber whose platforms are cropped menu images.

The games send optional `GAME_READY`, `GAME_STARTED`, `SCORE_UPDATE`, and `GAME_OVER` messages to a parent frame, matching the existing game-host pattern in this repository.
