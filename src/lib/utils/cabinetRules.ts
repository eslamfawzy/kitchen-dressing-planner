import type { FurnitureItem } from '$lib/models/types';
import { getCabinetDef, getFurnitureSize, type CabinetKind } from './furnitureCatalog';

/** Designer checks for a kitchen / dressing layout. Distances in cm; messages in English and Arabic. */
export interface Issue { id: string; severity: 'error' | 'warn' | 'info'; en: string; ar: string; ids: string[]; }

interface Box { id: string; kind: CabinetKind; kitchen: boolean; x0: number; x1: number; y0: number; y1: number; cx: number; cy: number; rot: number; wall: boolean; }

const WALL_KINDS: ReadonlySet<CabinetKind> = new Set(['wall', 'wall_corner', 'hood', 'microwave']);
const FRONT: Record<number, [number, number]> = { 0: [0, 1], 90: [-1, 0], 180: [0, -1], 270: [1, 0] };

function boxes(items: readonly FurnitureItem[]): Box[] {
  const out: Box[] = [];
  for (const it of items) {
    const def = getCabinetDef(it.catalogId);
    if (!def) continue;
    const s = getFurnitureSize(it);
    const rot = ((Math.round(it.rotation) % 360) + 360) % 360;
    const swap = rot === 90 || rot === 270;
    const w = swap ? s.depth : s.width, d = swap ? s.width : s.depth;
    out.push({
      id: it.id, kind: def.kind, kitchen: def.category === 'Kitchen Units', rot, wall: WALL_KINDS.has(def.kind),
      x0: it.position.x - w / 2, x1: it.position.x + w / 2, y0: it.position.y - d / 2, y1: it.position.y + d / 2, cx: it.position.x, cy: it.position.y,
    });
  }
  return out;
}

const gapBetween = (a: Box, b: Box) => Math.hypot(Math.max(0, a.x0 - b.x1, b.x0 - a.x1), Math.max(0, a.y0 - b.y1, b.y0 - a.y1));
const dist = (a: Box, b: Box) => Math.hypot(a.cx - b.cx, a.cy - b.cy);

export function checkDesign(items: readonly FurnitureItem[]): Issue[] {
  const all = boxes(items);
  const issues: Issue[] = [];
  if (!all.length) return issues;
  const floor = all.filter(b => !b.wall), wallB = all.filter(b => b.wall);

  // 1. Overlaps (same level only)
  for (const group of [floor, wallB]) {
    for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {
      const a = group[i], b = group[j];
      const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      if (ox > 6 && oy > 6) issues.push({ id: 'overlap', severity: 'error', ids: [a.id, b.id], en: 'Two units overlap. Move one of them.', ar: 'وحدتين فوق بعض. حرّك واحدة منهم.' });
    }
  }

  const kitchen = all.filter(b => b.kitchen);
  if (kitchen.length) {
    const sink = kitchen.find(b => b.kind === 'sink'), hob = kitchen.find(b => b.kind === 'hob'), fridge = kitchen.find(b => b.kind === 'fridge_tall');
    if (!sink) issues.push({ id: 'no-sink', severity: 'info', ids: [], en: 'No sink unit yet.', ar: 'مفيش وحدة حوض لسه.' });
    if (!hob) issues.push({ id: 'no-hob', severity: 'info', ids: [], en: 'No hob unit yet.', ar: 'مفيش وحدة بوتاجاز لسه.' });
    if (!fridge) issues.push({ id: 'no-fridge', severity: 'info', ids: [], en: 'No fridge space yet.', ar: 'مفيش مكان للتلاجة لسه.' });

    // 2. Work triangle
    if (sink && hob && fridge) {
      const legs = [dist(sink, hob), dist(hob, fridge), dist(fridge, sink)];
      const sum = legs.reduce((a, x) => a + x, 0);
      const ids = [sink.id, hob.id, fridge.id];
      if (legs.some(l => l < 100) || sum < 400) issues.push({ id: 'triangle-tight', severity: 'warn', ids, en: `Work triangle is tight (${Math.round(sum)} cm total; aim for 400–800).`, ar: `مثلث الشغل ضيق (${Math.round(sum)} سم، المفروض بين 400 و800).` });
      else if (legs.some(l => l > 270) || sum > 800) issues.push({ id: 'triangle-far', severity: 'warn', ids, en: `Sink, hob and fridge are far apart (${Math.round(sum)} cm total; aim for 400–800).`, ar: `الحوض والبوتاجاز والتلاجة بعيد عن بعض (${Math.round(sum)} سم، المفروض بين 400 و800).` });
    }
    // 3. Hob neighbours
    if (hob) {
      if (fridge && gapBetween(hob, fridge) < 40) issues.push({ id: 'hob-fridge', severity: 'warn', ids: [hob.id, fridge.id], en: 'Fridge is too close to the hob (keep 40 cm or more).', ar: 'التلاجة قريبة من البوتاجاز (سيب 40 سم على الأقل).' });
      if (sink && gapBetween(hob, sink) < 30) issues.push({ id: 'hob-sink', severity: 'warn', ids: [hob.id, sink.id], en: 'No work surface between sink and hob (keep 30 cm or more).', ar: 'مفيش سطح شغل بين الحوض والبوتاجاز (سيب 30 سم على الأقل).' });
      if (!wallB.some(b => b.kind === 'hood' && Math.abs(b.cx - hob.cx) < 40 && Math.abs(b.cy - hob.cy) < 60)) issues.push({ id: 'no-hood', severity: 'warn', ids: [hob.id], en: 'No hood above the hob.', ar: 'مفيش شفاط فوق البوتاجاز.' });
    }
  }

  // 4. Passages between facing floor units
  const reported = new Set<string>();
  for (const a of floor) {
    const dir = FRONT[a.rot];
    if (!dir || a.kind === 'filler') continue;
    let best: { gap: number; b: Box } | null = null;
    for (const b of floor) {
      if (b === a) continue;
      const lat = dir[0] === 0 ? Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) : Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      if (lat <= 20) continue;
      // Only runs that face each other (or an island) form a passage; neighbours around a corner do not.
      const opposite = b.rot === (a.rot + 180) % 360;
      if (!opposite && b.kind !== 'island' && b.kind !== 'dress_island') continue;
      const gap = dir[1] === 1 ? b.y0 - a.y1 : dir[1] === -1 ? a.y0 - b.y1 : dir[0] === 1 ? b.x0 - a.x1 : a.x0 - b.x1;
      if (gap < 4) continue;
      if (!best || gap < best.gap) best = { gap, b };
    }
    const limit = a.kitchen && best?.b.kitchen ? 90 : 70;
    if (best && best.gap < limit) {
      const key = [a.id, best.b.id].sort().join('|');
      if (reported.has(key)) continue;
      reported.add(key);
      const g = Math.round(best.gap);
      issues.push({ id: 'aisle', severity: 'warn', ids: [a.id, best.b.id], en: `Passage is only ${g} cm. Keep at least ${limit} cm.`, ar: `الممر ${g} سم بس. سيب ${limit} سم على الأقل.` });
    }
  }
  return issues;
}
