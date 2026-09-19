// Tunable game settings. Keep gameplay numbers here so the logic stays readable.
export const CONFIG = {
  // The board is COLS x ROWS cells; canvas size must equal COLS * CELL_SIZE.
  cols: 20,
  rows: 20,
  cellSize: 20,

  // Snake moves this many cells per second. Raise for a harder game.
  speed: 8,

  // Starting length of the snake, in cells.
  startLength: 3,

  // localStorage key used to persist the best score.
  bestScoreKey: "snake:bestScore",
};

export const COLORS = {
  grid: "#222b3a",
  snakeHead: "#4ade80",
  snakeBody: "#22c55e",
  food: "#f87171",
  overlay: "rgba(16, 20, 28, 0.78)",
  overlayText: "#eef2f8",
};
