import { get } from 'svelte/store';
import type { Point, Room, Wall } from '$lib/models/types';
import { activeFloor, addFurniture, addWall, beginUndoGroup, detectedRoomsStore, endUndoGroup, updateFurniture } from '$lib/stores/project';
import { isCabinetId } from './cabinetLayout';
import { DEFAULT_HANDLE, DEFAULT_TOP } from './cabinetFinishes';
import { planLayout, type LayoutOptions, type LayoutPlan } from './cabinetLayout';

const WALL_THICKNESS = 15;

export interface RoomChoice { id: string; name: string; x0: number; y0: number; width: number; depth: number; }

function wallsOf(room: Room, walls: Wall[]): Wall[] {
  const ids = new Set(room.walls);
  return walls.filter(w => ids.has(w.id));
}

/** Interior bounding box of a room (cm). Rooms are treated as rectangles. */
export function roomChoices(): RoomChoice[] {
  const floor = get(activeFloor);
  if (!floor) return [];
  const rooms = [...floor.rooms, ...get(detectedRoomsStore)];
  const out: RoomChoice[] = [];
  const seen = new Set<string>();
  for (const room of rooms) {
    if (seen.has(room.id)) continue;
    seen.add(room.id);
    const ws = wallsOf(room, floor.walls);
    if (!ws.length) continue;
    const xs = ws.flatMap(w => [w.start.x, w.end.x]), ys = ws.flatMap(w => [w.start.y, w.end.y]);
    const t = Math.max(...ws.map(w => w.thickness)) / 2;
    const x0 = Math.min(...xs) + t, y0 = Math.min(...ys) + t;
    const width = Math.max(...xs) - Math.min(...xs) - 2 * t, depth = Math.max(...ys) - Math.min(...ys) - 2 * t;
    if (width < 100 || depth < 100) continue;
    out.push({ id: room.id, name: room.name, x0, y0, width: Math.round(width), depth: Math.round(depth) });
  }
  return out;
}

export function previewLayout(options: LayoutOptions): LayoutPlan {
  return planLayout(options);
}

/** Place a planned layout. `origin` is the interior top-left corner in world coordinates. */
export function placeLayout(plan: LayoutPlan, origin: Point): void {
  beginUndoGroup();
  try {
    for (const item of plan.items) {
      const id = addFurniture(item.catalogId, { x: origin.x + item.x, y: origin.y + item.y });
      const updates: { rotation?: number; width?: number } = {};
      if (item.rotation) updates.rotation = item.rotation;
      if (item.width !== undefined) updates.width = item.width;
      if (Object.keys(updates).length) updateFurniture(id, updates);
    }
  } finally {
    endUndoGroup('Placed furniture');
  }
}

/** Draw a rectangular room around an interior of the given size, centred on `centre`. */
export function createRoomWalls(width: number, depth: number, centre: Point): Point {
  const half = WALL_THICKNESS / 2;
  const x0 = centre.x - width / 2, y0 = centre.y - depth / 2;
  const corners: Point[] = [
    { x: x0 - half, y: y0 - half }, { x: x0 + width + half, y: y0 - half },
    { x: x0 + width + half, y: y0 + depth + half }, { x: x0 - half, y: y0 + depth + half },
  ];
  beginUndoGroup();
  try {
    for (let i = 0; i < 4; i++) addWall(corners[i], corners[(i + 1) % 4]);
  } finally {
    endUndoGroup('Added wall');
  }
  return { x: x0, y: y0 };
}

export interface FinishChoice { door?: string; top?: string; handle?: string; }

/** Apply finishes to the given units, or to every unit on the floor when `only` is empty. */
export function applyFinish(choice: FinishChoice, only?: ReadonlySet<string>): number {
  const floor = get(activeFloor);
  if (!floor) return 0;
  const targets = floor.furniture.filter(f => isCabinetId(f.catalogId) && (!only || only.size === 0 || only.has(f.id)));
  if (!targets.length) return 0;
  beginUndoGroup();
  try {
    for (const f of targets) {
      const finish = { ...(f.finish ?? {}) };
      if (choice.top) finish.top = choice.top;
      if (choice.handle) finish.handle = choice.handle;
      updateFurniture(f.id, { ...(choice.door ? { color: choice.door } : {}), ...(choice.top || choice.handle ? { finish } : {}) });
    }
  } finally {
    endUndoGroup('Edit');
  }
  return targets.length;
}

export { DEFAULT_HANDLE, DEFAULT_TOP };
