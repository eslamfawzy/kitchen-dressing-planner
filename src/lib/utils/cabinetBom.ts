import type { FurnitureItem } from '$lib/models/types';
import { getCabinetDef, getFurnitureSize, type CabinetKind } from './furnitureCatalog';
import { CORNER_ARM_CM, PLINTH_CM, TOP_CM, unitSpec } from './cabinetSpec';

/** A cut part. Dimensions in mm: length is the longer side. */
export interface CutPart {
  material: string;
  length: number;
  width: number;
  qty: number;
  /** Where the part is used (first unit type seen). */
  part: string;
}

export interface HardwareLine { item: string; qty: number; }

export interface Bom {
  parts: CutPart[];
  hardware: HardwareLine[];
  /** Board area in m² per material. */
  area: Record<string, number>;
  /** Estimated 2440×1220 sheets (18 mm board, 15% waste). */
  sheets18: number;
  unitCount: number;
  readymade: Array<{ item: string; qty: number }>;
}

export const BOARD = '18mm board';
export const BACK = '6mm back panel';
const T = 18; // mm
const SHEET_M2 = 2.44 * 1.22;

const mm = (cm: number) => Math.round(cm * 10);

interface Box { w: number; d: number; h: number; }

/** Carcass parts of one box (a whole unit, or one arm of a corner unit). All inputs in cm. */
function carcass(parts: CutPart[], kind: CabinetKind, box: Box, spec: ReturnType<typeof unitSpec>, doors: number, drawers: number, shelves: number, label: string) {
  const plinth = spec.floor ? PLINTH_CM : 0;
  const top = spec.top ? TOP_CM : 0;
  const h = mm(box.h - plinth - top);
  const d = mm(box.d) - 20;      // 20 mm set-back for the back panel
  const w = mm(box.w);
  const push = (material: string, a: number, b: number, qty: number, part: string) => {
    if (qty <= 0 || a <= 0 || b <= 0) return;
    parts.push({ material, length: Math.max(a, b), width: Math.min(a, b), qty, part: `${label} · ${part}` });
  };
  if (kind === 'filler') { push(BOARD, mm(box.h - plinth), w, 1, 'Filler panel'); return; }
  push(BOARD, h, d, 2, 'Side');
  push(BOARD, w - 2 * T, d, 2, 'Top / bottom');
  push(BACK, w - 4, h - 4, 1, 'Back');
  push(BOARD, w - 2 * T - 2, d - 20, shelves, 'Shelf');
  const frontH = h;
  if (doors > 0) {
    const doorW = w / doors - 4;
    const tiers = kind === 'tall' ? 2 : 1;
    const doorH = (drawers ? frontH * 0.75 : frontH) / tiers - 4;
    push(BOARD, doorH, doorW, doors, 'Door');
  }
  if (drawers > 0) {
    const area = doors > 0 ? frontH * 0.25 : frontH;
    push(BOARD, w - 4, area / drawers - 4, drawers, 'Drawer front');
    // Drawer box: two sides, front/back, bottom
    const bw = w - 2 * T - 26;
    push(BOARD, d - 50, 120, drawers * 2, 'Drawer side');
    push(BOARD, bw, 120, drawers * 2, 'Drawer front/back');
    push(BACK, bw, d - 50, drawers, 'Drawer bottom');
  }
}

export function computeBom(items: readonly FurnitureItem[]): Bom {
  const raw: CutPart[] = [];
  const hw = new Map<string, number>();
  const ready = new Map<string, number>();
  const addHw = (name: string, qty: number) => { if (qty > 0) hw.set(name, (hw.get(name) ?? 0) + qty); };
  let unitCount = 0;
  for (const it of items) {
    const def = getCabinetDef(it.catalogId);
    if (!def) continue;
    unitCount += 1;
    const size = getFurnitureSize(it);
    const spec = unitSpec(def.kind, size.width);
    if (spec.doors > 0 && it.finish?.doors) spec.doors = it.finish.doors;
    const label = def.name.replace(/\s+\d+$/, '');
    if (spec.readymade) { ready.set(def.name, (ready.get(def.name) ?? 0) + 1); continue; }
    const arm = CORNER_ARM_CM[def.kind];
    if (spec.corner && arm) {
      // Two boxes: back arm (full width) and side arm (remaining depth).
      carcass(raw, def.kind, { w: size.width, d: arm, h: size.height }, spec, 1, 0, 1, label);
      carcass(raw, def.kind, { w: size.depth - arm, d: arm, h: size.height }, spec, 1, 0, 0, label);
    } else {
      carcass(raw, def.kind, { w: size.width, d: size.depth, h: size.height }, spec, spec.doors, spec.drawers, spec.shelves, label);
    }
    const doorH = (size.height - (spec.floor ? PLINTH_CM : 0)) * (def.kind === 'tall' ? 0.5 : 1);
    const hingesPerDoor = doorH >= 200 ? 4 : doorH >= 140 ? 3 : 2;
    addHw('Hinge', spec.doors * hingesPerDoor);
    addHw('Drawer slides (pair)', spec.drawers);
    addHw('Shelf pins', spec.shelves * 4);
    addHw('Adjustable leg', spec.floor ? 4 : 0);
    addHw('Hanging rod', spec.rods);
    addHw('Wall hanging bracket', spec.floor ? 0 : 2);
  }
  // Merge identical parts
  const merged = new Map<string, CutPart>();
  for (const p of raw) {
    const key = `${p.material}|${p.length}|${p.width}|${p.part}`;
    const m = merged.get(key);
    if (m) m.qty += p.qty; else merged.set(key, { ...p });
  }
  const parts = [...merged.values()].sort((a, b) => a.material.localeCompare(b.material) || b.length - a.length || b.width - a.width);
  const area: Record<string, number> = {};
  for (const p of parts) area[p.material] = (area[p.material] ?? 0) + (p.length * p.width * p.qty) / 1e6;
  for (const k of Object.keys(area)) area[k] = Math.round(area[k] * 100) / 100;
  return {
    parts,
    hardware: [...hw.entries()].map(([item, qty]) => ({ item, qty })),
    area,
    sheets18: Math.ceil(((area[BOARD] ?? 0) * 1.15) / SHEET_M2),
    unitCount,
    readymade: [...ready.entries()].map(([item, qty]) => ({ item, qty })),
  };
}
