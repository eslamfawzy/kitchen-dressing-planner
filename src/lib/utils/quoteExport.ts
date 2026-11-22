import type { Quote } from './cabinetQuote';
import type { Bom } from './cabinetBom';

export function toCsv(rows: ReadonlyArray<ReadonlyArray<string | number>>): string {
  const esc = (v: string | number) => {
    const s = String(v);
    // Guard against spreadsheet formula injection from text cells.
    const safe = typeof v === 'string' && /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return rows.map(r => r.map(esc).join(',')).join('\r\n');
}

export function quoteRows(q: Quote, currency: string): Array<Array<string | number>> {
  const rows: Array<Array<string | number>> = [['Item', 'Width (cm)', 'Qty', `Unit price (${currency})`, `Total (${currency})`]];
  for (const l of q.lines) rows.push([l.name, l.width, l.qty, l.unitPrice, l.total]);
  rows.push(['Worktop (m)', q.worktopMeters, '', '', q.worktopTotal]);
  rows.push(['Handles (pcs)', q.handles, '', '', q.handlesTotal]);
  rows.push(['Subtotal', '', '', '', q.subtotal]);
  if (q.discount) rows.push(['Discount', '', '', '', -q.discount]);
  if (q.vat) rows.push(['VAT', '', '', '', q.vat]);
  rows.push(['Total', '', '', '', q.total]);
  return rows;
}

export function cuttingRows(b: Bom): Array<Array<string | number>> {
  const rows: Array<Array<string | number>> = [['Material', 'Part', 'Length (mm)', 'Width (mm)', 'Qty']];
  for (const p of b.parts) rows.push([p.material, p.part, p.length, p.width, p.qty]);
  rows.push([]);
  rows.push(['Hardware', 'Qty']);
  for (const h of b.hardware) rows.push([h.item, h.qty]);
  for (const r of b.readymade) rows.push([r.item, r.qty]);
  rows.push([]);
  rows.push(['Board area 18mm (m2)', b.area['18mm board'] ?? 0]);
  rows.push(['Sheets 2440x1220 (+15% waste)', b.sheets18]);
  return rows;
}

export function downloadText(filename: string, text: string, mime = 'text/csv;charset=utf-8'): void {
  // BOM so Excel reads Arabic names correctly.
  const blob = new Blob(['﻿', text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const esc = (s: string | number) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export interface PrintLabels {
  title: string; client: string; date: string; item: string; width: string; qty: string; unit: string; total: string;
  worktop: string; handles: string; subtotal: string; discount: string; vat: string; grand: string; note: string;
}

/** Self-contained printable quote (use the browser's Save as PDF). */
export function quoteHtml(q: Quote, o: { client: string; currency: string; labels: PrintLabels; rtl: boolean; date: string }): string {
  const L = o.labels;
  const fmt = (n: number) => n.toLocaleString('en-US');
  const rows = q.lines.map(l => `<tr><td>${esc(l.name)}</td><td>${l.width}</td><td>${l.qty}</td><td>${fmt(l.unitPrice)}</td><td>${fmt(l.total)}</td></tr>`).join('');
  return `<!doctype html><html dir="${o.rtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${esc(L.title)}</title>
<style>body{font-family:system-ui,Segoe UI,Arial,sans-serif;margin:32px;color:#111}h1{font-size:22px;margin:0 0 4px}
table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}th,td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:${o.rtl ? 'right' : 'left'}}
th{background:#f3f4f6}tfoot td{font-weight:600}.total td{font-size:15px;border-top:2px solid #111}.muted{color:#666;font-size:12px}</style></head><body>
<h1>${esc(L.title)}</h1><div class="muted">${esc(L.client)}: ${esc(o.client || '-')} · ${esc(L.date)}: ${esc(o.date)}</div>
<table><thead><tr><th>${esc(L.item)}</th><th>${esc(L.width)}</th><th>${esc(L.qty)}</th><th>${esc(L.unit)} (${esc(o.currency)})</th><th>${esc(L.total)} (${esc(o.currency)})</th></tr></thead><tbody>${rows}</tbody>
<tfoot><tr><td colspan="4">${esc(L.worktop)} (${q.worktopMeters} m)</td><td>${fmt(q.worktopTotal)}</td></tr>
<tr><td colspan="4">${esc(L.handles)} (${q.handles})</td><td>${fmt(q.handlesTotal)}</td></tr>
<tr><td colspan="4">${esc(L.subtotal)}</td><td>${fmt(q.subtotal)}</td></tr>
${q.discount ? `<tr><td colspan="4">${esc(L.discount)}</td><td>-${fmt(q.discount)}</td></tr>` : ''}
${q.vat ? `<tr><td colspan="4">${esc(L.vat)}</td><td>${fmt(q.vat)}</td></tr>` : ''}
<tr class="total"><td colspan="4">${esc(L.grand)}</td><td>${fmt(q.total)} ${esc(o.currency)}</td></tr></tfoot></table>
<p class="muted">${esc(L.note)}</p></body></html>`;
}
