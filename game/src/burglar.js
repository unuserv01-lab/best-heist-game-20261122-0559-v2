// The thief: one circle the player steers with WASD or arrows, Shift to
// sneak, and three tools on keys 1-3, spent with a mouse click. Tools cost
// coins; the gold coins lying around the room pay for them. The thief lifts
// the diamond, then the exit opens and the getaway begins.
import { ROOM, THIEF, TOOLS } from './config.js';
import { pushOutOfRects } from './rooms.js';

export function spawnThief(room) {
  return {
    x: room.thiefStart.x,
    y: room.thiefStart.y,
    coins: 4,
    gold: 0,
    hasDiamond: false,
    smokeUntil: 0,
    sneaking: false,
    moving: false,
  };
}

export function moveThief(thief, input, blockers, dt) {
  let dx = 0;
  let dy = 0;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;
  thief.moving = dx !== 0 || dy !== 0;
  thief.sneaking = Boolean(input.sneak);
  if (!thief.moving) return;
  const length = Math.hypot(dx, dy);
  const speed = thief.sneaking ? THIEF.sneakSpeed : THIEF.speed;
  const next = pushOutOfRects(
    blockers,
    thief.x + (dx / length) * speed * dt,
    thief.y + (dy / length) * speed * dt,
    THIEF.radius,
  );
  thief.x = Math.max(ROOM.x + THIEF.radius, Math.min(ROOM.x + ROOM.width - THIEF.radius, next.x));
  thief.y = Math.max(ROOM.y + THIEF.radius, Math.min(ROOM.y + ROOM.height - THIEF.radius, next.y));
}

// Spend a tool at a clicked floor point. Returns what happened, so the
// caller can play the right sound and message; null when nothing was spent.
export function spendTool(thief, toolKey, x, y, now, guards, cameras, sendGuardsToNoise, blindCameras) {
  if (toolKey === TOOLS.coin.key) {
    if (thief.coins < TOOLS.coin.cost) return { ok: false, reason: 'Not enough coins — grab gold first.' };
    thief.coins -= TOOLS.coin.cost;
    sendGuardsToNoise(guards, x, y);
    return { ok: true, tool: 'coin', x, y };
  }
  if (toolKey === TOOLS.smoke.key) {
    if (thief.coins < TOOLS.smoke.cost) return { ok: false, reason: 'Not enough coins — grab gold first.' };
    thief.coins -= TOOLS.smoke.cost;
    thief.smokeUntil = now + 4;
    return { ok: true, tool: 'smoke', x: thief.x, y: thief.y };
  }
  if (toolKey === TOOLS.emp.key) {
    if (thief.coins < TOOLS.emp.cost) return { ok: false, reason: 'Not enough coins — grab gold first.' };
    thief.coins -= TOOLS.emp.cost;
    blindCameras(cameras, now, 6);
    return { ok: true, tool: 'emp' };
  }
  return null;
}

export function caughtByGuard(thief, guards) {
  for (const guard of guards) {
    if (Math.hypot(guard.x - thief.x, guard.y - thief.y) < THIEF.catchDistance) return guard;
  }
  return null;
}
