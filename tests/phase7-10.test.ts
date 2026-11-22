import { describe, expect, it } from 'vitest';
import { checkDesign } from '../src/lib/utils/cabinetRules';
import { cabinetStyles } from '../src/lib/utils/cabinetStyles';
import { doorFinishes, topFinishes, handleFinishes } from '../src/lib/utils/cabinetFinishes';
import { createStarterProject } from '../src/lib/utils/starterProject';
import { planLayout } from '../src/lib/utils/cabinetLayout';
import { createCabinetModel } from '../src/lib/utils/cabinetCatalog';
import { getCabinetDef, cabinetCatalog } from '../src/lib/utils/furnitureCatalog';
import { computeQuote } from '../src/lib/utils/cabinetQuote';
import type { FurnitureItem } from '../src/lib/models/types';

const it_ = (catalogId: string, x: number, y: number, rotation = 0, extra: Partial<FurnitureItem> = {}): FurnitureItem =>
  ({ id: `${catalogId}@${x},${y}`, catalogId, position: { x, y }, rotation, scale: { x: 1, y: 1, z: 1 }, ...extra });

describe('styles', () => {
  it('only use known finishes', () => {
    for (const s of cabinetStyles) {
      expect(doorFinishes.some(d => d.hex === s.door), s.id).toBe(true);
      expect(topFinishes.some(t => t.id === s.top), s.id).toBe(true);
      expect(handleFinishes.some(h => h.id === s.handle), s.id).toBe(true);
    }
  });
});

describe('designer rules', () => {
  it('starter project has no overlaps or narrow passages', () => {
    const bad = checkDesign(createStarterProject().floors[0].furniture).filter(i => i.severity === 'error' || i.id === 'aisle');
    expect(bad).toEqual([]);
    expect(checkDesign(createStarterProject().floors[0].furniture).filter(i => i.severity === 'warn')).toEqual([]);
  });
  it('flags overlaps, a narrow passage, missing hood and fridge next to hob', () => {
    const issues = checkDesign([
      it_('kit_base_60', 100, 100), it_('kit_base_60', 120, 100),                       // overlap
      it_('kit_hob_60', 300, 100), it_('kit_tall_fridge_70', 345, 100),                  // fridge beside hob, no hood
      it_('kit_base_60', 600, 100, 0), it_('kit_base_60', 600, 190, 180),                // 30cm passage? centres 90 apart, depth 60 -> gap 30
    ]).map(i => i.id);
    expect(issues).toContain('overlap');
    expect(issues).toContain('hob-fridge');
    expect(issues).toContain('no-hood');
    expect(issues).toContain('aisle');
  });
  it('accepts a 100 cm aisle between facing runs', () => {
    const ids = checkDesign([it_('kit_base_60', 100, 30, 0), it_('kit_base_60', 100, 190, 180)]).map(i => i.id);
    expect(ids).not.toContain('aisle');
  });
  it('checks the work triangle', () => {
    const tight = checkDesign([it_('kit_sink_80', 100, 100), it_('kit_hob_60', 170, 100), it_('kit_tall_fridge_70', 230, 100)]).map(i => i.id);
    expect(tight).toContain('triangle-tight');
  });
});

describe('appliances', () => {
  it('build in 3D, price per unit and sit beside the sink in generated kitchens', () => {
    for (const id of ['kit_dishwasher_60', 'kit_washer_60', 'kit_oven_base_60', 'kit_microwave_60']) {
      const def = getCabinetDef(id)!;
      expect(def).toBeTruthy();
      expect(createCabinetModel(def).children.length).toBeGreaterThan(2);
    }
    expect(computeQuote([it_('kit_dishwasher_60', 0, 0)]).unitsTotal).toBe(18000);
    const plan = planLayout({ kind: 'kitchen', shape: 'U', width: 450, depth: 350, island: false, wallUnits: true, startSide: 0 });
    expect(plan.items.some(i => i.catalogId === 'kit_dishwasher_60')).toBe(true);
    expect(cabinetCatalog.length).toBeGreaterThan(55);
  });
});

describe('dressing needs and LED', () => {
  const count = (needs: any) => {
    const plan = planLayout({ kind: 'dressing', shape: 'U', width: 400, depth: 300, island: false, wallUnits: false, startSide: 0, needs });
    const c = { hang: 0, drawers: 0, shelves: 0 };
    for (const i of plan.items) { if (i.catalogId.startsWith('dr_hang')) c.hang++; if (i.catalogId.startsWith('dr_drawers')) c.drawers++; if (i.catalogId.startsWith('dr_shelves')) c.shelves++; }
    return c;
  };
  it('follows the requested mix', () => {
    const hangs = count({ hang: 100, drawers: 0, shelves: 0 });
    expect(hangs.drawers + hangs.shelves).toBe(0);
    const drawers = count({ hang: 0, drawers: 100, shelves: 0 });
    expect(drawers.hang).toBe(0);
    expect(drawers.drawers).toBeGreaterThan(0);
  });
  it('LED adds emissive strips', () => {
    const emissive = (g: any) => { let n = 0; g.traverse((o: any) => { if (o.isMesh && o.material.emissiveIntensity > 1) n++; }); return n; };
    const off = createCabinetModel({ ...getCabinetDef('kit_wall_60')! });
    const on = createCabinetModel({ ...getCabinetDef('kit_wall_60')!, finish: { led: true } });
    expect(emissive(off)).toBe(0);
    expect(emissive(on)).toBeGreaterThan(0);
  });
});
