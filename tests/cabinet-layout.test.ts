import { describe, expect, it } from 'vitest';
import { planLayout, snapToNeighbors, type LayoutOptions, type PlannedItem } from '../src/lib/utils/cabinetLayout';
import { getCatalogItem } from '../src/lib/utils/furnitureCatalog';
import { cabinetDefaultElevation } from '../src/lib/utils/furnitureCatalog';

function footprint(i: PlannedItem) {
  const def = getCatalogItem(i.catalogId)!;
  const w = i.width ?? def.width, d = def.depth;
  const a = (i.rotation * Math.PI) / 180;
  const c = Math.cos(a), s = Math.sin(a);
  const pts = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([x, y]) => ({ x: i.x + x * c - y * s, y: i.y + x * s + y * c }));
  return pts;
}
function aabb(pts: { x: number; y: number }[]) {
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

const shapes: LayoutOptions['shape'][] = ['I', 'L', 'U', 'parallel'];
describe('planLayout', () => {
  for (const kind of ['kitchen', 'dressing'] as const) {
    for (const shape of shapes) {
      for (const startSide of [0, 1, 2, 3] as const) {
        it(`${kind} ${shape} side ${startSide}: units stay inside the room and never overlap on the floor`, () => {
          const o: LayoutOptions = { kind, shape, width: 420, depth: 330, island: true, wallUnits: true, startSide };
          const { items } = planLayout(o);
          expect(items.length).toBeGreaterThan(3);
          const floor = items.filter(i => cabinetDefaultElevation(i.catalogId) === 0);
          const boxes = floor.map(i => aabb(footprint(i)));
          for (const b of boxes) {
            expect(b.x0).toBeGreaterThan(-0.6); expect(b.y0).toBeGreaterThan(-0.6);
            expect(b.x1).toBeLessThan(o.width + 0.6); expect(b.y1).toBeLessThan(o.depth + 0.6);
          }
          for (let a = 0; a < boxes.length; a++) for (let b = a + 1; b < boxes.length; b++) {
            const A = boxes[a], B = boxes[b];
            const ox = Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0), oy = Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0);
            // Allow the empty notch of L-shaped corner units to host nothing; real overlaps exceed 1 cm in both axes.
            expect(ox > 1 && oy > 1, `${floor[a].catalogId} overlaps ${floor[b].catalogId}`).toBe(false);
          }
        });
      }
    }
  }

  it('fills a straight run exactly (units + fillers = run length)', () => {
    const { items } = planLayout({ kind: 'kitchen', shape: 'I', width: 337, depth: 300, island: false, wallUnits: false, startSide: 0 });
    const total = items.reduce((a, i) => a + (i.width ?? getCatalogItem(i.catalogId)!.width), 0);
    expect(Math.round(total)).toBe(337);
  });

  it('includes a sink and a hob in the kitchen', () => {
    const ids = planLayout({ kind: 'kitchen', shape: 'L', width: 400, depth: 300, island: false, wallUnits: true, startSide: 0 }).items.map(i => i.catalogId);
    expect(ids.some(i => i.startsWith('kit_sink_'))).toBe(true);
    expect(ids.some(i => i.startsWith('kit_hob_'))).toBe(true);
    expect(ids).toContain('kit_corner_base');
    expect(ids.some(i => i.startsWith('kit_hood_'))).toBe(true);
  });

  it('skips the island when the room is too tight', () => {
    const r = planLayout({ kind: 'kitchen', shape: 'parallel', width: 400, depth: 260, island: true, wallUnits: false, startSide: 0 });
    expect(r.notes).toContain('island-skipped');
    expect(r.items.some(i => i.catalogId.startsWith('kit_island'))).toBe(false);
  });
});

describe('snapToNeighbors', () => {
  const size = { width: 60, depth: 60 };
  it('butts a unit against the right edge of its neighbour', () => {
    const n = [{ position: { x: 30, y: 30 }, rotation: 0, size }];
    const p = snapToNeighbors({ x: 94, y: 30 }, 0, size, n);
    expect(p.x).toBeCloseTo(90, 5); expect(p.y).toBeCloseTo(30, 5);
  });
  it('works on a rotated wall run', () => {
    const n = [{ position: { x: 30, y: 30 }, rotation: 270, size }];
    const p = snapToNeighbors({ x: 30, y: -24 }, 270, size, n);
    expect(p.x).toBeCloseTo(30, 5); expect(Math.abs(p.y - (-30))).toBeLessThan(0.01);
  });
  it('ignores far neighbours and other orientations', () => {
    expect(snapToNeighbors({ x: 200, y: 30 }, 0, size, [{ position: { x: 30, y: 30 }, rotation: 0, size }])).toEqual({ x: 200, y: 30 });
    expect(snapToNeighbors({ x: 94, y: 30 }, 0, size, [{ position: { x: 30, y: 30 }, rotation: 90, size }])).toEqual({ x: 94, y: 30 });
  });
});
