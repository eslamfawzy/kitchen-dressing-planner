import type { FurnitureItem } from '$lib/models/types';
import { cabinetCatalog, getCabinetDef, localizedCabinetName, getFurnitureSize, type CabinetKind } from './furnitureCatalog';
import { doorFinishes, handleFinish, topFinish, DEFAULT_HANDLE, DEFAULT_TOP } from './cabinetFinishes';
import { CORNER_ARM_CM, unitSpec } from './cabinetSpec';

/** Price of a unit kind: per linear metre of width, or per piece. */
export interface KindPrice { mode: 'm' | 'unit'; price: number; }
export interface PriceBook {
  currency: string;
  kinds: Record<CabinetKind, KindPrice>;
  /** EGP per linear metre of 60 cm deep worktop. */
  tops: Record<string, number>;
  /** EGP per handle piece. */
  handles: Record<string, number>;
  /** Door finish id -> multiplier on the unit price. */
  doorMultiplier: Record<string, number>;
}

export const defaultPriceBook: PriceBook = {
  currency: 'EGP',
  kinds: {
    base: { mode: 'm', price: 4500 }, drawers: { mode: 'm', price: 6000 }, sink: { mode: 'm', price: 4800 }, hob: { mode: 'm', price: 4500 },
    corner_base: { mode: 'unit', price: 5500 }, island: { mode: 'm', price: 7000 }, filler: { mode: 'm', price: 1500 },
    wall: { mode: 'm', price: 3500 }, wall_corner: { mode: 'unit', price: 3500 }, hood: { mode: 'unit', price: 3000 },
    dishwasher: { mode: 'unit', price: 18000 }, washer: { mode: 'unit', price: 16000 }, microwave: { mode: 'unit', price: 6000 }, oven_base: { mode: 'unit', price: 14000 },
    tall: { mode: 'm', price: 6500 }, tall_oven: { mode: 'm', price: 7500 }, fridge_tall: { mode: 'm', price: 6500 },
    hang: { mode: 'm', price: 6500 }, shelves: { mode: 'm', price: 5000 }, dress_drawers: { mode: 'm', price: 7000 },
    shoes: { mode: 'm', price: 4500 }, dress_corner: { mode: 'unit', price: 9000 }, dress_island: { mode: 'm', price: 8000 }, vanity: { mode: 'm', price: 7000 },
  },
  tops: { granite: 3000, marble: 4500, quartz: 3800, wood: 2500, steel: 5000, same: 1500 },
  handles: { black: 60, chrome: 80, gold: 150, brass: 140, none: 0 },
  doorMultiplier: { gloss: 1.15, walnut: 1.12, oak: 1.1, black: 1.05, anthracite: 1.05 },
};

export interface QuoteLine {
  key: string;
  catalogId: string;
  name: string;
  width: number;
  qty: number;
  unitPrice: number;
  total: number;
  /** The price came from the unit's own price field, not the price book. */
  custom: boolean;
}

export interface Quote {
  lines: QuoteLine[];
  worktopMeters: number;
  worktopTotal: number;
  handles: number;
  handlesTotal: number;
  unitsTotal: number;
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
  unitCount: number;
}

export interface QuoteOptions { discountPct?: number; vatPct?: number; lang?: 'en' | 'ar'; }

function doorMultiplier(color: string | undefined, book: PriceBook): number {
  if (!color) return 1;
  const f = doorFinishes.find(d => d.hex.toLowerCase() === color.toLowerCase());
  return f ? (book.doorMultiplier[f.id] ?? 1) : 1;
}

export function unitLabel(catalogId: string, lang: 'en' | 'ar' = 'en'): string {
  const def = getCabinetDef(catalogId);
  if (!def) return catalogId;
  return lang === 'ar' ? localizedCabinetName(def, 'ar') : def.name;
}

const round = (v: number) => Math.round(v);

export function computeQuote(items: readonly FurnitureItem[], book: PriceBook = defaultPriceBook, opts: QuoteOptions = {}): Quote {
  const lines = new Map<string, QuoteLine>();
  let worktopMeters = 0, worktopTotal = 0, handles = 0, handlesTotal = 0, unitCount = 0;
  for (const it of items) {
    const def = getCabinetDef(it.catalogId);
    if (!def) continue;
    const size = getFurnitureSize(it);
    const width = Math.round(size.width * 10) / 10;
    const spec = unitSpec(def.kind, width);
    const own = typeof it.details?.price === 'number' ? it.details.price : null;
    const kp = book.kinds[def.kind];
    const base = kp.mode === 'm' ? (kp.price * width) / 100 : kp.price;
    const unitPrice = own ?? round(base * doorMultiplier(it.color, book));
    const key = `${it.catalogId}|${width}|${unitPrice}`;
    const line = lines.get(key);
    if (line) { line.qty += 1; line.total += unitPrice; }
    else lines.set(key, { key, catalogId: it.catalogId, name: unitLabel(it.catalogId, opts.lang), width, qty: 1, unitPrice, total: unitPrice, custom: own !== null });
    unitCount += 1;
    if (spec.top) {
      const arm = CORNER_ARM_CM[def.kind];
      const run = spec.corner && arm ? width + (size.depth - arm) : width;
      const meters = run / 100;
      const id = it.finish?.top ?? DEFAULT_TOP;
      const perM = book.tops[topFinish(id).id] ?? 0;
      worktopMeters += meters;
      worktopTotal += perM * meters * (size.depth / 60);
    }
    const pieces = spec.doors + spec.drawers;
    if (pieces && !spec.readymade) {
      const hid = handleFinish(it.finish?.handle ?? DEFAULT_HANDLE).id;
      handles += hid === 'none' ? 0 : pieces;
      handlesTotal += (book.handles[hid] ?? 0) * pieces;
    }
  }
  const unitsTotal = [...lines.values()].reduce((a, l) => a + l.total, 0);
  worktopTotal = round(worktopTotal); handlesTotal = round(handlesTotal);
  const subtotal = unitsTotal + worktopTotal + handlesTotal;
  const discount = round(subtotal * ((opts.discountPct ?? 0) / 100));
  const vat = round((subtotal - discount) * ((opts.vatPct ?? 0) / 100));
  return {
    lines: [...lines.values()].sort((a, b) => a.catalogId.localeCompare(b.catalogId) || a.width - b.width),
    worktopMeters: Math.round(worktopMeters * 100) / 100, worktopTotal, handles, handlesTotal, unitsTotal, subtotal, discount, vat,
    total: subtotal - discount + vat, unitCount,
  };
}

export const allCabinetKinds: CabinetKind[] = [...new Set(cabinetCatalog.map(c => c.kind))];

// ── Price book persistence ───────────────────────────────────────────────

const KEY = 'o3d_price_book_v1';
export function loadPriceBook(): PriceBook {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (!raw) return structuredClone(defaultPriceBook);
    const saved = JSON.parse(raw) as Partial<PriceBook>;
    return {
      currency: typeof saved.currency === 'string' ? saved.currency : defaultPriceBook.currency,
      kinds: { ...defaultPriceBook.kinds, ...(saved.kinds ?? {}) },
      tops: { ...defaultPriceBook.tops, ...(saved.tops ?? {}) },
      handles: { ...defaultPriceBook.handles, ...(saved.handles ?? {}) },
      doorMultiplier: { ...defaultPriceBook.doorMultiplier, ...(saved.doorMultiplier ?? {}) },
    };
  } catch { return structuredClone(defaultPriceBook); }
}
export function savePriceBook(book: PriceBook): void {
  try { localStorage.setItem(KEY, JSON.stringify(book)); } catch { /* storage unavailable */ }
}
