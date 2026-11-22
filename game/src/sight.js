// Sight geometry, shared by guards and cameras: is a point inside a
// watcher's cone, and does the straight line to it cross a wall or a
// piece of cover? Cover blocks sight; ropes and lamps do not.

// Does segment (x1,y1)-(x2,y2) cross rect? A parametric slab test: clip
// the segment against the rect's four sides and see if anything survives.
function segmentCrossesRect(x1, y1, x2, y2, rect) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let lo = 0;
  let hi = 1;
  // Each entry is [p, q]: the segment enters the half-plane when p*t >= q.
  const slabs = [
    [-dx, x1 - rect.x],
    [dx, rect.x + rect.width - x1],
    [-dy, y1 - rect.y],
    [dy, rect.y + rect.height - y1],
  ];
  for (const [p, q] of slabs) {
    if (p === 0) {
      if (q < 0) return false; // parallel and outside this side
      continue;
    }
    const t = q / p;
    if (p < 0) {
      if (t > hi) return false;
      if (t > lo) lo = t;
    } else {
      if (t < lo) return false;
      if (t < hi) hi = t;
    }
  }
  return lo <= hi;
}

export function lineOfSightClear(x1, y1, x2, y2, blockers) {
  for (const rect of blockers) {
    if (segmentCrossesRect(x1, y1, x2, y2, rect)) return false;
  }
  return true;
}

// Is (x, y) inside the cone of a watcher at (wx, wy) facing `facing`?
export function insideCone(wx, wy, facing, halfAngle, length, x, y) {
  const dx = x - wx;
  const dy = y - wy;
  const distance = Math.hypot(dx, dy);
  if (distance > length) return { seen: false, distance };
  let diff = Math.atan2(dy, dx) - facing;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return { seen: Math.abs(diff) <= halfAngle, distance };
}
