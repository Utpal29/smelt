/// <reference lib="webworker" />
import { initGrid, type GridBuffers } from './grid';
import { step } from './simulation';
import { consumeFeedback } from './feedback';

declare const self: DedicatedWorkerGlobalScope;

type WorkerMsg =
  | { type: 'init'; buffers: GridBuffers }
  | { type: 'pause'; paused: boolean };

let paused = false;
let started = false;
const TARGET_HZ = 60;
const TICK_MS = 1000 / TARGET_HZ;
let nextTick = 0;

self.addEventListener('message', (e: MessageEvent<WorkerMsg>) => {
  const msg = e.data;
  switch (msg.type) {
    case 'init':
      initGrid(msg.buffers);
      if (!started) {
        started = true;
        nextTick = performance.now();
        scheduleTick();
      }
      break;
    case 'pause':
      paused = msg.paused;
      break;
  }
});

function scheduleTick(): void {
  const now = performance.now();
  if (!paused && now >= nextTick) {
    step();
    const snap = consumeFeedback();
    if (
      snap.explosions ||
      snap.shake ||
      snap.fireCells ||
      snap.waterCells ||
      snap.sandCells ||
      snap.powderCells
    ) {
      self.postMessage({
        type: 'feedback',
        explosions: snap.explosions,
        shake: snap.shake,
        fireCells: snap.fireCells,
        waterCells: snap.waterCells,
        sandCells: snap.sandCells,
        powderCells: snap.powderCells,
      });
    }
    nextTick += TICK_MS;
    if (now - nextTick > TICK_MS * 4) nextTick = now + TICK_MS; // skip catch-up after a long pause
  }
  const delay = Math.max(0, nextTick - performance.now());
  setTimeout(scheduleTick, delay || 1);
}
