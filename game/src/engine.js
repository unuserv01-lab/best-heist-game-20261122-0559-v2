// The engine: one room's whole state and the one step that moves it.
// Input comes in, the thief moves, guards and cameras watch, the alarm
// climbs or falls, loot is lifted, and the room ends caught or cleared.
// Rendering and input never touch these numbers except through here.
import { ALARM, ROOM, SCORES, STEP } from './config.js';
import { makeRng } from './rng.js';
import { allBlockers, ROOMS } from './rooms.js';
import { guardCanSee, spawnGuards, updateGuards } from './patrol.js';
import { blindCameras, cameraCanSee, spawnCameras, updateCameras } from './sentry.js';
import { caughtByGuard, moveThief, spawnThief } from './burglar.js';

export const PLAYING = 'playing';
export const CAUGHT = 'caught';
export const CLEARED = 'cleared';

export function newRoom(roomIndex, seed) {
  const room = ROOMS[roomIndex];
  const rng = makeRng(seed);
  return {
    roomIndex,
    room,
    rng,
    thief: spawnThief(room),
    guards: spawnGuards(room, rng),
    cameras: spawnCameras(room),
    coins: room.coins.map((coin) => ({ ...coin, taken: false })),
    diamondTaken: false,
    exitOpen: false,
    alarm: 0,
    score: 0,
    time: 0,
    now: 0,
    status: PLAYING,
    caughtBy: null,
    clearBonus: 0,
    message: '',
    messageUntil: 0,
    pings: [],
    lastTickStep: -1,
  };
}

function announce(world, message, seconds = 2.5) {
  world.message = message;
  world.messageUntil = world.now + seconds;
}

export function stepRoom(world, input, dt, events) {
  if (world.status !== PLAYING) return;
  world.now += dt;
  world.time += dt;
  const blockers = allBlockers(world.room);
  const thief = world.thief;

  moveThief(thief, input, blockers, dt);
  updateGuards(world.guards, thief, blockers, dt, world.now, world.alarm, events);
  updateCameras(world.cameras, world.now);

  // Who sees the thief, and how fast does the alarm climb? Sneaking halves
  // the gain: slow and low is the fair trade for speed.
  const sneakFactor = thief.sneaking ? 0.5 : 1;
  let seenByGuard = null;
  let seenByCamera = null;
  for (const guard of world.guards) {
    const sight = guardCanSee(guard, thief, blockers, thief.smokeUntil, world.now);
    if (sight.seen) {
      seenByGuard = guard;
      world.alarm += (ALARM.guardPerSecond + (sight.distance < 110 ? ALARM.closeBonus : 0)) * sneakFactor * dt;
      break;
    }
  }
  if (seenByGuard === null) {
    for (const camera of world.cameras) {
      const sight = cameraCanSee(camera, thief, blockers, world.now);
      if (sight.seen) {
        seenByCamera = camera;
        world.alarm += (ALARM.cameraPerSecond + (sight.distance < 110 ? ALARM.closeBonus : 0)) * sneakFactor * dt;
        break;
      }
    }
  }
  if (seenByGuard === null && seenByCamera === null) {
    world.alarm = Math.max(0, world.alarm - ALARM.decayPerSecond * dt);
  }
  if (seenByGuard !== null && world.alarm > 0) {
    const step = Math.floor(world.alarm / 10);
    if (step !== world.lastTickStep) {
      world.lastTickStep = step;
      events.push({ type: 'alarm-tick' });
    }
  }

  // Gold coins pay for tools.
  for (const coin of world.coins) {
    if (!coin.taken && Math.hypot(coin.x - thief.x, coin.y - thief.y) < 26) {
      coin.taken = true;
      thief.coins += 1;
      thief.gold += 1;
      world.score += SCORES.goldCoin;
      events.push({ type: 'coin', x: coin.x, y: coin.y });
    }
  }

  // The diamond: lift it and the exit door opens.
  if (!world.diamondTaken && Math.hypot(world.room.diamond.x - thief.x, world.room.diamond.y - thief.y) < 34) {
    world.diamondTaken = true;
    thief.hasDiamond = true;
    world.exitOpen = true;
    world.score += SCORES.diamond;
    announce(world, 'Diamond lifted! Reach the east door — the getaway is open.');
    events.push({ type: 'diamond' });
  }

  // The exit, once open, clears the room.
  if (world.exitOpen) {
    const exit = world.room.exit;
    if (thief.x > exit.x - 10 && thief.x < exit.x + exit.width + 10 && thief.y > exit.y - 10 && thief.y < exit.y + exit.height + 10) {
      world.status = CLEARED;
      const timeBonus = Math.max(0, Math.round(120 - world.time) * SCORES.timeBonusPerSecond);
      world.clearBonus = SCORES.roomClear + timeBonus;
      world.score += world.clearBonus;
      events.push({ type: 'cleared', bonus: world.clearBonus });
      return;
    }
  }

  // Caught: a guard reaches the thief, or the alarm tops out while a guard
  // is close enough to grab. Both are shown, never sprung from nowhere.
  const catcher = caughtByGuard(thief, world.guards);
  if (catcher !== null) {
    world.status = CAUGHT;
    world.caughtBy = catcher.name;
    events.push({ type: 'caught', name: catcher.name });
    return;
  }
  if (world.alarm >= ALARM.lockdownAt) {
    let nearest = null;
    let nearestDist = Infinity;
    for (const guard of world.guards) {
      const dist = Math.hypot(guard.x - thief.x, guard.y - thief.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = guard;
      }
    }
    if (nearest !== null && nearestDist < 200) {
      world.status = CAUGHT;
      world.caughtBy = nearest.name;
      events.push({ type: 'caught', name: nearest.name });
    } else {
      world.alarm = ALARM.lockdownAt;
      announce(world, 'LOCKDOWN — every guard is converging. Break line of sight!', 1.5);
    }
  }
}

export function stepSeconds() {
  return STEP;
}

export function roomRect() {
  return ROOM;
}

export { blindCameras };
