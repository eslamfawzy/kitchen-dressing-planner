<script lang="ts">
  import { get } from 'svelte/store';
  import { locale } from '$lib/i18n';
  import { activeFloor, selectedElementIds } from '$lib/stores/project';
  import { checkDesign } from '$lib/utils/cabinetRules';

  const ar = (get(locale) as string) === 'ar';
  const tr = ar
    ? { title: 'فحص المصمم', ok: 'التصميم سليم ✓', empty: 'ضيف وحدات الأول' }
    : { title: 'Designer check', ok: 'Layout looks good ✓', empty: 'Add some units first' };
  const items = $derived($activeFloor?.furniture ?? []);
  const issues = $derived(checkDesign(items));
  const hasUnits = $derived(items.some(i => /^(kit|dr)_/.test(i.catalogId)));
  const icon = { error: '⛔', warn: '⚠️', info: 'ℹ️' } as const;
  const warnings = $derived(issues.filter(i => i.severity !== 'info'));
</script>

<div class="rounded-lg border border-gray-200 bg-white p-3 text-[11px] space-y-1.5" dir={ar ? 'rtl' : 'ltr'}>
  <div class="text-xs font-semibold text-gray-700">🧭 {tr.title}</div>
  {#if !hasUnits}
    <div class="text-gray-400">{tr.empty}</div>
  {:else}
    {#if warnings.length === 0}<div class="text-green-600">{tr.ok}</div>{/if}
    {#each issues as issue}
      <button class="w-full text-start flex gap-1.5 {issue.severity === 'error' ? 'text-red-600' : issue.severity === 'warn' ? 'text-amber-700' : 'text-gray-500'} hover:underline"
        onclick={() => selectedElementIds.set(new Set(issue.ids))}>
        <span>{icon[issue.severity]}</span><span>{ar ? issue.ar : issue.en}</span>
      </button>
    {/each}
  {/if}
</div>
