import { setupCanvas, render, setupGlow, renderGlow } from './renderer';
import { step } from './simulation';
import { attachInput, input } from './input';
import { buildPalette, attachControls, refreshSelectedLabel, ui } from './ui';
import { clearGrid } from './grid';
import { CELL_SIZE } from './types';
import { MATERIALS } from './materials';
import { consumeFeedback, type FeedbackFrame } from './feedback';
import { attachAudioUnlock, isMuted, setMuted, updateAudio } from './audio';
import { loadPreset, loadScenePng, PRESETS, saveScenePng, type PresetId } from './scenes';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const paletteEl = document.getElementById('palette') as HTMLElement;
const brushInput = document.getElementById('brush') as HTMLInputElement;
const pauseBtn = document.getElementById('pause') as HTMLButtonElement;
const clearBtn = document.getElementById('clear') as HTMLButtonElement;
const muteBtn = document.getElementById('mute') as HTMLButtonElement;
const presetSelect = document.getElementById('preset') as HTMLSelectElement;
const loadSceneBtn = document.getElementById('load-scene') as HTMLButtonElement;
const saveSceneBtn = document.getElementById('save-scene') as HTMLButtonElement;
const sceneFileInput = document.getElementById('scene-file') as HTMLInputElement;
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
attachAudioUnlock(document.body);

const soundIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"></path><path d="M16 8.5c1 .9 1.5 2.1 1.5 3.5S17 14.6 16 15.5"></path><path d="M18.5 6c1.7 1.5 2.5 3.5 2.5 6s-.8 4.5-2.5 6"></path></svg>';
const mutedIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"></path><path d="M18 9l4 4"></path><path d="M22 9l-4 4"></path></svg>';

function refreshMuteButton(): void {
  const muted = isMuted();
  const label = muted ? 'Unmute sound' : 'Mute sound';
  muteBtn.innerHTML = muted ? mutedIcon : soundIcon;
  muteBtn.setAttribute('aria-label', label);
  muteBtn.title = label;
  muteBtn.setAttribute('aria-pressed', String(muted));
  muteBtn.classList.toggle('muted', muted);
}

muteBtn.addEventListener('click', () => {
  setMuted(!isMuted());
  refreshMuteButton();
});
window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (e.key === 'm' || e.key === 'M') {
    setMuted(!isMuted());
    refreshMuteButton();
  }
});
refreshMuteButton();

for (const preset of PRESETS) {
  const option = document.createElement('option');
  option.value = preset.id;
  option.textContent = preset.name;
  presetSelect.appendChild(option);
}

presetSelect.addEventListener('change', () => {
  if (!presetSelect.value) return;
  loadPreset(presetSelect.value as PresetId);
  presetSelect.value = '';
});
saveSceneBtn.addEventListener('click', () => saveScenePng());
loadSceneBtn.addEventListener('click', () => sceneFileInput.click());
sceneFileInput.addEventListener('change', () => {
  const file = sceneFileInput.files?.[0];
  if (!file) return;
  void loadScenePng(file).finally(() => {
    sceneFileInput.value = '';
  });
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
  glowCanvas.style.width = `${r.width}px`;
  glowCanvas.style.height = `${r.height}px`;
  cursorCanvas.style.left = left;
  cursorCanvas.style.top = top;
  cursorCanvas.style.width = `${r.width}px`;
  cursorCanvas.style.height = `${r.height}px`;
}
positionOverlays();
window.addEventListener('resize', positionOverlays);

let lastFpsTime = performance.now();
let frames = 0;
let fps = 0;
let shakePower = 0;
let shakeUntil = 0;

function materialColor(id: number): string {
  const palette = MATERIALS[id]?.palette;
  if (!palette || palette.length === 0) return 'rgba(255,255,255,0.7)';
  return palette[(palette.length / 2) | 0];
}

function applyShake(frameFeedback: FeedbackFrame, now: number): void {
  if (frameFeedback.shake > 0) {
    shakePower = Math.min(12, shakePower + frameFeedback.shake * 0.85);
    shakeUntil = now + 220;
  }
  if (now >= shakeUntil || shakePower <= 0.1) {
    stage.style.transform = '';
    shakePower = 0;
    return;
  }
  const t = (shakeUntil - now) / 220;
  const strength = shakePower * t;
  const x = (Math.random() * 2 - 1) * strength;
  const y = (Math.random() * 2 - 1) * strength;
  stage.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
}

function drawCursor(): void {
  cursorCtx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);
  if (!input.onCanvas) return;
  const cx = (input.mouseGridX + 0.5) * CELL_SIZE;
  const cy = (input.mouseGridY + 0.5) * CELL_SIZE;
  const r = ui.brush * CELL_SIZE;
  const color = materialColor(ui.selected);
  cursorCtx.fillStyle = color;
  cursorCtx.globalAlpha = 0.16;
  cursorCtx.beginPath();
  cursorCtx.arc(cx, cy, r, 0, Math.PI * 2);
  cursorCtx.fill();
  cursorCtx.globalAlpha = 0.5;
  for (let i = 0; i < 7; i++) {
    const a = performance.now() * 0.002 + i * 2.399;
    const rr = r * (0.2 + (i % 4) * 0.16);
    const px = cx + Math.cos(a) * rr;
    const py = cy + Math.sin(a * 1.7) * rr + ((performance.now() * 0.03 + i * 5) % Math.max(4, r)) * 0.18;
    cursorCtx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
  }
  cursorCtx.globalAlpha = 1;
  cursorCtx.strokeStyle = color;
  cursorCtx.lineWidth = 1;
  cursorCtx.beginPath();
  cursorCtx.arc(cx, cy, r, 0, Math.PI * 2);
  cursorCtx.stroke();
}

function frame(): void {
  if (!ui.paused) step();
  const frameFeedback = consumeFeedback();
  const now = performance.now();
  updateAudio(frameFeedback);
  applyShake(frameFeedback, now);
  render(ctx);
  renderGlow(glowCtx, CELL_SIZE);
  drawCursor();

  frames++;
  if (now - lastFpsTime >= 500) {
    fps = (frames * 1000) / (now - lastFpsTime);
    fpsEl.textContent = `${fps.toFixed(0)} fps`;
    frames = 0;
    lastFpsTime = now;
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
