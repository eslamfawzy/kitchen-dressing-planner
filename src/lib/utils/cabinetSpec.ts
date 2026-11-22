import type { CabinetKind } from './furnitureCatalog';

/** Construction facts per unit kind, shared by pricing and the cutting list. */
export interface UnitSpec {
  doors: number;
  drawers: number;
  shelves: number;
  /** Stands on a plinth (adds feet, no plinth for wall units). */
  floor: boolean;
  /** Has a worktop. */
  top: boolean;
  /** Hanging rods (dressing). */
  rods: number;
  /** Panels are built as two boxes (L-shaped corner units). */
  corner: boolean;
  /** No carcass, priced and listed as a ready-made item. */
  readymade: boolean;
}

export const PLINTH_CM = 10;
export const TOP_CM = 3;
/** Arm depth of L-shaped corner units, in cm. */
export const CORNER_ARM_CM: Partial<Record<CabinetKind, number>> = { corner_base: 60, wall_corner: 35, dress_corner: 55 };

export function unitSpec(kind: CabinetKind, widthCm: number): UnitSpec {
  const wide = widthCm > 60;
  const base = { doors: 0, drawers: 0, shelves: 0, floor: true, top: false, rods: 0, corner: false, readymade: false };
  switch (kind) {
    case 'base': return { ...base, doors: wide ? 2 : 1, shelves: 1, top: true };
    case 'drawers': return { ...base, drawers: 3, top: true };
    case 'sink': return { ...base, drawers: 1, doors: wide ? 2 : 1, top: true };
    case 'hob': return { ...base, drawers: 1, doors: wide ? 2 : 1, top: true };
    case 'corner_base': return { ...base, doors: 2, shelves: 1, top: true, corner: true };
    case 'island': return { ...base, doors: Math.ceil(widthCm / 60), shelves: 1, top: true };
    case 'filler': return { ...base };
    case 'wall': return { ...base, doors: widthCm > 50 ? 2 : 1, shelves: 1, floor: false };
    case 'wall_corner': return { ...base, doors: 2, shelves: 1, floor: false, corner: true };
    case 'hood': return { ...base, floor: false, readymade: true };
    case 'tall': return { ...base, doors: 2, shelves: 4 };
    case 'tall_oven': return { ...base, doors: 1, drawers: 2, shelves: 1 };
    case 'fridge_tall': return { ...base, doors: 1 };
    case 'hang': return { ...base, doors: widthCm > 50 ? 2 : 1, shelves: 2, rods: 1 };
    case 'shelves': return { ...base, shelves: 7 };
    case 'dress_drawers': return { ...base, drawers: 5 };
    case 'shoes': return { ...base, shelves: 6 };
    case 'dress_corner': return { ...base, doors: 2, shelves: 3, rods: 1, corner: true };
    case 'dress_island': return { ...base, drawers: 4, top: true };
    case 'vanity': return { ...base, drawers: 6, top: true };
  }
}
