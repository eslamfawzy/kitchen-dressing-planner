import { expect, it } from 'vitest';
import { doorFinishes, topFinish, handleFinish, DEFAULT_TOP, DEFAULT_HANDLE } from '../src/lib/utils/cabinetFinishes';
import { readProject } from '../src/lib/utils/projectValidation';

it('looks up finishes with safe defaults', () => {
  expect(topFinish(undefined).id).toBe(DEFAULT_TOP);
  expect(topFinish('nope').id).toBe(DEFAULT_TOP);
  expect(handleFinish('gold').hex).toMatch(/^#/);
  expect(handleFinish(undefined).id).toBe(DEFAULT_HANDLE);
  expect(new Set(doorFinishes.map(d => d.id)).size).toBe(doorFinishes.length);
  for (const d of doorFinishes) expect(d.hex).toMatch(/^#[0-9a-f]{6}$/i);
});

it('accepts the finish field on furniture and rejects a malformed one', () => {
  const make = (finish: unknown) => ({
    id: 'p', name: 'x', floors: [{ id: 'f', name: 'G', level: 0, walls: [], doors: [], windows: [], rooms: [], stairs: [], columns: [],
      furniture: [{ id: 'a', catalogId: 'kit_base_60', position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1, z: 1 }, finish }] }],
    activeFloorId: 'f', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });
  let ok = true;
  try { readProject(make({ top: 'marble', handle: 'gold' })); } catch { ok = false; }
  expect(ok).toBe(true);
  expect(() => readProject(make({ top: 5 }))).toThrow();
});
