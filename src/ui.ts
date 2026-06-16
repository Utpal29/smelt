import { MATERIALS } from './materials';
import { EMPTY } from './types';

export interface UIState {
  selected: number;
  brush: number;
  paused: boolean;
}

export const ui: UIState = {
  selected: 1, // sand
  brush: 5,
  paused: false,
};

export function refreshSelectedLabel(): void {
  const label = document.getElementById('selected-label');
  if (label) label.textContent = MATERIALS[ui.selected]?.name ?? '';
}

export function buildPalette(container: HTMLElement): void {
  container.innerHTML = '';
  for (const mat of MATERIALS) {
    if (mat.hidden) continue;
    const el = document.createElement('div');
    el.className = 'swatch';
    el.dataset.id = String(mat.id);
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.style.background = mat.id === EMPTY ? '#0a0a0f' : mat.palette[Math.floor(mat.palette.length / 2)];
    const label = document.createElement('span');
    label.textContent = mat.name;
    const key = document.createElement('span');
    key.className = 'key';
    key.textContent = mat.key;
    el.append(chip, label, key);
    el.addEventListener('click', () => selectMaterial(mat.id));
    container.appendChild(el);
  }
  refreshSelection(container);
}

export function selectMaterial(id: number): void {
  ui.selected = id;
  const container = document.getElementById('palette');
  if (container) refreshSelection(container);
  const label = document.getElementById('selected-label');
  if (label) label.textContent = MATERIALS[id]?.name ?? '';
}

function refreshSelection(container: HTMLElement): void {
  for (const child of Array.from(container.children) as HTMLElement[]) {
    child.classList.toggle('selected', Number(child.dataset.id) === ui.selected);
  }
}

export function attachControls(opts: {
  brushInput: HTMLInputElement;
  pauseBtn: HTMLButtonElement;
  clearBtn: HTMLButtonElement;
  onClear: () => void;
}): void {
  opts.brushInput.value = String(ui.brush);
  const brushVal = document.getElementById('brush-val');
  if (brushVal) brushVal.textContent = String(ui.brush);
  opts.brushInput.addEventListener('input', () => {
    ui.brush = Number(opts.brushInput.value);
    if (brushVal) brushVal.textContent = String(ui.brush);
  });
  opts.pauseBtn.addEventListener('click', () => {
    ui.paused = !ui.paused;
    opts.pauseBtn.textContent = ui.paused ? 'Play' : 'Pause';
  });
  opts.clearBtn.addEventListener('click', opts.onClear);

  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    if (e.code === 'Space') {
      e.preventDefault();
      opts.pauseBtn.click();
      return;
    }
    if (e.key === 'c' || e.key === 'C') {
      opts.onClear();
      return;
    }
    const mat = MATERIALS.find((m) => !m.hidden && m.key === e.key);
    if (mat) selectMaterial(mat.id);
  });
}
