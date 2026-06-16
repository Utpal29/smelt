import { COLS, ROWS, EMPTY, SHADE_MASK, SHADE_COUNT, FIRE, LAVA } from './types';
import { cells, meta } from './grid';
import { MATERIALS } from './materials';

const useAge: Uint8Array = new Uint8Array(MATERIALS.length);
const lifespanLut: Uint16Array = new Uint16Array(MATERIALS.length);
for (let i = 0; i < MATERIALS.length; i++) {
  const m = MATERIALS[i];
  useAge[i] = m.behavior === 'fire' || m.behavior === 'gas' ? 1 : 0;
  lifespanLut[i] = m.lifespan ?? 1;
}

const BG = '#0a0a0f';

// Precompute palette lookup table: paletteRgb[matId][shade] = [r,g,b]
const paletteRgb: Uint8ClampedArray[] = MATERIALS.map((def) => {
  const arr = new Uint8ClampedArray(def.palette.length * 3);
  for (let i = 0; i < def.palette.length; i++) {
    const m = def.palette[i].match(/\d+/g)!;
    arr[i * 3] = parseInt(m[0], 10);
    arr[i * 3 + 1] = parseInt(m[1], 10);
    arr[i * 3 + 2] = parseInt(m[2], 10);
  }
  return arr;
});

const BG_RGB = (() => {
  const s = BG.replace('#', '');
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ];
})();

let imageData: ImageData | null = null;
let buffer: Uint8ClampedArray | null = null;
const glowCells = new Uint32Array(COLS * ROWS);
let glowCount = 0;

export function setupCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  canvas.width = COLS;
  canvas.height = ROWS;
  const ctx = canvas.getContext('2d', { alpha: false })!;
  ctx.imageSmoothingEnabled = false;
  imageData = ctx.createImageData(COLS, ROWS);
  buffer = imageData.data;
  return ctx;
}

export function render(ctx: CanvasRenderingContext2D): void {
  if (!imageData || !buffer) return;
  const data = buffer;
  const n = COLS * ROWS;
  glowCount = 0;
  for (let i = 0; i < n; i++) {
    const id = cells[i];
    const di = i * 4;
    if (id === EMPTY) {
      data[di] = BG_RGB[0];
      data[di + 1] = BG_RGB[1];
      data[di + 2] = BG_RGB[2];
      data[di + 3] = 255;
    } else {
      let shade: number;
      if (useAge[id]) {
        const age = meta[i];
        const max = lifespanLut[id];
        shade = (age * SHADE_COUNT / max) | 0;
        if (shade >= SHADE_COUNT) shade = SHADE_COUNT - 1;
      } else {
        shade = meta[i] & SHADE_MASK;
      }
      const pal = paletteRgb[id];
      const pi = shade * 3;
      data[di] = pal[pi];
      data[di + 1] = pal[pi + 1];
      data[di + 2] = pal[pi + 2];
      data[di + 3] = 255;
      if (id === FIRE || id === LAVA) {
        glowCells[glowCount] = i;
        glowCount++;
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

let glowSpriteFire: HTMLCanvasElement | null = null;
let glowSpriteLava: HTMLCanvasElement | null = null;
let glowWasVisible = false;

function makeGlowSprite(size: number, color: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const gctx = c.getContext('2d')!;
  const half = size / 2;
  const grad = gctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, color);
  grad.addColorStop(0.5, color.replace(/[\d.]+\)$/, '0.18)'));
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  gctx.fillStyle = grad;
  gctx.fillRect(0, 0, size, size);
  return c;
}

export function setupGlow(displayCellSize: number): { width: number; height: number } {
  glowSpriteFire = makeGlowSprite(displayCellSize * 16, 'rgba(255,180,90,0.55)');
  glowSpriteLava = makeGlowSprite(displayCellSize * 20, 'rgba(255,90,40,0.6)');
  return { width: COLS * displayCellSize, height: ROWS * displayCellSize };
}

export function renderGlow(ctx: CanvasRenderingContext2D, displayCellSize: number): void {
  if (!glowSpriteFire || !glowSpriteLava) return;
  if (glowCount === 0) {
    if (glowWasVisible) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      glowWasVisible = false;
    }
    return;
  }

  glowWasVisible = true;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.globalCompositeOperation = 'lighter';
  const fireSize = glowSpriteFire.width;
  const lavaSize = glowSpriteLava.width;
  const fireHalf = fireSize / 2;
  const lavaHalf = lavaSize / 2;
  const half = displayCellSize / 2;
  for (let g = 0; g < glowCount; g++) {
    const i = glowCells[g];
    const id = cells[i];
    const x = i % COLS;
    const y = (i / COLS) | 0;
    const cx = x * displayCellSize + half;
    const cy = y * displayCellSize + half;
    if (id === FIRE) {
      // Fade fire glow as it ages
      const age = meta[i];
      const max = lifespanLut[FIRE];
      const t = 1 - age / max;
      ctx.globalAlpha = 0.4 + 0.6 * t;
      ctx.drawImage(glowSpriteFire, cx - fireHalf, cy - fireHalf);
    } else {
      ctx.globalAlpha = 1;
      ctx.drawImage(glowSpriteLava, cx - lavaHalf, cy - lavaHalf);
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}
