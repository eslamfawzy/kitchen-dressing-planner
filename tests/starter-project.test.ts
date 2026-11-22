import { describe, expect, it } from 'vitest';
import { createStarterProject } from '../src/lib/utils/starterProject';
import { readProject } from '../src/lib/utils/projectValidation';
import { applyFinish } from '../src/lib/utils/cabinetPlacement';
import { createCabinetModel } from '../src/lib/utils/cabinetCatalog';
import { getCabinetDef } from '../src/lib/utils/furnitureCatalog';
import { computeBom } from '../src/lib/utils/cabinetBom';

describe('starter project', () => {
  it('has a kitchen and a dressing room with walls and units, and validates', () => {
    const p = createStarterProject();
    const f = p.floors[0];
    expect(f.walls.length).toBe(8);
    expect(f.furniture.filter(i => i.catalogId.startsWith('kit_')).length).toBeGreaterThan(5);
    expect(f.furniture.filter(i => i.catalogId.startsWith('dr_')).length).toBeGreaterThan(3);
    expect(() => readProject(JSON.parse(JSON.stringify(p)))).not.toThrow();
  });
});

describe('door control', () => {
  const count = (g: any) => { let n = 0; g.traverse((o: any) => { if (o.isMesh) n++; }); return n; };
  it('door count override changes the number of fronts and open swings them', () => {
    const def = { ...getCabinetDef('kit_base_100')!, width: 100 };
    const auto = createCabinetModel(def);
    const four = createCabinetModel({ ...def, finish: { doors: 4 } });
    expect(count(four)).toBeGreaterThan(count(auto));
    const closed = createCabinetModel({ ...def, finish: { handle: 'none' } });
    const open = createCabinetModel({ ...def, finish: { handle: 'none', open: true } });
    let rotated = 0; open.traverse(o => { if (o.rotation.y !== 0) rotated++; });
    let rotatedClosed = 0; closed.traverse(o => { if (o.rotation.y !== 0) rotatedClosed++; });
    expect(rotated).toBe(2); expect(rotatedClosed).toBe(0);
  });
  it('BOM follows the door override', () => {
    const it = { id: 'a', catalogId: 'kit_base_100', position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1, z: 1 }, finish: { doors: 3 } } as any;
    expect(computeBom([it]).hardware.find(h => h.item === 'Hinge')!.qty).toBe(6);
  });
});
