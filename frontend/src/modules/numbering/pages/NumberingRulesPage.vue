<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconLeft, IconRight } from '@arco-design/web-vue/es/icon';
import { numberingRules } from '../data/rules';

const { t } = useI18n();
const page = ref(1);
const pageSize = ref(10);
const jumpPage = ref(1);
const totalPages = computed(() => Math.max(1, Math.ceil(numberingRules.length / pageSize.value)));
function setPage(value: number) {
  page.value = Math.max(1, Math.min(totalPages.value, Math.trunc(value || 1)));
  jumpPage.value = page.value;
}
function changeSize(value: string | number | boolean | Record<string, any>) {
  pageSize.value = Number(value);
  setPage(1);
}
const visibleRows = computed(() => rows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
const columns = computed(() => [
  { title: t('numbering.location'), slotName: 'location', width: 300 },
  { title: t('numbering.fixed'), dataIndex: 'fixedCharacters', width: 150 },
  { title: t('numbering.variable'), dataIndex: 'variableCharacters', width: 180 },
  { title: t('numbering.year'), dataIndex: 'fixedYear', width: 130 },
  { title: t('numbering.digits'), dataIndex: 'sequenceDigits', width: 150 },
  { title: t('numbering.preview'), dataIndex: 'previewExample', width: 240 },
]);
const rows = computed(() => numberingRules.map(rule => ({
  ...rule,
  fixedCharacters: rule.fixedCharacters ?? '—',
  variableCharacters: rule.variableCharacters ?? '—',
  fixedYear: rule.fixedYear ?? '—',
})));
</script>

<template>
  <section class="numbering-rules" :aria-label="t('nav.settings.numbering')">
    <div class="table-region"><a-table :columns="columns" :data="visibleRows" row-key="id" :pagination="false"
      :bordered="false" :scroll="{ x: 1150 }">
      <template #location="{ record }">
        {{ record.locationKeys.map((key: string) => t(key)).join(' - ') }}
      </template>
      <template #empty>
        <a-empty :description="t('numbering.empty')">
          <div class="empty-help">{{ t('numbering.emptyHelp') }}</div>
        </a-empty>
      </template>
    </a-table></div>
      <nav class="numbering-pagination app-pagination" :aria-label="t('audit.table.navigation')">
        <span class="pagination-total">{{ t('audit.pagination.total', { count: rows.length }) }}</span>
        <div class="pagination-pages">
          <a-select class="app-page-size" :model-value="pageSize" :aria-label="t('audit.table.pageSize')" @update:model-value="changeSize">
            <a-option v-for="size in [10, 20, 50, 100, 200]" :key="size" :value="size">{{ t('audit.pagination.perPage', { count: size }) }}</a-option>
          </a-select>
          <button class="pagination-arrow" type="button" :disabled="page === 1" :aria-label="t('audit.pagination.previous')" @click="setPage(page - 1)"><IconLeft /></button>
          <button
            v-for="number in totalPages"
            :key="number"
            class="pagination-number"
            :class="{ active: page === number }"
            type="button"
            :aria-current="page === number ? 'page' : undefined"
            @click="setPage(number)"
          >{{ number }}</button>
          <button class="pagination-arrow" type="button" :disabled="page === totalPages" :aria-label="t('audit.pagination.next')" @click="setPage(page + 1)"><IconRight /></button>
        </div>
        <span class="pagination-jump-label">{{ t('audit.pagination.jumpTo') }}</span>
        <a-input-number v-model="jumpPage" class="app-page-jump" :aria-label="t('audit.pagination.jumpTo')" :min="1" :max="totalPages" hide-button @press-enter="setPage(jumpPage)" />
        <span class="pagination-total-pages">{{ t('audit.pagination.totalPages', { count: totalPages }) }}</span>
      </nav>
  </section>
</template>

<style scoped>
.numbering-rules { box-sizing: border-box; height: calc(100dvh - 88px); display: flex; flex-direction: column; padding: 16px; background: var(--app-surface); min-width: 0; }
.table-region { flex: 0 1 auto; min-height: 0; overflow: auto; }
.numbering-pagination { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 8px; padding-top: 16px; flex-shrink: 0; }
.pagination-total { margin-right: 8px; }
.pagination-pages { display: flex; align-items: center; gap: 8px; margin-right: 8px; }
@media (max-width: 900px) { .numbering-rules { height: auto; min-height: 500px; margin-bottom: 16px; } }
.empty-help { color: var(--color-text-3); }
.rule-count { padding-top: 16px; color: var(--color-text-2); }
.numbering-rules :deep(.arco-empty) { padding: 64px 0; }
</style>
