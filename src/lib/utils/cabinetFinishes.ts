/** Finish options for kitchen and dressing units. Door colour is stored on the item (`color`). */

export interface Swatch { id: string; en: string; ar: string; hex: string; }
export interface TopSwatch extends Swatch { roughness: number; metalness: number; }

export const doorFinishes: readonly Swatch[] = [
  { id: 'white', en: 'White matt', ar: 'أبيض مط', hex: '#f4f4f1' },
  { id: 'gloss', en: 'White gloss', ar: 'أبيض لامع', hex: '#fbfbfb' },
  { id: 'ivory', en: 'Ivory', ar: 'عاجي', hex: '#ece3d0' },
  { id: 'beige', en: 'Beige', ar: 'بيج', hex: '#d6c7b0' },
  { id: 'oak', en: 'Light oak', ar: 'سنديان فاتح', hex: '#c8a66b' },
  { id: 'walnut', en: 'Walnut', ar: 'جوز', hex: '#6b4a2f' },
  { id: 'grey', en: 'Grey', ar: 'رمادي', hex: '#9aa0a6' },
  { id: 'anthracite', en: 'Anthracite', ar: 'أنثراسايت', hex: '#3b3f45' },
  { id: 'navy', en: 'Navy', ar: 'كحلي', hex: '#2f3e5a' },
  { id: 'sage', en: 'Sage green', ar: 'أخضر زيتي', hex: '#9caf88' },
  { id: 'terracotta', en: 'Terracotta', ar: 'طوبي', hex: '#b9694a' },
  { id: 'black', en: 'Black', ar: 'أسود', hex: '#1f1f1f' },
];

export const topFinishes: readonly TopSwatch[] = [
  { id: 'granite', en: 'Black granite', ar: 'جرانيت أسود', hex: '#2e2e30', roughness: 0.25, metalness: 0.1 },
  { id: 'marble', en: 'White marble', ar: 'رخام أبيض', hex: '#ececea', roughness: 0.2, metalness: 0.05 },
  { id: 'quartz', en: 'Grey quartz', ar: 'كوارتز رمادي', hex: '#8c8f93', roughness: 0.3, metalness: 0.1 },
  { id: 'wood', en: 'Wood', ar: 'خشب', hex: '#a8794a', roughness: 0.7, metalness: 0.02 },
  { id: 'steel', en: 'Stainless steel', ar: 'ستانلس', hex: '#b9bdc2', roughness: 0.3, metalness: 0.8 },
  { id: 'same', en: 'Same as doors', ar: 'نفس الأبواب', hex: '', roughness: 0.5, metalness: 0.05 },
];

export const handleFinishes: readonly Swatch[] = [
  { id: 'black', en: 'Black', ar: 'أسود', hex: '#2a2a2a' },
  { id: 'chrome', en: 'Chrome', ar: 'كروم', hex: '#c9ccd1' },
  { id: 'gold', en: 'Gold', ar: 'ذهبي', hex: '#c9a24a' },
  { id: 'brass', en: 'Brushed brass', ar: 'نحاسي', hex: '#a98a4f' },
  { id: 'none', en: 'Handleless', ar: 'بدون مقبض', hex: '' },
];

export const DEFAULT_TOP = 'granite';
export const DEFAULT_HANDLE = 'black';

export function topFinish(id: string | undefined): TopSwatch {
  return topFinishes.find(t => t.id === id) ?? topFinishes[0];
}
export function handleFinish(id: string | undefined): Swatch {
  return handleFinishes.find(h => h.id === id) ?? handleFinishes[0];
}
