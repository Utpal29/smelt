import { COLS, ROWS, CELL_SIZE, EMPTY, GUNPOWDER } from './types';
import { inBounds, set, get } from './grid';
import { materialById, randomShade } from './materials';

export interface InputState {
  mouseGridX: number;
  mouseGridY: number;
  onCanvas: boolean;
  isDown: boolean;
}

export const input: InputState = {
  mouseGridX: -1,
  mouseGridY: -1,
  onCanvas: false,
  isDown: false,
};

interface BrushTarget {
  getMaterial: () => number;
  getRadius: () => number;
}

export function attachInput(canvas: HTMLCanvasElement, target: BrushTarget): void {
  function updatePos(e: PointerEvent): void {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * COLS;
    const y = ((e.clientY - rect.top) / rect.height) * ROWS;
    input.mouseGridX = Math.floor(x);
    input.mouseGridY = Math.floor(y);
    input.onCanvas = input.mouseGridX >= 0 && input.mouseGridX < COLS && input.mouseGridY >= 0 && input.mouseGridY < ROWS;
  }

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    input.isDown = true;
    canvas.setPointerCapture(e.pointerId);
    updatePos(e);
    stamp(input.mouseGridX, input.mouseGridY, target.getRadius(), target.getMaterial());
  });
  canvas.addEventListener('pointermove', (e) => {
    const prevX = input.mouseGridX;
    const prevY = input.mouseGridY;
    updatePos(e);
    if (input.isDown && input.onCanvas) {
      stampLine(prevX, prevY, input.mouseGridX, input.mouseGridY, target.getRadius(), target.getMaterial());
    }
  });
  canvas.addEventListener('pointerup', (e) => {
    input.isDown = false;
    canvas.releasePointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointerleave', () => {
    input.onCanvas = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  canvas.style.touchAction = 'none';
  void CELL_SIZE;
}

function stampLine(x0: number, y0: number, x1: number, y1: number, r: number, mat: number): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x0 + (dx * i) / steps);
    const y = Math.round(y0 + (dy * i) / steps);
    stamp(x, y, r, mat);
  }
}

function stamp(cx: number, cy: number, r: number, mat: number): void {
  const r2 = r * r;
  const sparse = mat !== EMPTY && (materialById(mat).behavior === 'powder' || mat === GUNPOWDER);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r2) continue;
      const x = cx + dx;
      const y = cy + dy;
      if (!inBounds(x, y)) continue;
      if (mat === EMPTY) {
        set(x, y, EMPTY, 0);
        continue;
      }
      if (get(x, y) !== EMPTY) continue;
      if (sparse && Math.random() >= 0.6) continue;
      set(x, y, mat, randomShade());
    }
  }
}
