<script lang="ts">
  import { get } from 'svelte/store';
  import { locale } from '$lib/i18n';
  import { selectedElementIds } from '$lib/stores/project';
  import { doorFinishes, topFinishes, handleFinishes } from '$lib/utils/cabinetFinishes';
  import { applyFinish } from '$lib/utils/cabinetPlacement';

  const ar = (get(locale) as string) === 'ar';
  const dict = {
    en: { title: 'Finishes', doors: 'Doors', top: 'Worktop', handle: 'Handles', doorCtl: 'Door control', count: 'Doors per row', auto: 'Auto', openAll: 'Open doors', closeAll: 'Close doors', hint: 'Applies to the selected units, or all units if none is selected.', done: 'Applied to' },
    ar: { title: 'الخامات', doors: 'الأبواب', top: 'سطح الشغل', handle: 'المقابض', doorCtl: 'التحكم في الدرف', count: 'عدد الدرف', auto: 'تلقائي', openAll: 'افتح الدرف', closeAll: 'اقفل الدرف', hint: 'بتتطبق على الوحدات المحددة، أو على كل الوحدات لو مفيش تحديد.', done: 'اتطبقت على' },
  };
  const tr = ar ? dict.ar : dict.en;
  let open = $state(true);
  let status = $state('');

  function apply(choice: { door?: string; top?: string; handle?: string; doors?: number; open?: boolean }) {
    const n = applyFinish(choice, get(selectedElementIds));
    status = n ? `${tr.done} ${n}` : '';
  }
</script>

<div class="rounded-lg border border-gray-200 bg-white" dir={ar ? 'rtl' : 'ltr'}>
  <button class="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-700" onclick={() => (open = !open)} aria-expanded={open}>
    <span>🎨 {tr.title}</span><span>{open ? '−' : '+'}</span>
  </button>
  {#if open}
    <div class="px-3 pb-3 space-y-2 text-[11px] text-gray-500">
      <div class="font-semibold text-gray-700">{tr.doorCtl}</div>
      <div class="flex flex-wrap gap-1 items-center">
        <span>{tr.count}</span>
        {#each [0, 1, 2, 3, 4] as n}
          <button class="min-w-7 px-2 py-1 rounded-full bg-gray-100 hover:bg-blue-100" onclick={() => apply({ doors: n })}>{n === 0 ? tr.auto : n}</button>
        {/each}
      </div>
      <div class="flex gap-1">
        <button class="flex-1 px-2 py-1.5 rounded-lg bg-blue-600 text-white font-semibold" onclick={() => apply({ open: true })}>{tr.openAll}</button>
        <button class="flex-1 px-2 py-1.5 rounded-lg bg-gray-200 text-gray-700 font-semibold" onclick={() => apply({ open: false })}>{tr.closeAll}</button>
      </div>
      <div>{tr.doors}</div>
      <div class="flex flex-wrap gap-1.5">
        {#each doorFinishes as f}
          <button class="w-6 h-6 rounded-full border border-gray-300 hover:ring-2 hover:ring-blue-400" style={`background:${f.hex}`} title={ar ? f.ar : f.en} aria-label={ar ? f.ar : f.en} onclick={() => apply({ door: f.hex })}></button>
        {/each}
      </div>
      <div>{tr.top}</div>
      <div class="flex flex-wrap gap-1">
        {#each topFinishes as f}
          <button class="px-2 py-1 rounded-full bg-gray-100 hover:bg-blue-100 flex items-center gap-1" onclick={() => apply({ top: f.id })}>
            {#if f.hex}<span class="inline-block w-3 h-3 rounded-full border border-gray-300" style={`background:${f.hex}`}></span>{/if}{ar ? f.ar : f.en}
          </button>
        {/each}
      </div>
      <div>{tr.handle}</div>
      <div class="flex flex-wrap gap-1">
        {#each handleFinishes as f}
          <button class="px-2 py-1 rounded-full bg-gray-100 hover:bg-blue-100 flex items-center gap-1" onclick={() => apply({ handle: f.id })}>
            {#if f.hex}<span class="inline-block w-3 h-3 rounded-full border border-gray-300" style={`background:${f.hex}`}></span>{/if}{ar ? f.ar : f.en}
          </button>
        {/each}
      </div>
      <div class="text-gray-400">{tr.hint}</div>
      {#if status}<div class="text-green-600">{status}</div>{/if}
    </div>
  {/if}
</div>
