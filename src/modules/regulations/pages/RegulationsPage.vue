<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRouter, onBeforeRouteLeave } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Message, type TableColumnData } from '@arco-design/web-vue';
import { IconUpload, IconDownload, IconFolder, IconPlus, IconSearch, IconRefresh, IconMore, IconFilter, IconSettings } from '@arco-design/web-vue/es/icon';
import ExcelJS from 'exceljs';
import ConfirmDialog from '../../../shared/components/ConfirmDialog.vue';
import { useTaskCenterStore } from '../../task-center/stores/taskCenter';
import ColumnSettingsPopover, { type ColumnSettingsItem } from '../../../shared/components/ColumnSettingsPopover.vue';
import { freezeEdgeColumns } from '../../../shared/tableColumns';
import AppPagination from '../../../design/components/AppPagination.vue';
import { regulationRows, initialRegulations, REGION_CODES, countries, type Regulation } from '../data/regulations';
import { regulationLabel } from '../labels';
const { t, locale } = useI18n();
const taskCenter = useTaskCenterStore();
const rows = regulationRows;
const router = useRouter();
const tab = ref('list');
const filters = reactive({ code: '', region: '', country: '', dates: [] as string[] });
const applied = ref({ code: '', region: '', country: '', dates: [] as string[] });
const page = ref(1);
const pageSize = ref(10);
const records = computed(() => rows.value.filter(row => row.code.toLowerCase().includes(applied.value.code.toLowerCase()) && (!applied.value.region || row.region === applied.value.region) && (!applied.value.country || row.country === applied.value.country) && (!applied.value.dates.length || row.date >= applied.value.dates[0]! && row.date <= applied.value.dates[1]!)));
const totalPages = computed(() => Math.max(1, Math.ceil(records.value.length / pageSize.value)));
const sortField = ref<ColumnKey>();
const sortDirection = ref<'ascend' | 'descend' | ''>('');
const sortedRecords = computed(() => {
  const key = sortField.value;
  if (!key || !sortDirection.value) return records.value;
  const collator = new Intl.Collator(locale.value, { numeric: true, sensitivity: 'base' });
  const label = (row: Regulation) => ['region', 'country', 'status'].includes(key) ? regulationLabel(t, row[key]) : row[key];
  return [...records.value].sort((a, b) => collator.compare(label(a), label(b)) * (sortDirection.value === 'ascend' ? 1 : -1));
});
function changeSort(field: string, direction: string) {
  sortField.value = field as ColumnKey;
  sortDirection.value = direction === 'ascend' || direction === 'descend' ? direction : '';
  page.value = 1;
}
const pagedRecords = computed(() => sortedRecords.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
watch([records, pageSize], () => { if (page.value > totalPages.value) page.value = totalPages.value; });
function search(reset = false) {
  if (reset) Object.assign(filters, { code: '', region: '', country: '', dates: [] });
  applied.value = { ...filters, dates: [...(filters.dates ?? [])] }; page.value = 1;
}
/** 国家下拉始终可编辑（DESIGN.md · Filter control surface 不支持用禁用态占位级联）；
   未选区域时列出全部国家，选定区域后只列该区域国家。 */
const countryOptions = computed(() => {
  if (filters.region) return [countries[filters.region as keyof typeof countries]];
  return REGION_CODES.map(r => countries[r as keyof typeof countries]);
});
/* ---------------------------------------- 筛选条件设置（DESIGN.md · List settings popover） */
const FILTER_KEYS = ['code', 'region', 'country', 'date'] as const;
type FilterKey = (typeof FILTER_KEYS)[number];
const defaultFilterSettings: { key: FilterKey; visible: boolean }[] = FILTER_KEYS.map(key => ({ key, visible: true }));
const filterSettings = ref(defaultFilterSettings.map(item => ({ ...item })));
const filterSettingsOpen = ref(false);
/** 弹层顺序即筛选条顺序；勾选、拖拽、恢复默认都即时生效，无草稿层 */
const visibleFilterKeys = computed(() => filterSettings.value.filter(item => item.visible).map(item => item.key));
const filterSettingsItems = computed<ColumnSettingsItem[]>(() => filterSettings.value.map(item => ({ ...item, label: t(`regulations.${item.key}`), disabled: item.key === 'code' })));
const defaultFilterItems = computed<ColumnSettingsItem[]>(() => defaultFilterSettings.map(item => ({ ...item, label: t(`regulations.${item.key}`), disabled: item.key === 'code' })));
function clearFilter(key: FilterKey) {
  if (key === 'date') { filters.dates = []; applied.value.dates = []; }
  else { filters[key] = ''; applied.value = { ...applied.value, [key]: '' }; }
  if (key === 'region') { filters.country = ''; applied.value = { ...applied.value, country: '' }; }
}
function onFilterSettingsChanged(next: ColumnSettingsItem[]) {
  const hidden = next.filter(item => !item.visible).map(item => item.key as FilterKey);
  filterSettings.value = next.map(item => ({ key: item.key as FilterKey, visible: item.visible }));
  // 隐藏条件时清空草稿值与生效值，避免「看不见却仍在生效」的隐式过滤
  hidden.forEach(clearFilter);
  if (hidden.length) page.value = 1;
}

/* ---------------------------------------- 列设置（操作列固定最后、编号列锁定可见） */
const COLUMN_KEYS = ['code', 'name', 'region', 'country', 'date', 'creator', 'version', 'status'] as const;
type ColumnKey = (typeof COLUMN_KEYS)[number];
const COLUMN_WIDTHS: Record<ColumnKey, number> = { code: 150, name: 220, region: 150, country: 150, date: 150, creator: 150, version: 150, status: 150 };
const defaultColumnSettings: { key: ColumnKey; visible: boolean; disabled: boolean }[] = COLUMN_KEYS.map(key => ({ key, visible: true, disabled: key === 'code' }));
const columnSettings = ref(defaultColumnSettings.map(item => ({ ...item })));
const columnSettingsOpen = ref(false);
const columnSettingsItems = computed<ColumnSettingsItem[]>(() => columnSettings.value.map(item => ({ ...item, label: t(`regulations.${item.key}`) })));
const defaultColumnItems = computed<ColumnSettingsItem[]>(() => defaultColumnSettings.map(item => ({ ...item, label: t(`regulations.${item.key}`) })));
function onColumnSettingsChanged(next: ColumnSettingsItem[]) {
  columnSettings.value = next.map(item => ({ key: item.key as ColumnKey, visible: item.visible, disabled: item.key === 'code' }));
}
/** 只有需要自定义渲染的列声明 slotName；纯文本列交给 Arco 的 ellipsis/tooltip 处理单行截断（DESIGN.md · Table） */
const SLOT_KEYS = new Set(['region', 'country', 'status']);
const columns = computed<TableColumnData[]>(() => freezeEdgeColumns([
  ...columnSettings.value.filter(item => item.visible).map(item => ({
    title: t(`regulations.${item.key}`),
    dataIndex: item.key,
    ...(SLOT_KEYS.has(item.key) ? { slotName: item.key } : {}),
    width: COLUMN_WIDTHS[item.key],
    sortable: { sortDirections: ['ascend', 'descend'] as ('ascend' | 'descend')[], sorter: true, sortOrder: sortField.value === item.key ? sortDirection.value : undefined },
    ellipsis: true,
    tooltip: true,
  })),
  { title: t('regulations.operations'), dataIndex: 'operations', slotName: 'operations', width: 280, ellipsis: false, tooltip: false },
]));
/** 横向滚动宽度由实际列宽汇总，避免列设置隐藏列后留下空白轨道 */
const horizontalWidth = computed(() => columns.value.reduce((total, column) => total + Number(column.width ?? 0), 0));
const selected = ref<Regulation>();
const visible = ref(false);
const mode = ref<'create'|'edit'|'detail'|'review'>('detail');
const form = reactive<Regulation>({ ...initialRegulations[0]!, attachments: [] });
const baseline = ref('');
const error = ref('');
const decision = ref('approve');
const discard = ref(false);
let exit: (() => void) | undefined;
let cancelExit: (() => void) | undefined;
const editable = computed(() => mode.value === 'create' || mode.value === 'edit');
function open(value: typeof mode.value, row?: Regulation) {
  if (row && (value === 'detail' || value === 'review')) { void router.push({ name: 'regulation-detail', params: { id: row.id }, query: value === 'review' ? { review: '1' } : {} }); return; }
  mode.value = value; error.value = ''; decision.value = 'approve';
  Object.assign(form, row ? structuredClone({ ...row, attachments: [...row.attachments] }) : { id: `LAW-${String(rows.value.length + 1).padStart(4,'0')}`, code: '', name: '', region: 'asia', country: 'china', date: new Date().toISOString().slice(0,10), creator: '张三', version: 'V1.0.0', status: 'pending', note: '', attachments: [], opinion: '' });
  baseline.value = JSON.stringify(form); visible.value = true;
}
function close() {
  if (mode.value !== 'detail' && JSON.stringify(form) !== baseline.value) { cancelExit = undefined; exit = () => { visible.value = false; }; discard.value = true; }
  else visible.value = false;
}
onBeforeRouteLeave(() => {
  if (!visible.value || mode.value === 'detail' || JSON.stringify(form) === baseline.value) return true;
  discard.value = true;
  return new Promise<boolean>(resolve => { exit = () => resolve(true); cancelExit = () => resolve(false); });
});
function save() {
  if (editable.value && (!form.code.trim() || !form.name.trim() || !form.version.trim() || !form.region || !form.country) || mode.value === 'review' && !form.opinion.trim()) { error.value = t('regulations.required'); return; }
  if (editable.value && rows.value.some(row => row.id !== form.id && row.code.toLowerCase() === form.code.trim().toLowerCase())) { error.value = t('regulations.duplicate'); return; }
  const record = { ...form, code: form.code.trim(), name: form.name.trim(), attachments: [...form.attachments] };
  if (mode.value === 'review') record.status = decision.value === 'approve' ? 'completed' : 'rejected';
  const index = rows.value.findIndex(row => row.id === record.id);
  if (index < 0) rows.value.push(record); else rows.value[index] = record;
  visible.value = false; Message.success(t('regulations.saved'));
}
function upload(event: Event) {
  const input = event.target as HTMLInputElement;
  for (const file of Array.from(input.files ?? [])) {
    if (!/\.(docx?|pdf)$/i.test(file.name) || file.size > 20 * 1024 * 1024) { Message.error(t('regulations.fileError')); continue; }
    if (!form.attachments.includes(file.name)) form.attachments.push(file.name);
  }
  input.value = '';
}
// Spreadsheet transfers operate on the current in-memory collection.
const deleteTarget = ref<Regulation>();
const importInput = ref<HTMLInputElement>();
const transferring = ref(false);
function removeRegulation() {
  rows.value = rows.value.filter(row => row.id !== deleteTarget.value?.id);
  deleteTarget.value = undefined;
  Message.success(t('regulations.deleted'));
}
const transferKeys = ['code', 'name', 'region', 'country', 'version', 'note'] as const;
const exportOpen = ref(false);
const exporting = ref(false);
function taskTime() { return new Date().toLocaleString('sv-SE'); }
function requestExport() {
  if (!records.value.length) { Message.info(t('regulations.exportEmpty')); return; }
  exportOpen.value = true;
}
async function exportData() {
  if (exporting.value) return;
  exporting.value = true;
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Regulations');
    sheet.addRow([...transferKeys]);
    records.value.forEach(row => sheet.addRow(transferKeys.map(key => row[key])));
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const time = taskTime();
    taskCenter.addDownloadTask({ id: crypto.randomUUID(), module: 'regulation', fileStamp: time.replace(/\D/g, ''), operator: '—', time, status: 'success', fileUrl: URL.createObjectURL(blob), fileName: `法规_${time.slice(0, 10)}.xlsx` });
    exportOpen.value = false;
    Message.success(t('regulations.exportSuccess'));
    taskCenter.open('download');
  } catch { Message.error(t('regulations.transferError')); }
  finally { exporting.value = false; }
}
/* ---------------------------------------- 批量导入抽屉（DESIGN.md · Batch import baseline） */
const importOpen = ref(false);
const importFile = ref<File>();
const importError = ref('');
const importDragging = ref(false);
const regTemplateUrl = ref('');
const regTemplatePreparing = ref(false);
onBeforeUnmount(() => { if (regTemplateUrl.value) URL.revokeObjectURL(regTemplateUrl.value); });
const transferLabels = () => transferKeys.map(key => t(`regulations.${key}`));
async function prepareRegTemplate() {
  regTemplatePreparing.value = true;
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Regulations');
    sheet.addRow(transferLabels());
    const buffer = await workbook.xlsx.writeBuffer();
    if (regTemplateUrl.value) URL.revokeObjectURL(regTemplateUrl.value);
    regTemplateUrl.value = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  } catch { importError.value = t('regulations.transferError'); }
  finally { regTemplatePreparing.value = false; }
}
function openImport() {
  importOpen.value = true; importFile.value = undefined; importError.value = ''; importDragging.value = false;
  if (importInput.value) importInput.value.value = '';
  void prepareRegTemplate();
}
function downloadRegTemplate() {
  if (!regTemplateUrl.value || regTemplatePreparing.value) return;
  const link = document.createElement('a'); link.href = regTemplateUrl.value; link.download = '法规导入模版.xlsx'; link.click();
}
function chooseImportFile() { if (!transferring.value) { if (importInput.value) importInput.value.value = ''; importInput.value?.click(); } }
function selectImportFile(file?: File) {
  if (!file) return;
  importFile.value = file; importError.value = ''; importDragging.value = false;
  if (!file.name.toLowerCase().endsWith('.xlsx')) importError.value = t('regulations.transferError');
}
async function submitImport() {
  if (!importFile.value || transferring.value) return;
  const file = importFile.value;
  transferring.value = true; importError.value = '';
  try {
    if (file.size > 20 * 1024 * 1024) throw new Error('size');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const sheet = workbook.worksheets[0];
    const labels = transferLabels();
    if (!sheet || transferKeys.some((key, index) => { const head = sheet.getRow(1).getCell(index + 1).text.trim(); return head !== key && head !== labels[index]; })) throw new Error('header');
    const added: Regulation[] = [];
    sheet.eachRow((row, index) => {
      if (index === 1) return;
      const [code, name, region, country, version, note] = transferKeys.map((_, column) => row.getCell(column + 1).text.trim());
      if (!code || !name || !version || !REGION_CODES.includes(region as Regulation['region']) || countries[region as Regulation['region']] !== country || [...rows.value, ...added].some(item => item.code.toLowerCase() === code.toLowerCase())) throw new Error('record');
      added.push({ id: crypto.randomUUID(), code, name, region: region as Regulation['region'], country, version, note, date: new Date().toISOString().slice(0,10), creator: '张三', status: 'pending', attachments: [], opinion: '' });
    });
    if (!added.length) throw new Error('empty');
    rows.value.push(...added);
    search(true);
    Message.success(t('regulations.imported', { count: added.length }));
    importOpen.value = false; importFile.value = undefined;
  } catch { importError.value = t('regulations.transferError'); }
  finally { transferring.value = false; }
}
</script>

<template>
  <div class="regulations-page">
    <div class="filters">

      <form v-if="tab === 'list'" class="filter-fields" @submit.prevent="search()">
        <label v-for="key in visibleFilterKeys" :key="key">
          <span class="app-field-label">{{ t(`regulations.${key}`) }}</span>
          <a-input v-if="key === 'code'" v-model="filters.code" class="app-filter-control" allow-clear :aria-label="t('regulations.code')" :placeholder="t('regulations.placeholderCode')" />
          <a-select v-else-if="key === 'region'" v-model="filters.region" class="app-filter-control" allow-clear :aria-label="t('regulations.region')" :placeholder="t('regulations.placeholderRegion')" @change="filters.country = ''"><a-option v-for="code in REGION_CODES" :key="code" :value="code">{{ regulationLabel(t,code) }}</a-option></a-select>
          <a-select v-else-if="key === 'country'" v-model="filters.country" class="app-filter-control" allow-clear :aria-label="t('regulations.country')" :placeholder="t('regulations.placeholderCountry')"><a-option v-for="c in countryOptions" :key="c" :value="c">{{ regulationLabel(t,c) }}</a-option></a-select>
          <a-range-picker v-else v-model="filters.dates" class="app-filter-control" :aria-label="t('regulations.date')" :placeholder="[t('regulations.startDate'), t('regulations.endDate')]" />
        </label>
        <a-button type="primary" html-type="submit"><template #icon><IconSearch /></template>{{ t('regulations.search') }}</a-button>
        <a-button class="app-btn-neutral" html-type="button" @click="search(true)"><template #icon><IconRefresh /></template>{{ t('regulations.reset') }}</a-button>
        <ColumnSettingsPopover v-model:visible="filterSettingsOpen" :items="filterSettingsItems" :default-items="defaultFilterItems" :title="t('regulations.filterSettings')" :list-aria-label="t('regulations.filterListAria')" :show-label="t('regulations.show')" :restore-label="t('regulations.restore')" @change="onFilterSettingsChanged">
          <a-tooltip :content="t('regulations.filterSettings')"><a-button class="app-btn-neutral filter-icon-button" html-type="button" :aria-label="t('regulations.filterSettings')"><IconFilter :size="16" /></a-button></a-tooltip>
        </ColumnSettingsPopover>
      </form>
    </div>
    <template v-if="tab === 'list'">
      <section class="list-panel" :aria-label="t('regulations.list')">
        <div class="toolbar"><a-space>
          <a-button type="primary" @click="open('create')"><template #icon><IconPlus /></template>{{ t('regulations.create') }}</a-button><a-button class="app-btn-neutral" @click="openImport"><template #icon><IconUpload /></template>{{ t('regulations.import') }}</a-button><a-button class="app-btn-neutral" @click="requestExport"><template #icon><IconDownload /></template>{{ t('regulations.export') }}</a-button></a-space>
          <ColumnSettingsPopover v-model:visible="columnSettingsOpen" :items="columnSettingsItems" :default-items="defaultColumnItems" :title="t('regulations.columnSettings')" :list-aria-label="t('regulations.columnListAria')" :show-label="t('regulations.show')" :restore-label="t('regulations.restore')" @change="onColumnSettingsChanged">
            <a-tooltip :content="t('regulations.columnSettings')"><a-button class="app-btn-neutral column-icon-button" :aria-label="t('regulations.columnSettings')"><IconSettings :size="16" /></a-button></a-tooltip>
          </ColumnSettingsPopover>
        </div>
        <a-table @sorter-change="changeSort" :columns="columns" :data="pagedRecords" row-key="id" :bordered="false" :pagination="false" :scroll="{ x: horizontalWidth }">
          <template #region="{ record }">{{ regulationLabel(t,record.region) }}</template><template #country="{ record }">{{ regulationLabel(t,record.country) }}</template>
          <template #status="{ record }"><a-tag :color="record.status === 'completed' ? 'green' : record.status === 'rejected' ? 'red' : 'gray'">{{ regulationLabel(t,record.status) }}</a-tag></template>
          <template #operations="{ record }"><div class="row-actions"><a-link @click="open('detail',record)">{{ t('regulations.detail') }}</a-link><a-link @click="open('edit',record)">{{ t('regulations.edit') }}</a-link><a-dropdown :trigger="['hover', 'click']" position="br" popup-container="body" content-class="row-more-dropdown" arrow-class="row-more-arrow" show-arrow><button type="button" class="row-more" :aria-label="t('regulations.more')" :title="t('regulations.more')"><IconMore :size="16" /></button><template #content><a-doption @click="open('review',record)">{{ t('regulations.review') }}</a-doption><a-doption class="row-more-danger" @click="deleteTarget = record">{{ t('regulations.delete') }}</a-doption></template></a-dropdown></div></template>
          <template #empty><a-empty :description="t('regulations.empty')" /></template>
        </a-table>
        <AppPagination v-model:current="page" v-model:page-size="pageSize" :total="records.length" />
      </section>
    </template>
    <section v-else class="list-panel" :aria-label="t('regulations.relations')"><a-select :model-value="selected?.id" @change="selected = rows.find(row => row.id === $event)"><template #label>{{ selected?.code }}</template><a-option v-for="row in rows" :key="row.id" :value="row.id">{{ row.code }} · {{ row.name }}</a-option></a-select><h3>{{ t('regulations.project') }}</h3><a-empty :description="t('regulations.noProjects')" /></section>
    <a-drawer class="regulation-editor" :visible="visible" :width="500" :title="mode === 'edit' ? t('regulations.editTitle') : t(`regulations.${mode}`)" :mask-closable="mode === 'detail'" @cancel="close">
      <template v-if="mode === 'detail'">
        <div class="reg-detail">
          <div class="app-detail-list">
            <div class="app-detail-row"><span class="app-detail-label">{{ t('regulations.id') }}</span><span class="app-detail-value">{{ form.id }}</span></div>
            <div class="app-detail-row"><span class="app-detail-label">{{ t('regulations.code') }}</span><span class="app-detail-value">{{ form.code }}</span></div>
            <div class="app-detail-row"><span class="app-detail-label">{{ t('regulations.name') }}</span><span class="app-detail-value">{{ form.name }}</span></div>
            <div class="app-detail-row"><span class="app-detail-label">{{ t('regulations.region') }}</span><span class="app-detail-value">{{ regulationLabel(t, form.region) }}</span></div>
            <div class="app-detail-row"><span class="app-detail-label">{{ t('regulations.country') }}</span><span class="app-detail-value">{{ regulationLabel(t, form.country) }}</span></div>
            <div class="app-detail-row"><span class="app-detail-label">{{ t('regulations.date') }}</span><span class="app-detail-value">{{ form.date }}</span></div>
            <div class="app-detail-row"><span class="app-detail-label">{{ t('regulations.creator') }}</span><span class="app-detail-value">{{ form.creator }}</span></div>
            <div class="app-detail-row"><span class="app-detail-label">{{ t('regulations.version') }}</span><span class="app-detail-value">{{ form.version }}</span></div>
            <div class="app-detail-row"><span class="app-detail-label">{{ t('regulations.status') }}</span><span class="app-detail-value"><a-tag :color="form.status === 'completed' ? 'green' : form.status === 'rejected' ? 'red' : 'gray'">{{ regulationLabel(t, form.status) }}</a-tag></span></div>
            <div class="app-detail-row"><span class="app-detail-label">{{ t('regulations.note') }}</span><span class="app-detail-value">{{ form.note || '—' }}</span></div>
          </div>
          <section class="reg-attach"><h3>{{ t('regulations.attachments') }}</h3>
            <div v-if="form.attachments.length" class="reg-attach-list">
              <div v-for="file in form.attachments" :key="file" class="reg-attach-item">{{ file }}</div>
            </div>
            <p v-else class="reg-empty">{{ t('regulations.noProjects') }}</p>
          </section>
        </div>
      </template>
      <template v-else>
        <section class="editor-block"><h3>{{ t('regulations.basic') }}</h3><a-form :model="form" layout="vertical" class="reg-form" :disabled="mode === 'review'">
          <a-form-item v-if="mode !== 'create'"><template #label><span class="app-field-label">{{ t('regulations.id') }}</span></template><a-input v-model="form.id" disabled /></a-form-item>
          <a-form-item><template #label><span class="required">*</span><span class="app-field-label">{{ t('regulations.code') }}</span></template><a-input v-model="form.code" :max-length="200" :placeholder="t('regulations.placeholderCode')" /></a-form-item>
          <a-form-item><template #label><span class="required">*</span><span class="app-field-label">{{ t('regulations.name') }}</span></template><a-input v-model="form.name" :max-length="200" /></a-form-item>
          <a-form-item><template #label><span class="required">*</span><span class="app-field-label">{{ t('regulations.version') }}</span></template><a-input v-model="form.version" :max-length="200" /></a-form-item>
          <a-form-item><template #label><span class="required">*</span><span class="app-field-label">{{ t('regulations.region') }}</span></template><a-select v-model="form.region" @change="form.country = countries[form.region]"><a-option v-for="code in REGION_CODES" :key="code" :value="code">{{ regulationLabel(t,code) }}</a-option></a-select></a-form-item>
          <a-form-item><template #label><span class="required">*</span><span class="app-field-label">{{ t('regulations.country') }}</span></template><a-select v-model="form.country"><a-option :value="countries[form.region]">{{ regulationLabel(t,countries[form.region]) }}</a-option></a-select></a-form-item>
          <a-form-item><template #label><span class="app-field-label">{{ t('regulations.note') }}</span></template><a-textarea v-model="form.note" :max-length="2000" /></a-form-item>
        </a-form></section>
        <section class="reg-attach"><h3>{{ t('regulations.attachments') }}</h3><template v-if="editable"><input type="file" multiple accept=".doc,.docx,.pdf" :aria-label="t('regulations.upload')" @change="upload"><p>{{ t('regulations.fileHelp') }}</p></template><div v-for="(file,index) in form.attachments" :key="file">{{ file }} <a-button v-if="editable" type="text" @click="form.attachments.splice(index,1)">{{ t('regulations.remove') }}</a-button></div></section>
        <section v-if="mode === 'review'" class="reg-review"><h3>{{ t('regulations.review') }}</h3>
          <div class="reg-review-field"><span class="app-field-label">{{ t('regulations.decision') }}</span><a-radio-group v-model="decision"><a-radio value="approve">{{ t('regulations.approve') }}</a-radio><a-radio value="reject">{{ t('regulations.reject') }}</a-radio></a-radio-group></div>
          <div class="reg-review-field"><span class="required">*</span><span class="app-field-label">{{ t('regulations.opinion') }}</span><a-textarea v-model="form.opinion" :max-length="2000" /></div>
        </section>
        <a-alert v-if="error" type="error">{{ error }}</a-alert>
      </template>
      <template #footer><a-space><a-button @click="close">{{ t('regulations.cancel') }}</a-button><a-button v-if="mode !== 'detail'" type="primary" @click="save">{{ t('regulations.save') }}</a-button></a-space></template>
    </a-drawer>
    <ConfirmDialog :visible="Boolean(deleteTarget)" :title="t('regulations.deleteTitle', { name: deleteTarget?.name ?? '' })" :description="t('regulations.deleteDescription')" @update:visible="deleteTarget = $event ? deleteTarget : undefined" @confirm="removeRegulation" />
    <ConfirmDialog :visible="discard" @update:visible="discard = $event; if (!$event) cancelExit?.()" :title="t('regulations.discard')" @confirm="discard = false; exit?.()" />
    <a-drawer class="app-import-drawer" :visible="importOpen" :width="'min(560px, 100vw)'" :title="t('batchImport.title')" :mask-closable="!transferring" :esc-to-close="!transferring" :closable="!transferring" @cancel="!transferring && (importOpen = false)">
      <div class="app-import-block">
        <input ref="importInput" type="file" accept=".xlsx" hidden @change="selectImportFile(($event.target as HTMLInputElement).files?.[0])" />
        <div class="app-import-target" :class="{ 'is-dragging': importDragging }" role="button" tabindex="0" :aria-label="t('batchImport.upload')" @click="chooseImportFile" @keydown.enter.prevent="chooseImportFile" @keydown.space.prevent="chooseImportFile" @dragover.prevent="!transferring && (importDragging = true)" @dragleave="importDragging = false" @drop.prevent="selectImportFile($event.dataTransfer?.files[0])">
          <IconFolder :size="32" />
          <p class="app-import-target-name">{{ importFile?.name || t('batchImport.hint') }}</p>
          <a-button type="primary" :disabled="transferring" @click.stop="chooseImportFile">{{ t(importFile ? 'batchImport.reupload' : 'batchImport.upload') }}</a-button>
        </div>
        <a-alert v-if="importError" type="error" role="alert">{{ importError }}</a-alert>
        <div class="app-import-notes"><p class="app-import-notes-title">{{ t('batchImport.notesTitle') }}</p><p class="app-import-notes-lines">{{ t('regulations.importHelp') }}</p></div>
        <a-button type="text" class="app-import-template" :loading="regTemplatePreparing" :disabled="regTemplatePreparing || transferring" @click="regTemplateUrl ? downloadRegTemplate() : prepareRegTemplate()">
          <template #icon><IconDownload /></template>{{ t(regTemplatePreparing ? 'batchImport.templatePreparing' : regTemplateUrl ? 'batchImport.template' : 'batchImport.templateRetry') }}
        </a-button>
      </div>
      <template #footer><a-space :size="12"><a-button class="app-btn-neutral" :disabled="transferring" @click="importOpen = false">{{ t('batchImport.cancel') }}</a-button><a-button type="primary" :loading="transferring" :disabled="!importFile || !importFile.name.toLowerCase().endsWith('.xlsx')" @click="submitImport">{{ t('batchImport.confirm') }}</a-button></a-space></template>
    </a-drawer>
    <ConfirmDialog v-model:visible="exportOpen" icon="info" :title="t('regulations.exportTitle')" :description="[t('regulations.exportScope'), t('regulations.exportDestination')]" :ok-text="t('regulations.exportConfirm')" :ok-loading="exporting" :dismissible="!exporting" @confirm="exportData" />
  </div>
</template>

<style scoped>
.regulations-page { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
.filters,.list-panel { min-width: 0; padding:16px; background:var(--app-surface); border-radius:2px; }
.filters :deep(.arco-tabs-nav) { margin-bottom: 0; }
.filters :deep(.arco-tabs-content) { padding-top: 0; }
/* 2026-11-09 用户裁决：字段名 12px 带冒号、左对齐，控件在字段下方、间距 4px；
   单元与查询/重置按 16px 栅栏分布，按钮组紧跟最后一个组件右侧且左对齐。 */
.filter-fields { display:flex; flex-wrap:wrap; gap:16px; align-items:flex-end; padding-top:0; }
.filter-fields label { display:grid; grid-template-columns:minmax(0,200px); align-items:start; justify-items:start; gap:4px; min-width:0; white-space:nowrap; }
.filter-fields :deep(.app-field-label) { font-size:12px; font-weight:400; line-height:20px; text-align:left; padding:0; }
.filter-fields :deep(.app-filter-control) { width:200px; max-width:100%; }
@media (max-width:760px) {
  /* 窄屏每个筛选单元独占一行；控件可收缩，但上限仍是 DESIGN.md 规定的 200px */
  .filter-fields label { grid-template-columns:minmax(0,1fr); width:100%; }
  .filter-fields :deep(.app-filter-control) { width:100%; max-width:200px; }
}
.toolbar { display:flex; flex-wrap:wrap; gap:16px; align-items:center; justify-content:space-between; margin-bottom:16px; }
/* DESIGN.md · Icon-only toolbar controls：筛选条件设置 / 列设置共用 32×32 白色非强调表面，名称由 Tooltip + aria-label 承载 */
.filter-icon-button, .column-icon-button { display:inline-grid; width:32px; height:32px; padding:0; place-items:center; }
/* DESIGN.md · Enterprise list presentation：白底、无外框、无斑马纹、每行细分隔线，列表文字统一 400 字重。
   表头区块单独用 --app-table-header（亮色 #F6F7F9 / 暗色 Fill-2），即规范允许的 measured header variant。
   52px 是数据行最小高度；状态标签与 24px「更多」按钮在 8px cell inset 下会把行撑到 55px，属规范允许的内容高度 */
.list-panel :deep(.arco-table),
.list-panel :deep(.arco-table-container) { border: 0; }
.list-panel :deep(thead) { background:var(--app-table-header); }
.list-panel :deep(.arco-table-th) { height:44px; padding:0 12px; border-bottom:1px solid var(--app-divider); color:var(--color-text-1); background:var(--app-table-header); font-size:14px; font-weight:400; line-height:22px; text-align:left; white-space:nowrap; }
.list-panel :deep(.arco-table-td) { height:52px; padding:8px 12px; border-bottom:1px solid var(--app-divider); color:var(--color-text-1); background:var(--app-surface); font-size:14px; font-weight:400; line-height:22px; text-align:left; white-space:nowrap; }
.list-panel :deep(.arco-table-tr:hover .arco-table-td) { background:var(--color-fill-1); }
.row-actions { display:inline-flex; align-items:center; gap:12px; }
.row-more { display:inline-grid; width:24px; height:24px; padding:0; place-items:center; border:0; border-radius:2px; background:transparent; color:var(--color-text-3); cursor:pointer; }
.row-more:hover { background:var(--color-fill-1); color:var(--color-text-2); }
.row-more:focus-visible { outline:2px solid var(--app-accent); outline-offset:2px; }
h3 { font-size:16px; font-weight:600; line-height:24px; }
section label { display:block; margin-bottom:16px; }
/* DESIGN.md · Form field layout：编辑表单 label 在控件上方、控件占满 500px 抽屉内容区；
   必填星号在标签左侧（danger 色、4px 间距），字段名右侧冒号由 .app-field-label 统一渲染 */
.reg-form :deep(.arco-form-item) { margin-bottom: 16px; }
/* DESIGN.md · Business-drawer grouping：白卡底部只保留 16px 内边距；末字段不叠加 16px 行间距，
   否则「最后一个字段 → 卡片下边缘」会变成 32px */
.reg-form :deep(.arco-form-item:last-child) { margin-bottom: 0; }
.reg-form :deep(.arco-input-wrapper),
.reg-form :deep(.arco-select-view),
.reg-form :deep(.arco-textarea-wrapper) { width: 100%; }
.required { color: var(--app-color-danger); margin-right: 4px; }
.reg-detail .app-detail-list { margin-bottom: 16px; }
.reg-attach, .editor-block { padding:var(--mt-ds-space-4); background:var(--app-surface); border-radius:var(--mt-ds-control-radius); margin-bottom:var(--mt-ds-space-4); }
/* 三个区块标题统一：去掉浏览器默认 h3 的 16px 上下外边距（原来只有附件/审核生效） */
.editor-block h3, .reg-attach h3, .reg-review h3 { margin: 0 0 12px; }
.reg-attach-list { display: flex; flex-direction: column; gap: 8px; }
.reg-attach-item { color: var(--color-text-1); line-height: 22px; overflow-wrap: anywhere; }
.reg-empty { color: var(--color-text-3); margin: 0; }
.reg-review-field { margin-bottom: 16px; }
.reg-review-field .app-field-label { display: block; margin-bottom: 4px; }
</style>

<style>
.regulation-editor .arco-drawer-body { background:var(--color-fill-1); padding:var(--mt-ds-space-4); }
.regulation-editor .arco-drawer-header { height:56px; background:var(--app-surface); }
.regulation-editor .arco-drawer-footer { background:var(--app-surface); }
</style>
