// Boot and the one loop: input is read every frame, the room advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// painter draws what is there. The game moves between six screens:
// title, play, paused, caught, room-clear and the final getaway.
//
// ?seed=N fixes the room's random draws. ?shot=cover|stealth|alarm|clear
// (with &seed=N) stages that scene instead of running the loop, paints it
// twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP, TOOLS } from './config.js';
import { makeSfx } from './sfx.js';
import { CAUGHT, CLEARED, newRoom, stepRoom } from './engine.js';
import { makePainter, SCREEN_CAUGHT, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_ROOM_CLEAR, SCREEN_TITLE, SCREEN_WIN } from './paint.js';
import { stageScene } from './scenes.js';
import { blindCameras } from './sentry.js';
import { sendGuardsToNoise } from './patrol.js';
import { spendTool } from './burglar.js';
import { ROOMS } from './rooms.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const sfx = makeSfx();
const painter = makePainter(canvas);

// Small read-only hook for automated checks (screenshots, playtests):
// it changes nothing about the game, it only lets a test read the state.
window.__debug = {
  get world() { return world; },
  get screen() { return screen; },
  get roomIndex() { return roomIndex; },
};

let roomIndex = 0;
let world = newRoom(roomIndex, seed);
let screen = SCREEN_TITLE;
let best = readBest();
let selectedTool = TOOLS.coin.key;
let totalScore = 0;
let bankedScore = 0; // loot already banked from cleared rooms

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit.
  }
}

function announce(message) {
  status.textContent = message;
}

function startRoom(index) {
  roomIndex = index;
  world = newRoom(index, seed + index * 7919);
  screen = SCREEN_PLAY;
  announce(`Room ${index + 1}: ${world.room.name}. ${world.room.blurb}`);
}

function startGame() {
  totalScore = 0;
  bankedScore = 0;
  startRoom(0);
}

function playEvents(events) {
  for (const event of events) {
    if (event.type === 'coin') sfx.coin();
    else if (event.type === 'diamond') sfx.diamond();
    else if (event.type === 'alarm-tick') sfx.alarmTick();
    else if (event.type === 'spotted') {
      sfx.spotted();
      announce(`${event.name} spotted you — break line of sight!`);
    } else if (event.type === 'caught') {
      sfx.caught();
      screen = SCREEN_CAUGHT;
      announce(`Caught by ${event.name}. Press R to try the room again.`);
    } else if (event.type === 'cleared') {
      bankedScore += world.score;
      totalScore = bankedScore;
      if (roomIndex + 1 < ROOMS.length) {
        screen = SCREEN_ROOM_CLEAR;
        announce(`Room clear! Bonus $${event.bonus}. Press ENTER for the next room.`);
      } else {
        screen = SCREEN_WIN;
        sfx.win();
        if (totalScore > best) {
          best = totalScore;
          saveBest(best);
        }
        announce(`Clean getaway! Final loot $${totalScore}.`);
      }
    }
  }
}

function runShot(name) {
  const scene = stageScene(name, world, seed);
  screen = scene.screen;
  if (scene.screen === SCREEN_ROOM_CLEAR) {
    bankedScore += world.score;
    totalScore = bankedScore;
  }
  let painted = 0;
  function paint() {
    painter.draw(world, screen, best, sfx.isMuted(), selectedTool, totalScore);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const keys = {};
  let mouse = null;

  window.addEventListener('keydown', (event) => {
    sfx.unlock();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
    keys[event.key.toLowerCase()] = true;
    if (event.key === '1' || event.key === '2' || event.key === '3') selectedTool = event.key;
    if (event.key.toLowerCase() === 'm') announce(sfx.toggleMute() ? 'Sound muted.' : 'Sound on.');
    if (event.key.toLowerCase() === 'p' && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (event.key.toLowerCase() === 'p' && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    if (event.key === 'Enter') {
      if (screen === SCREEN_TITLE) startGame();
      else if (screen === SCREEN_ROOM_CLEAR) startRoom(roomIndex + 1);
      else if (screen === SCREEN_CAUGHT) screen = SCREEN_TITLE;
    }
    if (event.key.toLowerCase() === 'r' && (screen === SCREEN_CAUGHT || screen === SCREEN_WIN)) {
      startGame();
    }
  });
  window.addEventListener('keyup', (event) => {
    keys[event.key.toLowerCase()] = false;
  });
  canvas.addEventListener('mousedown', (event) => {
    sfx.unlock();
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    mouse = { x, y };
    if (screen === SCREEN_TITLE) {
      startGame();
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const result = spendTool(world.thief, selectedTool, x, y, world.now, world.guards, world.cameras, sendGuardsToNoise, blindCameras);
    if (result === null) return;
    if (!result.ok) {
      announce(result.reason);
      return;
    }
    sfx.tool();
    if (result.tool === 'coin') {
      world.pings.push({ x: result.x, y: result.y, until: world.now + 2 });
      announce('Coin tossed — a guard walks over to look.');
    } else if (result.tool === 'smoke') {
      announce('Smoke! Unseen for 4 seconds.');
    } else if (result.tool === 'emp') {
      announce('EMP burst — cameras blind for 6 seconds.');
    }
  });

  function readInput() {
    return {
      up: Boolean(keys['w'] || keys['arrowup']),
      down: Boolean(keys['s'] || keys['arrowdown']),
      left: Boolean(keys['a'] || keys['arrowleft']),
      right: Boolean(keys['d'] || keys['arrowright']),
      sneak: Boolean(keys['shift']),
    };
  }

  let accumulator = 0;
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    if (screen === SCREEN_PLAY) {
      accumulator += elapsed;
      while (accumulator >= STEP) {
        accumulator -= STEP;
        const events = [];
        stepRoom(world, readInput(), STEP, events);
        playEvents(events);
        if (screen !== SCREEN_PLAY) break;
      }
    }
    painter.draw(world, screen, best, sfx.isMuted(), selectedTool, totalScore);
  }
  requestAnimationFrame(frame);
  announce('Midnight at the Meridian Vault. Press ENTER to begin the heist.');
}

if (shot) runShot(shot);
else runGame();
