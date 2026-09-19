# Snake game — project conventions

## Stack

Vanilla HTML, CSS and JavaScript (ES modules) with a `<canvas>` renderer. No framework, no bundler, no runtime dependencies. Keep it that way unless there's a clear reason not to.

## Commands

- Run locally: `npm run dev` (serves the repo root at http://localhost:3000)
- There is no build step. Files are deployed exactly as they sit in the repo.
- There is no test runner set up yet.

## Conventions

- Gameplay tunables (grid size, speed, colours) live in `src/config.js`. Don't hardcode them elsewhere.
- Game logic lives in `src/main.js`; keep update (state changes) and render (drawing) separate.
- The canvas is sized from `CONFIG.cols/rows/cellSize`; CSS scales it for display only.
- Positions are grid cells, not pixels. Convert to pixels only when drawing.
- Keep the game loop fixed-step: `requestAnimationFrame` drives frames, but state updates only every `1000 / CONFIG.speed` ms so speed is frame-rate independent.
- Accessibility: keep the score in a live region and keep the game playable by keyboard.

## Environment note

npm cannot reach the public registry on this machine (TLS interception, `UNABLE_TO_VERIFY_LEAF_SIGNATURE`). Prefer solutions using Node built-ins over new packages.
