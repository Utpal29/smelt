import { COLS, ROWS, EMPTY } from './types';

const GRID_BYTES = COLS * ROWS;

export interface GridBuffers {
  cells: SharedArrayBuffer;
  meta: SharedArrayBuffer;
  temp: SharedArrayBuffer;
}

export function createGridBuffers(): GridBuffers {
  return {
    cells: new SharedArrayBuffer(GRID_BYTES),
    meta: new SharedArrayBuffer(GRID_BYTES),
    temp: new SharedArrayBuffer(GRID_BYTES),
  };
}

// Live ESM bindings — reassigned by initGrid, consumers see the latest.
type SharedBytes = Uint8Array<ArrayBufferLike>;
export let cells: SharedBytes = new Uint8Array(0);
export let meta: SharedBytes = new Uint8Array(0);
export let temp: SharedBytes = new Uint8Array(0);

export function initGrid(b: GridBuffers): void {
  cells = new Uint8Array(b.cells);
  meta = new Uint8Array(b.meta);
  temp = new Uint8Array(b.temp);
}

export function idx(x: number, y: number): number {
  return y * COLS + x;
}

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && x < COLS && y >= 0 && y < ROWS;
}

export function get(x: number, y: number): number {
  return cells[y * COLS + x];
}

export function getMeta(x: number, y: number): number {
  return meta[y * COLS + x];
}

export function set(x: number, y: number, mat: number, shade: number = 0): void {
  const i = y * COLS + x;
  cells[i] = mat;
  meta[i] = shade;
  temp[i] = 0;
}

export function swap(x1: number, y1: number, x2: number, y2: number): void {
  const a = y1 * COLS + x1;
  const b = y2 * COLS + x2;
  const c = cells[a];
  const m = meta[a];
  const t = temp[a];
  cells[a] = cells[b];
  meta[a] = meta[b];
  temp[a] = temp[b];
  cells[b] = c;
  meta[b] = m;
  temp[b] = t;
}

export function clearGrid(): void {
  cells.fill(EMPTY);
  meta.fill(0);
  temp.fill(0);
}
