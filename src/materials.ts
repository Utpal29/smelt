import {
  EMPTY,
  SAND,
  STONE,
  WATER,
  WOOD,
  FIRE,
  SMOKE,
  OIL,
  ACID,
  LAVA,
  FIRE_LIFESPAN,
  SMOKE_LIFESPAN,
  SHADE_COUNT,
  type MaterialDef,
} from './types';

function buildPalette(stops: string[], count: number): string[] {
  const palette: string[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    palette.push(interp(stops, t));
  }
  return palette;
}

function interp(stops: string[], t: number): string {
  if (stops.length === 1) return stops[0];
  const seg = t * (stops.length - 1);
  const i = Math.min(Math.floor(seg), stops.length - 2);
  const f = seg - i;
  const a = hex(stops[i]);
  const b = hex(stops[i + 1]);
  const r = Math.round(a[0] + (b[0] - a[0]) * f);
  const g = Math.round(a[1] + (b[1] - a[1]) * f);
  const bl = Math.round(a[2] + (b[2] - a[2]) * f);
  return `rgb(${r},${g},${bl})`;
}

function hex(h: string): [number, number, number] {
  const s = h.replace('#', '');
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ];
}

export const MATERIALS: MaterialDef[] = [
  {
    id: EMPTY,
    name: 'Eraser',
    key: '0',
    palette: ['#0a0a0f'],
    density: 0,
    behavior: 'empty',
  },
  {
    id: SAND,
    name: 'Sand',
    key: '1',
    palette: buildPalette(['#c4a050', '#d4b060', '#e0c878'], SHADE_COUNT),
    density: 5,
    behavior: 'powder',
  },
  {
    id: STONE,
    name: 'Stone',
    key: '2',
    palette: buildPalette(['#555555', '#6e6e6e', '#888888'], SHADE_COUNT),
    density: 10,
    behavior: 'solid',
  },
  {
    id: WATER,
    name: 'Water',
    key: '3',
    palette: buildPalette(['#2a6ab5', '#3d80c7', '#5a9ad9'], SHADE_COUNT),
    density: 3,
    behavior: 'liquid',
  },
  {
    id: WOOD,
    name: 'Wood',
    key: '4',
    palette: buildPalette(['#6b3f1f', '#7a4e2b', '#8b5e3c'], SHADE_COUNT),
    density: 8,
    behavior: 'solid',
    flammable: true,
  },
  {
    id: FIRE,
    name: 'Fire',
    key: '5',
    palette: buildPalette(['#ffffff', '#ffee88', '#ff8833', '#dd2200', '#661100'], SHADE_COUNT),
    density: 1,
    behavior: 'fire',
    lifespan: FIRE_LIFESPAN,
  },
  {
    id: SMOKE,
    name: 'Smoke',
    key: '',
    palette: buildPalette(['#aaaaaa', '#666666', '#333333', '#161616'], SHADE_COUNT),
    density: 1,
    behavior: 'gas',
    lifespan: SMOKE_LIFESPAN,
    hidden: true,
  },
  {
    id: OIL,
    name: 'Oil',
    key: '6',
    palette: buildPalette(['#1a1a12', '#22221a', '#2a2a20'], SHADE_COUNT),
    density: 2,
    behavior: 'liquid',
    flammable: true,
  },
  {
    id: ACID,
    name: 'Acid',
    key: '7',
    palette: buildPalette(['#22aa22', '#33cc33', '#44ee44'], SHADE_COUNT),
    density: 4,
    behavior: 'acid',
  },
  {
    id: LAVA,
    name: 'Lava',
    key: '8',
    palette: buildPalette(['#cc2200', '#e63500', '#ff4400', '#ffaa33'], SHADE_COUNT),
    density: 7,
    behavior: 'lava',
    liquidSpread: 1,
  },
];

export function materialById(id: number): MaterialDef {
  return MATERIALS[id];
}

export function randomShade(): number {
  return (Math.random() * SHADE_COUNT) | 0;
}
