import { setupCanvas, render, setupGlow, renderGlow } from './renderer';
import { step } from './simulation';
import { attachInput, input } from './input';
import { buildPalette, attachControls, refreshSelectedLabel, ui } from './ui';
import { clearGrid } from './grid';
import { CELL_SIZE } from './types';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const paletteEl = document.getElementById('palette') as HTMLElement;
const brushInput = document.getElementById('brush') as HTMLInputElement;
const pauseBtn = document.getElementById('pause') as HTMLButtonElement;
const clearBtn = document.getElementById('clear') as HTMLButtonElement;
const fpsEl = document.getElementById('fps') as HTMLElement;

const ctx = setupCanvas(canvas);

buildPalette(paletteEl);
refreshSelectedLabel();
attachControls({
  brushInput,
  pauseBtn,
  clearBtn,
  onClear: () => clearGrid(),
});
attachInput(canvas, {
  getMaterial: () => ui.selected,
  getRadius: () => ui.brush,
});

const stage = canvas.parentElement!;
stage.style.position = 'relative';

const glowDims = setupGlow(CELL_SIZE);
const glowCanvas = makeOverlay(glowDims.width, glowDims.height);
glowCanvas.style.mixBlendMode = 'screen';
const glowCtx = glowCanvas.getContext('2d')!;

const cursorCanvas = makeOverlay(glowDims.width, glowDims.height);
const cursorCtx = cursorCanvas.getContext('2d')!;

function makeOverlay(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.style.position = 'absolute';
  c.style.pointerEvents = 'none';
  c.style.width = canvas.style.width;
  c.style.height = canvas.style.height;
  stage.appendChild(c);
  return c;
}

function positionOverlays(): void {
  const r = canvas.getBoundingClientRect();
  const pr = stage.getBoundingClientRect();
  const left = r.left - pr.left + 'px';
  const top = r.top - pr.top + 'px';
  glowCanvas.style.left = left;
  glowCanvas.style.top = top;
  cursorCanvas.style.left = left;
  cursorCanvas.style.top = top;
}
positionOverlays();
window.addEventListener('resize', positionOverlays);

let lastFpsTime = performance.now();
let frames = 0;
let fps = 0;

function drawCursor(): void {
  cursorCtx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);
  if (!input.onCanvas) return;
  const cx = (input.mouseGridX + 0.5) * CELL_SIZE;
  const cy = (input.mouseGridY + 0.5) * CELL_SIZE;
  const r = ui.brush * CELL_SIZE;
  cursorCtx.strokeStyle = 'rgba(255,255,255,0.5)';
  cursorCtx.lineWidth = 1;
  cursorCtx.beginPath();
  cursorCtx.arc(cx, cy, r, 0, Math.PI * 2);
  cursorCtx.stroke();
}

function frame(): void {
  if (!ui.paused) step();
  render(ctx);
  renderGlow(glowCtx, CELL_SIZE);
  drawCursor();

  frames++;
  const now = performance.now();
  if (now - lastFpsTime >= 500) {
    fps = (frames * 1000) / (now - lastFpsTime);
    fpsEl.textContent = `${fps.toFixed(0)} fps`;
    frames = 0;
    lastFpsTime = now;
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
