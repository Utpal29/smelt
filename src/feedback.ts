import { FIRE, GUNPOWDER, LAVA, SAND, WATER } from './types';

export interface FeedbackFrame {
  explosions: number;
  shake: number;
  fireCells: number;
  waterCells: number;
  sandCells: number;
  powderCells: number;
  paintCells: number;
  paintMaterial: number;
}

const MAX_ACTIVITY_COUNT = 2000;

const frame: FeedbackFrame = {
  explosions: 0,
  shake: 0,
  fireCells: 0,
  waterCells: 0,
  sandCells: 0,
  powderCells: 0,
  paintCells: 0,
  paintMaterial: 0,
};

let pendingPaintCells = 0;
let pendingPaintMaterial = 0;

export function beginSimulationFeedback(): void {
  frame.explosions = 0;
  frame.shake = 0;
  frame.fireCells = 0;
  frame.waterCells = 0;
  frame.sandCells = 0;
  frame.powderCells = 0;
}

export function noteActiveMaterial(id: number): void {
  if (id === FIRE || id === LAVA) {
    if (frame.fireCells < MAX_ACTIVITY_COUNT) frame.fireCells++;
  } else if (id === WATER) {
    if (frame.waterCells < MAX_ACTIVITY_COUNT) frame.waterCells++;
  } else if (id === SAND) {
    if (frame.sandCells < MAX_ACTIVITY_COUNT) frame.sandCells++;
  } else if (id === GUNPOWDER) {
    if (frame.powderCells < MAX_ACTIVITY_COUNT) frame.powderCells++;
  }
}

export function noteExplosion(strength: number): void {
  frame.explosions++;
  frame.shake += strength;
}

export function notePaint(material: number, count: number): void {
  if (count <= 0) return;
  pendingPaintCells += count;
  pendingPaintMaterial = material;
}

export function consumeFeedback(): FeedbackFrame {
  frame.paintCells = pendingPaintCells;
  frame.paintMaterial = pendingPaintMaterial;
  const snapshot: FeedbackFrame = {
    explosions: frame.explosions,
    shake: frame.shake,
    fireCells: frame.fireCells,
    waterCells: frame.waterCells,
    sandCells: frame.sandCells,
    powderCells: frame.powderCells,
    paintCells: frame.paintCells,
    paintMaterial: frame.paintMaterial,
  };
  frame.explosions = 0;
  frame.shake = 0;
  frame.fireCells = 0;
  frame.waterCells = 0;
  frame.sandCells = 0;
  frame.powderCells = 0;
  frame.paintCells = 0;
  frame.paintMaterial = 0;
  pendingPaintCells = 0;
  pendingPaintMaterial = 0;
  return snapshot;
}
