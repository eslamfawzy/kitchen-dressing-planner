<script lang="ts">
  import { get } from 'svelte/store';
  import { locale } from '$lib/i18n';
  import { modalDialog } from '$lib/utils/modalDialog';
  import { activeFloor } from '$lib/stores/project';
  import { computeQuote, loadPriceBook, savePriceBook, defaultPriceBook, allCabinetKinds, unitLabel, type PriceBook } from '$lib/utils/cabinetQuote';
  import { computeBom } from '$lib/utils/cabinetBom';
  import { downloadText, toCsv, quoteRows, cuttingRows, quoteHtml } from '$lib/utils/quoteExport';
  import { topFinishes, handleFinishes } from '$lib/utils/cabinetFinishes';

  let { onclose }: { onclose: () => void } = $props();

  const ar = (get(locale) as string) === 'ar';
  const dict = {
    en: {
      title: 'Quote & cutting list', quote: 'Quote', cutting: 'Cutting list', prices: 'Prices', client: 'Client name',
      discount: 'Discount %', vat: 'VAT %', item: 'Item', width: 'Width', qty: 'Qty', unit: 'Unit', total: 'Total',
      worktop: 'Worktop', handles: 'Handles', subtotal: 'Subtotal', discountL: 'Discount', vatL: 'VAT', grand: 'Total',
      csvQuote: 'Quote CSV', csvCut: 'Cutting CSV', print: 'Print / PDF', empty: 'No kitchen or dressing units in this floor yet.',
      part: 'Part', material: 'Material', length: 'Length mm', widthMm: 'Width mm', hardware: 'Hardware', sheets: 'Sheets 2440×1220 (+15%)',
      area: 'Board area m²', save: 'Save prices', reset: 'Reset', perM: 'per metre', perPiece: 'per piece', tops: 'Worktops (per metre)', handlesL: 'Handles (per piece)',
      units: 'Units', note: 'Prices are estimates from your price list. Doors and windows are not deducted.', saved: 'Saved',
      date: 'Date', close: 'Close',
    },
    ar: {
      title: 'عرض السعر وقائمة القطع', quote: 'عرض السعر', cutting: 'قائمة القطع', prices: 'الأسعار', client: 'اسم العميل',
      discount: 'خصم %', vat: 'ضريبة %', item: 'البند', width: 'العرض', qty: 'الكمية', unit: 'سعر الوحدة', total: 'الإجمالي',
      worktop: 'سطح الشغل', handles: 'المقابض', subtotal: 'المجموع', discountL: 'الخصم', vatL: 'الضريبة', grand: 'الإجمالي النهائي',
      csvQuote: 'عرض السعر CSV', csvCut: 'قائمة القطع CSV', print: 'طباعة / PDF', empty: 'مفيش وحدات مطبخ أو دريسنج في الدور ده لسه.',
      part: 'القطعة', material: 'الخامة', length: 'الطول مم', widthMm: 'العرض مم', hardware: 'الاكسسوار', sheets: 'ألواح 2440×1220 (+15%)',
      area: 'مساحة الخشب م²', save: 'حفظ الأسعار', reset: 'استرجاع', perM: 'للمتر', perPiece: 'للقطعة', tops: 'أسطح الشغل (للمتر)', handlesL: 'المقابض (للقطعة)',
      units: 'الوحدات', note: 'الأسعار تقديرية حسب قائمة أسعارك. الأبواب والشبابيك غير مخصومة.', saved: 'تم الحفظ',
      date: 'التاريخ', close: 'إغلاق',
    },
  };
  const tr = ar ? dict.ar : dict.en;
  const lang = ar ? 'ar' : 'en';

  const items = get(activeFloor)?.furniture ?? [];
  let tab = $state<'quote' | 'cutting' | 'prices'>('quote');
  let client = $state('');
  let discountPct = $state(0);
  let vatPct = $state(0);
  let book = $state<PriceBook>(loadPriceBook());
  let savedMsg = $state(false);

  const quote = $derived(computeQuote(items, book, { discountPct: Number(discountPct) || 0, vatPct: Number(vatPct) || 0, lang }));
  const bom = $derived(computeBom(items));
  const fmt = (n: number) => n.toLocaleString('en-US');
  const today = new Date().toISOString().slice(0, 10);

  function savePrices() { savePriceBook($state.snapshot(book) as PriceBook); savedMsg = true; setTimeout(() => (savedMsg = false), 1500); }
  function resetPrices() { book = structuredClone(defaultPriceBook); }
  function csvQuote() { downloadText('quote.csv', toCsv(quoteRows(computeQuote(items, book, { discountPct: Number(discountPct) || 0, vatPct: Number(vatPct) || 0, lang: 'en' }), book.currency))); }
  function csvCut() { downloadText('cutting-list.csv', toCsv(cuttingRows(bom))); }
  function print() {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(quoteHtml(quote, {
      client, currency: book.currency, rtl: ar, date: today,
      labels: { title: tr.title, client: tr.client, date: tr.date, item: tr.item, width: tr.width, qty: tr.qty, unit: tr.unit, total: tr.total, worktop: tr.worktop, handles: tr.handles, subtotal: tr.subtotal, discount: tr.discountL, vat: tr.vatL, grand: tr.grand, note: tr.note },
    }));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }
  const kindSample: Record<string, string> = {};
  for (const k of allCabinetKinds) kindSample[k] = k;
</script>

<dialog use:modalDialog class="modal-overlay fixed inset-0 bg-black/50 z-50 flex items-center justify-center" aria-label={tr.title}
  onclick={(e) => { if (e.target === e.currentTarget) onclose(); }} oncancel={(e) => { e.preventDefault(); onclose(); }}>
  <div class="bg-white rounded-xl shadow-2xl w-[44rem] max-w-[calc(100vw-2rem)] max-h-[90vh] flex flex-col" dir={ar ? 'rtl' : 'ltr'}>
    <div class="flex items-center justify-between px-5 pt-4">
      <h3 class="text-sm font-bold text-gray-800">{tr.title}</h3>
      <button class="text-gray-400 hover:text-gray-700 text-lg leading-none" onclick={onclose} aria-label={tr.close}>×</button>
    </div>
    <div class="flex gap-1 px-5 pt-3 text-xs">
      {#each [['quote', tr.quote], ['cutting', tr.cutting], ['prices', tr.prices]] as [id, label]}
        <button class="px-3 py-1.5 rounded-lg font-semibold {tab === id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}" onclick={() => (tab = id as typeof tab)}>{label}</button>
      {/each}
    </div>

    <div class="overflow-auto px-5 py-3 text-xs text-gray-700 flex-1">
      {#if quote.unitCount === 0 && tab !== 'prices'}
        <div class="py-10 text-center text-gray-400">{tr.empty}</div>
      {:else if tab === 'quote'}
        <div class="grid grid-cols-3 gap-2 mb-3">
          <label class="col-span-3 sm:col-span-1">{tr.client}<input class="w-full mt-1 px-2 py-1.5 border border-gray-200 rounded-lg" bind:value={client} /></label>
          <label>{tr.discount}<input type="number" min="0" max="100" class="w-full mt-1 px-2 py-1.5 border border-gray-200 rounded-lg" bind:value={discountPct} /></label>
          <label>{tr.vat}<input type="number" min="0" max="100" class="w-full mt-1 px-2 py-1.5 border border-gray-200 rounded-lg" bind:value={vatPct} /></label>
        </div>
        <table class="w-full">
          <thead><tr class="text-gray-500 border-b"><th class="text-start py-1">{tr.item}</th><th class="text-start">{tr.width}</th><th class="text-start">{tr.qty}</th><th class="text-end">{tr.unit}</th><th class="text-end">{tr.total}</th></tr></thead>
          <tbody>
            {#each quote.lines as l (l.key)}
              <tr class="border-b border-gray-100"><td class="py-1">{l.name}{#if l.custom} <span class="text-amber-600">*</span>{/if}</td><td>{l.width}</td><td>{l.qty}</td><td class="text-end">{fmt(l.unitPrice)}</td><td class="text-end">{fmt(l.total)}</td></tr>
            {/each}
            <tr class="border-b border-gray-100"><td class="py-1" colspan="4">{tr.worktop} ({quote.worktopMeters} m)</td><td class="text-end">{fmt(quote.worktopTotal)}</td></tr>
            <tr class="border-b border-gray-100"><td class="py-1" colspan="4">{tr.handles} ({quote.handles})</td><td class="text-end">{fmt(quote.handlesTotal)}</td></tr>
            <tr><td class="py-1 font-semibold" colspan="4">{tr.subtotal}</td><td class="text-end font-semibold">{fmt(quote.subtotal)}</td></tr>
            {#if quote.discount}<tr><td class="py-1" colspan="4">{tr.discountL}</td><td class="text-end">-{fmt(quote.discount)}</td></tr>{/if}
            {#if quote.vat}<tr><td class="py-1" colspan="4">{tr.vatL}</td><td class="text-end">{fmt(quote.vat)}</td></tr>{/if}
            <tr class="text-sm"><td class="py-2 font-bold" colspan="4">{tr.grand}</td><td class="text-end font-bold">{fmt(quote.total)} {book.currency}</td></tr>
          </tbody>
        </table>
        <div class="mt-2 text-gray-400">{tr.note}</div>
      {:else if tab === 'cutting'}
        <table class="w-full">
          <thead><tr class="text-gray-500 border-b"><th class="text-start py-1">{tr.part}</th><th class="text-start">{tr.material}</th><th class="text-end">{tr.length}</th><th class="text-end">{tr.widthMm}</th><th class="text-end">{tr.qty}</th></tr></thead>
          <tbody>
            {#each bom.parts as p}
              <tr class="border-b border-gray-100"><td class="py-1">{p.part}</td><td>{p.material}</td><td class="text-end">{p.length}</td><td class="text-end">{p.width}</td><td class="text-end">{p.qty}</td></tr>
            {/each}
          </tbody>
        </table>
        <div class="mt-3 grid grid-cols-2 gap-x-6 gap-y-1">
          <div class="font-semibold col-span-2">{tr.hardware}</div>
          {#each bom.hardware as h}<div>{h.item}</div><div class="text-end">{h.qty}</div>{/each}
          {#each bom.readymade as r}<div>{r.item}</div><div class="text-end">{r.qty}</div>{/each}
          <div class="font-semibold pt-2">{tr.area}</div><div class="text-end pt-2">{bom.area['18mm board'] ?? 0}</div>
          <div class="font-semibold">{tr.sheets}</div><div class="text-end">{bom.sheets18}</div>
        </div>
      {:else}
        <div class="font-semibold mb-1">{tr.units}</div>
        <div class="grid grid-cols-2 gap-x-6 gap-y-1.5">
          {#each allCabinetKinds as k}
            <label class="flex items-center justify-between gap-2">
              <span>{unitLabel(k === 'base' ? 'kit_base_60' : (['drawers','sink','hob','wall'].includes(k) ? `kit_${k}_${k === 'wall' ? 60 : 80}` : k), lang).replace(/\s+\d+$/, '') || k} <span class="text-gray-400">({book.kinds[k].mode === 'm' ? tr.perM : tr.perPiece})</span></span>
              <input type="number" min="0" class="w-24 px-2 py-1 border border-gray-200 rounded" bind:value={book.kinds[k].price} />
            </label>
          {/each}
        </div>
        <div class="font-semibold mt-3 mb-1">{tr.tops}</div>
        <div class="grid grid-cols-2 gap-x-6 gap-y-1.5">
          {#each topFinishes as t}
            <label class="flex items-center justify-between gap-2"><span>{ar ? t.ar : t.en}</span><input type="number" min="0" class="w-24 px-2 py-1 border border-gray-200 rounded" bind:value={book.tops[t.id]} /></label>
          {/each}
        </div>
        <div class="font-semibold mt-3 mb-1">{tr.handlesL}</div>
        <div class="grid grid-cols-2 gap-x-6 gap-y-1.5">
          {#each handleFinishes as h}
            <label class="flex items-center justify-between gap-2"><span>{ar ? h.ar : h.en}</span><input type="number" min="0" class="w-24 px-2 py-1 border border-gray-200 rounded" bind:value={book.handles[h.id]} /></label>
          {/each}
        </div>
        <div class="flex gap-2 mt-4">
          <button class="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold" onclick={savePrices}>{tr.save}</button>
          <button class="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200" onclick={resetPrices}>{tr.reset}</button>
          {#if savedMsg}<span class="text-green-600 self-center">{tr.saved}</span>{/if}
        </div>
      {/if}
    </div>

    {#if tab !== 'prices' && quote.unitCount > 0}
      <div class="flex gap-2 px-5 pb-4 pt-2 border-t border-gray-100">
        <button class="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs" onclick={csvQuote}>{tr.csvQuote}</button>
        <button class="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs" onclick={csvCut}>{tr.csvCut}</button>
        <button class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold" onclick={print}>{tr.print}</button>
      </div>
    {/if}
  </div>
</dialog>
