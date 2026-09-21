# Snake

A simple browser-based snake game built with vanilla HTML, CSS and JavaScript on a `<canvas>`. No framework, no build step, no runtime dependencies.

## Requirements

- Node.js 18 or newer (only used to run the local dev server)

## Run locally

```powershell
npm run dev
```

Then open http://localhost:3000.

The dev server (`scripts/dev-server.mjs`) is a ~60-line static file server using only Node built-ins. It binds to `127.0.0.1` and is for local development only. A server is needed because the game uses ES modules, which browsers will not load over `file://`.

## Project structure

```
index.html                  markup, HUD and canvas element
src/styles.css              layout and theme
src/config.js               grid size, speed and colour settings
src/main.js                 canvas setup, game loop, rendering
scripts/dev-server.mjs      zero-dependency static dev server
.github/workflows/deploy.yml  GitHub Pages deployment
```

## How to play

Press Space or a direction key to start. Steer with the arrow keys or W A S D, or swipe on the board. Space pauses and resumes; after a game over it restarts. The game also pauses itself if you switch tabs.

Eat the red cell to score a point and grow by one segment. Hitting a wall or your own body ends the run. The best score is kept in `localStorage`.

## Features

- Fixed-step game loop, so speed is independent of display refresh rate
- Turn queue (up to two moves buffered), so fast direction changes are not dropped
- Reversals into the snake's own neck are rejected
- Food only ever spawns on a cell the snake does not occupy
- Filling the entire board counts as a win rather than a crash
- Best score persisted across sessions, with `localStorage` failures handled

Tuning lives in `src/config.js`: grid dimensions, cell size, speed in cells per second, starting length and colours.

## License

MIT
