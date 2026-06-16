import { COLS, ROWS, EMPTY, FIRE, SMOKE, WATER, STONE, ACID } from './types';
import { cells, meta, get, swap } from './grid';
import { materialById, randomShade } from './materials';

const LIQUID_SPREAD = 4;
const FIRE_IGNITE_CHANCE = 0.04;
const FIRE_WATER_EXTINGUISH = 0.6;
const FIRE_RISE_CHANCE = 0.25;
const ACID_DISSOLVE_CHANCE = 0.18;

const moved = new Uint8Array(COLS * ROWS);

export function step(): void {
  moved.fill(0);
  const dirLeftToRight = Math.random() < 0.5;
  for (let y = ROWS - 1; y >= 0; y--) {
    if (dirLeftToRight) {
      for (let x = 0; x < COLS; x++) updateCell(x, y);
    } else {
      for (let x = COLS - 1; x >= 0; x--) updateCell(x, y);
    }
  }
}

function updateCell(x: number, y: number): void {
  const i = y * COLS + x;
  if (moved[i]) return;
  const id = cells[i];
  if (id === EMPTY) return;
  const def = materialById(id);
  switch (def.behavior) {
    case 'powder':
      updatePowder(x, y, def.density);
      break;
    case 'liquid':
      updateLiquidMotion(x, y, def.density, def.liquidSpread ?? LIQUID_SPREAD);
      break;
    case 'acid':
      updateAcid(x, y, def.density);
      break;
    case 'lava':
      updateLava(x, y, def.density, def.liquidSpread ?? 1);
      break;
    case 'fire':
      updateFire(x, y, def.lifespan ?? 50);
      break;
    case 'gas':
      updateGas(x, y, def.lifespan ?? 100);
      break;
  }
}

function markMoved(x: number, y: number): void {
  moved[y * COLS + x] = 1;
}

function canDisplace(targetId: number, ownDensity: number): boolean {
  if (targetId === EMPTY) return true;
  const def = materialById(targetId);
  // Treat acid/lava as liquid for buoyancy purposes
  const isFluid = def.behavior === 'liquid' || def.behavior === 'acid' || def.behavior === 'lava';
  return isFluid && def.density < ownDensity;
}

function tryMoveTo(x: number, y: number, nx: number, ny: number, ownDensity: number): boolean {
  if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return false;
  if (moved[ny * COLS + nx]) return false;
  if (!canDisplace(get(nx, ny), ownDensity)) return false;
  swap(x, y, nx, ny);
  markMoved(x, y);
  markMoved(nx, ny);
  return true;
}

function updatePowder(x: number, y: number, density: number): void {
  if (tryMoveTo(x, y, x, y + 1, density)) return;
  const first = Math.random() < 0.5 ? -1 : 1;
  if (tryMoveTo(x, y, x + first, y + 1, density)) return;
  tryMoveTo(x, y, x - first, y + 1, density);
}

function updateLiquidMotion(x: number, y: number, density: number, spread: number): void {
  if (tryMoveTo(x, y, x, y + 1, density)) return;
  const first = Math.random() < 0.5 ? -1 : 1;
  if (tryMoveTo(x, y, x + first, y + 1, density)) return;
  if (tryMoveTo(x, y, x - first, y + 1, density)) return;
  if (spreadHorizontal(x, y, density, first, spread)) return;
  spreadHorizontal(x, y, density, -first, spread);
}

function spreadHorizontal(x: number, y: number, density: number, dir: number, maxSteps: number): boolean {
  let targetX = x;
  for (let step = 1; step <= maxSteps; step++) {
    const nx = x + dir * step;
    if (nx < 0 || nx >= COLS) break;
    if (!canDisplace(get(nx, y), density)) break;
    targetX = nx;
  }
  if (targetX === x) return false;
  swap(x, y, targetX, y);
  markMoved(x, y);
  markMoved(targetX, y);
  return true;
}

function updateAcid(x: number, y: number, density: number): void {
  const i = y * COLS + x;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
      const ni = ny * COLS + nx;
      const nid = cells[ni];
      if (nid === EMPTY || nid === ACID) continue;
      const ndef = materialById(nid);
      if ((ndef.behavior === 'solid' || ndef.behavior === 'powder') && Math.random() < ACID_DISSOLVE_CHANCE) {
        cells[ni] = EMPTY;
        meta[ni] = 0;
        cells[i] = EMPTY;
        meta[i] = 0;
        markMoved(x, y);
        markMoved(nx, ny);
        return;
      }
    }
  }
  updateLiquidMotion(x, y, density, LIQUID_SPREAD);
}

function updateLava(x: number, y: number, density: number, spread: number): void {
  const i = y * COLS + x;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
      const ni = ny * COLS + nx;
      const nid = cells[ni];
      if (nid === EMPTY) continue;
      if (nid === WATER) {
        cells[i] = STONE;
        meta[i] = randomShade();
        cells[ni] = SMOKE;
        meta[ni] = 0;
        markMoved(x, y);
        markMoved(nx, ny);
        return;
      }
      const ndef = materialById(nid);
      if (ndef.flammable && !moved[ni] && Math.random() < FIRE_IGNITE_CHANCE) {
        cells[ni] = FIRE;
        meta[ni] = 0;
        markMoved(nx, ny);
      }
    }
  }
  updateLiquidMotion(x, y, density, spread);
}

function updateFire(x: number, y: number, lifespan: number): void {
  const i = y * COLS + x;
  const age = meta[i] + 1;

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
      const ni = ny * COLS + nx;
      const nid = cells[ni];
      if (nid === EMPTY || nid === FIRE) continue;
      if (nid === WATER) {
        if (Math.random() < FIRE_WATER_EXTINGUISH) {
          cells[i] = SMOKE;
          meta[i] = 0;
          markMoved(x, y);
          return;
        }
        continue;
      }
      const ndef = materialById(nid);
      if (ndef.flammable && !moved[ni] && Math.random() < FIRE_IGNITE_CHANCE) {
        cells[ni] = FIRE;
        meta[ni] = 0;
        markMoved(nx, ny);
      }
    }
  }

  if (age >= lifespan) {
    cells[i] = SMOKE;
    meta[i] = 0;
    markMoved(x, y);
    return;
  }
  meta[i] = age;

  if (Math.random() < FIRE_RISE_CHANCE && y - 1 >= 0) {
    const above = (y - 1) * COLS + x;
    if (cells[above] === EMPTY && !moved[above]) {
      swap(x, y, x, y - 1);
      markMoved(x, y);
      markMoved(x, y - 1);
    }
  }
}

function updateGas(x: number, y: number, lifespan: number): void {
  const i = y * COLS + x;
  const age = meta[i] + 1;
  if (age >= lifespan) {
    cells[i] = EMPTY;
    meta[i] = 0;
    return;
  }
  meta[i] = age;

  if (y - 1 < 0) return;

  if (tryGasMove(x, y, x, y - 1)) return;
  const first = Math.random() < 0.5 ? -1 : 1;
  if (tryGasMove(x, y, x + first, y - 1)) return;
  if (tryGasMove(x, y, x - first, y - 1)) return;
  if (tryGasMove(x, y, x + first, y)) return;
  tryGasMove(x, y, x - first, y);
}

function tryGasMove(x: number, y: number, nx: number, ny: number): boolean {
  if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return false;
  const ni = ny * COLS + nx;
  if (moved[ni]) return false;
  if (cells[ni] !== EMPTY) return false;
  swap(x, y, nx, ny);
  markMoved(x, y);
  markMoved(nx, ny);
  return true;
}
