<script lang="ts">
  import { get } from 'svelte/store';
  import { locale } from '$lib/i18n';
  import { modalDialog } from '$lib/utils/modalDialog';
  import { canvasCamX, canvasCamY, beginUndoGroup, endUndoGroup } from '$lib/stores/project';
  import { getCatalogItem, cabinetDefaultElevation } from '$lib/utils/furnitureCatalog';
  import { type LayoutKind, type LayoutShape, type LayoutOptions } from '$lib/utils/cabinetLayout';
  import { createRoomWalls, placeLayout, previewLayout, roomChoices, type RoomChoice } from '$lib/utils/cabinetPlacement';

  let { onclose }: { onclose: () => void } = $props();

  const dict = {
    en: {
      title: 'Kitchen / dressing room wizard', kind: 'Type', kitchen: 'Kitchen', dressing: 'Dressing room',
      room: 'Room', newRoom: 'New room (enter size)', width: 'Width (cm)', depth: 'Depth (cm)',
      shape: 'Layout', I: 'Single wall', L: 'L-shape', U: 'U-shape', parallel: 'Parallel',
      wall: 'Main wall', top: 'Top', right: 'Right', bottom: 'Bottom', left: 'Left',
      island: 'Island', wallUnits: 'Wall units', needs: 'What do you need in the wardrobe?', hang: 'Hanging', drawers: 'Drawers', shelves: 'Shelves', cancel: 'Cancel', generate: 'Generate layout',
      preview: 'Preview', units: 'units',
      'room-too-small': 'The room is very small for this layout.',
      'island-skipped': 'No island: there is not enough clearance around it.',
      'run-too-short': 'One wall run is too short and was skipped.',
      note: 'Doors and windows are not avoided. Move or resize units afterwards.',
    },
    ar: {
      title: 'معالج المطبخ والدريسنج', kind: 'النوع', kitchen: 'مطبخ', dressing: 'دريسنج',
      room: 'الغرفة', newRoom: 'غرفة جديدة (أدخل المقاس)', width: 'العرض (سم)', depth: 'العمق (سم)',
      shape: 'التصميم', I: 'حيطة واحدة', L: 'شكل L', U: 'شكل U', parallel: 'متوازي',
      wall: 'الحيطة الرئيسية', top: 'فوق', right: 'يمين', bottom: 'تحت', left: 'شمال',
      island: 'جزيرة', wallUnits: 'وحدات علوية', needs: 'محتاج إيه في الدريسنج؟', hang: 'شماعات', drawers: 'أدراج', shelves: 'رفوف', cancel: 'إلغاء', generate: 'ولّد التصميم',
      preview: 'معاينة', units: 'وحدة',
      'room-too-small': 'الغرفة صغيرة جدًا للتصميم ده.',
      'island-skipped': 'مفيش جزيرة: المساحة حواليها مش كفاية.',
      'run-too-short': 'ضلع قصير جدًا وتم تخطيه.',
      note: 'الأبواب والشبابيك مش بتتراعى. عدّل أو حرّك الوحدات بعد التوليد.',
    },
  } as const;
  const tr = $derived(((get(locale) as string) === 'ar' ? dict.ar : dict.en));
  const rtl = $derived((get(locale) as string) === 'ar');

  let kind = $state<LayoutKind>('kitchen');
  let shape = $state<LayoutShape>('L');
  let roomId = $state<string>('new');
  let width = $state(400);
  let depth = $state(300);
  let startSide = $state<0 | 1 | 2 | 3>(0);
  let island = $state(false);
  let wallUnits = $state(true);
  let needHang = $state(50);
  let needDrawers = $state(25);
  let needShelves = $state(25);
  const rooms: RoomChoice[] = roomChoices();

  const chosen = $derived(rooms.find(r => r.id === roomId) ?? null);
  const W = $derived(chosen ? chosen.width : Math.max(100, Number(width) || 0));
  const D = $derived(chosen ? chosen.depth : Math.max(100, Number(depth) || 0));
  const options = $derived<LayoutOptions>({ kind, shape: kind === 'dressing' && shape === 'parallel' ? 'U' : shape, width: W, depth: D, island, wallUnits: kind === 'kitchen' && wallUnits, startSide, ...(kind === 'dressing' ? { needs: { hang: needHang, drawers: needDrawers, shelves: needShelves } } : {}) });
  const plan = $derived(previewLayout(options));

  function rects() {
    return plan.items.map(i => {
      const def = getCatalogItem(i.catalogId);
      const w = i.width ?? def?.width ?? 50, d = def?.depth ?? 50;
      return { w, d, x: i.x, y: i.y, rot: i.rotation, wall: cabinetDefaultElevation(i.catalogId) > 0, tall: (def?.height ?? 0) > 150 };
    });
  }

  function generate() {
    beginUndoGroup();
    try {
      const origin = chosen
        ? { x: chosen.x0, y: chosen.y0 }
        : createRoomWalls(W, D, { x: get(canvasCamX), y: get(canvasCamY) });
      placeLayout(plan, origin);
    } finally {
      endUndoGroup('Placed furniture');
    }
    onclose();
  }
</script>

<dialog use:modalDialog class="modal-overlay fixed inset-0 bg-black/50 z-50 flex items-center justify-center" aria-label={tr.title}
  onclick={(e) => { if (e.target === e.currentTarget) onclose(); }} oncancel={(e) => { e.preventDefault(); onclose(); }}>
  <div class="bg-white rounded-xl shadow-2xl w-[22rem] max-w-[calc(100vw-2rem)] max-h-[90vh] overflow-auto p-5" dir={rtl ? 'rtl' : 'ltr'}>
    <h3 class="text-sm font-bold text-gray-800 mb-3">{tr.title}</h3>
    <div class="space-y-3 text-xs text-gray-600">
      <div class="flex gap-2">
        {#each ['kitchen', 'dressing'] as k}
          <button class="flex-1 py-1.5 rounded-lg font-semibold {kind === k ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}" onclick={() => (kind = k as LayoutKind)}>{tr[k as 'kitchen' | 'dressing']}</button>
        {/each}
      </div>
      <label class="block">{tr.room}
        <select bind:value={roomId} class="w-full mt-1 px-2 py-1.5 border border-gray-200 rounded-lg">
          <option value="new">{tr.newRoom}</option>
          {#each rooms as r}<option value={r.id}>{r.name} ({r.width}×{r.depth})</option>{/each}
        </select>
      </label>
      {#if !chosen}
        <div class="grid grid-cols-2 gap-2">
          <label>{tr.width}<input type="number" min="150" step="10" bind:value={width} class="w-full mt-1 px-2 py-1.5 border border-gray-200 rounded-lg" /></label>
          <label>{tr.depth}<input type="number" min="150" step="10" bind:value={depth} class="w-full mt-1 px-2 py-1.5 border border-gray-200 rounded-lg" /></label>
        </div>
      {/if}
      <div>
        <div class="mb-1">{tr.shape}</div>
        <div class="grid grid-cols-4 gap-1">
          {#each (kind === 'kitchen' ? ['I', 'L', 'U', 'parallel'] : ['I', 'L', 'U']) as s}
            <button class="py-1.5 rounded-lg font-medium {shape === s ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}" onclick={() => (shape = s as LayoutShape)}>{tr[s as 'I' | 'L' | 'U' | 'parallel']}</button>
          {/each}
        </div>
      </div>
      <label class="block">{tr.wall}
        <select bind:value={startSide} class="w-full mt-1 px-2 py-1.5 border border-gray-200 rounded-lg">
          {#each [[0, 'top'], [1, 'right'], [2, 'bottom'], [3, 'left']] as [v, key]}<option value={v}>{tr[key as 'top' | 'right' | 'bottom' | 'left']}</option>{/each}
        </select>
      </label>
      <div class="flex gap-4">
        <label class="flex items-center gap-1.5"><input type="checkbox" bind:checked={island} class="accent-blue-500" />{tr.island}</label>
        {#if kind === 'kitchen'}<label class="flex items-center gap-1.5"><input type="checkbox" bind:checked={wallUnits} class="accent-blue-500" />{tr.wallUnits}</label>{/if}
      </div>

      {#if kind === 'dressing'}
        <div class="space-y-1">
          <div class="text-gray-500">{tr.needs}</div>
          {#each [['hang', tr.hang], ['drawers', tr.drawers], ['shelves', tr.shelves]] as [key, label]}
            <label class="flex items-center gap-2">
              <span class="w-16">{label}</span>
              {#if key === 'hang'}<input type="range" min="0" max="100" bind:value={needHang} class="flex-1 accent-amber-500" />
              {:else if key === 'drawers'}<input type="range" min="0" max="100" bind:value={needDrawers} class="flex-1 accent-amber-500" />
              {:else}<input type="range" min="0" max="100" bind:value={needShelves} class="flex-1 accent-amber-500" />{/if}
            </label>
          {/each}
        </div>
      {/if}

      <div>
        <div class="mb-1 text-gray-500">{tr.preview} · {plan.items.length} {tr.units}</div>
        <svg viewBox={`-20 -20 ${W + 40} ${D + 40}`} class="w-full bg-gray-50 border border-gray-200 rounded-lg" style="max-height: 14rem" role="img" aria-label={tr.preview}>
          <rect x="0" y="0" width={W} height={D} fill="#fff" stroke="#374151" stroke-width="6" />
          {#each rects() as r}
            <g transform={`translate(${r.x} ${r.y}) rotate(${r.rot})`}>
              <rect x={-r.w / 2} y={-r.d / 2} width={r.w} height={r.d}
                fill={r.wall ? 'none' : r.tall ? '#a89878' : '#d6c7b0'} stroke={r.wall ? '#9ca3af' : '#6b5d45'}
                stroke-width="2" stroke-dasharray={r.wall ? '6 4' : 'none'} />
              <line x1={-r.w / 2} y1={r.d / 2} x2={r.w / 2} y2={r.d / 2} stroke="#3b82f6" stroke-width="3" />
            </g>
          {/each}
        </svg>
      </div>
      {#each plan.notes as n}<div class="text-amber-600">{tr[n as keyof typeof tr] ?? n}</div>{/each}
      <div class="text-gray-400">{tr.note}</div>
    </div>
    <div class="flex gap-2 mt-4">
      <button class="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm" onclick={onclose}>{tr.cancel}</button>
      <button class="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold" onclick={generate}>{tr.generate}</button>
    </div>
  </div>
</dialog>
