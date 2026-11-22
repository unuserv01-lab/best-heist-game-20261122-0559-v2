// The wall cameras: fixed mounts whose cones sweep back and forth. A
// camera never moves, never chases, and never sees through cover. An EMP
// burst blinds every camera for a few seconds; the HUD shows the countdown.
import { CAMERA } from './config.js';
import { insideCone, lineOfSightClear } from './sight.js';

export function spawnCameras(room) {
  return room.cameras.map((spec) => ({
    x: spec.x,
    y: spec.y,
    baseAngle: spec.baseAngle,
    angle: spec.baseAngle,
    blindUntil: 0,
  }));
}

export function updateCameras(cameras, now) {
  for (let i = 0; i < cameras.length; i += 1) {
    const camera = cameras[i];
    camera.angle = camera.baseAngle + Math.sin(now * CAMERA.sweepSpeed + i * 2.1) * CAMERA.sweepRange;
  }
}

export function cameraCanSee(camera, thief, blockers, now) {
  if (now < camera.blindUntil) return { seen: false, distance: Infinity };
  const cone = insideCone(camera.x, camera.y, camera.angle, CAMERA.coneHalfAngle, CAMERA.coneLength, thief.x, thief.y);
  if (!cone.seen) return { seen: false, distance: cone.distance };
  if (!lineOfSightClear(camera.x, camera.y, thief.x, thief.y, blockers)) return { seen: false, distance: cone.distance };
  return { seen: true, distance: cone.distance };
}

export function blindCameras(cameras, now, seconds) {
  for (const camera of cameras) {
    camera.blindUntil = now + seconds;
  }
}
