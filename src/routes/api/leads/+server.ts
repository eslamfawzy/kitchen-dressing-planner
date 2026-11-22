import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

let minute = -1, hits = 0;
const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

/** Receives a design enquiry. Forwards to LEADS_WEBHOOK_URL (e.g. a Perfex CRM endpoint) when configured. */
export async function POST({ request }: { request: Request }) {
  const now = Math.floor(Date.now() / 60_000);
  if (minute !== now) { minute = now; hits = 0; }
  if (++hits > 30) return json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, { status: 400 }); }
  const link = clip(body.link, 70_000);
  const lead = {
    name: clip(body.name, 120),
    phone: clip(body.phone, 30).replace(/[^\d+\s-]/g, ''),
    notes: clip(body.notes, 1000),
    total: Number.isFinite(Number(body.total)) ? Number(body.total) : 0,
    currency: clip(body.currency, 8) || 'EGP',
    units: Number.isFinite(Number(body.units)) ? Math.min(Number(body.units), 1000) : 0,
    link: link.startsWith('https://') ? link : '',
    receivedAt: new Date().toISOString(),
  };
  if (!lead.name && !lead.phone) return json({ error: 'Name or phone is required' }, { status: 400 });
  const hook = env.LEADS_WEBHOOK_URL;
  if (hook) {
    try {
      const res = await fetch(hook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(env.LEADS_WEBHOOK_TOKEN ? { Authorization: `Bearer ${env.LEADS_WEBHOOK_TOKEN}` } : {}) },
        body: JSON.stringify(lead),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return json({ error: 'Lead forwarding failed' }, { status: 502 });
    } catch { return json({ error: 'Lead forwarding failed' }, { status: 502 }); }
  } else {
    // No CRM wired yet: keep a trace in the function logs (visible in Vercel) so no lead is lost.
    console.info(JSON.stringify({ event: 'lead', ...lead, link: lead.link ? '[link]' : '' }));
  }
  return json({ ok: true }, { status: 201 });
}
