import { cells, clearGrid, meta, temp } from './grid';
import {
  ACID,
  COLS,
  EMPTY,
  FIRE,
  GUNPOWDER,
  ICE,
  LAVA,
  METAL,
  MUD,
  OIL,
  PLANT,
  ROWS,
  SAND,
  STONE,
  WATER,
  WOOD,
} from './types';
import { MATERIALS, randomShade } from './materials';

export const PRESETS = [
  { id: 'volcano', name: 'Volcano' },
  { id: 'waterfall', name: 'Waterfall' },
  { id: 'chain', name: 'Bomb Chain' },
  { id: 'glacier', name: 'Glacier Cave' },
  { id: 'furnace', name: 'Metal Furnace' },
  { id: 'fortress', name: 'Sand Fortress' },
] as const;

export type PresetId = (typeof PRESETS)[number]['id'];

export function saveScenePng(): void {
  const sceneCanvas = document.createElement('canvas');
  sceneCanvas.width = COLS;
  sceneCanvas.height = ROWS;
  const ctx = sceneCanvas.getContext('2d')!;
  const imageData = ctx.createImageData(COLS, ROWS);
  const data = imageData.data;
  const n = COLS * ROWS;
  for (let i = 0; i < n; i++) {
    const di = i * 4;
    data[di] = cells[i];
    data[di + 1] = meta[i];
    data[di + 2] = temp[i];
    data[di + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  const a = document.createElement('a');
  a.download = `smelt-scene-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
  a.href = sceneCanvas.toDataURL('image/png');
  a.click();
}

export async function loadScenePng(file: File): Promise<void> {
  const bitmap = await createImageBitmap(file);
  const sceneCanvas = document.createElement('canvas');
  sceneCanvas.width = COLS;
  sceneCanvas.height = ROWS;
  const ctx = sceneCanvas.getContext('2d')!;
  ctx.clearRect(0, 0, COLS, ROWS);
  ctx.drawImage(bitmap, 0, 0, COLS, ROWS);
  bitmap.close();

  const data = ctx.getImageData(0, 0, COLS, ROWS).data;
  const n = COLS * ROWS;
  for (let i = 0; i < n; i++) {
    const di = i * 4;
    const id = data[di];
    cells[i] = id < MATERIALS.length ? id : EMPTY;
    meta[i] = data[di + 1];
    temp[i] = data[di + 2];
  }
}

export function loadPreset(id: PresetId): void {
  clearGrid();
  switch (id) {
    case 'volcano':
      buildVolcano();
      break;
    case 'waterfall':
      buildWaterfall();
      break;
    case 'chain':
      buildBombChain();
      break;
    case 'glacier':
      buildGlacier();
      break;
    case 'furnace':
      buildFurnace();
      break;
    case 'fortress':
      buildFortress();
      break;
  }
}

// ---------- shape helpers ----------

function setCell(x: number, y: number, id: number, heat = 0): void {
  if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return;
  const i = y * COLS + x;
  cells[i] = id;
  meta[i] = randomShade();
  temp[i] = heat;
}

function fillRect(x0: number, y0: number, w: number, h: number, id: number, heat = 0): void {
  const x1 = Math.min(COLS, x0 + w);
  const y1 = Math.min(ROWS, y0 + h);
  for (let y = Math.max(0, y0); y < y1; y++) {
    for (let x = Math.max(0, x0); x < x1; x++) {
      setCell(x, y, id, heat);
    }
  }
}

function drawCircle(cx: number, cy: number, r: number, id: number, heat = 0): void {
  const r2 = r * r;
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > r2) continue;
      setCell(x, y, id, heat);
    }
  }
}

function drawDisk(cx: number, cy: number, r: number, id: number, density: number, heat = 0): void {
  // Sparse fill — useful for powdery materials so they fall naturally.
  const r2 = r * r;
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > r2) continue;
      if (Math.random() > density) continue;
      setCell(x, y, id, heat);
    }
  }
}

// Mountain-shaped triangle filled with `id`. Apex at (peakX, peakY), base on row `baseY`.
function fillTriangle(peakX: number, peakY: number, halfBase: number, baseY: number, id: number): void {
  const rows = baseY - peakY;
  for (let y = peakY; y <= baseY; y++) {
    const t = rows === 0 ? 0 : (y - peakY) / rows;
    const half = (halfBase * t) | 0;
    fillRect(peakX - half, y, half * 2 + 1, 1, id);
  }
}

// ---------- presets ----------

function buildVolcano(): void {
  // Ground stone bed first — everything sits on this.
  fillRect(0, 264, COLS, 16, STONE);
  // Wide rocky base, then a layered cone (each fillTriangle paints stone over the last).
  fillTriangle(210, 150, 170, 264, STONE);
  fillTriangle(210, 120, 130, 264, STONE);
  fillTriangle(210, 96, 90, 264, STONE);
  // Carve the crater funnel + vertical vent down to the magma chamber.
  fillRect(192, 84, 36, 22, EMPTY);
  fillRect(200, 96, 20, 130, EMPTY);
  // Magma chamber, fully contained inside stone.
  fillRect(176, 226, 68, 36, LAVA, 255);
  // Vent + bubbling crater rim.
  fillRect(200, 130, 20, 96, LAVA, 255);
  drawCircle(210, 86, 14, LAVA, 255);
  // Stone seal at the chamber floor (so lava can't leak below).
  fillRect(170, 262, 80, 2, STONE);
  // Left side: an icy lake fed by a frozen rim.
  fillRect(0, 238, 100, 26, WATER);
  fillRect(0, 232, 100, 6, ICE);
  // Shoreline: wet sand beach climbing toward the mountain.
  fillRect(100, 256, 60, 8, SAND);
  // Right side: forest of wood trunks with plant crowns, on a soft soil ridge.
  fillRect(290, 256, 120, 8, SAND);
  for (let tx = 296; tx < COLS - 8; tx += 18) {
    fillRect(tx, 232, 4, 24, WOOD);
    drawCircle(tx + 2, 226, 7, PLANT);
  }
}

function buildWaterfall(): void {
  // Ground bed.
  fillRect(0, 260, COLS, 20, STONE);
  // Far-left cliff face (top reservoir holder) — a tall stone wall + base.
  fillRect(0, 30, 24, 230, STONE);
  fillRect(0, 30, 130, 8, STONE);
  fillRect(122, 30, 8, 60, STONE);
  // Reservoir cup, filled with water.
  fillRect(24, 38, 98, 50, WATER);
  // Spillway: water lip at the right edge of the reservoir.
  fillRect(116, 86, 14, 4, EMPTY);
  // Tier 2 cliff catching the first fall — supported by a left column.
  fillRect(150, 130, 12, 130, STONE);
  fillRect(150, 122, 90, 10, STONE);
  // Tier 3 cliff — supported by a right column running to floor.
  fillRect(310, 184, 12, 76, STONE);
  fillRect(238, 176, 84, 10, STONE);
  // Falling water streams seeded so simulation starts already flowing.
  fillRect(118, 90, 8, 30, WATER);
  fillRect(214, 132, 8, 40, WATER);
  fillRect(296, 186, 8, 50, WATER);
  // Bottom pool framed by stone banks.
  fillRect(24, 246, 286, 14, WATER);
  // Sandy bank in front of the right column + plants on the banks.
  fillRect(322, 248, 88, 12, SAND);
  for (let px = 322; px < COLS - 8; px += 12) drawCircle(px, 244, 3, PLANT);
  // Driftwood resting on the second tier.
  fillRect(168, 116, 24, 6, WOOD);
  // Mud strip on the lowest cliff (cold spray makes runoff).
  fillRect(238, 170, 60, 6, MUD);
}

function buildBombChain(): void {
  // Stage floor + a back wall.
  fillRect(0, 252, COLS, 28, STONE);
  fillRect(0, 60, COLS, 4, STONE);
  // Fuse line of gunpowder mounds.
  for (let x = 28; x < COLS - 28; x += 32) {
    drawDisk(x, 232, 8, GUNPOWDER, 0.65);
  }
  // Ignition source on the far left.
  fillRect(10, 220, 8, 12, FIRE, 220);
  // Targets sprinkled between mounds.
  fillRect(98, 198, 28, 36, WOOD);
  fillRect(186, 208, 26, 26, OIL);
  fillRect(254, 198, 30, 36, WOOD);
  fillRect(320, 210, 30, 24, ACID);
  // Sand bunkers between targets, partly absorbing blast.
  fillRect(78, 226, 4, 8, SAND);
  fillRect(150, 224, 4, 10, SAND);
  fillRect(220, 226, 4, 8, SAND);
  fillRect(296, 224, 4, 10, SAND);
}

function buildGlacier(): void {
  // Stone bedrock floor — keeps water from leaking off-screen.
  fillRect(0, 260, COLS, 20, STONE);
  // Ice ceiling slab, full width.
  fillRect(0, 0, COLS, 22, ICE);
  // Ice side walls, anchored to floor.
  fillRect(0, 22, 22, 238, ICE);
  fillRect(COLS - 22, 22, 22, 238, ICE);
  // Stalactites from the ceiling.
  for (let x = 50; x < COLS - 50; x += 40) {
    fillTriangle(x, 22, 7, 70, ICE);
  }
  // Central frozen pillar that touches floor + ceiling.
  fillRect(198, 22, 24, 238, ICE);
  // Sub-pillar pond on the left (cold lake).
  fillRect(28, 240, 160, 20, WATER);
  // Mud strip on the floor by the lake (runoff).
  fillRect(28, 252, 160, 8, MUD);
  // A small lava spark on a stone shelf melting into the right wall.
  fillRect(330, 232, 60, 6, STONE);
  drawCircle(360, 226, 7, LAVA, 255);
  // Plant tucked in a warm pocket on the right.
  fillRect(240, 248, 60, 12, PLANT);
}

function buildFurnace(): void {
  // Ground.
  fillRect(0, 260, COLS, 20, STONE);
  // Furnace body: thick metal walls, floor, and lid.
  fillRect(140, 80, 16, 180, METAL);
  fillRect(264, 80, 16, 180, METAL);
  fillRect(140, 244, 140, 16, METAL);
  fillRect(140, 80, 140, 10, METAL);
  // Chimney rising from the lid.
  fillRect(200, 36, 8, 44, METAL);
  fillRect(208, 36, 8, 44, METAL);
  // Wood + oil fuel piled inside the furnace.
  fillRect(160, 222, 100, 22, WOOD);
  fillRect(160, 200, 100, 22, OIL);
  // Lava drip just entering the top of the chimney.
  drawCircle(208, 40, 6, LAVA, 255);
  // Workbench outside: stone shelf with wood on it and an acid jar.
  fillRect(28, 220, 90, 4, STONE);
  fillRect(34, 196, 60, 24, WOOD);
  fillRect(96, 196, 22, 24, ACID);
  // Coolant tank to the right of the furnace.
  fillRect(296, 220, 100, 4, STONE);
  fillRect(300, 196, 92, 24, WATER);
  fillRect(300, 186, 92, 10, ICE);
  // Sandy floor patch.
  fillRect(28, 256, 90, 4, SAND);
  fillRect(296, 256, 110, 4, SAND);
}

function buildFortress(): void {
  // Ground.
  fillRect(0, 264, COLS, 16, STONE);
  // Stone foundation slab.
  fillRect(120, 244, 180, 20, STONE);
  // Sand fortress body (boxy castle silhouette, not a sand-pile).
  fillRect(140, 150, 140, 94, SAND);
  // Stone-clad battlements along the top, with crenellation gaps.
  fillRect(140, 142, 140, 8, STONE);
  for (let x = 150; x < 280; x += 22) fillRect(x, 136, 10, 6, STONE);
  // Two corner watchtowers — anchored ON TOP of the fortress.
  fillRect(140, 118, 22, 32, STONE);
  fillRect(258, 118, 22, 32, STONE);
  // Tower flag-pieces (wood flagpoles).
  fillRect(150, 102, 2, 18, WOOD);
  fillRect(268, 102, 2, 18, WOOD);
  // Wooden gate set into the wall.
  fillRect(196, 210, 28, 34, WOOD);
  // Plant hedge moat on both flanks.
  fillRect(96, 252, 24, 12, PLANT);
  fillRect(300, 252, 24, 12, PLANT);
  // Acid storm — a sealed stone bowl that drips on the castle.
  fillRect(140, 40, 140, 6, STONE);
  fillRect(140, 46, 6, 30, STONE);
  fillRect(274, 46, 6, 30, STONE);
  fillRect(146, 76, 128, 4, STONE);
  // Holes in the bowl floor so acid leaks down.
  for (let x = 156; x < 272; x += 22) fillRect(x, 76, 6, 4, EMPTY);
  // Fill the bowl with acid.
  fillRect(146, 46, 128, 30, ACID);
  // Lava catapult lobs on the flanks (sitting on a stone shelf, not floating).
  fillRect(40, 220, 30, 6, STONE);
  fillRect(350, 220, 30, 6, STONE);
  drawCircle(55, 212, 6, LAVA, 255);
  drawCircle(365, 212, 6, LAVA, 255);
  // Gunpowder mines under the gate.
  drawDisk(196, 256, 4, GUNPOWDER, 0.8);
  drawDisk(224, 256, 4, GUNPOWDER, 0.8);
}
