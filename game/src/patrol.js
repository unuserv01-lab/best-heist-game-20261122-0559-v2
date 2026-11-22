// The guards: patrols that walk their waypoints, grow suspicious when
// they glimpse the thief, and chase once the alarm is high. A guard never
// sees through cover, and a guard that loses the thief walks back to its
// patrol. A coin toss sends a nearby guard off to look at the noise.
import { GUARD } from './config.js';
import { insideCone, lineOfSightClear } from './sight.js';
import { pushOutOfRects } from './rooms.js';

export const PATROL = 'patrol';
export const SUSPICIOUS = 'suspicious';
export const CHASE = 'chase';
export const INVESTIGATE = 'investigate';

export function spawnGuards(room, rng) {
  return room.guards.map((spec, index) => {
    const start = spec.waypoints[0];
    return {
      name: spec.name,
      x: start.x,
      y: start.y,
      facing: rng.range(0, Math.PI * 2),
      waypointIndex: 1 % spec.waypoints.length,
      waypoints: spec.waypoints,
      state: PATROL,
      seenFor: 0,
      lookAt: null,
      lookTime: 0,
      speedScale: room.guardSpeed,
      wobble: index * 1.7,
    };
  });
}

function walkTo(guard, targetX, targetY, speed, dt, blockers) {
  const dx = targetX - guard.x;
  const dy = targetY - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  const next = pushOutOfRects(blockers, guard.x + (dx / dist) * step, guard.y + (dy / dist) * step, GUARD.radius);
  guard.x = next.x;
  guard.y = next.y;
  guard.facing = Math.atan2(dy, dx);
  return dist - step < 2;
}

// Does this guard see the thief right now? Smoke hides the thief; cover
// hides the thief; nothing else does.
export function guardCanSee(guard, thief, blockers, smokeUntil, now) {
  if (now < smokeUntil) return { seen: false, distance: Infinity };
  const cone = insideCone(guard.x, guard.y, guard.facing, GUARD.coneHalfAngle, GUARD.coneLength, thief.x, thief.y);
  if (!cone.seen) return { seen: false, distance: cone.distance };
  if (!lineOfSightClear(guard.x, guard.y, thief.x, thief.y, blockers)) return { seen: false, distance: cone.distance };
  return { seen: true, distance: cone.distance };
}

export function updateGuards(guards, thief, blockers, dt, now, alarm, events) {
  for (const guard of guards) {
    const sight = guardCanSee(guard, thief, blockers, thief.smokeUntil, now);
    if (sight.seen) {
      guard.seenFor += dt;
      if (guard.state === PATROL && guard.seenFor > GUARD.suspectSeconds) {
        guard.state = SUSPICIOUS;
        events.push({ type: 'spotted', name: guard.name });
      }
    } else {
      guard.seenFor = Math.max(0, guard.seenFor - dt * 2);
      if (guard.state === SUSPICIOUS && guard.seenFor <= 0) guard.state = PATROL;
    }

    if (alarm >= GUARD.chaseAlarm && sight.seen) guard.state = CHASE;
    if (guard.state === CHASE && !sight.seen && alarm < GUARD.chaseAlarm) guard.state = PATROL;

    if (guard.state === CHASE) {
      walkTo(guard, thief.x, thief.y, GUARD.chaseSpeed * guard.speedScale, dt, blockers);
    } else if (guard.state === INVESTIGATE && guard.lookAt) {
      const arrived = walkTo(guard, guard.lookAt.x, guard.lookAt.y, GUARD.patrolSpeed * 1.4 * guard.speedScale, dt, blockers);
      guard.lookTime -= dt;
      if (arrived || guard.lookTime <= 0) {
        guard.state = PATROL;
        guard.lookAt = null;
      }
    } else if (guard.state === SUSPICIOUS) {
      // Stand and stare at the last seen spot, cone sweeping a little:
      // the thief gets a fair second to break line of sight.
      guard.facing += Math.sin(now * 2 + guard.wobble) * dt * 0.8;
    } else {
      const target = guard.waypoints[guard.waypointIndex];
      const arrived = walkTo(guard, target.x, target.y, GUARD.patrolSpeed * guard.speedScale, dt, blockers);
      if (arrived) guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
    }
  }
}

// A coin toss pulls every guard near the ping over to look at it.
export function sendGuardsToNoise(guards, x, y) {
  for (const guard of guards) {
    if (guard.state === CHASE) continue;
    if (Math.hypot(guard.x - x, guard.y - y) < 260) {
      guard.state = INVESTIGATE;
      guard.lookAt = { x, y };
      guard.lookTime = 3;
    }
  }
}
