import { COLS, ROWS, EMPTY } from './types';

export const cells = new Uint8Array(COLS * ROWS);
export const meta = new Uint8Array(COLS * ROWS);
export const temp = new Uint8Array(COLS * ROWS);

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
