export const COLS = 300;
export const ROWS = 200;
export const CELL_SIZE = 3;

export const EMPTY = 0;
export const SAND = 1;
export const STONE = 2;
export const WATER = 3;
export const WOOD = 4;
export const FIRE = 5;
export const SMOKE = 6;
export const OIL = 7;
export const ACID = 8;
export const LAVA = 9;
export const PLANT = 10;
export const STEAM = 11;
export const MUD = 12;
export const GUNPOWDER = 13;

export const SHADE_BITS = 3;
export const SHADE_COUNT = 1 << SHADE_BITS;
export const SHADE_MASK = SHADE_COUNT - 1;

export const FIRE_LIFESPAN = 50;
export const SMOKE_LIFESPAN = 110;
export const STEAM_LIFESPAN = 90;

export type MaterialId = number;

export interface MaterialDef {
  id: MaterialId;
  name: string;
  key: string;
  palette: string[];
  density: number;
  behavior:
    | 'empty'
    | 'powder'
    | 'liquid'
    | 'gas'
    | 'solid'
    | 'fire'
    | 'acid'
    | 'lava'
    | 'plant'
    | 'mud'
    | 'gunpowder';
  flammable?: boolean;
  lifespan?: number;
  liquidSpread?: number;
  hidden?: boolean;
}
