// The three rooms of the Meridian Vault. Each one is a fixed layout:
// where the thief starts, where the diamond waits, where the exit opens,
// what blocks sight and movement, and where the guards walk and the
// cameras watch. Nothing here moves; patrol.js, sentry.js and burglar.js
// read these rooms.
import { ROOM } from './config.js';

function borderWalls() {
  // The room's own border, as four thin rects, so sight and movement
  // share the same walls.
  return [
    { x: ROOM.x - 8, y: ROOM.y - 8, width: ROOM.width + 16, height: 8 },
    { x: ROOM.x - 8, y: ROOM.y + ROOM.height, width: ROOM.width + 16, height: 8 },
    { x: ROOM.x - 8, y: ROOM.y, width: 8, height: ROOM.height },
    { x: ROOM.x + ROOM.width, y: ROOM.y, width: 8, height: ROOM.height },
  ];
}

// Push a circle out of every rect it overlaps, so the thief and the
// guards slide along cover instead of sticking to it.
export function pushOutOfRects(rects, x, y, radius) {
  for (const rect of rects) {
    const nearestX = Math.max(rect.x, Math.min(x, rect.x + rect.width));
    const nearestY = Math.max(rect.y, Math.min(y, rect.y + rect.height));
    const dx = x - nearestX;
    const dy = y - nearestY;
    const dist = Math.hypot(dx, dy);
    if (dist < radius) {
      if (dist === 0) {
        y = rect.y - radius;
      } else {
        x = nearestX + (dx / dist) * radius;
        y = nearestY + (dy / dist) * radius;
      }
    }
  }
  return { x, y };
}

export function allBlockers(room) {
  return borderWalls().concat(room.cover);
}

const ROOM_1 = {
  name: 'Room 1 — The Meridian Hall',
  blurb: 'Cross the hall, lift the Meridian Diamond, reach the east door.',
  thiefStart: { x: 90, y: 620 },
  diamond: { x: 640, y: 235 },
  exit: { x: 1180, y: 92, width: 64, height: 44 },
  guardSpeed: 1,
  cover: [
    { x: 280, y: 150, width: 80, height: 60, kind: 'pedestal' },
    { x: 920, y: 150, width: 80, height: 60, kind: 'pedestal' },
    { x: 280, y: 500, width: 80, height: 60, kind: 'crate' },
    { x: 920, y: 500, width: 80, height: 60, kind: 'crate' },
    { x: 560, y: 300, width: 160, height: 100, kind: 'island' },
    { x: 140, y: 280, width: 60, height: 110, kind: 'planter' },
    { x: 1080, y: 280, width: 60, height: 110, kind: 'planter' },
  ],
  ropes: [
    { x: 560, y: 290, width: 160 },
    { x: 560, y: 410, width: 160 },
  ],
  lamps: [
    { x: 200, y: 150 }, { x: 1080, y: 150 }, { x: 200, y: 600 }, { x: 1080, y: 600 },
  ],
  guards: [
    { waypoints: [{ x: 240, y: 140 }, { x: 1020, y: 140 }, { x: 1020, y: 430 }, { x: 240, y: 430 }], name: 'Rook' },
    { waypoints: [{ x: 1020, y: 570 }, { x: 240, y: 570 }, { x: 240, y: 300 }, { x: 1020, y: 300 }], name: 'Vesper' },
    { waypoints: [{ x: 640, y: 120 }, { x: 640, y: 195 }], name: 'Marlowe' },
  ],
  cameras: [
    { x: 60, y: 110, baseAngle: 0.7 },
    { x: 1220, y: 640, baseAngle: Math.PI + 0.7 },
  ],
  coins: [
    { x: 180, y: 220 }, { x: 180, y: 480 }, { x: 1100, y: 220 }, { x: 1100, y: 480 },
    { x: 480, y: 620 }, { x: 800, y: 620 },
  ],
};

const ROOM_2 = {
  name: 'Room 2 — The Gilded Gallery',
  blurb: 'Paintings watch the walls. Two patrols cross; the cameras never blink together.',
  thiefStart: { x: 90, y: 620 },
  diamond: { x: 640, y: 245 },
  exit: { x: 1180, y: 92, width: 64, height: 44 },
  guardSpeed: 1.15,
  cover: [
    { x: 210, y: 150, width: 80, height: 140, kind: 'pedestal' },
    { x: 990, y: 150, width: 80, height: 140, kind: 'pedestal' },
    { x: 210, y: 490, width: 80, height: 140, kind: 'crate' },
    { x: 990, y: 490, width: 80, height: 140, kind: 'crate' },
    { x: 560, y: 310, width: 160, height: 100, kind: 'island' },
    { x: 420, y: 120, width: 120, height: 50, kind: 'planter' },
    { x: 720, y: 570, width: 120, height: 50, kind: 'planter' },
    { x: 640, y: 120, width: 60, height: 60, kind: 'pedestal' },
  ],
  ropes: [
    { x: 560, y: 300, width: 160 },
    { x: 560, y: 420, width: 160 },
  ],
  lamps: [
    { x: 340, y: 140 }, { x: 940, y: 140 }, { x: 340, y: 620 }, { x: 940, y: 620 },
  ],
  guards: [
    { waypoints: [{ x: 190, y: 130 }, { x: 1090, y: 130 }, { x: 1090, y: 390 }, { x: 190, y: 390 }], name: 'Rook' },
    { waypoints: [{ x: 1090, y: 610 }, { x: 190, y: 610 }, { x: 190, y: 430 }, { x: 1090, y: 430 }], name: 'Vesper' },
    { waypoints: [{ x: 460, y: 110 }, { x: 820, y: 110 }, { x: 820, y: 630 }, { x: 460, y: 630 }], name: 'Marlowe' },
    { waypoints: [{ x: 640, y: 470 }, { x: 640, y: 560 }], name: 'Ivo' },
  ],
  cameras: [
    { x: 60, y: 110, baseAngle: 0.7 },
    { x: 1220, y: 110, baseAngle: Math.PI - 0.7 },
    { x: 640, y: 660, baseAngle: -Math.PI / 2 },
  ],
  coins: [
    { x: 150, y: 340 }, { x: 1130, y: 340 }, { x: 480, y: 200 }, { x: 800, y: 200 },
    { x: 480, y: 560 }, { x: 800, y: 560 }, { x: 640, y: 460 },
  ],
};

const ROOM_3 = {
  name: 'Room 3 — The Safe Room',
  blurb: 'The last vault. Three cameras, four guards, one diamond. Then the getaway.',
  thiefStart: { x: 90, y: 620 },
  diamond: { x: 640, y: 235 },
  exit: { x: 1180, y: 92, width: 64, height: 44 },
  guardSpeed: 1.3,
  cover: [
    { x: 250, y: 190, width: 70, height: 70, kind: 'pedestal' },
    { x: 960, y: 190, width: 70, height: 70, kind: 'pedestal' },
    { x: 250, y: 480, width: 70, height: 70, kind: 'crate' },
    { x: 960, y: 480, width: 70, height: 70, kind: 'crate' },
    { x: 560, y: 300, width: 160, height: 110, kind: 'island' },
    { x: 480, y: 120, width: 90, height: 50, kind: 'planter' },
    { x: 710, y: 570, width: 90, height: 50, kind: 'planter' },
  ],
  ropes: [
    { x: 560, y: 290, width: 160 },
    { x: 560, y: 420, width: 160 },
  ],
  lamps: [
    { x: 200, y: 150 }, { x: 1080, y: 150 }, { x: 200, y: 600 }, { x: 1080, y: 600 },
  ],
  guards: [
    { waypoints: [{ x: 210, y: 140 }, { x: 1050, y: 140 }, { x: 1050, y: 430 }, { x: 210, y: 430 }], name: 'Rook' },
    { waypoints: [{ x: 1050, y: 590 }, { x: 210, y: 590 }, { x: 210, y: 330 }, { x: 1050, y: 330 }], name: 'Vesper' },
    { waypoints: [{ x: 500, y: 110 }, { x: 780, y: 110 }, { x: 780, y: 640 }, { x: 500, y: 640 }], name: 'Marlowe' },
    { waypoints: [{ x: 640, y: 450 }, { x: 900, y: 450 }, { x: 900, y: 570 }, { x: 640, y: 570 }], name: 'Ivo' },
  ],
  cameras: [
    { x: 60, y: 110, baseAngle: 0.7 },
    { x: 1220, y: 110, baseAngle: Math.PI - 0.7 },
    { x: 1220, y: 640, baseAngle: Math.PI + 0.7 },
  ],
  coins: [
    { x: 160, y: 300 }, { x: 1120, y: 300 }, { x: 480, y: 620 }, { x: 800, y: 620 },
    { x: 640, y: 160 }, { x: 640, y: 510 },
  ],
};

export const ROOMS = [ROOM_1, ROOM_2, ROOM_3];
