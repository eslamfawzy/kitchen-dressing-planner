import { describe, expect, it } from 'vitest';
import type { FurnitureItem } from '../src/lib/models/types';
import { computeQuote, defaultPriceBook } from '../src/lib/utils/cabinetQuote';
import { computeBom } from '../src/lib/utils/cabinetBom';
import { planLayout } from '../src/lib/utils/cabinetLayout';

const item = (catalogId: string, extra: Partial<FurnitureItem> = {}): FurnitureItem =>
  ({ id: Math.random().toString(36).slice(2), catalogId, position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1, z: 1 }, ...extra });

describe('computeQuote', () => {
  it('prices per linear metre and groups identical units', () => {
    const q = computeQuote([item('kit_base_60'), item('kit_base_60'), item('kit_base_100')]);
    expect(q.unitCount).toBe(3);
    const l60 = q.lines.find(l => l.catalogId === 'kit_base_60')!;
    expect(l60.qty).toBe(2);
    expect(l60.unitPrice).toBe(Math.round(4500 * 0.6));
    expect(q.unitsTotal).toBe(2 * 2700 + 4500);
  });
  it('charges worktop by metre and handles by piece', () => {
    const q = computeQuote([item('kit_base_100')]);  // 2 doors, granite default, black handles
    expect(q.worktopMeters).toBe(1);
    expect(q.worktopTotal).toBe(3000);
    expect(q.handles).toBe(2);
    expect(q.handlesTotal).toBe(120);
  });
  it('honours finish choices and handleless units', () => {
    const q = computeQuote([item('kit_base_100', { finish: { top: 'marble', handle: 'none' } })]);
    expect(q.worktopTotal).toBe(4500);
    expect(q.handles).toBe(0);
    expect(q.handlesTotal).toBe(0);
  });
  it('uses the per-item price override and a door-finish multiplier', () => {
    const own = computeQuote([item('kit_base_60', { details: { price: 5000 } })]);
    expect(own.lines[0].unitPrice).toBe(5000); expect(own.lines[0].custom).toBe(true);
    const walnut = computeQuote([item('kit_base_60', { color: '#6b4a2f' })]);
    expect(walnut.lines[0].unitPrice).toBe(Math.round(2700 * 1.12));
  });
  it('applies discount then VAT', () => {
    const q = computeQuote([item('kit_hood_60')], defaultPriceBook, { discountPct: 10, vatPct: 14 });
    expect(q.subtotal).toBe(3000);
    expect(q.discount).toBe(300);
    expect(q.vat).toBe(Math.round(2700 * 0.14));
    expect(q.total).toBe(2700 + Math.round(2700 * 0.14));
  });
  it('ignores non-cabinet furniture', () => {
    expect(computeQuote([item('sofa')]).unitCount).toBe(0);
  });
});

describe('computeBom', () => {
  it('lists panels for a base unit', () => {
    const b = computeBom([item('kit_base_60')]);
    const side = b.parts.find(p => p.part.endsWith('Side'))!;
    expect(side.qty).toBe(2);
    expect(b.hardware.find(h => h.item === 'Hinge')!.qty).toBe(2);
    expect(b.hardware.find(h => h.item === 'Adjustable leg')!.qty).toBe(4);
  });
  it('has correct side height: 85 - plinth 10 - top 3 = 72 cm', () => {
    const b = computeBom([item('kit_base_60')]);
    const side = b.parts.find(p => p.part.endsWith('Side'))!;
    expect(side.length).toBe(720);
    expect(side.width).toBe(580);
  });
  it('merges identical parts across units and totals area', () => {
    const b = computeBom([item('kit_base_60'), item('kit_base_60')]);
    expect(b.parts.find(p => p.part.endsWith('Side'))!.qty).toBe(4);
    expect(b.area['18mm board']).toBeGreaterThan(1);
    expect(b.sheets18).toBeGreaterThanOrEqual(1);
  });
  it('treats hoods as ready-made items', () => {
    const b = computeBom([item('kit_hood_60')]);
    expect(b.parts.length).toBe(0);
    expect(b.readymade).toEqual([{ item: 'Hood Unit 60', qty: 1 }]);
  });
  it('quotes and cuts a whole generated kitchen', () => {
    const plan = planLayout({ kind: 'kitchen', shape: 'U', width: 450, depth: 350, island: false, wallUnits: true, startSide: 0 });
    const items = plan.items.map(i => item(i.catalogId, i.width ? { width: i.width } : {}));
    const q = computeQuote(items), b = computeBom(items);
    expect(q.total).toBeGreaterThan(30000);
    expect(b.parts.length).toBeGreaterThan(10);
    expect(b.unitCount).toBe(items.length);
  });
});

import { toCsv, quoteRows, cuttingRows } from '../src/lib/utils/quoteExport';
describe('csv export', () => {
  it('escapes quotes, commas and formula-looking text', () => {
    expect(toCsv([['a,b', 'say "hi"', '=1+1', 5]])).toBe('"a,b","say ""hi""",\'=1+1,5');
  });
  it('builds quote and cutting rows with totals', () => {
    const q = computeQuote([item('kit_base_60')]);
    const rows = quoteRows(q, 'EGP');
    expect(rows[0][0]).toBe('Item');
    expect(rows[rows.length - 1]).toEqual(['Total', '', '', '', q.total]);
    expect(cuttingRows(computeBom([item('kit_base_60')])).some(r => r[1] === 'Base Unit · Side')).toBe(true);
  });
});
