import { cells, clearGrid, meta, temp } from './grid';
import {
  ACID,
  COLS,
  EMPTY,
  FIRE,
  GUNPOWDER,
  LAVA,
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
  if (id === 'volcano') buildVolcano();
  else if (id === 'waterfall') buildWaterfall();
  else buildBombChain();
}

function fillRect(x0: number, y0: number, w: number, h: number, id: number, heat = 0): void {
  const x1 = Math.min(COLS, x0 + w);
  const y1 = Math.min(ROWS, y0 + h);
  for (let y = Math.max(0, y0); y < y1; y++) {
    for (let x = Math.max(0, x0); x < x1; x++) {
      const i = y * COLS + x;
      cells[i] = id;
      meta[i] = randomShade();
      temp[i] = heat;
    }
  }
}

function drawCircle(cx: number, cy: number, r: number, id: number, heat = 0): void {
  const r2 = r * r;
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if (x < 0 || x >= COLS || y < 0 || y >= ROWS) continue;
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > r2) continue;
      const i = y * COLS + x;
      cells[i] = id;
      meta[i] = randomShade();
      temp[i] = heat;
    }
  }
}

function buildVolcano(): void {
  for (let y = 92; y < ROWS; y++) {
    const t = (y - 92) / (ROWS - 92);
    const half = 18 + (t * 86) | 0;
    fillRect((COLS / 2 - half) | 0, y, half * 2, 1, STONE);
  }
  fillRect(138, 88, 24, 84, EMPTY);
  fillRect(142, 96, 16, 68, LAVA, 255);
  drawCircle(150, 88, 12, LAVA, 255);
  fillRect(42, 170, 58, 18, WATER);
  fillRect(205, 154, 45, 24, PLANT);
  fillRect(218, 178, 32, 14, WOOD);
}

function buildWaterfall(): void {
  fillRect(0, 178, COLS, 22, STONE);
  fillRect(22, 54, 78, 14, STONE);
  fillRect(100, 92, 68, 13, STONE);
  fillRect(168, 132, 76, 14, STONE);
  fillRect(38, 20, 44, 32, WATER);
  fillRect(56, 52, 16, 128, WATER);
  fillRect(190, 146, 48, 32, SAND);
  fillRect(224, 146, 28, 32, MUD);
  fillRect(34, 155, 28, 24, PLANT);
}

function buildBombChain(): void {
  fillRect(0, 184, COLS, 16, STONE);
  for (let x = 24; x < 266; x += 26) {
    drawCircle(x, 168, 7, GUNPOWDER);
    fillRect(x + 8, 166, 12, 4, SAND);
  }
  fillRect(18, 154, 8, 10, FIRE, 220);
  fillRect(90, 136, 24, 30, WOOD);
  fillRect(150, 146, 22, 18, OIL);
  fillRect(214, 143, 28, 22, ACID);
}
