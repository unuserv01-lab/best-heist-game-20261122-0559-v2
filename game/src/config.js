// Every tunable number for the heist, in one place: the size of the
// vault floor, how fast the thief and the guards move, how far a watcher
// can see, how the alarm climbs and falls, what the tools cost, and the
// colours of the rooms at night. No drawing or input lives here.
export const FIELD = { width: 1280, height: 720 };
export const BEST_KEY = 'meridian-vault-best-v2';
export const HUD_HEIGHT = 64;
export const ROOM = { x: 20, y: HUD_HEIGHT + 12, width: 1240, height: 600 };
export const STEP = 1 / 60;

export const THIEF = {
  radius: 13,
  speed: 220,
  sneakSpeed: 115,
  catchDistance: 26,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 76,
  chaseSpeed: 155,
  coneLength: 240,
  coneHalfAngle: 0.62, // about 35 degrees each side
  suspectSeconds: 1.0, // glimpsed this long before the guard grows suspicious
  chaseAlarm: 60, // alarm at which a guard that sees you gives chase
};

export const CAMERA = {
  coneLength: 270,
  coneHalfAngle: 0.48,
  sweepSpeed: 0.5, // radians per second
  sweepRange: 0.85, // radians each side of the mount's facing
};

export const ALARM = {
  guardPerSecond: 36, // alarm gained while a guard watches the thief
  cameraPerSecond: 28,
  closeBonus: 12, // extra per second when the watcher is very close
  decayPerSecond: 18, // alarm lost while nobody can see the thief
  lockdownAt: 100,
};

export const TOOLS = {
  coin: { cost: 1, key: '1', name: 'Coin toss', blurb: 'Ping a spot: a nearby guard walks over to look' },
  smoke: { cost: 2, key: '2', name: 'Smoke puff', blurb: 'Unseen for 4 s inside the cloud' },
  emp: { cost: 3, key: '3', name: 'EMP burst', blurb: 'Cameras blind for 6 s' },
};

export const SCORES = { goldCoin: 50, diamond: 500, roomClear: 200, timeBonusPerSecond: 5 };

export const PALETTE = {
  floorA: '#232850',
  floorB: '#1b2044',
  wall: '#0d1026',
  brass: '#c9a227',
  brassDim: '#8a6d1f',
  velvet: '#7f1d2d',
  carpet: '#401530',
  cone: 'rgba(255, 190, 60, 0.20)',
  coneHot: 'rgba(255, 70, 60, 0.30)',
  coneEdge: 'rgba(255, 190, 60, 0.55)',
  thief: '#0f766e',
  thiefTrim: '#f5d76e',
  guard: '#b91c1c',
  camera: '#64748b',
  diamond: '#a5f3fc',
  gold: '#fbbf24',
  alarmLow: '#22c55e',
  alarmMid: '#f59e0b',
  alarmHigh: '#ef4444',
  text: '#f1f5f9',
  textDim: '#94a3b8',
  panel: '#111631',
};
