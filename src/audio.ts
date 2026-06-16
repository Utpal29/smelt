import { EMPTY, FIRE, GUNPOWDER, LAVA, SAND, WATER } from './types';
import type { FeedbackFrame } from './feedback';

const MASTER_GAIN = 0.22;
const PAINT_COOLDOWN = 0.045;
const EXPLOSION_COOLDOWN = 0.08;

let audioCtx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let lastPaint = 0;
let lastExplosion = 0;
let muted = false;

export function attachAudioUnlock(target: HTMLElement): void {
  const unlock = (): void => {
    void ensureAudio();
  };
  target.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
}

export function updateAudio(frame: FeedbackFrame): void {
  if (muted) return;
  if (!audioCtx || !master || audioCtx.state !== 'running') return;
  const now = audioCtx.currentTime;

  if (frame.explosions > 0 && now - lastExplosion > EXPLOSION_COOLDOWN) {
    playExplosion(now, Math.min(1, frame.explosions / 3 + frame.shake / 16));
    lastExplosion = now;
  }

  if (frame.paintCells > 0 && frame.paintMaterial !== EMPTY && now - lastPaint > PAINT_COOLDOWN) {
    playPaint(now, frame.paintMaterial, Math.min(1, frame.paintCells / 90));
    lastPaint = now;
  }

  void frame.sandCells;
  void frame.waterCells;
  void frame.fireCells;
}

export function setMuted(nextMuted: boolean): void {
  muted = nextMuted;
  if (master && audioCtx) {
    master.gain.setTargetAtTime(muted ? 0.0001 : MASTER_GAIN, audioCtx.currentTime, 0.015);
  }
}

export function isMuted(): boolean {
  return muted;
}

async function ensureAudio(): Promise<void> {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    master = audioCtx.createGain();
    master.gain.value = muted ? 0.0001 : MASTER_GAIN;
    master.connect(audioCtx.destination);
    noiseBuffer = makeNoiseBuffer(audioCtx);
  }
  if (audioCtx.state !== 'running') await audioCtx.resume();
}

function makeNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function playPaint(now: number, material: number, amount: number): void {
  if (material === FIRE || material === LAVA) {
    playNoise(now, 0.055, 1700, 0.035, 0.25 + amount * 0.25);
  } else if (material === WATER) {
    playNoise(now, 0.08, 520, 0.045, 0.22 + amount * 0.24);
  } else if (material === SAND || material === GUNPOWDER) {
    playNoise(now, 0.06, 1050, 0.03, 0.18 + amount * 0.22);
  } else {
    playTone(now, 180, 0.035, 0.08 + amount * 0.1);
  }
}

function playExplosion(now: number, amount: number): void {
  playNoise(now, 0.32, 160, 0.28, 0.7 + amount * 0.5);
  playTone(now, 58, 0.22, 0.35 + amount * 0.25);
}

function playNoise(now: number, duration: number, frequency: number, attack: number, gainValue: number): void {
  if (!audioCtx || !master || !noiseBuffer) return;
  const src = audioCtx.createBufferSource();
  const filter = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();
  src.buffer = noiseBuffer;
  filter.type = 'bandpass';
  filter.frequency.value = frequency;
  filter.Q.value = 0.9;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, gainValue), now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start(now);
  src.stop(now + duration + 0.02);
}

function playTone(now: number, frequency: number, duration: number, gainValue: number): void {
  if (!audioCtx || !master) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(gainValue, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(master);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}
