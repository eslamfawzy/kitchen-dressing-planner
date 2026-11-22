import type { Project } from '$lib/models/types';

const MAX_LINK = 60_000;

const b64url = (bytes: Uint8Array) => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64url = (text: string) => {
  const s = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, c => c.charCodeAt(0));
};

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** Drop heavy, non-design data (photos, background images, version history) before sharing. */
export function slimProject(project: Project): Project {
  const copy = JSON.parse(JSON.stringify(project)) as Record<string, unknown>;
  delete copy.backgroundImage;
  for (const f of (copy.floors as Array<Record<string, unknown>> | undefined) ?? []) delete f.backgroundImage;
  return copy as unknown as Project;
}

export async function encodeShare(project: Project): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(slimProject(project)));
  const text = b64url(await pipe(json, new CompressionStream('gzip')));
  if (text.length > MAX_LINK) throw new Error('Design is too large for a link. Export the project file instead.');
  return text;
}

export async function decodeShare(text: string): Promise<unknown> {
  if (text.length > MAX_LINK) throw new Error('Share link is too large.');
  const raw = await pipe(fromB64url(text), new DecompressionStream('gzip'));
  if (raw.length > 5_000_000) throw new Error('Share link is too large.');
  return JSON.parse(new TextDecoder().decode(raw));
}

export const SHARE_PREFIX = '#share=';

export async function shareUrl(project: Project, origin: string, basePath = ''): Promise<string> {
  return `${origin}${basePath}/editor${SHARE_PREFIX}${await encodeShare(project)}`;
}

export function whatsappUrl(number: string, message: string): string {
  const digits = number.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
