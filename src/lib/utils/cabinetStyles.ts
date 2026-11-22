/** One-click looks: door colour + worktop + handle, named the way a customer says them. */
export interface CabinetStyle { id: string; en: string; ar: string; door: string; top: string; handle: string; }

export const cabinetStyles: readonly CabinetStyle[] = [
  { id: 'modern-white', en: 'Modern white', ar: 'مودرن أبيض', door: '#fbfbfb', top: 'quartz', handle: 'none' },
  { id: 'modern-dark', en: 'Modern dark', ar: 'مودرن داكن', door: '#3b3f45', top: 'marble', handle: 'black' },
  { id: 'scandi', en: 'Scandinavian', ar: 'اسكندنافي', door: '#f4f4f1', top: 'wood', handle: 'black' },
  { id: 'classic', en: 'Classic', ar: 'كلاسيك', door: '#ece3d0', top: 'marble', handle: 'gold' },
  { id: 'neoclassic', en: 'Neoclassic', ar: 'نيو كلاسيك', door: '#d6c7b0', top: 'marble', handle: 'brass' },
  { id: 'warm-wood', en: 'Warm wood', ar: 'خشبي دافئ', door: '#6b4a2f', top: 'granite', handle: 'brass' },
  { id: 'oak-light', en: 'Light oak', ar: 'سنديان فاتح', door: '#c8a66b', top: 'quartz', handle: 'black' },
  { id: 'navy-gold', en: 'Navy & gold', ar: 'كحلي وذهبي', door: '#2f3e5a', top: 'marble', handle: 'gold' },
  { id: 'black-gold', en: 'Black & gold', ar: 'أسود وذهبي', door: '#1f1f1f', top: 'marble', handle: 'gold' },
  { id: 'sage', en: 'Sage green', ar: 'أخضر زيتي', door: '#9caf88', top: 'wood', handle: 'brass' },
];
