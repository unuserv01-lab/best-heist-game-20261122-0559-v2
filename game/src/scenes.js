// The screenshot scenes behind ?shot=cover|stealth|alarm|clear. Each one
// plays the real rules forward from a fresh room, steered by a simple
// autopilot that tries eight steps and keeps the one that gets closest to
// its target for the least danger — so the frame is what a short game
// really looks like, and the same seed always gives the same frame.
import { ROOM, STEP } from './config.js';
import { guardCanSee } from './patrol.js';
import { cameraCanSee } from './sentry.js';
import { lineOfSightClear } from './sight.js';
import { allBlockers } from './rooms.js';
import { newRoom, stepRoom, CLEARED } from './engine.js';
import { spendTool } from './burglar.js';
import { sendGuardsToNoise } from './patrol.js';
import { blindCameras } from './sentry.js';
import { SCREEN_PLAY, SCREEN_ROOM_CLEAR } from './paint.js';

const MOVES = [
  [0, 0], [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

// How dangerous is it to stand at (x, y)? A cone that can see the spot
// costs a lot; standing close to a guard costs a little.
function dangerAt(world, x, y) {
  const blockers = allBlockers(world.room);
  const probe = { x, y };
  let danger = 0;
  for (const guard of world.guards) {
    const sight = guardCanSee(guard, probe, blockers, 0, world.now);
    if (sight.seen) danger += 600;
    const dist = Math.hypot(guard.x - x, guard.y - y);
    if (dist < 90) danger += (90 - dist) * 3;
  }
  for (const camera of world.cameras) {
    const sight = cameraCanSee(camera, probe, blockers, world.now);
    if (sight.seen) danger += 500;
  }
  return danger;
}

// One autopilot step: of the nine ways to move, take the one that gets
// closest to the target for the least danger. `brave` ignores danger, for
// the alarm scene, where the thief walks straight into a cone. `sneak`
// moves slow and halves how fast the alarm climbs while seen.
function autopilotStep(world, target, brave, sneak) {
  const thief = world.thief;
  let bestScore = -Infinity;
  let best = { up: false, down: false, left: false, right: false, sneak: Boolean(sneak) };
  for (const [dx, dy] of MOVES) {
    const x = thief.x + dx * 10;
    const y = thief.y + dy * 10;
    const dist = Math.hypot(target.x - x, target.y - y);
    const score = -dist - (brave ? 0 : dangerAt(world, x, y));
    if (score > bestScore) {
      bestScore = score;
      best = { up: dy < 0, down: dy > 0, left: dx < 0, right: dx > 0, sneak: Boolean(sneak) };
    }
  }
  return best;
}

function closestCoin(world) {
  let best = null;
  let bestDist = Infinity;
  for (const coin of world.coins) {
    if (coin.taken) continue;
    const dist = Math.hypot(coin.x - world.thief.x, coin.y - world.thief.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = coin;
    }
  }
  return best;
}

function playFor(world, seconds, pickTarget, brave, sneak = false) {
  for (let i = 0; i < seconds / STEP; i += 1) {
    if (world.status !== 'playing') break;
    const target = pickTarget(world);
    if (target === null) break;
    stepRoom(world, autopilotStep(world, target, brave, sneak), STEP, []);
  }
}

// Find a spot on open floor directly ahead of a guard, with a clear
// sight line back to the guard: the guard's own path carries it straight
// at whoever stands there. Tries each guard at a few distances.
function findAheadSpot(world) {
  const blockers = allBlockers(world.room);
  for (const guard of world.guards) {
    for (const dist of [160, 200, 120]) {
      const point = {
        x: guard.x + Math.cos(guard.facing) * dist,
        y: guard.y + Math.sin(guard.facing) * dist,
      };
      if (point.x < ROOM.x + 30 || point.x > ROOM.x + ROOM.width - 30) continue;
      if (point.y < ROOM.y + 30 || point.y > ROOM.y + ROOM.height - 30) continue;
      let insideCover = false;
      for (const rect of blockers) {
        if (point.x > rect.x - 24 && point.x < rect.x + rect.width + 24
          && point.y > rect.y - 24 && point.y < rect.y + rect.height + 24) {
          insideCover = true;
          break;
        }
      }
      if (insideCover) continue;
      if (!lineOfSightClear(guard.x, guard.y, point.x, point.y, blockers)) continue;
      return { guard, point };
    }
  }
  return null;
}

// Put the thief where a guard's cone already falls and let one real step
// do the rest, so the alarm climbs the honest way.
function stepIntoCone(world, guard, distance, seconds) {
  world.thief.x = guard.x + Math.cos(guard.facing) * distance;
  world.thief.y = guard.y + Math.sin(guard.facing) * distance;
  playFor(world, seconds, () => ({ x: world.thief.x, y: world.thief.y }), true);
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * cover: mid-heist, thief closing on the diamond, alarm already warm.
 * stealth: a coin toss has pulled a guard away; the thief waits behind cover.
 * alarm: the thief blundered into a cone and the room is hunting them.
 * clear: the room is cleared, the bonus counted, the door standing open.
 * The clear scene replays the room from a fresh start with a sneaking
 * autopilot, so the clear on screen is a clear the rules really produced;
 * it never paints a clear over a caught room.
 */
export function stageScene(name, world, seed = 7) {
  if (name === 'stealth') {
    playFor(world, 9, (w) => closestCoin(w) || w.room.diamond, false);
    const guard = world.guards[0];
    const pingX = guard.x + 120;
    const pingY = guard.y + 40;
    const result = spendTool(world.thief, '1', pingX, pingY, world.now, world.guards, world.cameras, sendGuardsToNoise, blindCameras);
    if (result && result.ok) world.pings.push({ x: pingX, y: pingY, until: world.now + 2 });
    return { screen: SCREEN_PLAY };
  }
  if (name === 'alarm') {
    // Walk straight for the south-west carpet, right through the patrols'
    // cones — never for the diamond, whose keeper stands on it. Check the
    // alarm every half second and stop pushing forward once the room is
    // properly alarmed, before the bold walk gets the thief caught.
    const dash = { x: 500, y: 450 };
    for (let t = 0; t < 16 && world.status === 'playing' && world.alarm < 45; t += 0.5) {
      playFor(world, 0.5, () => dash, true);
    }
    if (world.status !== 'playing') {
      // The bold walk got the thief caught: start over and stop sooner.
      Object.assign(world, newRoom(world.roomIndex, seed));
      for (let t = 0; t < 10 && world.status === 'playing' && world.alarm < 40; t += 0.5) {
        playFor(world, 0.5, () => dash, true);
      }
    }
    if (world.status === 'playing' && world.alarm < 55) {
      // Stand on open floor directly ahead of a guard, where the guard's
      // own path carries it straight at the thief: the cone holds the
      // thief the whole approach, and the thief slips away just before
      // the guard is close enough to grab.
      const spot = findAheadSpot(world);
      if (spot !== null) {
        world.thief.x = spot.point.x;
        world.thief.y = spot.point.y;
        for (let i = 0; i < 3 / STEP && world.status === 'playing' && world.alarm < 62; i += 1) {
          stepRoom(world, { up: false, down: false, left: false, right: false, sneak: false }, STEP, []);
          if (Math.hypot(spot.guard.x - world.thief.x, spot.guard.y - world.thief.y) < 42) break;
        }
        if (world.status === 'playing' && world.alarm >= 40) {
          // Flee straight away from the guard — but only half a second:
          // long enough for the chase to read on screen, short enough
          // that the second patrol cannot cut the corner and intercept.
          playFor(world, 0.5, (w) => {
            const dx = w.thief.x - spot.guard.x;
            const dy = w.thief.y - spot.guard.y;
            const len = Math.hypot(dx, dy) || 1;
            return { x: w.thief.x + (dx / len) * 300, y: w.thief.y + (dy / len) * 300 };
          }, true);
        }
      }
    }
    return { screen: SCREEN_PLAY };
  }
  if (name === 'clear') {
    const headFor = (w) => (w.diamondTaken ? { x: w.room.exit.x + 32, y: w.room.exit.y + 22 } : w.room.diamond);
    for (let attempt = 0; attempt < 3 && world.status !== CLEARED; attempt += 1) {
      if (attempt > 0 || world.status !== 'playing') {
        Object.assign(world, newRoom(world.roomIndex, seed));
      }
      playFor(world, 150, headFor, false, true);
    }
    if (world.status !== CLEARED) return { screen: SCREEN_PLAY };
    return { screen: SCREEN_ROOM_CLEAR };
  }
  // cover, the default
  playFor(world, 14, (w) => closestCoin(w) || w.room.diamond, false);
  if (world.alarm < 25 && world.status === 'playing') {
    // Warm the alarm the honest way: hold the thief at the edge of a cone
    // for a few real steps, where a guard can just see them.
    stepIntoCone(world, world.guards[0], 200, 2.5);
  }
  return { screen: SCREEN_PLAY };
}
