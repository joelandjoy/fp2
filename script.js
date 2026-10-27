const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const startBtn = document.getElementById("startBtn");
const gameStatus = document.getElementById("gameStatus");

const CELLS = 24;
const CELL = canvas.width / CELLS;
const COLORS = { bg: "#030403", grid: "#111510", snake: "#c6ff4d", head: "#e0ff9c", food: "#f4f4f4" };

let snake, food, direction, nextDirection, score, best, running, paused, gameOver, loopId;
let lastTick = 0;
let accumulator = 0;
const STEP_MS = 115;

try { best = Number(localStorage.getItem("snakeArcadeBest") || 0); }
catch { best = 0; }
bestEl.textContent = String(best).padStart(3, "0");

function resetGame() {
  snake = [{ x: 8, y: 12 }, { x: 7, y: 12 }, { x: 6, y: 12 }, { x: 5, y: 12 }];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  running = false;
  paused = false;
  gameOver = false;
  accumulator = 0;
  scoreEl.textContent = "000";
  food = spawnFood();
  draw();
}

function spawnFood() {
  let point;
  do {
    point = { x: Math.floor(Math.random() * CELLS), y: Math.floor(Math.random() * CELLS) };
  } while (snake.some(part => part.x === point.x && part.y === point.y));
  return point;
}

function draw() {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= CELLS; i++) {
    const p = i * CELL + 0.5;
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(canvas.width, p); ctx.stroke();
  }

  // Food
  ctx.fillStyle = COLORS.food;
  ctx.beginPath();
  ctx.arc((food.x + .5) * CELL, (food.y + .5) * CELL, CELL * .27, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(244,244,244,.14)";
  ctx.beginPath();
  ctx.arc((food.x + .5) * CELL, (food.y + .5) * CELL, CELL * .46, 0, Math.PI * 2);
  ctx.fill();

  // Snake, with rounded segments and a clear head
  snake.forEach((part, index) => {
    const inset = index === 0 ? 2 : 3;
    ctx.fillStyle = index === 0 ? COLORS.head : COLORS.snake;
    roundRect(ctx, part.x * CELL + inset, part.y * CELL + inset,
      CELL - inset * 2, CELL - inset * 2, 5);
    if (index === 0) drawEyes(part);
  });
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
}

function drawEyes(head) {
  const cx = (head.x + .5) * CELL;
  const cy = (head.y + .5) * CELL;
  const perp = { x: -direction.y, y: direction.x };
  const front = { x: direction.x, y: direction.y };
  ctx.fillStyle = "#10140a";
  for (const side of [-1, 1]) {
    const ex = cx + front.x * 4 + perp.x * side * 4;
    const ey = cy + front.y * 4 + perp.y * side * 4;
    ctx.beginPath(); ctx.arc(ex, ey, 1.8, 0, Math.PI * 2); ctx.fill();
  }
}

function startGame() {
  if (gameOver) resetGame();
  running = true;
  paused = false;
  overlay.classList.add("hidden");
  gameStatus.textContent = "PLAYING";
  lastTick = performance.now();
  cancelAnimationFrame(loopId);
  loopId = requestAnimationFrame(frame);
}

function frame(now) {
  if (!running || paused) return;
  accumulator += Math.min(now - lastTick, 250);
  lastTick = now;
  while (accumulator >= STEP_MS) {
    update();
    accumulator -= STEP_MS;
    if (gameOver) return;
  }
  draw();
  loopId = requestAnimationFrame(frame);
}

function update() {
  direction = nextDirection;
  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
  const eating = head.x === food.x && head.y === food.y;

  if (head.x < 0 || head.x >= CELLS || head.y < 0 || head.y >= CELLS) {
    endGame();
    return;
  }

  // The tail may move away on this tick, unless the snake is eating.
  const body = eating ? snake : snake.slice(0, -1);
  if (body.some(part => part.x === head.x && part.y === head.y)) {
    endGame();
    return;
  }

  snake.unshift(head);
  if (eating) {
    score++;
    scoreEl.textContent = String(score).padStart(3, "0");
    if (score > best) {
      best = score;
      bestEl.textContent = String(best).padStart(3, "0");
      try { localStorage.setItem("snakeArcadeBest", String(best)); } catch {}
    }
    food = spawnFood();
  } else {
    snake.pop();
  }
}

function endGame() {
  running = false;
  gameOver = true;
  gameStatus.textContent = "GAME OVER";
  overlayTitle.textContent = "Game over";
  overlayText.textContent = `You scored ${score}. Ready for another round?`;
  startBtn.innerHTML = 'Play again <span>↻</span>';
  overlay.classList.remove("hidden");
  draw();
}

function togglePause() {
  if (gameOver) return;
  if (!running && !paused) { startGame(); return; }
  paused = !paused;
  if (paused) {
    running = false;
    cancelAnimationFrame(loopId);
    gameStatus.textContent = "PAUSED";
    overlayTitle.textContent = "Paused";
    overlayText.textContent = "Take a breath. Your next run is waiting.";
    startBtn.innerHTML = 'Resume game <span>→</span>';
    overlay.classList.remove("hidden");
  } else {
    startGame();
  }
}

function setDirection(name) {
  const map = {
    up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
    left: { x: -1, y: 0 }, right: { x: 1, y: 0 }
  };
  const candidate = map[name];
  if (!candidate) return;
  if (candidate.x === -direction.x && candidate.y === -direction.y) return;
  nextDirection = candidate;
  if (!running && !gameOver && !paused) startGame();
}

document.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();
  const keys = {
    arrowup: "up", w: "up",
    arrowdown: "down", s: "down",
    arrowleft: "left", a: "left",
    arrowright: "right", d: "right"
  };
  if (keys[key]) {
    event.preventDefault();
    setDirection(keys[key]);
  } else if (key === " ") {
    event.preventDefault();
    togglePause();
  } else if (key === "enter") {
    event.preventDefault();
    if (gameOver || (!running && !paused)) startGame();
    else if (paused) togglePause();
  } else if (key === "escape" && running) {
    togglePause();
  }
});

document.querySelectorAll("[data-dir]").forEach(button => {
  button.addEventListener("pointerdown", event => {
    event.preventDefault();
    setDirection(button.dataset.dir);
  });
});

startBtn.addEventListener("click", () => {
  if (paused) { togglePause(); return; }
  startGame();
});
document.getElementById("restartBtn").addEventListener("click", () => {
  resetGame();
  startGame();
});

let touchStart = null;
canvas.addEventListener("touchstart", event => {
  const touch = event.changedTouches[0];
  touchStart = { x: touch.clientX, y: touch.clientY };
}, { passive: true });
canvas.addEventListener("touchend", event => {
  if (!touchStart) return;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) > 22) {
    setDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
  }
  touchStart = null;
}, { passive: true });

resetGame();
