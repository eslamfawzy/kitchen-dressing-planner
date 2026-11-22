import type { Point } from '$lib/models/types';
import { getCabinetDef } from './furnitureCatalog';

/**
 * Pure helpers for kitchen / dressing-room units:
 *  - snapToNeighbors: butt a unit against its neighbours along a wall run
 *  - planLayout: generate a complete layout for a rectangular room
 *
 * Canvas conventions (cm, y down): a unit at rotation 0 has its back on the top wall and its front
 * facing +y. Rotation is clockwise in degrees: 90 = back on the right wall, 180 = back on the
 * bottom wall, 270 = back on the left wall.
 */

export interface UnitSize { width: number; depth: number; }
export interface PlacedUnit { position: Point; rotation: number; size: UnitSize; }

export function isCabinetId(catalogId: string): boolean {
  return getCabinetDef(catalogId) !== undefined;
}

function norm(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

/**
 * Slide a unit along its own width axis so its side edge touches a neighbour's side edge.
 * Only neighbours with the same orientation and almost the same distance from the wall count.
 */
export function snapToNeighbors(
  position: Point,
  rotation: number,
  size: UnitSize,
  neighbors: readonly PlacedUnit[],
  threshold = 15,
): Point {
  const a = (norm(rotation) * Math.PI) / 180;
  const ux = Math.cos(a), uy = Math.sin(a);   // along the unit's width
  const vx = -Math.sin(a), vy = Math.cos(a);  // along the unit's depth (front direction)
  let best: { delta: number; dist: number } | null = null;
  for (const n of neighbors) {
    if (Math.abs(norm(n.rotation) - norm(rotation)) > 0.5) continue;
    const dx = n.position.x - position.x, dy = n.position.y - position.y;
    const along = dx * ux + dy * uy;
    const across = dx * vx + dy * vy;
    // Same run: back faces line up (compare back edges, not centres, so depths may differ).
    const backDiff = (across - n.size.depth / 2) - (-size.depth / 2);
    if (Math.abs(backDiff) > 6) continue;
    for (const side of [-1, 1]) {
      // My edge on `side` meets the neighbour's opposite edge.
      const gap = along - side * (size.width / 2 + n.size.width / 2);
      // gap = how far I must move along u so the edges touch
      if (Math.abs(gap) <= threshold && (!best || Math.abs(gap) < best.dist)) best = { delta: gap, dist: Math.abs(gap) };
    }
  }
  if (!best) return position;
  return { x: position.x + ux * best.delta, y: position.y + uy * best.delta };
}

// ── Layout planning ─────────────────────────────────────────────────────

export type LayoutKind = 'kitchen' | 'dressing';
export type LayoutShape = 'I' | 'L' | 'U' | 'parallel';

export interface LayoutOptions {
  kind: LayoutKind;
  shape: LayoutShape;
  /** Interior size in cm. */
  width: number;
  depth: number;
  island: boolean;
  /** Kitchen only. */
  wallUnits: boolean;
  /** Which wall the main run uses: 0 top, 1 right, 2 bottom, 3 left. */
  startSide: 0 | 1 | 2 | 3;
}

export interface PlannedItem {
  catalogId: string;
  /** Centre, in the room's interior frame (origin at its top-left interior corner). */
  x: number;
  y: number;
  rotation: number;
  /** Set when the unit is stretched or cut to a non-catalog width. */
  width?: number;
}

export interface LayoutPlan { items: PlannedItem[]; notes: string[]; }

interface Run {
  /** Which wall: 0 top, 1 right, 2 bottom, 3 left (canonical frame). */
  side: 0 | 1 | 2 | 3;
  /** Distance along the wall where the run starts / ends, in cm. */
  from: number;
  to: number;
  cornerAtFrom: boolean;
  cornerAtTo: boolean;
}

const KITCHEN = { baseDepth: 60, wallDepth: 35, corner: 90, wallCorner: 60, aisle: 100, tallDepth: 60 };
const DRESS = { depth: 55, corner: 100, aisle: 80 };
const BASE_WIDTHS = [120, 100, 90, 80, 60, 50, 45, 40, 30];
const WALL_WIDTHS = [100, 80, 60, 50, 40, 30];

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/** Greedy split of a gap into standard base widths; a tail under 30 cm becomes a filler panel. */
function fillGap(gap: number): Array<{ id: string; width: number; custom?: boolean }> {
  const out: Array<{ id: string; width: number; custom?: boolean }> = [];
  let left = round1(gap);
  while (left >= 30) {
    const w = BASE_WIDTHS.find(x => x <= left && (left - x === 0 || left - x >= 30));
    if (!w) break;
    out.push({ id: `kit_base_${w}`, width: w });
    left = round1(left - w);
  }
  if (left > 0.5) {
    if (out.length === 0 || left >= 10) out.push({ id: 'kit_filler_10', width: left, custom: true });
    else {
      // Absorb a tiny tail into the last unit instead of adding a sliver.
      const last = out[out.length - 1];
      last.width = round1(last.width + left);
      last.custom = true;
    }
  }
  return out;
}

interface Piece { id: string; width: number; custom?: boolean; role?: 'fridge' | 'sink' | 'hob' | 'base' | 'filler' }

function kitchenRunPieces(length: number, fridgeAtEnd: boolean, appliances: boolean): Piece[] {
  const pieces: Piece[] = [];
  let avail = length;
  let fridge: Piece | null = null;
  if (fridgeAtEnd && avail >= 70 + 30) {
    fridge = { id: 'kit_tall_fridge_70', width: 70, role: 'fridge' };
    avail -= 70;
  }
  const mid: Piece[] = [];
  if (appliances) {
    const sets: Piece[][] = [
      [{ id: 'kit_sink_100', width: 100, role: 'sink' }, { id: 'kit_drawers_60', width: 60 }, { id: 'kit_hob_60', width: 60, role: 'hob' }],
      [{ id: 'kit_sink_80', width: 80, role: 'sink' }, { id: 'kit_hob_60', width: 60, role: 'hob' }],
      [{ id: 'kit_sink_80', width: 80, role: 'sink' }],
    ];
    const fixed = sets.find(s => s.reduce((a, p) => a + p.width, 0) <= avail);
    if (fixed) {
      const used = fixed.reduce((a, p) => a + p.width, 0);
      const free = avail - used;
      const gapA = Math.floor(free / 2 / 10) * 10;
      pieces.push(...fillGap(gapA).map(p => ({ ...p, role: p.id === 'kit_filler_10' ? 'filler' as const : 'base' as const })));
      pieces.push(...fixed);
      pieces.push(...fillGap(free - gapA).map(p => ({ ...p, role: p.id === 'kit_filler_10' ? 'filler' as const : 'base' as const })));
    } else {
      pieces.push(...fillGap(avail).map(p => ({ ...p, role: p.id === 'kit_filler_10' ? 'filler' as const : 'base' as const })));
    }
  } else {
    mid.push(...fillGap(avail).map(p => ({ ...p, role: p.id === 'kit_filler_10' ? 'filler' as const : 'base' as const })));
    pieces.push(...mid);
  }
  if (fridge) pieces.push(fridge);
  return pieces;
}

function dressingRunPieces(length: number): Piece[] {
  const n = Math.max(1, Math.ceil(length / 110));
  const w = round1(length / n);
  const pattern = ['hang', 'shelves', 'hang', 'drawers', 'hang', 'shelves', 'drawers'];
  const std = (kind: string) => {
    const ws = kind === 'drawers' ? [100, 80, 60] : [100, 80, 60, 50];
    return ws.reduce((best, x) => (Math.abs(x - w) < Math.abs(best - w) ? x : best), ws[0]);
  };
  const out: Piece[] = [];
  for (let i = 0; i < n; i++) {
    const kind = pattern[i % pattern.length];
    const id = kind === 'hang' ? `dr_hang_${std('hang')}` : kind === 'shelves' ? `dr_shelves_${std('shelves')}` : `dr_drawers_${std('drawers')}`;
    out.push({ id, width: w, custom: true });
  }
  return out;
}

function wallPieceId(width: number): { id: string; parts: number } {
  // Over-wide spans use two units.
  const parts = width > 100 ? Math.ceil(width / 100) : 1;
  const each = width / parts;
  const std = WALL_WIDTHS.find(x => x <= each + 0.01) ?? 30;
  return { id: `kit_wall_${std}`, parts };
}

/** Canonical plan: main run on the top wall. */
function planCanonical(o: LayoutOptions, W: number, D: number, notes: string[]): PlannedItem[] {
  const items: PlannedItem[] = [];
  const kitchen = o.kind === 'kitchen';
  const depth = kitchen ? KITCHEN.baseDepth : DRESS.depth;
  const cornerSize = kitchen ? KITCHEN.corner : DRESS.corner;
  const cornerId = kitchen ? 'kit_corner_base' : 'dr_corner';

  const shape: LayoutShape = !kitchen && o.shape === 'parallel' ? 'U' : o.shape;
  const sideLen = (side: number) => (side % 2 === 0 ? W : D);

  const runs: Run[] = [];
  const corners: Array<'TL' | 'TR' | 'BR' | 'BL'> = [];
  if (shape === 'I') {
    runs.push({ side: 0, from: 0, to: W, cornerAtFrom: false, cornerAtTo: false });
  } else if (shape === 'L') {
    corners.push('TL');
    runs.push({ side: 0, from: cornerSize, to: W, cornerAtFrom: true, cornerAtTo: false });
    runs.push({ side: 3, from: cornerSize, to: D, cornerAtFrom: true, cornerAtTo: false });
  } else if (shape === 'U') {
    corners.push('TL', 'TR');
    runs.push({ side: 3, from: cornerSize, to: D, cornerAtFrom: true, cornerAtTo: false });
    runs.push({ side: 0, from: cornerSize, to: W - cornerSize, cornerAtFrom: true, cornerAtTo: true });
    runs.push({ side: 1, from: cornerSize, to: D, cornerAtFrom: true, cornerAtTo: false });
  } else {
    runs.push({ side: 0, from: 0, to: W, cornerAtFrom: false, cornerAtTo: false });
    runs.push({ side: 2, from: 0, to: W, cornerAtFrom: false, cornerAtTo: false });
  }

  // Corners
  const cornerRot = { TL: 270, TR: 0, BR: 90, BL: 180 } as const;
  const cornerPos = (c: 'TL' | 'TR' | 'BR' | 'BL') => ({
    x: c === 'TL' || c === 'BL' ? cornerSize / 2 : W - cornerSize / 2,
    y: c === 'TL' || c === 'TR' ? cornerSize / 2 : D - cornerSize / 2,
  });
  for (const c of corners) {
    const p = cornerPos(c);
    items.push({ catalogId: cornerId, x: p.x, y: p.y, rotation: cornerRot[c] });
    if (kitchen && o.wallUnits) {
      const s = KITCHEN.wallCorner;
      const wx = c === 'TL' || c === 'BL' ? s / 2 : W - s / 2;
      const wy = c === 'TL' || c === 'TR' ? s / 2 : D - s / 2;
      items.push({ catalogId: 'kit_wall_corner', x: wx, y: wy, rotation: cornerRot[c] });
    }
  }

  // Which run hosts the appliances / fridge tower
  const lengths = runs.map(r => r.to - r.from);
  const host = lengths.indexOf(Math.max(...lengths));
  const fridgeRun = runs.findIndex(r => !r.cornerAtTo);

  const sideRot = [0, 90, 180, 270] as const;
  const toWorld = (side: number, along: number, off: number) => {
    // `along` is distance from the wall's start corner (top-left going clockwise), `off` is distance from the wall.
    switch (side) {
      case 0: return { x: along, y: off };
      case 1: return { x: W - off, y: along };
      case 2: return { x: W - along, y: D - off };
      default: return { x: off, y: D - along };
    }
  };
  // For sides 2 and 3 the run is measured clockwise too, so mirror the run bounds.
  const bounds = (r: Run) => {
    const len = sideLen(r.side);
    return r.side >= 2 ? { from: len - r.to, to: len - r.from } : { from: r.from, to: r.to };
  };

  runs.forEach((r, idx) => {
    const { from, to } = bounds(r);
    const length = to - from;
    if (length < 20) { notes.push('run-too-short'); return; }
    let pieces: Piece[];
    if (kitchen) {
      // Fridge tower goes at the clockwise end of its run unless that end is a corner.
      const freeAtEnd = !r.cornerAtTo;
      pieces = kitchenRunPieces(length, idx === fridgeRun && freeAtEnd, idx === host);
      if (r.side >= 2) pieces.reverse();
    } else {
      pieces = dressingRunPieces(length);
    }
    let cursor = from;
    for (const p of pieces) {
      const w = p.width;
      const centre = cursor + w / 2;
      const isTall = p.role === 'fridge';
      const d = kitchen ? (isTall ? KITCHEN.tallDepth : KITCHEN.baseDepth) : DRESS.depth;
      const pos = toWorld(r.side, centre, d / 2);
      items.push({ catalogId: p.id, x: pos.x, y: pos.y, rotation: sideRot[r.side], ...(p.custom ? { width: round1(w) } : {}) });
      if (kitchen && o.wallUnits && !isTall && p.role !== 'filler') {
        if (p.role === 'hob') {
          const hood = w >= 90 ? 'kit_hood_90' : 'kit_hood_60';
          const hp = toWorld(r.side, centre, 50 / 2);
          items.push({ catalogId: hood, x: hp.x, y: hp.y, rotation: sideRot[r.side] });
        } else {
          const { id, parts } = wallPieceId(w);
          const each = w / parts;
          for (let k = 0; k < parts; k++) {
            const wc = cursor + each * (k + 0.5);
            const wp = toWorld(r.side, wc, KITCHEN.wallDepth / 2);
            items.push({ catalogId: id, x: wp.x, y: wp.y, rotation: sideRot[r.side], width: round1(each) });
          }
        }
      }
      cursor += w;
    }
    // Wall units over the 30 cm between a wall corner unit (60) and the base run start (90)
    if (kitchen && o.wallUnits) {
      const gapCount = (r.cornerAtFrom ? 1 : 0) + (r.cornerAtTo ? 1 : 0);
      if (gapCount) {
        const gap = KITCHEN.corner - KITCHEN.wallCorner;
        const spots: number[] = [];
        const al = (ph: number) => (r.side >= 2 ? sideLen(r.side) - ph : ph);
        if (r.cornerAtFrom) spots.push(al(r.from - gap / 2));
        if (r.cornerAtTo) spots.push(al(r.to + gap / 2));
        for (const s of spots) {
          const wp = toWorld(r.side, s, KITCHEN.wallDepth / 2);
          items.push({ catalogId: 'kit_wall_30', x: wp.x, y: wp.y, rotation: sideRot[r.side], width: gap });
        }
      }
    }
  });

  // Island
  if (o.island) {
    const occTop = runs.some(r => r.side === 0) || corners.some(c => c === 'TL' || c === 'TR') ? depth : 0;
    const occBottom = runs.some(r => r.side === 2) ? depth : 0;
    const occLeft = runs.some(r => r.side === 3) ? depth : 0;
    const occRight = runs.some(r => r.side === 1) ? depth : 0;
    const iw = kitchen ? (W - occLeft - occRight >= 180 + 2 * 80 ? 180 : 120) : 120;
    const idp = kitchen ? 90 : 60;
    const aisle = kitchen ? KITCHEN.aisle : DRESS.aisle;
    const freeW = W - occLeft - occRight, freeH = D - occTop - occBottom;
    if ((freeH - idp) / 2 >= aisle && freeW - iw >= 2 * 60) {
      const cx = occLeft + freeW / 2;
      const cy = occTop + freeH / 2;
      items.push({ catalogId: kitchen ? `kit_island_${iw}` : 'dr_island_120', x: cx, y: cy, rotation: 0 });
    } else {
      notes.push('island-skipped');
    }
  }
  return items;
}

/** Rotate canonical items (main run on the top wall) so the main run uses another wall. */
function rotateItems(items: PlannedItem[], steps: number, cw: number, cd: number): PlannedItem[] {
  if (steps === 0) return items;
  const ccx = cw / 2, ccy = cd / 2;
  const [rw, rd] = steps % 2 ? [cd, cw] : [cw, cd];
  return items.map(it => {
    let dx = it.x - ccx, dy = it.y - ccy;
    for (let i = 0; i < steps; i++) { const nx = -dy, ny = dx; dx = nx; dy = ny; }
    return { ...it, x: round1(dx + rw / 2), y: round1(dy + rd / 2), rotation: norm(it.rotation + 90 * steps) };
  });
}

export function planLayout(o: LayoutOptions): LayoutPlan {
  const notes: string[] = [];
  const steps = o.startSide;
  // Canonical room: main run on the top wall; odd steps swap the room's sides.
  const [cw, cd] = steps % 2 ? [o.depth, o.width] : [o.width, o.depth];
  if (cw < 150 || cd < 150) notes.push('room-too-small');
  const canon = planCanonical(o, cw, cd, notes);
  const items = rotateItems(canon, steps, cw, cd).map(i => ({ ...i, x: round1(i.x), y: round1(i.y) }));
  return { items, notes: [...new Set(notes)] };
}
