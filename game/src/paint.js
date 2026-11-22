// Everything the eye sees: the vault at night, the cones sweeping, the
// thief in teal, the diamond glittering, and the HUD that never hides the
// alarm meter. One canvas, no images, no fonts to load — every shape is
// drawn here, so a screenshot is always the game itself.
import { CAMERA, FIELD, GUARD, HUD_HEIGHT, PALETTE, ROOM, TOOLS } from './config.js';
import { allBlockers } from './rooms.js';
import { guardCanSee } from './patrol.js';
import { cameraCanSee } from './sentry.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_ROOM_CLEAR = 'room-clear';
export const SCREEN_WIN = 'win';

function label(ctx, str, x, y, font, fill, align = 'left') {
  ctx.font = font;
  ctx.fillStyle = fill;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

function rounded(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function paintCone(ctx, x, y, facing, halfAngle, length, hot) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, length, facing - halfAngle, facing + halfAngle);
  ctx.closePath();
  ctx.fillStyle = hot ? PALETTE.coneHot : PALETTE.cone;
  ctx.fill();
  ctx.strokeStyle = PALETTE.coneEdge;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function paintFloor(ctx, world) {
  const tile = 62;
  for (let ty = ROOM.y; ty < ROOM.y + ROOM.height; ty += tile) {
    for (let tx = ROOM.x; tx < ROOM.x + ROOM.width; tx += tile) {
      const even = (Math.floor((tx - ROOM.x) / tile) + Math.floor((ty - ROOM.y) / tile)) % 2 === 0;
      ctx.fillStyle = even ? PALETTE.floorA : PALETTE.floorB;
      ctx.fillRect(tx, ty, tile, tile);
    }
  }
  // The carpet runner across the middle, where the thief is meant to cross.
  ctx.fillStyle = PALETTE.carpet;
  ctx.fillRect(ROOM.x, 330, ROOM.width, 60);
  ctx.strokeStyle = PALETTE.brassDim;
  ctx.lineWidth = 2;
  ctx.strokeRect(ROOM.x + 4, 334, ROOM.width - 8, 52);
  // Brass border of the room.
  ctx.strokeStyle = PALETTE.brass;
  ctx.lineWidth = 4;
  ctx.strokeRect(ROOM.x, ROOM.y, ROOM.width, ROOM.height);
  // Lamp glow pools.
  for (const lamp of world.room.lamps) {
    const glow = ctx.createRadialGradient(lamp.x, lamp.y, 4, lamp.x, lamp.y, 130);
    glow.addColorStop(0, 'rgba(255, 214, 120, 0.20)');
    glow.addColorStop(1, 'rgba(255, 214, 120, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(lamp.x - 130, lamp.y - 130, 260, 260);
    ctx.fillStyle = '#ffd678';
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintCover(ctx, world) {
  for (const rect of world.room.cover) {
    if (rect.kind === 'island') {
      ctx.fillStyle = '#2a2f55';
      rounded(ctx, rect.x, rect.y, rect.width, rect.height, 8);
      ctx.fill();
      ctx.strokeStyle = PALETTE.brass;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#3a4170';
      rounded(ctx, rect.x + 10, rect.y + 10, rect.width - 20, rect.height - 20, 6);
      ctx.fill();
    } else if (rect.kind === 'pedestal') {
      ctx.fillStyle = '#4a3b22';
      rounded(ctx, rect.x, rect.y, rect.width, rect.height, 6);
      ctx.fill();
      ctx.strokeStyle = PALETTE.brassDim;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#d9c27a';
      ctx.beginPath();
      ctx.arc(rect.x + rect.width / 2, rect.y + rect.height / 2, 9, 0, Math.PI * 2);
      ctx.fill();
    } else if (rect.kind === 'crate') {
      ctx.fillStyle = '#5b4632';
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      ctx.strokeStyle = '#7a5c3e';
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x + 3, rect.y + 3, rect.width - 6, rect.height - 6);
      ctx.beginPath();
      ctx.moveTo(rect.x, rect.y);
      ctx.lineTo(rect.x + rect.width, rect.y + rect.height);
      ctx.moveTo(rect.x + rect.width, rect.y);
      ctx.lineTo(rect.x, rect.y + rect.height);
      ctx.stroke();
    } else {
      // Planter: dark green, soft round leaves.
      ctx.fillStyle = '#1e4d2b';
      rounded(ctx, rect.x, rect.y, rect.width, rect.height, 12);
      ctx.fill();
      ctx.fillStyle = '#2f7a44';
      for (let i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.arc(rect.x + 12 + i * 14, rect.y + rect.height / 2, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // Velvet ropes in front of the diamond island.
  ctx.strokeStyle = PALETTE.velvet;
  ctx.lineWidth = 5;
  for (const rope of world.room.ropes) {
    ctx.beginPath();
    ctx.moveTo(rope.x, rope.y);
    ctx.quadraticCurveTo(rope.x + rope.width / 2, rope.y + 14, rope.x + rope.width, rope.y);
    ctx.stroke();
  }
}

function paintExit(ctx, world) {
  const exit = world.room.exit;
  const open = world.exitOpen;
  ctx.fillStyle = open ? '#14532d' : '#3f1d1d';
  rounded(ctx, exit.x, exit.y, exit.width, exit.height, 6);
  ctx.fill();
  ctx.strokeStyle = open ? '#22c55e' : '#ef4444';
  ctx.lineWidth = 3;
  ctx.stroke();
  label(ctx, open ? 'EXIT — OPEN' : 'EXIT — LOCKED', exit.x + exit.width / 2, exit.y + exit.height / 2 + 4, 'bold 11px Verdana, sans-serif', open ? '#bbf7d0' : '#fecaca', 'center');
  label(ctx, 'EXIT', exit.x + exit.width / 2, exit.y + exit.height + 14, 'bold 9px Verdana, sans-serif', PALETTE.textDim, 'center');
}

function paintDiamond(ctx, world, now) {
  if (world.diamondTaken) return;
  const d = world.room.diamond;
  const sparkle = 1 + Math.sin(now * 4) * 0.15;
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.scale(sparkle, sparkle);
  ctx.fillStyle = PALETTE.diamond;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(12, -4);
  ctx.lineTo(8, 12);
  ctx.lineTo(-8, 12);
  ctx.lineTo(-12, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
  label(ctx, '◆ THE MERIDIAN DIAMOND', d.x, d.y + 34, 'bold 10px Verdana, sans-serif', '#cffafe', 'center');
}

function paintCoins(ctx, world, now) {
  for (const coin of world.coins) {
    if (coin.taken) continue;
    const bob = Math.sin(now * 3 + coin.x) * 2;
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y + bob, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    label(ctx, '$', coin.x, coin.y + bob + 3, 'bold 9px Verdana, sans-serif', '#78350f', 'center');
  }
}

function paintCameras(ctx, world, blockers, now) {
  for (const camera of world.cameras) {
    const blind = now < camera.blindUntil;
    const sight = cameraCanSee(camera, world.thief, blockers, now);
    if (!blind) paintCone(ctx, camera.x, camera.y, camera.angle, CAMERA.coneHalfAngle, CAMERA.coneLength, sight.seen);
    ctx.fillStyle = blind ? '#475569' : PALETTE.camera;
    ctx.beginPath();
    ctx.arc(camera.x, camera.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = blind ? '#94a3b8' : '#f8fafc';
    ctx.beginPath();
    ctx.arc(camera.x + Math.cos(camera.angle) * 5, camera.y + Math.sin(camera.angle) * 5, 3.5, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, blind ? 'CAMERA — OFF' : 'CAMERA', camera.x, camera.y + 26, 'bold 9px Verdana, sans-serif', blind ? '#94a3b8' : PALETTE.textDim, 'center');
  }
}

function paintGuards(ctx, world, blockers) {
  for (const guard of world.guards) {
    const sight = guardCanSee(guard, world.thief, blockers, world.thief.smokeUntil, world.now);
    paintCone(ctx, guard.x, guard.y, guard.facing, GUARD.coneHalfAngle, GUARD.coneLength, sight.seen || guard.state === 'chase');
    ctx.fillStyle = PALETTE.guard;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fecaca';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Facing tick, so the patrol direction reads at a glance.
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.facing) * (GUARD.radius + 7), guard.y + Math.sin(guard.facing) * (GUARD.radius + 7));
    ctx.strokeStyle = '#fecaca';
    ctx.lineWidth = 3;
    ctx.stroke();
    const mark = guard.state === 'chase' ? '!' : guard.state === 'suspicious' ? '?' : guard.state === 'investigate' ? '…' : '';
    if (mark) label(ctx, mark, guard.x, guard.y - GUARD.radius - 8, 'bold 16px Verdana, sans-serif', '#fca5a5', 'center');
    label(ctx, `GUARD ${guard.name.toUpperCase()}`, guard.x, guard.y + GUARD.radius + 14, 'bold 9px Verdana, sans-serif', PALETTE.textDim, 'center');
  }
}

function paintThief(ctx, world) {
  const thief = world.thief;
  if (world.now < thief.smokeUntil) {
    ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
    ctx.beginPath();
    ctx.arc(thief.x, thief.y, 30, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, 'SMOKE — UNSEEN', thief.x, thief.y - 34, 'bold 9px Verdana, sans-serif', '#e2e8f0', 'center');
  }
  ctx.fillStyle = PALETTE.thief;
  ctx.beginPath();
  ctx.arc(thief.x, thief.y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.thiefTrim;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // The mask: two gold eyes, so the thief reads as a thief, not a dot.
  ctx.fillStyle = PALETTE.thiefTrim;
  ctx.beginPath();
  ctx.arc(thief.x - 4, thief.y - 1, 2, 0, Math.PI * 2);
  ctx.arc(thief.x + 4, thief.y - 1, 2, 0, Math.PI * 2);
  ctx.fill();
  if (thief.hasDiamond) {
    ctx.fillStyle = PALETTE.diamond;
    ctx.beginPath();
    ctx.arc(thief.x + 10, thief.y - 10, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  label(ctx, 'YOU — THE THIEF', thief.x, thief.y + 28, 'bold 9px Verdana, sans-serif', '#99f6e4', 'center');
}

function paintHud(ctx, world, best, muted, selectedTool) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, 0, FIELD.width, HUD_HEIGHT);
  ctx.fillStyle = PALETTE.brass;
  ctx.fillRect(0, HUD_HEIGHT - 3, FIELD.width, 3);
  label(ctx, 'MIDNIGHT AT THE MERIDIAN VAULT', 20, 26, 'bold 19px Georgia, serif', PALETTE.text);
  label(ctx, world.room.name, 20, 48, '12px Verdana, sans-serif', PALETTE.textDim);
  label(ctx, `LOOT $${world.score}`, 470, 30, 'bold 16px Verdana, sans-serif', PALETTE.gold);
  label(ctx, `COINS ${world.thief.coins}`, 470, 50, '12px Verdana, sans-serif', PALETTE.textDim);
  // The alarm meter: the one number the whole heist turns on.
  const alarmX = 620;
  const alarmWidth = 220;
  label(ctx, 'ALARM', alarmX, 22, 'bold 11px Verdana, sans-serif', PALETTE.textDim);
  ctx.fillStyle = '#0f172a';
  rounded(ctx, alarmX, 28, alarmWidth, 16, 8);
  ctx.fill();
  const alarmFill = world.alarm >= 75 ? PALETTE.alarmHigh : world.alarm >= 40 ? PALETTE.alarmMid : PALETTE.alarmLow;
  ctx.fillStyle = alarmFill;
  if (world.alarm > 1) {
    rounded(ctx, alarmX, 28, Math.max(10, (alarmWidth * world.alarm) / 100), 16, 8);
    ctx.fill();
  }
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  rounded(ctx, alarmX, 28, alarmWidth, 16, 8);
  ctx.stroke();
  label(ctx, `${Math.floor(world.alarm)}%`, alarmX + alarmWidth + 10, 42, 'bold 13px Verdana, sans-serif', alarmFill);
  // Tools, with their costs, so the choice is visible before the click.
  let toolX = 900;
  for (const key of ['coin', 'smoke', 'emp']) {
    const tool = TOOLS[key];
    const selected = selectedTool === tool.key;
    ctx.fillStyle = selected ? '#334155' : '#1e293b';
    rounded(ctx, toolX, 12, 108, 42, 6);
    ctx.fill();
    ctx.strokeStyle = selected ? PALETTE.brass : '#475569';
    ctx.lineWidth = selected ? 2 : 1;
    ctx.stroke();
    label(ctx, `[${tool.key}] ${tool.name}`, toolX + 8, 29, 'bold 10px Verdana, sans-serif', PALETTE.text);
    label(ctx, `cost ${tool.cost} coin${tool.cost > 1 ? 's' : ''}`, toolX + 8, 45, '10px Verdana, sans-serif', PALETTE.textDim);
    toolX += 116;
  }
  label(ctx, `TIME ${Math.floor(world.time)}s   BEST ${best}   ${muted ? 'MUTED (M)' : 'SOUND ON (M)'}`, 20, FIELD.height - 8, '11px Verdana, sans-serif', PALETTE.textDim);
  label(ctx, 'WASD / arrows move · SHIFT sneak (alarm climbs slower) · 1/2/3 pick a tool · CLICK use it · P pause', FIELD.width - 20, FIELD.height - 8, '11px Verdana, sans-serif', PALETTE.textDim, 'right');
  if (world.now < world.messageUntil && world.message) {
    ctx.font = 'bold 13px Verdana, sans-serif';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    const width = ctx.measureText(world.message).width + 28;
    rounded(ctx, (FIELD.width - width) / 2, 84, width, 30, 8);
    ctx.fill();
    label(ctx, world.message, FIELD.width / 2, 104, 'bold 13px Verdana, sans-serif', '#fde68a', 'center');
  }
}

function veil(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(5, 8, 24, 0.82)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  label(ctx, title, FIELD.width / 2, 300, 'bold 44px Georgia, serif', accent, 'center');
  let y = 350;
  for (const line of lines) {
    label(ctx, line, FIELD.width / 2, y, '16px Verdana, sans-serif', PALETTE.text, 'center');
    y += 28;
  }
}

export function makePainter(canvas) {
  const ctx = canvas.getContext('2d');
  return {
    draw(world, screen, best, muted, selectedTool, totalScore) {
      ctx.clearRect(0, 0, FIELD.width, FIELD.height);
      ctx.fillStyle = '#0b0e22';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      const blockers = allBlockers(world.room);
      paintFloor(ctx, world);
      paintCover(ctx, world);
      paintExit(ctx, world);
      paintDiamond(ctx, world, world.now);
      paintCoins(ctx, world, world.now);
      paintCameras(ctx, world, blockers, world.now);
      paintGuards(ctx, world, blockers);
      paintThief(ctx, world);
      for (const ping of world.pings) {
        if (world.now < ping.until) {
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(ping.x, ping.y, 12 + (ping.until - world.now) * 8, 0, Math.PI * 2);
          ctx.stroke();
          label(ctx, 'CLINK!', ping.x, ping.y - 18, 'bold 10px Verdana, sans-serif', '#fde68a', 'center');
        }
      }
      paintHud(ctx, world, best, muted, selectedTool);
      if (screen === SCREEN_TITLE) {
        veil(ctx, 'MIDNIGHT AT THE MERIDIAN VAULT', [
          'Three rooms. One diamond each. Guards with cones, cameras that sweep, an alarm that remembers.',
          'Lift the diamond, then slip out the east door. Spend coins on coin tosses, smoke and EMP.',
          'Sneak (Shift) and the alarm climbs half as fast while a watcher sees you.',
          'Press ENTER or click to begin the heist.',
          world.room.blurb,
        ], PALETTE.brass);
      } else if (screen === SCREEN_PAUSED) {
        veil(ctx, 'PAUSED', ['The vault waits. Press P to keep stealing.'], PALETTE.text);
      } else if (screen === SCREEN_CAUGHT) {
        veil(ctx, `CAUGHT BY ${String(world.caughtBy || 'A GUARD').toUpperCase()}`, [
          `The alarm hit ${Math.floor(world.alarm)}% and the patrol closed in.`,
          `Loot kept: $${world.score} · Room ${world.roomIndex + 1} of 3`,
          'Press R to try the room again, or ENTER for the title screen.',
        ], PALETTE.alarmHigh);
      } else if (screen === SCREEN_ROOM_CLEAR) {
        veil(ctx, 'ROOM CLEAR — CLEAN SO FAR', [
          `Room bonus $${world.clearBonus} · Total loot $${world.score}`,
          world.roomIndex + 1 < 3 ? 'Press ENTER for the next room.' : 'Press ENTER for the getaway.',
        ], PALETTE.alarmLow);
      } else if (screen === SCREEN_WIN) {
        veil(ctx, 'CLEAN GETAWAY', [
          'Three diamonds, three rooms, no cell. The Meridian Vault is lighter tonight.',
          `Final loot $${totalScore ?? world.score} · Best $${Math.max(best, totalScore ?? world.score)}`,
          'Press R to run the heist again.',
        ], PALETTE.diamond);
      }
    },
  };
}
