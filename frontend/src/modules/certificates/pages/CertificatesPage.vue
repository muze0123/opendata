<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { Message, type TableColumnData } from '@arco-design/web-vue';
import { IconSearch, IconRefresh, IconFilter, IconSettings, IconDownload } from '@arco-design/web-vue/es/icon';
import ExcelJS from 'exceljs';
import AppFieldLabel from '../../../design/components/AppFieldLabel.vue';
import AppPagination from '../../../design/components/AppPagination.vue';
import AppStatusTag from '../../../design/components/AppStatusTag.vue';
import ConfirmDialog from '../../../shared/components/ConfirmDialog.vue';
import ColumnSettingsPopover, { type ColumnSettingsItem } from '../../../shared/components/ColumnSettingsPopover.vue';
import { useTaskCenterStore } from '../../task-center/stores/taskCenter';
import { statusRole } from '../../../shared/status';
import { libraryRecords, libraryProjects, LIBRARY_STATUSES, type LibraryRecord } from '../data/library';

const { t, locale } = useI18n();
const router = useRouter();
const base = '/data/certificates';
const label = (key: string) => t(`certificateLibrary.${key}`);
const statusLabel = (code: string) => t(`certificateLibrary.statuses.${code}`);

const emptyFilters = () => ({ number: '', name: '', project: '', taskName: '', regulation: '', regulationName: '', issuer: '', agency: '', issued: '', expires: '', status: '' });
const filters = ref(emptyFilters());
const applied = ref({ ...filters.value });
const page = ref(1);
const pageSize = ref(10);
const keys = ['number', 'name', 'project', 'taskName', 'regulation', 'regulationName', 'issuer', 'agency', 'issued', 'expires', 'status'] as const;
type FieldKey = typeof keys[number];

function listLabel(key: string) {
  return label(key === 'project' ? 'relatedTask' : key === 'status' ? 'certificateStatus' : key);
}
const widths: Record<FieldKey, number> = { number: 200, name: 200, project: 180, taskName: 220, regulation: 180, regulationName: 220, issuer: 180, agency: 180, issued: 160, expires: 160, status: 140 };

const filterDefaults = keys.map((key, index) => ({ key, visible: true, disabled: index === 0 }));
const filterSettings = ref(filterDefaults.map(item => ({ ...item })));
const filterOpen = ref(false);
const visibleFilters = computed(() => filterSettings.value.filter(item => item.visible).map(item => item.key));
const filterItems = computed<ColumnSettingsItem[]>(() => filterSettings.value.map(item => ({ ...item, label: listLabel(item.key) })));
const defaultFilterItems = computed<ColumnSettingsItem[]>(() => filterDefaults.map(item => ({ ...item, label: listLabel(item.key) })));
function changeFilters(items: ColumnSettingsItem[]) {
  filterSettings.value = items.map(item => ({ key: item.key as FieldKey, visible: item.visible, disabled: item.key === keys[0] }));
  for (const key of keys) if (!visibleFilters.value.includes(key)) { filters.value[key] = ''; applied.value[key] = ''; }
  page.value = 1;
}

const columnDefaults = keys.map((key, index) => ({ key, visible: true, disabled: index === 0 }));
const columnSettings = ref(columnDefaults.map(item => ({ ...item })));
const columnsOpen = ref(false);
const visibleFields = computed(() => columnSettings.value.filter(item => item.visible).map(item => item.key));
const columnItems = computed<ColumnSettingsItem[]>(() => columnSettings.value.map(item => ({ ...item, label: listLabel(item.key) })));
const defaultColumnItems = computed<ColumnSettingsItem[]>(() => columnDefaults.map(item => ({ ...item, label: listLabel(item.key) })));
const sortField = ref<FieldKey | ''>('');
const sortDirection = ref<'' | 'ascend' | 'descend'>('');
function changeColumns(items: ColumnSettingsItem[]) {
  columnSettings.value = items.map(item => ({ key: item.key as FieldKey, visible: item.visible, disabled: item.key === keys[0] }));
  if (sortField.value && !visibleFields.value.includes(sortField.value)) { sortField.value = ''; sortDirection.value = ''; }
  page.value = 1;
}

function cellText(row: LibraryRecord, key: FieldKey): string {
  if (key === 'status') return statusLabel(row.status);
  if (key === 'taskName') return libraryProjects.find(project => project.id === row.project)?.name || '';
  if (key === 'name') return row.entries.map(entry => entry.name || row.name).filter(Boolean).join('、');
  if (key === 'project') return row.project;
  return row.entries.map(entry => entry[key as 'number' | 'regulation' | 'regulationName' | 'issuer' | 'agency' | 'issued' | 'expires']).filter(Boolean).join('、');
}
const collator = computed(() => new Intl.Collator(locale.value, { numeric: true, sensitivity: 'base' }));
function compareRows(a: LibraryRecord, b: LibraryRecord, key: FieldKey, direction: 'ascend' | 'descend') {
  const x = cellText(a, key);
  const y = cellText(b, key);
  if (!x && y) return 1;
  if (x && !y) return -1;
  const result = collator.value.compare(x, y);
  return direction === 'descend' ? -result : result;
}
function handleSort(key: unknown, direction: unknown) {
  if (typeof key !== 'string' || !keys.includes(key as FieldKey)) return;
  sortField.value = direction === 'ascend' || direction === 'descend' ? key as FieldKey : '';
  sortDirection.value = direction === 'ascend' || direction === 'descend' ? direction : '';
  page.value = 1;
}

const results = computed(() => {
  const list = libraryRecords.value.filter(row => keys.every(key => {
    const value = applied.value[key];
    if (!value) return true;
    if (key === 'status' || key === 'project') return row[key] === value;
    if (key === 'issued' || key === 'expires') return row.entries.some(entry => entry[key] === value);
    return cellText(row, key).toLocaleLowerCase().includes(value.trim().toLocaleLowerCase());
  }));
  return sortField.value && sortDirection.value ? [...list].sort((a, b) => compareRows(a, b, sortField.value as FieldKey, sortDirection.value as 'ascend' | 'descend')) : list;
});
const visible = computed(() => results.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
function search() { applied.value = { ...filters.value }; page.value = 1; }
function reset() { filters.value = emptyFilters(); search(); }
const horizontalWidth = computed(() => visibleFields.value.reduce((sum, key) => sum + widths[key], 200));
const columns = computed<TableColumnData[]>(() => [
  ...visibleFields.value.map((key): TableColumnData => ({
    title: listLabel(key), dataIndex: key, slotName: 'field', width: widths[key], fixed: key === 'number' ? 'left' : undefined,
    sortable: { sortDirections: ['ascend', 'descend'], sortOrder: sortField.value === key ? sortDirection.value : '', sorter: (a, b, extra) => compareRows(a as unknown as LibraryRecord, b as unknown as LibraryRecord, key, extra.direction) },
  })),
  { title: label('actions'), dataIndex: 'actions', slotName: 'actions', width: 110, fixed: 'right' },
]);
function openDetail(row: LibraryRecord) { void router.push(`${base}/${row.id}`); }

/* ---------------------------------------- 导出（DESIGN.md · Batch export baseline：确认弹窗 → 导入导出-导出数据） */
const taskCenter = useTaskCenterStore();
const exportOpen = ref(false);
const exporting = ref(false);
function requestExport() {
  if (!results.value.length) { Message.info(label('exportEmpty')); return; }
  exportOpen.value = true;
}
async function exportData() {
  if (exporting.value) return;
  exporting.value = true;
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Certificates');
    sheet.addRow(keys.map(key => listLabel(key)));
    results.value.forEach(row => sheet.addRow(keys.map(key => cellText(row, key))));
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const time = new Date().toLocaleString('sv-SE');
    taskCenter.addDownloadTask({ id: crypto.randomUUID(), module: 'certificate', fileStamp: time.replace(/\D/g, ''), operator: '—', time, status: 'success', fileUrl: URL.createObjectURL(blob), fileName: `证书_${time.slice(0, 10)}.xlsx` });
    exportOpen.value = false;
    Message.success(label('exportSuccess'));
    taskCenter.open('download');
  } catch { Message.error(label('transferError')); }
  finally { exporting.value = false; }
}
</script>

<template>
  <main class="library-page">
    <form class="filters app-filter-strip" @submit.prevent="search">
      <div v-for="key in visibleFilters" :key="key" class="app-filter-unit">
        <AppFieldLabel :text="listLabel(key)" :for="`certificate-filter-${key}`" as="label" context="filter" />
        <a-select v-if="key === 'project'" v-model="filters.project" class="app-filter-control" allow-clear :aria-label="listLabel(key)" :placeholder="label('all')">
          <a-option v-for="project in libraryProjects" :key="project.id" :value="project.id">{{ project.id }}</a-option>
        </a-select>
        <a-select v-else-if="key === 'status'" v-model="filters.status" class="app-filter-control" allow-clear :aria-label="listLabel(key)" :placeholder="label('all')">
          <a-option v-for="status in LIBRARY_STATUSES" :key="status" :value="status">{{ statusLabel(status) }}</a-option>
        </a-select>
        <a-date-picker v-else-if="key === 'issued' || key === 'expires'" :id="`certificate-filter-${key}`" v-model="filters[key]" class="app-filter-control" allow-clear :aria-label="listLabel(key)" :placeholder="label('selectDate')" />
        <a-input v-else v-model="filters[key]" class="app-filter-control" allow-clear :placeholder="t('certificateLibrary.enterField', { field: listLabel(key) })" :input-attrs="{ id: `certificate-filter-${key}`, 'aria-label': listLabel(key) }" />
      </div>
      <div class="app-filter-actions">
        <a-button type="primary" html-type="submit"><template #icon><IconSearch /></template>{{ label('search') }}</a-button>
        <a-button class="app-btn-neutral" @click="reset"><template #icon><IconRefresh /></template>{{ label('reset') }}</a-button>
        <ColumnSettingsPopover v-model:visible="filterOpen" :items="filterItems" :default-items="defaultFilterItems" :title="label('filterSettings')" :list-aria-label="label('filterSettings')" :show-label="label('show')" :restore-label="label('restore')" @change="changeFilters">
          <a-tooltip :content="label('filterSettings')"><a-button class="app-btn-neutral settings-trigger" :aria-label="label('filterSettings')" :title="label('filterSettings')"><IconFilter /></a-button></a-tooltip>
        </ColumnSettingsPopover>
      </div>
    </form>

    <section class="list-region" :aria-label="label('list')">
      <div class="list-toolbar">
        <a-button class="app-btn-neutral" @click="requestExport"><template #icon><IconDownload /></template>{{ label('export') }}</a-button>
        <div class="toolbar-actions toolbar-settings">
          <ColumnSettingsPopover v-model:visible="columnsOpen" :items="columnItems" :default-items="defaultColumnItems" :title="label('columnSettings')" :list-aria-label="label('columnSettings')" :show-label="label('show')" :restore-label="label('restore')" @change="changeColumns">
            <a-tooltip :content="label('columnSettings')"><a-button class="app-btn-neutral settings-trigger" :aria-label="label('columnSettings')" :title="label('columnSettings')"><IconSettings /></a-button></a-tooltip>
          </ColumnSettingsPopover>
        </div>
      </div>
      <a-table :columns="columns" :data="visible" row-key="id" :pagination="false" :bordered="false" :stripe="false" :scroll="{ x: horizontalWidth }" @sorter-change="handleSort">
        <template #field="{ record, column }">
          <button v-if="column.dataIndex === 'number'" type="button" class="identity-link" @click="openDetail(record)">{{ cellText(record, 'number') }}</button>
          <AppStatusTag v-else-if="column.dataIndex === 'status'" :label="statusLabel(record.status)" :role="statusRole(record.status, 'certificates')" />
          <span v-else>{{ cellText(record, column.dataIndex as FieldKey) || '—' }}</span>
        </template>
        <template #actions="{ record }"><div class="row-actions">
          <button type="button" class="row-action" @click="openDetail(record)">{{ label('detail') }}</button>
        </div></template>
        <template #empty><a-empty :description="label(libraryRecords.length ? 'noMatch' : 'empty')" /></template>
      </a-table>
      <AppPagination v-model:current="page" v-model:page-size="pageSize" :total="results.length" />
    </section>

    <ConfirmDialog v-model:visible="exportOpen" icon="info" :title="label('exportTitle')" :description="[label('exportScope'), label('exportDestination')]" :ok-text="label('exportConfirm')" :ok-loading="exporting" :dismissible="!exporting" @confirm="exportData" />
  </main>
</template>

<style scoped>
.library-page { display: grid; grid-template-rows: auto minmax(0, 1fr); gap: var(--mt-ds-space-3); min-width: 0; }
.filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--mt-ds-space-4); min-width: 0; padding: var(--mt-ds-space-4); background: var(--app-surface); border-radius: var(--mt-ds-control-radius); }
.app-filter-unit { display: grid; grid-template-columns: minmax(0, 200px); align-items: start; justify-items: start; gap: 4px; min-width: 0; white-space: nowrap; }
.app-filter-unit :deep(.mt-field-label) { color: var(--mt-ds-text-secondary); font-size: 12px; font-weight: 400; line-height: 20px; text-align: left; }
.app-filter-unit :deep(.app-filter-control) { width: 200px; max-width: 100%; }
.app-filter-actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--mt-ds-space-4); min-width: 0; }
.list-region { min-width: 0; padding: var(--mt-ds-space-4); background: var(--app-surface); border-radius: var(--mt-ds-control-radius); }
.list-toolbar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--mt-ds-space-3); margin-bottom: var(--mt-ds-space-4); }
.toolbar-actions { display: flex; align-items: center; flex-wrap: wrap; gap: var(--mt-ds-space-2); min-width: 0; }
.toolbar-settings { margin-left: auto; }
.settings-trigger { display: inline-grid; width: 32px; height: 32px; padding: 0; place-items: center; }
.row-actions { display: flex; align-items: center; gap: var(--mt-ds-space-3); white-space: nowrap; }
.row-action, .identity-link { padding: 0; border: 0; background: transparent; color: var(--app-color-primary); font: inherit; font-weight: var(--mt-ds-weight-body); cursor: pointer; }
.row-action:hover { text-decoration: underline; }
.identity-link { color: var(--color-text-1); }
.identity-link:hover, .identity-link:focus-visible { color: var(--app-color-primary); }
.row-action:focus-visible, .identity-link:focus-visible { outline: 2px solid var(--app-accent); outline-offset: 2px; }
.list-region :deep(.arco-table), .list-region :deep(.arco-table-container) { border: 0; }
.list-region :deep(.arco-table-cell) { padding: 0; }
.list-region :deep(.arco-table-th) { height: 50px; padding: 0 12px; border-bottom: 1px solid var(--app-divider); background: linear-gradient(var(--app-table-header), var(--app-table-header)), var(--app-surface); font-size: var(--mt-ds-font-body); line-height: var(--mt-ds-line-body); font-weight: var(--mt-ds-weight-body); text-align: left; white-space: nowrap; }
.list-region :deep(.arco-table-td) { height: 50px; padding: 8px 12px; border-bottom: 1px solid var(--app-divider); background: var(--app-surface); font-size: var(--mt-ds-font-body); line-height: var(--mt-ds-line-body); font-weight: var(--mt-ds-weight-body); text-align: left; }
.list-region :deep(.arco-table-tr:hover .arco-table-td) { background: var(--color-fill-1); }
.list-region :deep(.arco-tag) { font-weight: var(--mt-ds-weight-body); }
@media (max-width: 760px) {
  .app-filter-unit { grid-template-columns: minmax(0, 1fr); width: 100%; }
  .app-filter-unit :deep(.app-filter-control) { width: 100%; max-width: none; }
  .app-filter-actions { width: 100%; }
}
</style>
