import {
  COLS,
  ROWS,
  EMPTY,
  FIRE,
  SMOKE,
  WATER,
  WOOD,
  STONE,
  OIL,
  ACID,
  LAVA,
  SAND,
  PLANT,
  STEAM,
  MUD,
  GUNPOWDER,
} from './types';
import { cells, meta, temp, get, swap } from './grid';
import { materialById, randomShade } from './materials';

const LIQUID_SPREAD = 4;
const FIRE_IGNITE_CHANCE = 0.04;
const FIRE_WATER_EXTINGUISH = 0.6;
const FIRE_RISE_CHANCE = 0.25;
const ACID_DISSOLVE_CHANCE = 0.18;
const PLANT_GROW_CHANCE = 0.004;
const PLANT_WET_GROW_CHANCE = 0.025;
const PLANT_SIDE_GROW_CHANCE = 0.003;
const STEAM_CONDENSE_HEIGHT = (ROWS * 0.28) | 0;
const STEAM_CONDENSE_CHANCE = 0.018;
const STEAM_COLD_CONDENSE_CHANCE = 0.08;
const MUD_DRY_AGE = 170;
const MUD_DRY_CHANCE = 0.025;
const GUNPOWDER_IGNITE_CHANCE = 0.12;
const EXPLOSION_RADIUS = 7;
const EXPLOSION_FIRE_CHANCE = 0.28;
const FIRE_TEMP = 220;
const LAVA_TEMP = 255;
const STEAM_TEMP = 120;
const EXPLOSION_TEMP = 240;
const HEAT_DIFFUSE_SHIFT = 3;
const HEAT_COOLING = 1;
const WATER_EVAP_TEMP = 118;
const FLAMMABLE_IGNITE_TEMP = 150;
const GUNPOWDER_IGNITE_TEMP = 95;
const STONE_MELT_TEMP = 245;
const STONE_MELT_CHANCE = 0.003;

const moved = new Uint8Array(COLS * ROWS);
const nextTemp = new Uint8Array(COLS * ROWS);

export function step(): void {
  moved.fill(0);
  diffuseHeat();
  resolveLavaWaterContacts();
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
  if (applyTemperatureTransition(x, y, i, id)) return;
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
    case 'plant':
      updatePlant(x, y);
      break;
    case 'mud':
      updateMud(x, y, def.density, def.liquidSpread ?? 1);
      break;
    case 'gunpowder':
      updateGunpowder(x, y, def.density);
      break;
    case 'fire':
      updateFire(x, y, def.lifespan ?? 50);
      break;
    case 'gas':
      if (id === STEAM) {
        updateSteam(x, y, def.lifespan ?? 90);
      } else {
        updateGas(x, y, def.lifespan ?? 100);
      }
      break;
  }
}

function markMoved(x: number, y: number): void {
  moved[y * COLS + x] = 1;
}

function canDisplace(targetId: number, ownDensity: number): boolean {
  if (targetId === EMPTY) return true;
  const def = materialById(targetId);
  const isFluid = isFlowing(def.behavior);
  return isFluid && def.density < ownDensity;
}

function isFlowing(behavior: string): boolean {
  return behavior === 'liquid' || behavior === 'acid' || behavior === 'lava' || behavior === 'mud';
}

function setCell(i: number, id: number, shade: number): void {
  cells[i] = id;
  meta[i] = shade;
}

function setCellWithTemp(i: number, id: number, shade: number, heat: number): void {
  cells[i] = id;
  meta[i] = shade;
  temp[i] = heat;
}

function heatCell(i: number, amount: number): void {
  if (temp[i] < amount) temp[i] = amount;
}

function diffuseHeat(): void {
  const n = COLS * ROWS;
  for (let i = 0; i < n; i++) {
    const id = cells[i];
    if (id === FIRE) {
      nextTemp[i] = FIRE_TEMP;
      continue;
    }
    if (id === LAVA) {
      nextTemp[i] = LAVA_TEMP;
      continue;
    }
    if (id === STEAM) {
      nextTemp[i] = Math.max(temp[i], STEAM_TEMP);
      continue;
    }

    const own = temp[i];
    let total = own * 4;
    let count = 4;
    if (i >= COLS) {
      total += temp[i - COLS];
      count++;
    }
    if (i < n - COLS) {
      total += temp[i + COLS];
      count++;
    }
    if (i % COLS !== 0) {
      total += temp[i - 1];
      count++;
    }
    if (i % COLS !== COLS - 1) {
      total += temp[i + 1];
      count++;
    }

    const avg = (total / count) | 0;
    let heat = own + ((avg - own) >> HEAT_DIFFUSE_SHIFT);
    if (heat > HEAT_COOLING) heat -= HEAT_COOLING;
    else heat = 0;
    nextTemp[i] = heat;
  }
  temp.set(nextTemp);
}

function resolveLavaWaterContacts(): void {
  const n = COLS * ROWS;
  for (let i = 0; i < n; i++) {
    if (cells[i] !== LAVA || moved[i]) continue;
    const x = i % COLS;
    const y = (i / COLS) | 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
        const ni = ny * COLS + nx;
        if (moved[ni]) continue;
        const nid = cells[ni];
        if (nid !== WATER && nid !== STEAM) continue;
        setCellWithTemp(i, STONE, randomShade(), 180);
        setCellWithTemp(ni, STEAM, 0, STEAM_TEMP);
        markMoved(x, y);
        markMoved(nx, ny);
        dx = 2;
        dy = 2;
      }
    }
  }
}

function applyTemperatureTransition(x: number, y: number, i: number, id: number): boolean {
  const heat = temp[i];
  if (id === WATER && heat >= WATER_EVAP_TEMP) {
    if (tryCoolAdjacentLava(x, y, i)) return true;
    setCellWithTemp(i, STEAM, 0, STEAM_TEMP);
    markMoved(x, y);
    return true;
  }
  if (id === GUNPOWDER && heat >= GUNPOWDER_IGNITE_TEMP) {
    explodeAt(x, y);
    return true;
  }
  if ((id === WOOD || id === OIL || id === PLANT) && heat >= FLAMMABLE_IGNITE_TEMP) {
    setCellWithTemp(i, FIRE, 0, FIRE_TEMP);
    markMoved(x, y);
    return true;
  }
  if (id === STONE && heat >= STONE_MELT_TEMP && Math.random() < STONE_MELT_CHANCE) {
    setCellWithTemp(i, LAVA, randomShade(), LAVA_TEMP);
    markMoved(x, y);
    return true;
  }
  return false;
}

function tryCoolAdjacentLava(x: number, y: number, waterIndex: number): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
      const ni = ny * COLS + nx;
      if (cells[ni] !== LAVA) continue;
      setCellWithTemp(ni, STONE, randomShade(), 180);
      setCellWithTemp(waterIndex, STEAM, 0, STEAM_TEMP);
      markMoved(nx, ny);
      markMoved(x, y);
      return true;
    }
  }
  return false;
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
  if (tryMakeMud(x, y)) return;
  if (tryMoveTo(x, y, x, y + 1, density)) return;
  const first = Math.random() < 0.5 ? -1 : 1;
  if (tryMoveTo(x, y, x + first, y + 1, density)) return;
  tryMoveTo(x, y, x - first, y + 1, density);
}

function updateLiquidMotion(x: number, y: number, density: number, spread: number): void {
  if (cells[y * COLS + x] === WATER && tryMakeMud(x, y)) return;
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
  heatCell(i, LAVA_TEMP);
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
      const ni = ny * COLS + nx;
      const nid = cells[ni];
      if (nid === EMPTY) continue;
      heatCell(ni, LAVA_TEMP - 25);
      if (nid === WATER || nid === STEAM) {
        setCellWithTemp(i, STONE, randomShade(), 180);
        setCellWithTemp(ni, STEAM, 0, STEAM_TEMP);
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
  heatCell(i, FIRE_TEMP);

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
      const ni = ny * COLS + nx;
      const nid = cells[ni];
      if (nid === EMPTY || nid === FIRE) continue;
      heatCell(ni, FIRE_TEMP - 35);
      if (nid === WATER) {
        if (Math.random() < FIRE_WATER_EXTINGUISH) {
          setCellWithTemp(i, SMOKE, 0, FIRE_TEMP / 2);
          setCellWithTemp(ni, STEAM, 0, STEAM_TEMP);
          markMoved(x, y);
          markMoved(nx, ny);
          return;
        }
        continue;
      }
      if (nid === GUNPOWDER && !moved[ni] && Math.random() < GUNPOWDER_IGNITE_CHANCE) {
        explodeAt(nx, ny);
        return;
      }
      const ndef = materialById(nid);
      if (ndef.flammable && !moved[ni] && Math.random() < FIRE_IGNITE_CHANCE) {
        setCell(ni, FIRE, 0);
        markMoved(nx, ny);
      }
    }
  }

  if (age >= lifespan) {
    setCellWithTemp(i, SMOKE, 0, Math.min(temp[i], FIRE_TEMP / 2));
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

function updatePlant(x: number, y: number): void {
  const i = y * COLS + x;
  const wet = nearMaterial(x, y, WATER);
  const growChance = wet ? PLANT_WET_GROW_CHANCE : PLANT_GROW_CHANCE;

  if (y > 0 && cells[i - COLS] === EMPTY && Math.random() < growChance) {
    setCell(i - COLS, PLANT, randomShade());
    markMoved(x, y - 1);
  }

  const first = Math.random() < 0.5 ? -1 : 1;
  if (tryGrowPlantSide(x, y, first, wet)) return;
  tryGrowPlantSide(x, y, -first, wet);
}

function tryGrowPlantSide(x: number, y: number, dir: number, wet: boolean): boolean {
  const nx = x + dir;
  if (nx < 0 || nx >= COLS) return false;
  const ni = y * COLS + nx;
  if (cells[ni] !== EMPTY) return false;
  const chance = wet ? PLANT_SIDE_GROW_CHANCE * 3 : PLANT_SIDE_GROW_CHANCE;
  if (Math.random() >= chance) return false;
  setCell(ni, PLANT, randomShade());
  markMoved(nx, y);
  return true;
}

function updateMud(x: number, y: number, density: number, spread: number): void {
  const i = y * COLS + x;
  const age = meta[i] + 1;
  meta[i] = age;
  if (age >= MUD_DRY_AGE && !nearMaterial(x, y, WATER) && Math.random() < MUD_DRY_CHANCE) {
    setCell(i, SAND, randomShade());
    markMoved(x, y);
    return;
  }
  updateLiquidMotion(x, y, density, spread);
}

function updateGunpowder(x: number, y: number, density: number): void {
  if (nearMaterial(x, y, FIRE) || nearMaterial(x, y, LAVA)) {
    if (Math.random() < GUNPOWDER_IGNITE_CHANCE) {
      explodeAt(x, y);
      return;
    }
  }
  updatePowder(x, y, density);
}

function updateSteam(x: number, y: number, lifespan: number): void {
  const i = y * COLS + x;
  const age = meta[i] + 1;
  const cold = y <= STEAM_CONDENSE_HEIGHT || nearMaterial(x, y, STONE);
  const chance = cold ? STEAM_COLD_CONDENSE_CHANCE : STEAM_CONDENSE_CHANCE;
  if (age >= lifespan || Math.random() < chance) {
    setCellWithTemp(i, WATER, randomShade(), Math.min(temp[i], WATER_EVAP_TEMP - 10));
    markMoved(x, y);
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

function tryMakeMud(x: number, y: number): boolean {
  const i = y * COLS + x;
  const id = cells[i];
  if (id !== SAND && id !== WATER) return false;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (Math.abs(dx) + Math.abs(dy) !== 1) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
      const ni = ny * COLS + nx;
      const nid = cells[ni];
      if ((id === SAND && nid === WATER) || (id === WATER && nid === SAND)) {
        setCell(i, MUD, randomShade());
        setCell(ni, MUD, randomShade());
        temp[i] = Math.max(temp[i], temp[ni]);
        temp[ni] = temp[i];
        markMoved(x, y);
        markMoved(nx, ny);
        return true;
      }
    }
  }
  return false;
}

function nearMaterial(x: number, y: number, material: number): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
      if (cells[ny * COLS + nx] === material) return true;
    }
  }
  return false;
}

function explodeAt(cx: number, cy: number): void {
  const r2 = EXPLOSION_RADIUS * EXPLOSION_RADIUS;
  for (let dy = -EXPLOSION_RADIUS; dy <= EXPLOSION_RADIUS; dy++) {
    for (let dx = -EXPLOSION_RADIUS; dx <= EXPLOSION_RADIUS; dx++) {
      if (dx * dx + dy * dy > r2) continue;
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || x >= COLS || y < 0 || y >= ROWS) continue;
      const i = y * COLS + x;
      const id = cells[i];
      if (id === STONE || id === LAVA) continue;
      if (id === GUNPOWDER || Math.random() < EXPLOSION_FIRE_CHANCE) {
        setCellWithTemp(i, FIRE, 0, EXPLOSION_TEMP);
      } else {
        setCellWithTemp(i, EMPTY, 0, EXPLOSION_TEMP / 2);
      }
      markMoved(x, y);
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
