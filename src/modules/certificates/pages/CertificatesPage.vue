<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Message } from '@arco-design/web-vue';
import { IconFolder, IconUpload, IconDownload, IconFilter, IconMore, IconPlus, IconRefresh, IconSearch, IconSettings } from '@arco-design/web-vue/es/icon';
import ExcelJS from 'exceljs';
import { useTaskCenterStore } from '../../task-center/stores/taskCenter';
import AppPagination from '../../../design/components/AppPagination.vue';
import ColumnSettingsPopover, { type ColumnSettingsItem } from '../../../shared/components/ColumnSettingsPopover.vue';
import ConfirmDialog from '../../../shared/components/ConfirmDialog.vue';
import { certificateRows, certificates, STATUS_CODES, type Certificate } from '../data/certificates';

/** 列表数据目前来自模块内类型化样例；接入服务端后由列表查询接口替换 rows / filtered 的取数边界。 */
const { t } = useI18n();
const rows = certificateRows;
const router = useRouter();
const query = reactive({ code: '', name: '', project: '', status: '', regulation: '', issuer: '', authority: '', issued: '', expires: '' });
/** 输入态与生效态分离：改动筛选条件不会静默改变结果，点击「查询」才生效 */
const applied = ref({ ...query });
const page = ref(1);
const pageSize = ref(10);
const visible = ref(false);
const readonly = ref(false);
const deleting = ref<Certificate>();
const error = ref('');
const dirty = ref(false);
const discardVisible = ref(false);
const fields = ['code', 'name', 'project', 'regulation', 'issuer', 'authority', 'issued', 'expires'] as const;
const form = reactive<Certificate>({ ...certificates[0]!, id: '', code: '' });
/** 状态色集中映射：枚举值仍以 code 存储，文案走 i18n，颜色只作辅助提示 */
const STATUS_COLORS: Record<string, string> = { completed: 'green', rejected: 'red', reviewing: 'arcoblue', draft: 'gray' };

/* ---------------------------------------------- 筛选条件设置（DESIGN.md · List settings popover） */
const FILTER_KEYS = ['code', 'name', 'project', 'status', 'regulation', 'issuer', 'authority', 'issued', 'expires'] as const;
type FilterKey = (typeof FILTER_KEYS)[number];
const defaultFilterSettings: { key: FilterKey; visible: boolean }[] = FILTER_KEYS.map(key => ({ key, visible: ['code', 'name', 'project', 'status'].includes(key) }));
const filterSettings = ref(defaultFilterSettings.map(item => ({ ...item })));
const filterSettingsOpen = ref(false);
/** 弹层顺序即筛选行顺序；勾选、拖拽、恢复默认都即时写入页面状态，无草稿层 */
const visibleFilterKeys = computed(() => filterSettings.value.filter(item => item.visible).map(item => item.key));
const filterSettingsItems = computed<ColumnSettingsItem[]>(() => filterSettings.value.map(item => ({ ...item, label: t(`certificates.${item.key}`) })));
const defaultFilterItems = computed<ColumnSettingsItem[]>(() => defaultFilterSettings.map(item => ({ ...item, label: t(`certificates.${item.key}`) })));
function onFilterSettingsChanged(next: ColumnSettingsItem[]) {
  const hidden = next.filter(item => !item.visible).map(item => item.key as FilterKey);
  filterSettings.value = next.map(item => ({ key: item.key as FilterKey, visible: item.visible }));
  // 隐藏条件时同步清空草稿值与生效值，避免「看不见却仍在生效」的隐式过滤
  for (const key of hidden) { query[key] = ''; applied.value[key] = ''; }
  if (hidden.length) page.value = 1;
}

/* ---------------------------------------------- 列设置（操作列固定最后，首列锁定可见） */
const COLUMN_KEYS = [...fields, 'status'] as const;
type ColumnKey = (typeof COLUMN_KEYS)[number];
const COLUMN_WIDTHS: Record<ColumnKey, number> = { code: 190, name: 200, project: 150, regulation: 150, issuer: 150, authority: 150, issued: 150, expires: 150, status: 150 };
const defaultColumnSettings: { key: ColumnKey; visible: boolean; disabled: boolean }[] = COLUMN_KEYS.map(key => ({ key, visible: true, disabled: key === 'code' }));
const columnSettings = ref(defaultColumnSettings.map(item => ({ ...item })));
const columnSettingsOpen = ref(false);
const columnSettingsItems = computed<ColumnSettingsItem[]>(() => columnSettings.value.map(item => ({ ...item, label: t(`certificates.${item.key}`) })));
const defaultColumnItems = computed<ColumnSettingsItem[]>(() => defaultColumnSettings.map(item => ({ ...item, label: t(`certificates.${item.key}`) })));
function onColumnSettingsChanged(next: ColumnSettingsItem[]) {
  columnSettings.value = next.map(item => ({ key: item.key as ColumnKey, visible: item.visible, disabled: item.key === 'code' }));
}

const sortField = ref<ColumnKey>();
const sortDirection = ref('');
const filtered = computed(() => rows.value.filter(row => FILTER_KEYS.every(key => !applied.value[key] || (key === 'status' || key === 'issued' || key === 'expires' ? row[key] === applied.value[key] : row[key].toLowerCase().includes(applied.value[key].trim().toLowerCase())))));
const sortedRows = computed(() => {
  const key = sortField.value;
  if (!key || !sortDirection.value) return filtered.value;
  return [...filtered.value].sort((a, b) => a[key].localeCompare(b[key], undefined, { numeric: true }) * (sortDirection.value === 'ascend' ? 1 : -1));
});
const pagedRows = computed(() => sortedRows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
const hasApplied = computed(() => Object.values(applied.value).some(Boolean));
function changeSort(field: string, direction: string) { sortField.value = field as ColumnKey; sortDirection.value = direction; page.value = 1; }
const columns = computed(() => [
  ...columnSettings.value.filter(item => item.visible).map(item => ({
    title: t(`certificates.${item.key}`),
    dataIndex: item.key,
    slotName: item.key === 'status' ? 'status' : undefined,
    width: COLUMN_WIDTHS[item.key],
    sortable: { sortDirections: ['ascend', 'descend'] as ('ascend' | 'descend')[], sorter: true, sortOrder: sortField.value === item.key ? sortDirection.value as 'ascend' | 'descend' : undefined },
  })),
  { title: t('certificates.operations'), dataIndex: 'operations', slotName: 'operations', width: 190 },
]);
/** 横向滚动宽度由实际列宽汇总，避免固定值小于列宽总和导致末列被裁切 */
const horizontalWidth = computed(() => columns.value.reduce((total, column) => total + Number(column.width ?? 0), 0));

function applyFilters() { applied.value = { ...query }; page.value = 1; }
function resetFilters() { Object.assign(query, { code: '', name: '', project: '', status: '', regulation: '', issuer: '', authority: '', issued: '', expires: '' }); applyFilters(); }
function open(row?: Certificate, view = false) {
  Object.assign(form, row ?? { id: '', code: '', name: '', project: '', regulation: '', issuer: '', authority: '', issued: '', expires: '', status: 'draft' });
  readonly.value = view;
  error.value = '';
  dirty.value = false;
  discardVisible.value = false;
  visible.value = true;
}
function save() {
  if (readonly.value) { visible.value = false; return; }
  if (fields.filter(field => field !== 'expires').some(field => !form[field].trim())) { error.value = 'required'; return; }
  if (rows.value.some(row => row.code === form.code.trim() && row.id !== form.id)) { error.value = 'duplicate'; return; }
  if (form.expires && form.expires < form.issued) { error.value = 'dateError'; return; }
  const record = { ...form, code: form.code.trim() };
  const index = rows.value.findIndex(row => row.id === form.id);
  if (index >= 0) rows.value[index] = record;
  else rows.value.unshift({ ...record, id: crypto.randomUUID() });
  visible.value = false;
  Message.success(t('certificates.saved'));
}
function markDirty() { dirty.value = true; }
function close() { visible.value = false; }
/** 遮罩 / X / Esc 触发：只读或干净表单直接关闭；编辑态且有未保存改动时弹放弃确认（DESIGN.md · 抽屉脏数据守卫）。 */
function onCancel() {
  if (readonly.value || !dirty.value) close();
  else discardVisible.value = true;
}
function confirmDiscard() { discardVisible.value = false; close(); }
function remove() {
  rows.value = rows.value.filter(row => row.id !== deleting.value?.id);
  deleting.value = undefined;
  if (page.value > 1 && pagedRows.value.length === 0) page.value -= 1;
}

const taskCenter = useTaskCenterStore();
const importOpen = ref(false);
const exportOpen = ref(false);
const processing = ref(false);
const selectedFile = ref<File>();
const fileInput = ref<HTMLInputElement>();
const transferError = ref('');
const templateUrl = ref('');
const templatePreparing = ref(false);
const dragging = ref(false);
let templateGeneration = 0;
onBeforeUnmount(() => { templateGeneration++; if (templateUrl.value) URL.revokeObjectURL(templateUrl.value); });
const transferFields = [...fields, 'status'] as const;
async function workbookBlob(data: string[][]) {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet('Certificates');
  sheet.addRow([...transferFields]);
  data.forEach(row => sheet.addRow(row));
  return new Blob([await book.xlsx.writeBuffer() as BlobPart]);
}
async function prepareTemplate() {
  const generation = ++templateGeneration;
  templatePreparing.value = true;
  try {
    const blob = await workbookBlob([]);
    if (generation !== templateGeneration) return;
    if (templateUrl.value) URL.revokeObjectURL(templateUrl.value);
    templateUrl.value = URL.createObjectURL(blob);
  } catch { transferError.value = t('certificates.transferError'); }
  finally { if (generation === templateGeneration) templatePreparing.value = false; }
}
function openImport() {
  importOpen.value = true; selectedFile.value = undefined; transferError.value = ''; dragging.value = false;
  if (fileInput.value) fileInput.value.value = '';
  void prepareTemplate();
}
function downloadTemplate() {
  if (!templateUrl.value || templatePreparing.value) return;
  const link = document.createElement('a');
  link.href = templateUrl.value; link.download = '证书导入模版.xlsx'; link.click();
}
function selectFile(file?: File) {
  if (processing.value || !file) return;
  selectedFile.value = file; transferError.value = ''; dragging.value = false;
  if (!file.name.toLowerCase().endsWith('.xlsx')) transferError.value = t('certificates.transferError');
}
function chooseFile() { if (!processing.value) { if (fileInput.value) fileInput.value.value = ''; fileInput.value?.click(); } }
function requestExport() {
  if (!filtered.value.length) { Message.info(t('certificates.empty')); return; }
  exportOpen.value = true;
}
function taskTime() { return new Date().toLocaleString('sv-SE'); }
async function exportData() {
  if (processing.value) return;
  processing.value = true;
  try {
    const blob = await workbookBlob(filtered.value.map(row => transferFields.map(field => row[field])));
    const time = taskTime();
    taskCenter.addDownloadTask({ id: crypto.randomUUID(), module: 'certificate', fileStamp: time.replace(/\D/g, ''), operator: '—', time, status: 'success', fileUrl: URL.createObjectURL(blob), fileName: `证书_${time.slice(0, 10)}.xlsx` });
    exportOpen.value = false;
    Message.success(t('certificates.exportSuccess'));
    taskCenter.open('download');
  } catch { Message.error(t('certificates.transferError')); }
  finally { processing.value = false; }
}
async function importData() {
  if (!selectedFile.value || processing.value) return;
  processing.value = true; transferError.value = '';
  try {
    if (!selectedFile.value.name.endsWith('.xlsx')) throw Error();
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(await selectedFile.value.arrayBuffer());
    const sheet = book.worksheets[0];
    if (!sheet || transferFields.some((field, i) => sheet.getRow(1).getCell(i + 1).text !== field)) throw Error();
    const pending = new Map(rows.value.map(row => [row.code, { ...row }]));
    const failures: string[][] = [];
    let ok = 0;
    sheet.eachRow((row, index) => {
      if (index === 1) return;
      const values = transferFields.map((_, i) => row.getCell(i + 1).text.trim());
      const record = Object.fromEntries(transferFields.map((field, i) => [field, values[i]])) as unknown as Certificate;
      const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
      if (fields.filter(field => field !== 'expires').some(field => !record[field]) || !STATUS_CODES.includes(record.status) || !validDate(record.issued) || (record.expires && (!validDate(record.expires) || record.expires < record.issued))) { failures.push(values); return; }
      record.id = pending.get(record.code)?.id ?? crypto.randomUUID();
      pending.set(record.code, record); ok++;
    });
    if (!ok && !failures.length) throw Error();
    const time = taskTime();
    const errorUrl = failures.length ? URL.createObjectURL(await workbookBlob(failures)) : undefined;
    taskCenter.addImportTask({ id: crypto.randomUUID(), module: 'certificate', fileStamp: time.slice(0, 10).replaceAll('-', ''), operator: '—', time, status: failures.length ? (ok ? 'partial_fail' : 'fail') : 'success', total: ok + failures.length, ok, fail: failures.length, errorUrl, errorName: `证书_导入错误数据_${time.replace(/[: ]/g, '_')}.xlsx` });
    rows.value = [...pending.values()]; page.value = 1; importOpen.value = false; Message.success(t('certificates.importFinished')); taskCenter.open('import');
  } catch { transferError.value = t('certificates.transferError'); }
  finally { processing.value = false; }
}

</script>

<template>
  <div class="certificate-page">
    <!-- 筛选条件：字段名在上、控件在下（12px / 4px / 左对齐 / 200px），查询/重置/筛选设置紧跟最后一个条件（2026-11-09 筛选布局裁决） -->
    <form class="certificate-filter-panel" @submit.prevent="applyFilters">
      <div v-for="key in visibleFilterKeys" :key="key" class="certificate-filter-field">
        <label class="app-field-label" :for="`certificate-${key}-filter`">{{ t(`certificates.${key}`) }}</label>
        <a-input v-if="key === 'code'" id="certificate-code-filter" v-model="query.code" class="certificate-filter-control app-filter-control" allow-clear :placeholder="t('certificates.placeholderCode')" />
        <a-input v-else-if="key === 'project'" id="certificate-project-filter" v-model="query.project" class="certificate-filter-control app-filter-control" allow-clear :placeholder="t('certificates.placeholderProject')" />
        <a-date-picker v-else-if="key === 'issued' || key === 'expires'" :id="`certificate-${key}-filter`" v-model="query[key]" class="certificate-filter-control app-filter-control" :aria-label="t(`certificates.${key}`)" />
        <a-input v-else-if="key !== 'status'" :id="`certificate-${key}-filter`" v-model="query[key]" class="certificate-filter-control app-filter-control" allow-clear :aria-label="t(`certificates.${key}`)" />
        <a-select v-else id="certificate-status-filter" v-model="query.status" class="certificate-filter-control app-filter-control" allow-clear :aria-label="t('certificates.status')" :placeholder="t('certificates.placeholderStatus')" :options="STATUS_CODES.map(value => ({ value, label: t(`certificates.${value}`) }))" />
      </div>
      <a-button type="primary" html-type="submit"><template #icon><IconSearch :size="16" /></template>{{ t('certificates.search') }}</a-button>
      <a-button class="app-btn-neutral" html-type="button" @click="resetFilters"><template #icon><IconRefresh :size="16" /></template>{{ t('certificates.reset') }}</a-button>
      <ColumnSettingsPopover
        v-model:visible="filterSettingsOpen"
        :items="filterSettingsItems"
        :default-items="defaultFilterItems"
        :title="t('certificates.filterSettings')"
        :list-aria-label="t('certificates.filterSettings')"
        :show-label="t('certificates.show')"
        :restore-label="t('certificates.restore')"
        @change="onFilterSettingsChanged"
      >
        <a-tooltip :content="t('certificates.filterSettings')">
          <a-button class="app-btn-neutral certificate-icon-button" html-type="button" :aria-label="t('certificates.filterSettings')"><IconFilter :size="16" /></a-button>
        </a-tooltip>
      </ColumnSettingsPopover>
    </form>

    <!-- 数据列表：分区标题 + 主操作/列设置、表格、右对齐分页（DESIGN.md · Section list composition / Pagination） -->
    <section class="certificate-list" role="region" :aria-label="t('certificates.listTitle')">
      <div class="certificate-toolbar">
          
          <a-button type="primary" @click="open()"><template #icon><IconPlus :size="16" /></template>{{ t('certificates.create') }}</a-button>
          <a-button class="app-btn-neutral" @click="openImport"><template #icon><IconUpload /></template>{{ t('certificates.import') }}</a-button>
          <a-button class="app-btn-neutral" @click="requestExport"><template #icon><IconDownload /></template>{{ t('certificates.export') }}</a-button>
          <ColumnSettingsPopover
            v-model:visible="columnSettingsOpen"
            :items="columnSettingsItems"
            :default-items="defaultColumnItems"
            :title="t('certificates.columnSettings')"
            :list-aria-label="t('certificates.columnSettings')"
            :show-label="t('certificates.show')"
            :restore-label="t('certificates.restore')"
            @change="onColumnSettingsChanged"
          >
            <a-tooltip :content="t('certificates.columnSettings')">
              <a-button class="app-btn-neutral certificate-icon-button" :aria-label="t('certificates.columnSettings')"><IconSettings :size="16" /></a-button>
            </a-tooltip>
          </ColumnSettingsPopover>
      </div>
      <a-table class="certificate-table" row-key="id" @sorter-change="changeSort" :columns="columns" :data="pagedRows" :bordered="false" :stripe="false" :pagination="false" :scroll="{ x: horizontalWidth }">
        <template #empty><a-empty :description="hasApplied ? t('certificates.empty') : t('certificates.noData')" /></template>
        <template #status="{ record }"><a-tag :color="STATUS_COLORS[record.status] ?? 'gray'">{{ t(`certificates.${record.status}`) }}</a-tag></template>
        <template #operations="{ record }">
          <div class="certificate-row-actions">
            <a-link @click="router.push(`/data/certificates/${record.id}`)">{{ t('certificates.view') }}</a-link>
            <a-link @click="open(record)">{{ t('certificates.edit') }}</a-link>
            <a-dropdown :trigger="['hover', 'click']" position="br" popup-container="body" content-class="row-more-dropdown" arrow-class="row-more-arrow" show-arrow>
              <button type="button" class="certificate-row-more" :aria-label="t('certificates.more')" :title="t('certificates.more')"><IconMore :size="16" /></button>
              <template #content><a-doption @click="router.push(`/data/certificates/${record.id}`)">{{ t('certificates.approve') }}</a-doption><a-doption class="row-more-danger" @click="deleting = record">{{ t('certificates.delete') }}</a-doption></template>
            </a-dropdown>
          </div>
        </template>
      </a-table>
      <AppPagination v-model:current="page" v-model:page-size="pageSize" :total="filtered.length" />
    </section>

    <ConfirmDialog v-model:visible="exportOpen" icon="info" :title="t('certificates.exportTitle')" :description="[t('certificates.exportScope'), t('certificates.exportDestination')]" :ok-text="t('certificates.exportConfirm')" :ok-loading="processing" :dismissible="!processing" @confirm="exportData" />
    <a-drawer class="app-import-drawer" :visible="importOpen" :width="'min(560px, 100vw)'" :title="t('batchImport.title')" :mask-closable="!processing" :esc-to-close="!processing" :closable="!processing" @cancel="!processing && (importOpen = false)">
      <div class="app-import-block">
        <input ref="fileInput" type="file" accept=".xlsx" hidden @change="selectFile(($event.target as HTMLInputElement).files?.[0])" />
        <div class="app-import-target" :class="{ 'is-dragging': dragging }" role="button" tabindex="0" :aria-label="t('batchImport.upload')" @click="chooseFile" @keydown.enter.prevent="chooseFile" @keydown.space.prevent="chooseFile" @dragover.prevent="!processing && (dragging = true)" @dragleave="dragging = false" @drop.prevent="selectFile($event.dataTransfer?.files[0])">
          <IconFolder :size="32" />
          <p class="app-import-target-name">{{ selectedFile?.name || t('batchImport.hint') }}</p>
          <a-button type="primary" :disabled="processing" @click.stop="chooseFile">{{ t(selectedFile ? 'batchImport.reupload' : 'batchImport.upload') }}</a-button>
        </div>
        <a-alert v-if="transferError" type="error" role="alert">{{ transferError }}</a-alert>
        <div class="app-import-notes">
          <p class="app-import-notes-title">{{ t('batchImport.notesTitle') }}</p>
          <p class="app-import-notes-lines">{{ t('certificates.importHelp') }}</p>
        </div>
        <a-button type="text" class="app-import-template" :loading="templatePreparing" :disabled="templatePreparing || processing" @click="templateUrl ? downloadTemplate() : prepareTemplate()">
          <template #icon><IconDownload /></template>{{ t(templatePreparing ? 'batchImport.templatePreparing' : templateUrl ? 'batchImport.template' : 'batchImport.templateRetry') }}
        </a-button>
      </div>
      <template #footer><a-space :size="12"><a-button class="app-btn-neutral" :disabled="processing" @click="importOpen = false">{{ t('batchImport.cancel') }}</a-button><a-button type="primary" :loading="processing" :disabled="!selectedFile || !selectedFile.name.toLowerCase().endsWith('.xlsx')" @click="importData">{{ t('batchImport.confirm') }}</a-button></a-space></template>
    </a-drawer>
    <a-drawer
      :visible="visible"
      :width="500"
      :title="t(`certificates.${readonly ? 'view' : form.id ? 'editTitle' : 'create'}`)"
      class="certificate-drawer"
      @cancel="onCancel"
    >
      <form v-if="!readonly" class="certificate-form" novalidate @submit.prevent="save">
        <a-alert v-if="error" type="error" class="certificate-form-alert">{{ t(`certificates.${error}`) }}</a-alert>
        <div v-for="field in fields" :key="field" class="certificate-field">
          <label class="app-field-label" :for="`certificate-${field}`">
            <span v-if="field !== 'expires'" class="certificate-req">*</span>{{ t(`certificates.${field}`) }}
          </label>
          <a-date-picker v-if="field === 'issued' || field === 'expires'" :id="`certificate-${field}`" v-model="form[field]" class="app-filter-control certificate-control" @change="markDirty" />
          <a-input v-else :id="`certificate-${field}`" v-model="form[field]" class="app-filter-control certificate-control" :max-length="120" allow-clear @input="markDirty" />
        </div>
      </form>
      <a-descriptions v-else :column="1" class="certificate-detail">
        <a-descriptions-item v-for="field in fields" :key="field" :label="t(`certificates.${field}`)">{{ form[field] || '—' }}</a-descriptions-item>
      </a-descriptions>

      <template #footer>
        <div class="certificate-drawer-footer">
          <a-button class="app-btn-neutral" @click="onCancel">{{ t('certificates.cancel') }}</a-button>
          <a-button v-if="!readonly" type="primary" @click="save">{{ t('certificates.save') }}</a-button>
        </div>
      </template>

      <ConfirmDialog
        :visible="discardVisible"
        :title="t('certificates.discardTitle')"
        :description="t('certificates.discard')"
        :cancel-text="t('certificates.cancel')"
        :ok-text="t('common.confirm')"
        @update:visible="discardVisible = $event"
        @confirm="confirmDiscard"
      />
    </a-drawer>
    <ConfirmDialog :visible="!!deleting" :title="t('certificates.confirmDelete', { name: deleting?.name })" :description="t('certificates.deleteWarning')" @update:visible="deleting = undefined" @confirm="remove" />
  </div>
</template>

<style scoped>
.certificate-toolbar { display: flex; flex-wrap: wrap; gap: var(--mt-ds-space-3); margin-bottom: var(--mt-ds-space-3); }
.certificate-toolbar > :last-child { margin-left: auto; }

/* 两块白色业务面板：模块间距 12px、面板内边距 16px、圆角 2px
   （DESIGN.md · Content-region module gap / Spacing by scope / Section list composition） */
.certificate-page { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--mt-ds-space-3); min-width: 0; }
.certificate-filter-panel, .certificate-list {
  min-width: 0;
  padding: var(--mt-ds-space-4);
  background: var(--app-surface);
  border-radius: var(--mt-ds-control-radius);
}

/* 筛选条（2026-11-09 用户裁决）：字段名 12px 带冒号、左对齐，控件在字段下方、间距 4px；
   单元与查询/重置/筛选设置按 16px 栅栏分布，按钮组紧跟最后一个组件右侧且左对齐。
   控件挂共享 app-filter-control 类走 global.css 白底 + 1px 描边规则（DESIGN.md · Filter control surface rule） */
.certificate-filter-panel { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--mt-ds-space-4); }
.certificate-filter-field { display: grid; grid-template-columns: minmax(0, var(--mt-ds-filter-width)); align-items: start; justify-items: start; gap: var(--mt-ds-space-1); min-width: 0; }
.certificate-filter-field .app-field-label { font-size: var(--mt-ds-font-caption); font-weight: var(--mt-ds-weight-body); line-height: var(--mt-ds-line-caption); text-align: left; padding: 0; white-space: nowrap; }
/* :deep() 穿透：Arco a-input / a-select 根节点不携带本文件 scope id，普通 scoped 规则不命中 */
.certificate-filter-panel :deep(.certificate-filter-control) { width: var(--mt-ds-filter-width); max-width: 100%; }
.certificate-filter-panel > :deep(.arco-btn) { flex: 0 0 auto; }
/* 图标型触发按钮：32×32 白色非强调表面、16px 图标，Tooltip 补充 hover 提示（DESIGN.md · Icon-only toolbar controls） */
.certificate-icon-button { display: inline-grid; width: 32px; height: 32px; padding: 0; place-items: center; }

/* 标题块与其所辖内容保持 12px（DESIGN.md · Title roles and vertical rhythm） */
.certificate-list :deep(.mt-list-toolbar) { margin-bottom: var(--mt-ds-space-3); }

/* 表格：白底、无外框、无斑马纹、行间单线分隔；表头区块用 Fill-2 语义填充（亮色 #F6F7F9、暗色映射 token）；
   表头、值、链接、标签统一 400 字重（DESIGN.md · Table / Enterprise list presentation / Data-list text weight） */
.certificate-list :deep(.arco-table), .certificate-list :deep(.arco-table-container) { border: 0; }
.certificate-list :deep(thead) { background: var(--app-table-header); }
.certificate-list :deep(.arco-table-th) { height: 44px; padding: 0 12px; border-bottom: 1px solid var(--app-divider); color: var(--color-text-1); background: var(--app-table-header); font-size: var(--mt-ds-font-body); font-weight: var(--mt-ds-weight-body); line-height: var(--mt-ds-line-body); text-align: left; white-space: nowrap; }
.certificate-list :deep(.arco-table-td) { height: 52px; padding: 8px 12px; border-bottom: 1px solid var(--app-divider); color: var(--color-text-1); background: var(--app-surface); font-size: var(--mt-ds-font-body); font-weight: var(--mt-ds-weight-body); line-height: var(--mt-ds-line-body); text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.certificate-list :deep(.arco-table-tr:hover .arco-table-td) { background: var(--color-fill-1); }
.certificate-list :deep(.arco-link), .certificate-list :deep(.arco-tag) { font-weight: var(--mt-ds-weight-body); }

/* 行操作：前两个文本链接直显，其余收进 24px「…」气泡（DESIGN.md · Row action overflow） */
.certificate-row-actions { display: inline-flex; align-items: center; gap: var(--mt-ds-space-3); }
.certificate-row-more { display: inline-grid; width: 24px; height: 24px; padding: 0; place-items: center; border: 0; border-radius: var(--mt-ds-control-radius); background: transparent; color: var(--color-text-3); cursor: pointer; }
.certificate-row-more:hover { background: var(--color-fill-1); color: var(--color-text-2); }
.certificate-row-more:focus-visible { outline: 2px solid var(--app-accent); outline-offset: 2px; }

/* 窄屏：每个筛选单元独占一行、控件占满可用宽度（DESIGN.md · Filter geometry） */
@media (max-width: 760px) {
  .certificate-filter-panel { align-items: stretch; }
  .certificate-filter-field { grid-template-columns: minmax(0, 1fr); width: 100%; }
  .certificate-filter-panel :deep(.certificate-filter-control) { width: 100%; max-width: 100%; }
}

/* 列表标题区右侧计数：静默说明文字，与工具栏 summary 同视觉权重（DESIGN.md · List toolbar summary） */
.certificate-list-count { color: var(--mt-ds-text-muted); font-size: var(--mt-ds-font-caption); line-height: var(--mt-ds-line-caption); font-variant-numeric: tabular-nums; white-space: nowrap; }

/* 抽屉表单：白色业务卡片承载（Fill-1 画布 + 白卡，DESIGN.md · Business-drawer surface） */
.certificate-form { display: flex; flex-direction: column; gap: 16px; padding: 16px; background: var(--app-surface); border-radius: 2px; }
.certificate-form-alert { margin: 0; }
.certificate-field { display: flex; flex-direction: column; gap: 6px; }
.certificate-field > label { display: block; font-size: 14px; line-height: 22px; color: var(--color-text-2); }
.certificate-req { margin-right: 4px; color: rgb(var(--danger-6)); }
.certificate-control { width: 100%; }
/* 只读详情：行式排布，标签 Text-3、值 Text-1 */
.certificate-detail :deep(.arco-descriptions-item-label) { color: var(--color-text-3); }
.certificate-detail :deep(.arco-descriptions-item-value) { color: var(--color-text-1); }
/* 固定底部操作栏：取消（中性）+ 确定（主操作），右对齐 */
.certificate-drawer-footer { display: flex; justify-content: flex-end; gap: 12px; }

</style>
