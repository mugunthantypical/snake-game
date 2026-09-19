import { CONFIG, COLORS } from "./config.js";

/*
 * Snake.
 *
 * Positions are grid cells, not pixels; pixels only appear in the draw helpers.
 * State changes happen in update() on a fixed step, drawing happens in render()
 * once per animation frame. Keeping those separate is what makes the game speed
 * independent of the display refresh rate.
 */

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

const ui = {
  score: document.getElementById("score"),
  best: document.getElementById("best"),
  status: document.getElementById("status"),
  start: document.getElementById("start"),
  pause: document.getElementById("pause"),
};

// Make sure the drawing surface matches the configured grid.
canvas.width = CONFIG.cols * CONFIG.cellSize;
canvas.height = CONFIG.rows * CONFIG.cellSize;

/** @typedef {{ x: number, y: number }} Cell */

const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** Keyboard bindings. `event.key` is lowercased before lookup. */
const KEY_TO_DIRECTION = {
  arrowup: DIRECTIONS.up,
  w: DIRECTIONS.up,
  arrowdown: DIRECTIONS.down,
  s: DIRECTIONS.down,
  arrowleft: DIRECTIONS.left,
  a: DIRECTIONS.left,
  arrowright: DIRECTIONS.right,
  d: DIRECTIONS.right,
};

/** Fresh game state. Called on load and on every restart. */
function createState() {
  const midY = Math.floor(CONFIG.rows / 2);

  /** @type {Cell[]} head first, tail last */
  const snake = [];
  for (let i = 0; i < CONFIG.startLength; i += 1) {
    snake.push({ x: Math.floor(CONFIG.cols / 2) - i, y: midY });
  }

  return {
    snake,
    direction: DIRECTIONS.right,
    /**
     * Direction changes wait here until the next step. Queueing (rather than
     * writing straight to `direction`) means a fast turn like right-then-up
     * is not swallowed when both keys land inside a single step.
     * @type {Cell[]}
     */
    pending: [],
    food: { x: Math.floor(CONFIG.cols * 0.75), y: midY },
    score: 0,
    running: false,
    gameOver: false,
    won: false,
  };
}

let state = createState();
let bestScore = loadBestScore();

/* ------------------------------------------------------------------ *
 * Best score persistence (localStorage can throw in private modes)
 * ------------------------------------------------------------------ */

function loadBestScore() {
  try {
    const stored = Number(localStorage.getItem(CONFIG.bestScoreKey));
    return Number.isFinite(stored) && stored > 0 ? stored : 0;
  } catch {
    return 0;
  }
}

function saveBestScore(score) {
  try {
    localStorage.setItem(CONFIG.bestScoreKey, String(score));
  } catch {
    // Persistence is a nice-to-have; ignore storage failures.
  }
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/** @param {Cell} a @param {Cell} b */
const sameCell = (a, b) => a.x === b.x && a.y === b.y;

/** @param {Cell} a @param {Cell} b */
const isOpposite = (a, b) => a.x + b.x === 0 && a.y + b.y === 0;

/** @param {Cell} cell */
const isOutOfBounds = (cell) =>
  cell.x < 0 || cell.y < 0 || cell.x >= CONFIG.cols || cell.y >= CONFIG.rows;

/**
 * Pick a random cell the snake does not occupy.
 * @param {Cell[]} snake
 * @returns {Cell | null} null when the board is full (the player has won)
 */
function spawnFood(snake) {
  const taken = new Set(snake.map((cell) => `${cell.x},${cell.y}`));
  const free = [];

  for (let y = 0; y < CONFIG.rows; y += 1) {
    for (let x = 0; x < CONFIG.cols; x += 1) {
      if (!taken.has(`${x},${y}`)) free.push({ x, y });
    }
  }

  if (free.length === 0) return null;
  return free[Math.floor(Math.random() * free.length)];
}

/* ------------------------------------------------------------------ *
 * Rendering
 * ------------------------------------------------------------------ */

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;

  for (let x = 1; x < CONFIG.cols; x += 1) {
    ctx.beginPath();
    ctx.moveTo(x * CONFIG.cellSize, 0);
    ctx.lineTo(x * CONFIG.cellSize, canvas.height);
    ctx.stroke();
  }

  for (let y = 1; y < CONFIG.rows; y += 1) {
    ctx.beginPath();
    ctx.moveTo(0, y * CONFIG.cellSize);
    ctx.lineTo(canvas.width, y * CONFIG.cellSize);
    ctx.stroke();
  }
}

/** @param {Cell} cell @param {string} color */
function drawCell(cell, color) {
  const pad = 1;
  ctx.fillStyle = color;
  ctx.fillRect(
    cell.x * CONFIG.cellSize + pad,
    cell.y * CONFIG.cellSize + pad,
    CONFIG.cellSize - pad * 2,
    CONFIG.cellSize - pad * 2,
  );
}

/** @param {string} title @param {string} subtitle */
function drawOverlay(title, subtitle) {
  ctx.fillStyle = COLORS.overlay;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = COLORS.overlayText;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "600 24px system-ui, sans-serif";
  ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 14);

  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 16);
}

function render() {
  drawGrid();
  if (state.food) drawCell(state.food, COLORS.food);
  state.snake.forEach((cell, index) => {
    drawCell(cell, index === 0 ? COLORS.snakeHead : COLORS.snakeBody);
  });

  if (state.gameOver) {
    drawOverlay(
      state.won ? "Board cleared" : "Game over",
      `Score ${state.score} — press Space to play again`,
    );
  } else if (!state.running) {
    drawOverlay("Snake", state.score > 0 ? "Paused" : "Press Space to start");
  }
}

/* ------------------------------------------------------------------ *
 * Game loop (fixed step: one update per 1000 / CONFIG.speed ms)
 * ------------------------------------------------------------------ */

const stepMs = 1000 / CONFIG.speed;
let lastStep = 0;
let frameId = null;

function loop(timestamp) {
  frameId = requestAnimationFrame(loop);

  if (state.running && timestamp - lastStep >= stepMs) {
    lastStep = timestamp;
    update();
  }

  render();
}

function update() {
  // Apply at most one queued turn per step, so a turn always takes effect on
  // a distinct cell and the snake can never fold back onto itself.
  while (state.pending.length > 0) {
    const next = state.pending.shift();
    if (!isOpposite(next, state.direction)) {
      state.direction = next;
      break;
    }
  }

  const head = state.snake[0];
  const nextHead = {
    x: head.x + state.direction.x,
    y: head.y + state.direction.y,
  };

  if (isOutOfBounds(nextHead)) {
    endGame();
    return;
  }

  const willEat = state.food !== null && sameCell(nextHead, state.food);

  // Without food the tail vacates its cell this step, so moving into it is legal.
  const body = willEat ? state.snake : state.snake.slice(0, -1);
  if (body.some((cell) => sameCell(cell, nextHead))) {
    endGame();
    return;
  }

  state.snake.unshift(nextHead);

  if (willEat) {
    state.score += 1;
    ui.score.textContent = String(state.score);
    state.food = spawnFood(state.snake);

    // A full board means there is nowhere left to place food: that's a win.
    if (state.food === null) {
      endGame(true);
      return;
    }
  } else {
    state.snake.pop();
  }
}

/** @param {boolean} [won] */
function endGame(won = false) {
  state.running = false;
  state.gameOver = true;
  state.won = won;

  if (state.score > bestScore) {
    bestScore = state.score;
    ui.best.textContent = String(bestScore);
    saveBestScore(bestScore);
  }

  setStatus(
    won
      ? `Board cleared with a score of ${state.score}. Press Space to play again.`
      : `Game over. Score ${state.score}. Press Space to play again.`,
  );
}

/* ------------------------------------------------------------------ *
 * Input and controls
 * ------------------------------------------------------------------ */

/** @param {Cell} direction */
function queueDirection(direction) {
  if (state.gameOver) return;

  // A direction key doubles as "start playing", even when it matches the
  // heading the snake already has.
  if (!state.running) resume();

  // Compare against the last intent, not the current heading, so two quick
  // presses are validated as the player will actually experience them.
  const last = state.pending.at(-1) ?? state.direction;
  if (sameCell(direction, last) || isOpposite(direction, last)) return;

  // Two queued turns is plenty; more would feel like input lag.
  if (state.pending.length < 2) state.pending.push(direction);
}

function onKeyDown(event) {
  if (event.code === "Space") {
    event.preventDefault();
    toggleRunning();
    return;
  }

  const direction = KEY_TO_DIRECTION[event.key.toLowerCase()];
  if (!direction) return;

  // Stop arrow keys from scrolling the page while playing.
  event.preventDefault();
  queueDirection(direction);
}

function toggleRunning() {
  if (state.gameOver) {
    restart();
  } else if (state.running) {
    pause();
  } else {
    resume();
  }
}

function resume() {
  state.running = true;
  // Reset the clock so an idle pause doesn't cause an immediate step.
  lastStep = performance.now();
  setStatus("");
}

function pause() {
  state.running = false;
  setStatus("Paused. Press Space to resume.");
}

function restart() {
  state = createState();
  state.food = spawnFood(state.snake) ?? state.food;
  ui.score.textContent = "0";
  resume();
}

function setStatus(message) {
  ui.status.textContent = message;
}

/* Swipe support for touch devices (the canvas sets touch-action: none). */
let touchStart = null;
const SWIPE_THRESHOLD = 24; // pixels

function onPointerDown(event) {
  touchStart = { x: event.clientX, y: event.clientY };
}

function onPointerUp(event) {
  if (!touchStart) return;

  const dx = event.clientX - touchStart.x;
  const dy = event.clientY - touchStart.y;
  touchStart = null;

  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;

  if (Math.abs(dx) > Math.abs(dy)) {
    queueDirection(dx > 0 ? DIRECTIONS.right : DIRECTIONS.left);
  } else {
    queueDirection(dy > 0 ? DIRECTIONS.down : DIRECTIONS.up);
  }
}

// Buttons drop focus after activation so a later Space key reaches the game
// rather than re-triggering the button.
ui.start.addEventListener("click", (event) => {
  event.currentTarget.blur();
  restart();
});
ui.pause.addEventListener("click", (event) => {
  event.currentTarget.blur();
  toggleRunning();
});
document.addEventListener("keydown", onKeyDown);
canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointerup", onPointerUp);
canvas.addEventListener("pointercancel", () => {
  touchStart = null;
});

// Pause rather than letting the snake run on while the tab is hidden.
document.addEventListener("visibilitychange", () => {
  if (document.hidden && state.running) pause();
});

/* ------------------------------------------------------------------ *
 * Boot
 * ------------------------------------------------------------------ */

ui.best.textContent = String(bestScore);
render();
frameId = requestAnimationFrame(loop);
