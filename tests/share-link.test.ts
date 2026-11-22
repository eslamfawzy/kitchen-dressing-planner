import { describe, expect, it } from 'vitest';
import { encodeShare, decodeShare, whatsappUrl, slimProject } from '../src/lib/utils/shareLink';
import { createDefaultProject } from '../src/lib/stores/project';

describe('share link', () => {
  it('round-trips a project and strips background images', async () => {
    const p = createDefaultProject('Kitchen ☕ مطبخ');
    (p as any).backgroundImage = { data: 'x'.repeat(1000) };
    const text = await encodeShare(p);
    expect(text).toMatch(/^[A-Za-z0-9_-]+$/);
    const back = (await decodeShare(text)) as any;
    expect(back.name).toBe('Kitchen ☕ مطبخ');
    expect(back.backgroundImage).toBeUndefined();
    expect((slimProject(p) as any).backgroundImage).toBeUndefined();
  });
  it('builds a wa.me link with digits only and encoded text', () => {
    expect(whatsappUrl('+20 10-1234 5678', 'مرحبا & hi')).toBe('https://wa.me/201012345678?text=' + encodeURIComponent('مرحبا & hi'));
  });
  it('rejects oversized links', async () => {
    await expect(decodeShare('A'.repeat(70000))).rejects.toThrow();
  });
});
