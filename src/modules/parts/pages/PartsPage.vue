<script setup lang="ts">
import { exportParts, importParts, partsTemplateBlob, PART_SHEET_FIELDS } from '../data/spreadsheet';
import { readPartDetail } from '../data/detailSnapshot';
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { usePartsStore } from '../stores/parts';
import { Message, type FormInstance } from '@arco-design/web-vue';
import { IconLeft, IconUpload, IconDownload, IconFolder, IconFilter, IconMore, IconPlus, IconRefresh, IconSearch, IconSettings } from '@arco-design/web-vue/es/icon';
import ConfirmDialog from '../../../shared/components/ConfirmDialog.vue';
import { useTaskCenterStore } from '../../task-center/stores/taskCenter';
import ColumnSettingsPopover, { type ColumnSettingsItem } from '../../../shared/components/ColumnSettingsPopover.vue';
import { freezeEdgeColumns } from '../../../shared/tableColumns';
import AppPagination from '../../../design/components/AppPagination.vue';
import emptyDot from '../../../assets/parts-empty-dot.svg';
import { DEVELOPMENT_CODES, LEVEL_CODES, INTERFACE_CODES, PROTOCOL_CODES, suppliers, emptyPart, type Part, type Segment, type HardwareVersion } from '../data/parts';
import { developmentLabel, levelLabel, scanLabel } from '../labels';
// 详情页基础信息标题右侧的状态标签配色：规划中=灰、进行中=橙、已完成=绿，与证书/法规一致。
const PART_STATUS_COLOR: Record<string, string> = { planning: 'gray', active: 'orange', completed: 'green' };
const { t } = useI18n();
const taskCenter = useTaskCenterStore();
const route = useRoute();
const router = useRouter();
const { rows, initialized, custom, lockedSegments, lockedSeparator, lockedDigits, serial } = storeToRefs(usePartsStore());
const transferBusy = ref(false);
const approvalOpinion = ref('');
const approvalDecision = ref('approved');
const approvalBusy = ref(false);
const approvalError = ref(false);
async function approvePart() {
  if (approvalBusy.value || !detail.value) return;
  approvalError.value = !approvalOpinion.value.trim();
  if (approvalError.value) { document.querySelector<HTMLTextAreaElement>('#part-approval-opinion textarea')?.focus(); return; }
  approvalBusy.value = true;
  try {
    // 审批结果暂存模块数据，待审批接口接入。
    const record = rows.value.find(item => item.id === detail.value?.id);
    if (!record) { Message.error(t('parts.missing')); return; }
    record.approval = { decision: approvalDecision.value as 'approved' | 'rejected', opinion: approvalOpinion.value.trim() };
    Message.success(t('parts.approvalUpdated'));
    await router.push('/data/parts');
  } finally { approvalBusy.value = false; }
}
const exportOpen = ref(false);
function taskTime() { return new Date().toLocaleString('sv-SE'); }
function requestExport() {
  if (!filtered.value.length) { Message.info(t('parts.exportEmpty')); return; }
  exportOpen.value = true;
}
async function exportData() {
  if (transferBusy.value) return;
  transferBusy.value = true;
  try {
    const blob = await exportParts(filtered.value, PART_SHEET_FIELDS.map(key => t(`parts.${key}`)));
    const time = taskTime();
    taskCenter.addDownloadTask({ id: crypto.randomUUID(), module: 'part', fileStamp: time.replace(/\D/g, ''), operator: '—', time, status: 'success', fileUrl: URL.createObjectURL(blob), fileName: `零部件_${time.slice(0, 10)}.xlsx` });
    exportOpen.value = false;
    Message.success(t('parts.exportSuccess'));
    taskCenter.open('download');
  } catch { Message.error(t('parts.transferFailed')); }
  finally { transferBusy.value = false; }
}
/* ---------------------------------------- 批量导入抽屉（DESIGN.md · Batch import baseline） */
const importOpen = ref(false);
const importFile = ref<File>();
const importError = ref('');
const importDragging = ref(false);
const importFileInput = ref<HTMLInputElement>();
const partTemplateUrl = ref('');
const partTemplatePreparing = ref(false);
onBeforeUnmount(() => { if (partTemplateUrl.value) URL.revokeObjectURL(partTemplateUrl.value); });
async function preparePartTemplate() {
  partTemplatePreparing.value = true;
  try {
    const blob = await partsTemplateBlob(PART_SHEET_FIELDS.map(key => t(`parts.${key}`)));
    if (partTemplateUrl.value) URL.revokeObjectURL(partTemplateUrl.value);
    partTemplateUrl.value = URL.createObjectURL(blob);
  } catch { importError.value = t('parts.transferFailed'); }
  finally { partTemplatePreparing.value = false; }
}
function openImport() {
  importOpen.value = true; importFile.value = undefined; importError.value = ''; importDragging.value = false;
  if (importFileInput.value) importFileInput.value.value = '';
  void preparePartTemplate();
}
function downloadPartTemplate() {
  if (!partTemplateUrl.value || partTemplatePreparing.value) return;
  const link = document.createElement('a');
  link.href = partTemplateUrl.value; link.download = '零部件导入模版.xlsx'; link.click();
}
function chooseImportFile() { if (!transferBusy.value) { if (importFileInput.value) importFileInput.value.value = ''; importFileInput.value?.click(); } }
function selectImportFile(file?: File) {
  if (!file) return;
  importFile.value = file; importError.value = ''; importDragging.value = false;
  if (!file.name.toLowerCase().endsWith('.xlsx')) importError.value = t('parts.importFailed');
}
async function submitImport() {
  if (!importFile.value || transferBusy.value) return;
  transferBusy.value = true; importError.value = '';
  try {
    const labels = ['zh-CN', 'en-US'].map(locale => PART_SHEET_FIELDS.map(key => t(`parts.${key}`, {}, { locale })));
    const records = await importParts(importFile.value, rows.value, labels);
    rows.value.push(...records);
    initialized.value = true;
    Message.success(t('parts.imported', { count: records.length }));
    importOpen.value = false; importFile.value = undefined;
  } catch { importError.value = t('parts.importFailed'); }
  finally { transferBusy.value = false; }
}
const query = reactive({ code: '', name: '', supplier: '' });
const applied = ref({ ...query });

/* 筛选条件设置 / 列设置（DESIGN.md · List settings popover）：弹层顺序即筛选行 / 表格列顺序，
   勾选与恢复默认即时生效；隐藏筛选条件时同步清空草稿值和生效值，避免隐式过滤。 */
const FILTER_KEYS = ['code', 'name', 'supplier'] as const;
type FilterKey = (typeof FILTER_KEYS)[number];
const defaultFilterSettings: { key: FilterKey; visible: boolean }[] = FILTER_KEYS.map(key => ({ key, visible: true }));
const filterSettings = ref(defaultFilterSettings.map(item => ({ ...item })));
const filterSettingsOpen = ref(false);
const visibleFilterKeys = computed(() => filterSettings.value.filter(item => item.visible).map(item => item.key));
const filterSettingsItems = computed<ColumnSettingsItem[]>(() => filterSettings.value.map(item => ({ ...item, label: t(`parts.${item.key}`) })));
const defaultFilterItems = computed<ColumnSettingsItem[]>(() => defaultFilterSettings.map(item => ({ ...item, label: t(`parts.${item.key}`) })));
function onFilterSettingsChanged(next: ColumnSettingsItem[]) {
  const hidden = next.filter(item => !item.visible).map(item => item.key as FilterKey);
  filterSettings.value = next.map(item => ({ key: item.key as FilterKey, visible: item.visible }));
  for (const key of hidden) { query[key] = ''; applied.value[key] = ''; }
  if (hidden.length) page.value = 1;
}

const COLUMN_KEYS = ['code', 'name', 'level', 'supplier', 'material', 'owner', 'securityOwner'] as const;
type ColumnKey = (typeof COLUMN_KEYS)[number];
const defaultColumnSettings: { key: ColumnKey; visible: boolean; disabled: boolean }[] = COLUMN_KEYS.map(key => ({ key, visible: true, disabled: key === 'code' }));
const columnSettings = ref(defaultColumnSettings.map(item => ({ ...item })));
const columnSettingsOpen = ref(false);
const columnSettingsItems = computed<ColumnSettingsItem[]>(() => columnSettings.value.map(item => ({ ...item, label: t(`parts.${item.key}`) })));
const defaultColumnItems = computed<ColumnSettingsItem[]>(() => defaultColumnSettings.map(item => ({ ...item, label: t(`parts.${item.key}`) })));
function onColumnSettingsChanged(next: ColumnSettingsItem[]) {
  columnSettings.value = next.map(item => ({ key: item.key as ColumnKey, visible: item.visible, disabled: item.key === 'code' }));
}

const filtered = computed(() => rows.value.filter(row => row.code.toLowerCase().includes(applied.value.code.toLowerCase()) && row.name.toLowerCase().includes(applied.value.name.toLowerCase()) && (!applied.value.supplier || row.supplier === applied.value.supplier)));
/** 共享分页：查询/重置回到第 1 页，筛选结果减少时把越界页码收敛回来（DESIGN.md · Pagination）。 */
const page = ref(1);
const pageSize = ref(10);
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)));
const pagedRows = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
watch([filtered, pageSize], () => { if (page.value > totalPages.value) page.value = totalPages.value; });
function applyFilters() { applied.value = { ...query }; page.value = 1; }
function resetFilters() { Object.assign(query, { code: '', name: '', supplier: '' }); applyFilters(); }
const detail = computed(() => rows.value.find(row => row.id === route.params.id) ?? readPartDetail(String(route.params.id)));
const columns = computed(() => freezeEdgeColumns([
  ...columnSettings.value.filter(item => item.visible).map(item => ({
    title: t(`parts.${item.key}`),
    dataIndex: item.key,
    slotName: item.key === 'level' ? 'level' : undefined,
    width: 150,
  })),
  { title: t('parts.actions'), dataIndex: 'actions', slotName: 'actions', width: 180 },
]));
/** 横向滚动宽度由实际列宽汇总，避免固定值小于列宽总和导致末列被裁切。 */
const horizontalWidth = computed(() => columns.value.reduce((total, column) => total + Number(column.width ?? 0), 0));
const drawer = ref(false);
const formRef = ref<FormInstance>();
const form = reactive(emptyPart());
const variable = ref('');
const snapshot = ref('');
const dirty = computed(() => drawer.value && snapshot.value !== JSON.stringify({ form, variable: variable.value }));
const discard = ref(false);
const pendingLeave = ref<((allow: boolean) => void)>();
function closeDrawer() {
  if (dirty.value) { discard.value = true; return; }
  drawer.value = false;
}
function open(row?: Part) {
  Object.assign(form, JSON.parse(JSON.stringify(row ?? emptyPart())));
  variable.value = '';
  snapshot.value = JSON.stringify({ form, variable: variable.value });
  drawer.value = true;
  formRef.value?.clearValidate();
}
const fields = ['name', 'abbreviation', 'level', 'development', 'supplier', 'material', 'ip', 'owner', 'securityOwner'] as const;
const required = ['name', 'abbreviation', 'level', 'development', 'owner', 'securityOwner'];
const rules = computed(() => Object.fromEntries(required.map(field => [field, [{ required: true, message: t('parts.required') }, { validator: (value: string, callback: (error?: string) => void) => callback(value?.trim() ? undefined : t('parts.required')) }]])));
const ruleVisible = ref(false);
const ruleSnapshot = ref('');
const ruleDiscard = ref(false);
function ruleState() { return JSON.stringify({ separator: separator.value, digits: digits.value, segments: segments.value }); }
function openRule() { ruleSnapshot.value = ruleState(); ruleVisible.value = true; }
function closeRule() { if (ruleState() !== ruleSnapshot.value) ruleDiscard.value = true; else ruleVisible.value = false; }
function discardRule() {
  const initial = JSON.parse(ruleSnapshot.value);
  separator.value = initial.separator;
  digits.value = initial.digits;
  segments.value = initial.segments;
  ruleVisible.value = false;
  ruleDiscard.value = false;
}
const separator = ref('-');
const digits = ref(4);
const segments = ref<Segment[]>([{ id: 'fixed', kind: 'fixed', value: 'DDY' }, { id: 'variable', kind: 'variable', value: 'ABCD' }, { id: 'year', kind: 'year', value: '2026' }]);
const preview = computed(() => [...segments.value.map(s => s.value), '1'.padStart(digits.value, '0')].join(separator.value));
const digitOptions = computed(() => [4, 6, 8].map(value => ({ value, label: t('parts.digitOption', { count: value }) })));
const generatedCode = computed(() => custom.value ? [...lockedSegments.value.map(s => s.kind === 'variable' ? variable.value.trim() : s.value), String(serial.value).padStart(lockedDigits.value, '0')].join(lockedSeparator.value) : `PART-${String(serial.value).padStart(4, '0')}`);
/** 规则允许配置多段可变字符，但值共用同一个 variable：编号条里只让第一段可编辑，其余同步只读展示。 */
const firstVariableIndex = computed(() => lockedSegments.value.findIndex(segment => segment.kind === 'variable'));
function addSegment(kind: Segment['kind']) { segments.value.push({ id: crypto.randomUUID(), kind, value: kind === 'year' ? String(new Date().getFullYear()) : '' }); }
function configure() {
  if (!segments.value.length || segments.value.some(s => !/^[A-Za-z0-9]+$/.test(s.value))) { Message.error(t('parts.invalidRule')); return false; }
  lockedSegments.value = JSON.parse(JSON.stringify(segments.value));
  lockedSeparator.value = separator.value;
  lockedDigits.value = digits.value;
  custom.value = true;
  initialized.value = true;
  ruleVisible.value = false;
  open();
  return true;
}
async function save() {
  if (await formRef.value?.validate()) { formRef.value?.scrollToField(required.find(field => !String(form[field as keyof Part]).trim()) ?? 'name'); return; }
  if (form.ip && !/^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(form.ip)) { Message.error(t('parts.invalidIp')); return; }
  if (!form.id && custom.value && lockedSegments.value.some(s => s.kind === 'variable') && !/^[A-Za-z0-9]+$/.test(variable.value.trim())) { Message.error(t('parts.invalidVariable')); return; }
  const record = JSON.parse(JSON.stringify({ ...form, name: form.name.trim(), abbreviation: form.abbreviation.trim(), code: form.id ? form.code : generatedCode.value })) as Part;
  if (rows.value.some(row => row.id !== record.id && (row.code === record.code || row.name === record.name))) { Message.error(t('parts.duplicate')); return; }
  if (record.id) rows.value.splice(rows.value.findIndex(row => row.id === record.id), 1, record);
  else { rows.value.push({ ...record, id: crypto.randomUUID() }); serial.value++; }
  initialized.value = true;
  drawer.value = false;
  Message.success(t('parts.saved'));
}
const deleting = ref<Part>();
function remove() {
  const index = rows.value.findIndex(row => row.id === deleting.value?.id);
  if (index >= 0) rows.value.splice(index, 1);
  deleting.value = undefined;
}
const selectedHardware = ref('');
const hardware = computed(() => detail.value?.hardware.find(hw => hw.id === selectedHardware.value) ?? detail.value?.hardware[0]);
const selectedSoftware = ref('');
const software = computed(() => hardware.value?.software.find(item => item.id === selectedSoftware.value));
watch(hardware, () => { selectedSoftware.value = ''; });
const progressVisible = ref(false);
const sbomColumns = computed(() => ['componentCode', 'componentName', 'componentVersion', 'componentSource'].map(key => ({ title: t(`parts.${key}`), dataIndex: key })));
const sbomPage = ref(1);
const sbomPageSize = ref(10);
const sbomComponents = computed(() => software.value?.components ?? []);
const pagedComponents = computed(() => sbomComponents.value.slice((sbomPage.value - 1) * sbomPageSize.value, sbomPage.value * sbomPageSize.value));
watch(software, () => { sbomPage.value = 1; progressVisible.value = false; });
const projectColumns = computed(() => [
  ...['projectCode', 'projectName', 'brand', 'series', 'model', 'priority', 'relationStatus'].map((key, index) => ({
    title: t(`parts.${key}`), dataIndex: ['code', 'name', 'brand', 'series', 'model', 'priority', 'status'][index],
    slotName: key === 'priority' ? 'priority' : key === 'relationStatus' ? 'status' : undefined, width: 150,
  })),
  { title: t('parts.actions'), slotName: 'actions', width: 100 },
]);
const versionFormRef = ref<FormInstance>();
const versionRules = computed(() => ({ name: [{ required: true, message: t('parts.required') }, { validator: (value: string, callback: (error?: string) => void) => callback(value.trim() ? undefined : t('parts.required')) }] }));
const versionVisible = ref(false);
const versionKind = ref<'hardware' | 'software'>('hardware');
const version = reactive({ name: '', note: '', interfaces: [] as string[], protocols: [] as string[], method: 'json', fileName: '' });
function openVersion(kind: 'hardware' | 'software') {
  versionKind.value = kind;
  Object.assign(version, { name: '', note: '', interfaces: [], protocols: [], method: 'json', fileName: '' });
  versionVisible.value = true;
}
async function saveVersion() {
  if (await versionFormRef.value?.validate()) { versionFormRef.value?.scrollToField('name'); return false; }
  const versions = versionKind.value === 'hardware' ? detail.value?.hardware : hardware.value?.software;
  if (!version.name.trim() || !versions) { Message.error(t('parts.required')); return false; }
  if (versions.some(v => v.name === version.name.trim())) { Message.error(t('parts.duplicate')); return false; }
  if (versionKind.value === 'hardware') {
    const hw: HardwareVersion = { id: crypto.randomUUID(), name: version.name.trim(), note: version.note, software: [] };
    detail.value!.hardware.push(hw);
    selectedHardware.value = hw.id;
  } else hardware.value!.software.push({ id: crypto.randomUUID(), name: version.name.trim(), interfaces: [...version.interfaces], protocols: [...version.protocols], scan: version.fileName ? 'queued' : 'unconfigured', fileName: version.fileName, method: version.method as 'json' | 'firmware' });
  versionVisible.value = false;
  Message.success(t('parts.saved'));
  return true;
}
function replaceSbom(file: File) {
  if (!software.value) return false;
  if (!/\.(json|bin|zip|hex)$/i.test(file.name) || file.size > 20 * 1024 * 1024) { Message.error(t('parts.fileError')); return false; }
  software.value.fileName = file.name;
  software.value.scan = 'queued';
  software.value.method = /\.json$/i.test(file.name) ? 'json' : 'firmware';
  software.value.components = [];
  software.value.progress = 0;
  return false;
}
function upload(file: File) {
  const accepted = version.method === 'json' ? /\.json$/i : /\.(bin|zip|hex)$/i;
  if (!accepted.test(file.name) || file.size > 20 * 1024 * 1024) { Message.error(t('parts.fileError')); return false; }
  version.fileName = file.name;
  return false;
}
const deletingHardware = ref<HardwareVersion>();
function removeHardware() { if (detail.value) detail.value.hardware = detail.value.hardware.filter(hw => hw.id !== deletingHardware.value?.id); deletingHardware.value = undefined; }
function beforeUnload(event: BeforeUnloadEvent) { if (dirty.value) event.preventDefault(); }
window.addEventListener('beforeunload', beforeUnload);
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload));
onBeforeRouteLeave((_to, _from, next) => { if (!dirty.value) next(); else { pendingLeave.value = allow => next(allow); discard.value = true; } });
watch(discard, value => { if (!value) { pendingLeave.value?.(false); pendingLeave.value = undefined; } });
function confirmDiscard() { drawer.value = false; pendingLeave.value?.(true); pendingLeave.value = undefined; discard.value = false; }
</script>

<template>
  <main class="parts-page" :class="{ 'parts-detail-page': !!route.params.id }">
    <template v-if="route.params.id">
      <nav class="detail-toolbar" :aria-label="t('parts.partDetailTitle')"><router-link class="detail-back" to="/data/parts" :aria-label="t('parts.back')"><IconLeft /></router-link><a-breadcrumb><a-breadcrumb-item><router-link to="/data/parts">{{ t('parts.title') }}</router-link></a-breadcrumb-item><a-breadcrumb-item>{{ t('parts.partDetailTitle') }}</a-breadcrumb-item></a-breadcrumb></nav>
      <template v-if="detail">
        <section v-if="route.query.mode === 'approval'" class="region"><h3>{{ t('parts.approve') }}</h3><a-form :model="{ approvalOpinion }" layout="vertical"><a-form-item :label="t('parts.approvalDecision')"><a-radio-group v-model="approvalDecision"><a-radio value="approved">{{ t('parts.approved') }}</a-radio><a-radio value="rejected">{{ t('parts.rejected') }}</a-radio></a-radio-group></a-form-item><a-form-item required :label="t('parts.approvalOpinion')" :validate-status="approvalError ? 'error' : undefined" :help="approvalError ? t('parts.required') : ''"><a-textarea id="part-approval-opinion" v-model="approvalOpinion" :max-length="500" show-word-limit /></a-form-item><a-button type="primary" :loading="approvalBusy" @click="approvePart">{{ t('parts.submitApproval') }}</a-button></a-form></section>
        <section class="region"><div class="block-title"><h3>{{ t('parts.basic') }}</h3><a-tag v-if="detail.status" :color="PART_STATUS_COLOR[String(detail.status)] || 'gray'" class="detail-status">{{ t(`parts.projectStatuses.${detail.status}`) }}</a-tag></div><a-descriptions :column="{ xs: 1, sm: 2, lg: 3 }" layout="vertical">
          <a-descriptions-item v-for="field in ['code', ...fields] as const" :key="field"><template #label><span class="app-detail-label">{{ t(`parts.${field}`) }}</span></template>{{ field === 'level' ? levelLabel(t, detail.level) : field === 'development' ? developmentLabel(t, detail.development) : detail[field] || '—' }}</a-descriptions-item>
        </a-descriptions></section>
        <section class="region"><h3>{{ t('parts.versions') }}</h3><div class="version-layout">
          <aside class="hardware"><div class="hardware-toolbar"><span>{{ t('parts.hardware') }}</span><a-button type="primary" @click="openVersion('hardware')"><IconPlus />{{ t('parts.add') }}</a-button></div>
            <div v-for="hw in detail.hardware" :key="hw.id" class="hardware-item" :class="{ selected: hw.id === hardware?.id }"><button type="button" :aria-pressed="hw.id === hardware?.id" @click="selectedHardware = hw.id">{{ hw.name }}<small>{{ t('parts.softwareCount', { count: hw.software.length }) }}</small></button><a-button type="text" status="danger" @click="deletingHardware = hw">{{ t('parts.delete') }}</a-button></div>
            <a-empty v-if="!detail.hardware.length" :description="t('parts.empty')" />
          </aside>
          <div class="software"><div class="software-toolbar"><span>{{ t('parts.software') }}<span v-if="hardware" class="hardware-summary">{{ hardware.name }}<span v-if="hardware.note"> · {{ hardware.note }}</span></span></span><a-button v-if="software" @click="selectedSoftware = ''">{{ t('parts.versionList') }}</a-button><a-button type="primary" :disabled="!hardware" @click="openVersion('software')">{{ t('parts.addSoftware') }}</a-button></div>
            <div class="software-grid"><article v-for="sw in (software ? [software] : hardware?.software)" :key="sw.id" class="software-card version-card" :class="{ selected: software?.id === sw.id }" tabindex="0" role="button" :aria-label="sw.name" :aria-pressed="software?.id === sw.id" @click="selectedSoftware = sw.id" @keydown.enter.prevent="selectedSoftware = sw.id" @keydown.space.prevent="selectedSoftware = sw.id"><div class="toolbar"><span class="software-name">{{ sw.name }}</span><span v-if="software?.id === sw.id" class="selected-label">{{ t('parts.selectedVersion') }}</span><a-tag :color="sw.scan === 'failed' ? 'red' : sw.scan === 'available' ? 'green' : 'gray'">{{ scanLabel(t, sw.scan) }}</a-tag></div><p><span class="app-detail-label">{{ t('parts.interfaces') }}</span><a-tag v-for="item in sw.interfaces" :key="item">{{ item }}</a-tag><span v-if="!sw.interfaces.length">—</span></p><p><span class="app-detail-label">{{ t('parts.protocols') }}</span><a-tag v-for="item in sw.protocols" :key="item">{{ item }}</a-tag><span v-if="!sw.protocols.length">—</span></p><p v-if="sw.fileName">{{ sw.fileName }}</p></article></div>
            <section v-if="software" class="software-config">
              <h3>{{ t('parts.configuration') }} · {{ software.name }}</h3>
              <div class="software-grid">
                <section class="software-card"><label class="app-field-label" for="software-interfaces">{{ t('parts.interfaces') }}</label><a-checkbox-group id="software-interfaces" v-model="software.interfaces" :options="INTERFACE_CODES" :aria-label="t('parts.interfaces')" /></section>
                <section class="software-card"><label class="app-field-label" for="software-protocols">{{ t('parts.protocols') }}</label><a-checkbox-group id="software-protocols" v-model="software.protocols" :options="PROTOCOL_CODES" :aria-label="t('parts.protocols')" /></section>
              </div>
              <section class="software-card sbom-section">
                <div class="toolbar"><span>{{ t('parts.sbomComponents') }}</span><a-space wrap><a-button @click="progressVisible = true">{{ t('parts.viewProgress') }}</a-button><a-upload :show-file-list="false" accept=".json,.bin,.zip,.hex" :on-before-upload="replaceSbom"><template #upload-button><a-button>{{ t('parts.reupload') }}</a-button></template></a-upload></a-space></div>
                <p><span class="app-detail-label">{{ t('parts.scanStatus') }}</span>{{ scanLabel(t, software.scan) }}<span v-if="software.fileName"> · {{ software.fileName }}</span></p>
                <a-table :columns="sbomColumns" :data="pagedComponents" row-key="id" :pagination="false" :bordered="false" :scroll="{ x: 600 }" /><AppPagination v-model:current="sbomPage" v-model:page-size="sbomPageSize" :total="sbomComponents.length" />
              </section>
            </section>
            <a-empty v-if="!hardware?.software.length" :description="t('parts.empty')" />
          </div>
        </div></section>
        <section class="region"><h3>{{ t('parts.relatedProjects') }}</h3><a-table :columns="projectColumns" :data="detail.relatedProjects ?? []" :pagination="false" :bordered="false" :scroll="{ x: 1150 }" row-key="id"><template #priority="{ record }">{{ t(`parts.projectPriorities.${record.priority}`) }}</template><template #status="{ record }">{{ t(`parts.projectStatuses.${record.status}`) }}</template><template #actions="{ record }"><router-link :to="`/data/parts/${detail.id}/relations/projects/${record.id}`">{{ t('parts.detail') }}</router-link></template><template #empty><a-empty :description="t('parts.noProjects')" /></template></a-table></section>
      </template><a-empty v-else :description="t('parts.missing')" />
    </template>
    <section v-else-if="!initialized && !rows.length" class="initial region">
      <div class="empty-illustration" aria-hidden="true"><div class="empty-sheet"><div class="empty-top"/><div v-for="n in 3" :key="n" class="empty-line"><img :src="emptyDot" alt="" /><span /></div></div></div>
      <p>{{ t('parts.initialHelp') }}</p><a-space wrap><a-button type="primary" @click="custom = false; open()">{{ t('parts.direct') }}</a-button><a-button @click="openRule">{{ t('parts.customRule') }}</a-button></a-space>
    </section>
    <template v-else>
      <!-- 筛选条件（2026-11-09 用户裁决）：字段名在上、控件在下（12px / 4px / 左对齐 / 200px），
           查询/重置/筛选设置紧跟最后一个组件右侧，整体 16px 栅栏左对齐 -->
      <form class="region filters" @submit.prevent="applyFilters">
        <div v-for="key in visibleFilterKeys" :key="key" class="parts-filter-field">
          <label class="app-field-label" :for="`parts-${key}-filter`">{{ t(`parts.${key}`) }}</label>
          <a-input v-if="key === 'code'" id="parts-code-filter" v-model="query.code" class="parts-filter-control app-filter-control" allow-clear :placeholder="t('parts.input')" />
          <a-input v-else-if="key === 'name'" id="parts-name-filter" v-model="query.name" class="parts-filter-control app-filter-control" allow-clear :placeholder="t('parts.input')" />
          <a-select v-else id="parts-supplier-filter" v-model="query.supplier" class="parts-filter-control app-filter-control" :options="suppliers" allow-clear :aria-label="t('parts.supplier')" :placeholder="t('parts.all')" />
        </div>
        <a-button type="primary" html-type="submit"><template #icon><IconSearch :size="16" /></template>{{ t('parts.search') }}</a-button>
        <a-button class="app-btn-neutral" html-type="button" @click="resetFilters"><template #icon><IconRefresh :size="16" /></template>{{ t('parts.reset') }}</a-button>
        <ColumnSettingsPopover v-model:visible="filterSettingsOpen" :items="filterSettingsItems" :default-items="defaultFilterItems" :title="t('parts.filterSettings')" :list-aria-label="t('parts.filterSettings')" :show-label="t('parts.show')" :restore-label="t('parts.restore')" @change="onFilterSettingsChanged">
          <a-tooltip :content="t('parts.filterSettings')"><a-button class="app-btn-neutral parts-icon-button" html-type="button" :aria-label="t('parts.filterSettings')"><IconFilter :size="16" /></a-button></a-tooltip>
        </ColumnSettingsPopover>
      </form>
      <!-- 数据列表（DESIGN.md · Enterprise list presentation / Row action overflow / Pagination） -->
      <section class="region parts-list" role="region" :aria-label="t('parts.listTitle')">
        <div class="parts-list-actions"><a-space wrap>
            <a-button type="primary" @click="open()"><template #icon><IconPlus :size="16" /></template>{{ t('parts.create') }}</a-button><a-button class="app-btn-neutral" :disabled="transferBusy" @click="openImport"><template #icon><IconUpload :size="16" /></template>{{ t('parts.import') }}</a-button><a-button class="app-btn-neutral" @click="requestExport"><template #icon><IconDownload :size="16" /></template>{{ t('parts.export') }}</a-button></a-space>
            <ColumnSettingsPopover v-model:visible="columnSettingsOpen" :items="columnSettingsItems" :default-items="defaultColumnItems" :title="t('parts.columnSettings')" :list-aria-label="t('parts.columnSettings')" :show-label="t('parts.show')" :restore-label="t('parts.restore')" @change="onColumnSettingsChanged">
              <a-tooltip :content="t('parts.columnSettings')"><a-button class="app-btn-neutral parts-icon-button" :aria-label="t('parts.columnSettings')"><IconSettings :size="16" /></a-button></a-tooltip>
            </ColumnSettingsPopover>
        </div>
        <a-table class="parts-table" :columns="columns" :data="pagedRows" row-key="id" :bordered="false" :stripe="false" :pagination="false" :scroll="{ x: horizontalWidth }"><template #level="{ record }">{{ levelLabel(t, record.level) }}</template><template #actions="{ record }"><div class="parts-row-actions"><a-link @click="router.push(`/data/parts/${record.id}`)">{{ t('parts.detail') }}</a-link><a-link @click="open(record)">{{ t('parts.edit') }}</a-link><a-dropdown :trigger="['hover', 'click']" position="br" popup-container="body" content-class="row-more-dropdown" arrow-class="row-more-arrow" show-arrow><button type="button" class="parts-row-more" :aria-label="t('parts.more')" :title="t('parts.more')"><IconMore :size="16" /></button><template #content><a-doption @click="router.push({ path: `/data/parts/${record.id}`, query: { mode: 'approval' } })">{{ t('parts.approve') }}</a-doption><a-doption class="row-more-danger" @click="deleting = record">{{ t('parts.delete') }}</a-doption></template></a-dropdown></div></template><template #empty><a-empty :description="t('parts.noMatch')" /></template></a-table>
        <AppPagination v-model:current="page" v-model:page-size="pageSize" :total="filtered.length" />
      </section>
    </template>
    <a-drawer :visible="drawer" :width="'min(500px, 100vw)'" :title="t(form.id ? 'parts.editTitle' : 'parts.create')" class="parts-form-drawer" :mask-closable="false" :esc-to-close="true" @cancel="closeDrawer" @ok="save">
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical" class="part-form" scroll-to-first-error>
        <a-form-item v-if="custom && !form.id && lockedSegments.some(segment => segment.kind === 'variable')">
          <template #label><span class="part-required" aria-hidden="true">*</span><span class="app-field-label">{{ t('parts.code') }}</span></template>
          <div class="part-code-editor" role="group" :aria-label="t('parts.code')">
            <template v-for="(segment, index) in lockedSegments" :key="segment.id">
              <span v-if="index > 0" class="part-code-separator" aria-hidden="true">{{ lockedSeparator }}</span>
              <a-input v-if="segment.kind === 'variable' && index === firstVariableIndex" v-model="variable" class="part-code-segment part-code-variable" :placeholder="t('parts.variablePlaceholder')" :max-length="20" :input-attrs="{ 'aria-label': t('parts.variable'), 'aria-required': 'true' }" />
              <span v-else-if="segment.kind === 'variable'" class="part-code-segment part-code-fixed">{{ variable.trim() || t('parts.variable') }}</span>
              <span v-else class="part-code-segment part-code-fixed">{{ segment.value }}</span>
            </template>
            <span class="part-code-separator" aria-hidden="true">{{ lockedSeparator }}</span>
            <span class="part-code-segment part-code-fixed">{{ String(serial).padStart(lockedDigits, '0') }}</span>
          </div>
        </a-form-item>
        <a-form-item v-for="field in fields" :key="field" :field="field"><template #label><span class="app-field-label">{{ t(`parts.${field}`) }}</span></template>
          <a-select v-if="field === 'level'" v-model="form.level" :options="LEVEL_CODES.map(value => ({ value, label: levelLabel(t, value) }))" :placeholder="t('parts.select')" />
          <a-select v-else-if="field === 'development'" v-model="form.development" :options="DEVELOPMENT_CODES.map(value => ({ value, label: developmentLabel(t, value) }))" :placeholder="t('parts.select')" />
          <a-select v-else-if="field === 'supplier'" v-model="form.supplier" :options="suppliers" allow-clear :placeholder="t('parts.select')" />
          <a-input v-else v-model="form[field]" :max-length="field === 'abbreviation' ? 20 : 100" show-word-limit :placeholder="t('parts.input')" />
        </a-form-item>
      </a-form>
      <template #footer>
        <div class="parts-drawer-footer">
          <a-button class="app-btn-neutral" @click="closeDrawer">{{ t('parts.cancel') }}</a-button>
          <a-button type="primary" @click="save">{{ t('parts.confirm') }}</a-button>
        </div>
      </template>
    </a-drawer>
    <a-drawer :visible="ruleVisible" :title="t('parts.customRule')" :width="500" class="parts-rule-drawer" :mask-closable="true" :esc-to-close="true" @cancel="closeRule">
      <section class="rule-section">
        <h4 class="rule-section-title">{{ t('parts.basicConfig') }}</h4>
        <div class="rule-row">
          <span class="rule-row-label"><span class="rule-required" aria-hidden="true">*</span><span class="app-field-label">{{ t('parts.separator') }}</span></span>
          <a-radio-group v-model="separator" class="rule-radios" :options="['-', '_', '/']" :aria-label="t('parts.separator')" />
        </div>
        <div class="rule-row">
          <span class="rule-row-label"><span class="rule-required" aria-hidden="true">*</span><span class="app-field-label">{{ t('parts.digits') }}</span></span>
          <a-radio-group v-model="digits" class="rule-radios" :options="digitOptions" :aria-label="t('parts.digits')" />
        </div>
      </section>
      <section class="rule-section">
        <h4 class="rule-section-title">{{ t('parts.ruleSection') }}</h4>
        <div class="rule-actions">
          <a-button v-for="kind in ['fixed', 'variable', 'year'] as const" :key="kind" class="rule-add" @click="addSegment(kind)"><IconPlus />{{ t(`parts.${kind}`) }}</a-button>
        </div>
        <div class="segments">
          <div v-for="segment in segments" :key="segment.id" class="segment">
            <div class="segment-head"><span class="segment-title">{{ t(`parts.${segment.kind}`) }}</span><button type="button" class="segment-remove" :aria-label="t('parts.removeSegment')" @click="segments = segments.filter(item => item.id !== segment.id)">×</button></div>
            <a-input v-model="segment.value" :max-length="20" :disabled="segment.kind === 'year'" :aria-label="t(`parts.${segment.kind}`)" />
          </div>
          <div class="segment">
            <div class="segment-head"><span class="segment-title">{{ t('parts.sequence') }}</span></div>
            <a-input :model-value="'1'.padStart(digits, '0')" disabled :aria-label="t('parts.sequence')" />
          </div>
        </div>
        <p class="rule-preview"><span class="app-field-label">{{ t('parts.preview') }}</span>{{ preview }}</p>
      </section>
      <template #footer><a-space><a-button class="app-btn-neutral" @click="closeRule">{{ t('parts.cancel') }}</a-button><a-button type="primary" @click="configure">{{ t('parts.confirm') }}</a-button></a-space></template>
    </a-drawer>
    <ConfirmDialog v-model:visible="ruleDiscard" :title="t('parts.discard')" @confirm="discardRule" />
    <a-modal v-model:visible="versionVisible" :title="t(versionKind === 'hardware' ? 'parts.addHardware' : 'parts.addSoftware')" :width="560" :on-before-ok="saveVersion"><a-form ref="versionFormRef" :model="version" :rules="versionRules" layout="vertical" scroll-to-first-error><a-form-item field="name" required><template #label><span class="app-field-label">{{ t(versionKind === 'hardware' ? 'parts.hardware' : 'parts.software') }}</span></template><a-input v-model="version.name" :max-length="40" :placeholder="t('parts.input')" /></a-form-item><a-form-item v-if="versionKind === 'hardware'"><template #label><span class="app-field-label">{{ t('parts.note') }}</span></template><a-textarea v-model="version.note" :max-length="500" show-word-limit /></a-form-item><template v-else><a-form-item v-for="field in ['interfaces', 'protocols'] as const" :key="field"><template #label><span class="app-field-label">{{ t(`parts.${field}`) }}</span></template><a-select v-model="version[field]" multiple :options="field === 'interfaces' ? INTERFACE_CODES : PROTOCOL_CODES" /></a-form-item><a-form-item><template #label><span class="app-field-label">{{ t('parts.sbomMethod') }}</span></template><a-radio-group v-model="version.method" @change="version.fileName = ''"><a-radio value="json">{{ t('parts.json') }}</a-radio><a-radio value="firmware">{{ t('parts.firmware') }}</a-radio></a-radio-group></a-form-item><a-upload :key="version.method" draggable :accept="version.method === 'json' ? '.json' : '.bin,.zip,.hex'" :auto-upload="true" :show-file-list="false" :on-before-upload="upload" /><p>{{ version.fileName || t('parts.fileHelp') }}</p></template></a-form></a-modal>
    <a-modal v-model:visible="progressVisible" :title="t('parts.viewProgress')" :footer="false"><a-descriptions :column="1"><a-descriptions-item :label="t('parts.software')">{{ software?.name }}</a-descriptions-item><a-descriptions-item :label="t('parts.scanStatus')">{{ software ? scanLabel(t, software.scan) : '—' }}</a-descriptions-item><a-descriptions-item :label="t('parts.sbomMethod')">{{ software?.method ? t(software.method === 'json' ? 'parts.json' : 'parts.firmware') : '—' }}</a-descriptions-item></a-descriptions></a-modal>
    <ConfirmDialog v-model:visible="discard" :title="t('parts.discard')" @confirm="confirmDiscard" />
    <ConfirmDialog :visible="!!deleting" :title="t('parts.confirmDeleteNamed', { name: deleting?.name ?? '' })" :description="t('parts.deleteCaution')" @update:visible="deleting = undefined" @confirm="remove" />
    <ConfirmDialog :visible="!!deletingHardware" :title="t('parts.confirmDeleteHardware')" :description="deletingHardware ? t('parts.deleteHardwareDescription', { name: deletingHardware.name }) : ''" @update:visible="deletingHardware = undefined" @confirm="removeHardware" />
    <a-drawer class="app-import-drawer" :visible="importOpen" :width="'min(560px, 100vw)'" :title="t('batchImport.title')" :mask-closable="!transferBusy" :esc-to-close="!transferBusy" :closable="!transferBusy" @cancel="!transferBusy && (importOpen = false)">
      <div class="app-import-block">
        <input ref="importFileInput" type="file" accept=".xlsx" hidden @change="selectImportFile(($event.target as HTMLInputElement).files?.[0])" />
        <div class="app-import-target" :class="{ 'is-dragging': importDragging }" role="button" tabindex="0" :aria-label="t('batchImport.upload')" @click="chooseImportFile" @keydown.enter.prevent="chooseImportFile" @keydown.space.prevent="chooseImportFile" @dragover.prevent="!transferBusy && (importDragging = true)" @dragleave="importDragging = false" @drop.prevent="selectImportFile($event.dataTransfer?.files[0])">
          <IconFolder :size="32" />
          <p class="app-import-target-name">{{ importFile?.name || t('batchImport.hint') }}</p>
          <a-button type="primary" :disabled="transferBusy" @click.stop="chooseImportFile">{{ t(importFile ? 'batchImport.reupload' : 'batchImport.upload') }}</a-button>
        </div>
        <a-alert v-if="importError" type="error" role="alert">{{ importError }}</a-alert>
        <div class="app-import-notes"><p class="app-import-notes-title">{{ t('batchImport.notesTitle') }}</p><p class="app-import-notes-lines">{{ t('parts.importHelp') }}</p></div>
        <a-button type="text" class="app-import-template" :loading="partTemplatePreparing" :disabled="partTemplatePreparing || transferBusy" @click="partTemplateUrl ? downloadPartTemplate() : preparePartTemplate()">
          <template #icon><IconDownload :size="16" /></template>{{ t(partTemplatePreparing ? 'batchImport.templatePreparing' : partTemplateUrl ? 'batchImport.template' : 'batchImport.templateRetry') }}
        </a-button>
      </div>
      <template #footer><a-space :size="12"><a-button class="app-btn-neutral" :disabled="transferBusy" @click="importOpen = false">{{ t('batchImport.cancel') }}</a-button><a-button type="primary" :loading="transferBusy" :disabled="!importFile || !importFile.name.toLowerCase().endsWith('.xlsx')" @click="submitImport">{{ t('batchImport.confirm') }}</a-button></a-space></template>
    </a-drawer>
    <ConfirmDialog v-model:visible="exportOpen" icon="info" :title="t('parts.exportTitle')" :description="[t('parts.exportScope'), t('parts.exportDestination')]" :ok-text="t('parts.exportConfirm')" :ok-loading="transferBusy" :dismissible="!transferBusy" @confirm="exportData" />
  </main>
</template>

<style scoped>
.parts-page { display: grid; gap: 16px; min-width: 0; }
.region { padding: 16px; background: var(--app-surface); min-width: 0; }
/* 初始空态白块铺满内容区可用高度：header 56 + 画布上下各 16 = 88，
   因此底边与视口底部始终留 16px，高度随视口自适应。 */
.initial { min-height: calc(100dvh - 88px); display: flex; align-items: center; flex-direction: column; padding-top: clamp(80px, 20vh, 204px); box-sizing: border-box; }
.initial > p { max-width: 520px; text-align: center; color: var(--color-text-3); line-height: 22px; margin: 28px 0 40px; }
.empty-illustration { width: 160px; height: 120px; background: rgb(var(--primary-2)); border-radius: 12px; padding: 10px; box-sizing: border-box; }
.empty-sheet { background: var(--app-surface); height: 100px; border-radius: 8px; overflow: hidden; }
.empty-top { height: 18px; background: rgb(var(--primary-3)); margin-bottom: 14px; }
.empty-line { display: flex; align-items: center; gap: 4px; padding: 0 8px; margin-bottom: 10px; }
.empty-line img { width: 8px; height: 8px; }
.empty-line span { width: 100px; height: 8px; background: var(--color-fill-2); border-radius: 4px; }
.toolbar, .detail-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.detail-toolbar { min-width: 0; margin: 0; justify-content: flex-start; padding: var(--mt-ds-space-4); background: var(--app-surface); border-radius: var(--mt-ds-control-radius); }
.detail-back { display: inline-grid; place-items: center; width: 32px; height: 32px; flex: none; color: var(--color-text-3); border-radius: var(--mt-ds-control-radius); }
.detail-back:hover { color: var(--app-accent); background: var(--color-fill-2); }
.detail-back:focus-visible { outline: 2px solid var(--app-accent); }
.detail-toolbar .arco-breadcrumb a { color: var(--color-text-3); }
.detail-toolbar .arco-breadcrumb a:hover { color: var(--app-accent); }
h3 { margin: 0 0 16px; font-size: 16px; }
/* 新增/编辑抽屉表单：白色业务卡片承载（Fill-1 画布 + 白卡，DESIGN.md · Business-drawer surface），
   字段名沿用共享 .app-field-label（带冒号，字号由表单标签决定），控件占满卡片宽度。 */
.part-form { display: flex; flex-direction: column; gap: 16px; width: 100%; max-width: 100%; padding: 16px; background: var(--app-surface); border-radius: 2px; }
.part-form :deep(.arco-form-item) { margin-bottom: 0; }
.part-form :deep(.arco-form-item-label) { margin-bottom: 4px; padding: 0; }
.part-form :deep(.arco-input-wrapper), .part-form :deep(.arco-select-view) { width: 100%; }
/* 固定底部操作栏：取消（中性）+ 确定（主操作），右对齐 */
.parts-drawer-footer { display: flex; justify-content: flex-end; gap: 12px; }
/* 自定义编号 · 零部件编号（必填）：分段式编号条（2026-11-11 用户裁决，参考图）。
   只读段是静态文本块（灰底、中性描边、次级文字），只有「可变字符」段是真正的输入框：
   默认白底 + 中性 1px 描边（不高亮），获取焦点时才切到主题色双线高亮描边，
   与截图的聚焦态一致；保留 12px 左右内距，避免提示语贴住边框。
   符合 Business-drawer surface 的 editable/disabled 契约；整条横向排列且窄屏可换行不溢出。 */
.part-required { margin-right: 4px; color: rgb(var(--danger-6)); font-size: 14px; line-height: 22px; }
.part-code-editor { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; width: 100%; min-width: 0; }
.part-form .part-code-editor :deep(.part-code-separator) { flex: none; color: var(--color-text-3); font-size: 14px; line-height: 32px; }
.part-form .part-code-editor :deep(.part-code-segment) { flex: none; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; height: 32px; min-width: 56px; padding: 0 12px; border: 1px solid var(--app-control-border); border-radius: var(--app-radius-control); background: var(--app-fill-2); color: var(--color-text-3); font-size: 14px; line-height: 22px; white-space: nowrap; }
.part-form .part-code-editor :deep(.part-code-variable) { flex: 1 1 140px; width: auto; min-width: 140px; justify-content: flex-start; padding: 0 12px; border-color: var(--app-control-border); background: var(--app-surface); box-shadow: none; }
.part-form .part-code-editor :deep(.part-code-variable:focus-within) { border-color: var(--app-accent); box-shadow: inset 0 0 0 1px var(--app-accent); }
.part-form .part-code-editor :deep(.part-code-variable .arco-input) { color: var(--color-text-1); font-size: 14px; }
.part-form .part-code-editor :deep(.part-code-variable .arco-input::placeholder) { color: var(--color-text-3); }
.version-layout { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 20px; }
.hardware { background: var(--color-fill-1); padding: 12px; }
.hardware-item { display: flex; align-items: center; border: 1px solid var(--color-border-2); margin-bottom: 12px; padding: 8px; border-radius: var(--app-radius-control); }
.hardware-item.selected { border-color: rgb(var(--primary-6)); background: var(--app-surface); }
.hardware-item > button:first-child { background: transparent; border: 0; color: var(--color-text-1); text-align: left; cursor: pointer; flex: 1; }
.hardware-item small { display: block; color: var(--color-text-3); margin-top: 8px; }
.software-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.software-card { padding: 16px; border: 1px solid var(--color-border-2); border-radius: var(--app-radius-control); overflow-wrap: anywhere; }
.software { min-width: 0; }
.hardware-summary { margin-left: var(--mt-ds-space-4); color: var(--color-text-3); }
.software-config { margin-top: var(--mt-ds-space-4); padding: var(--mt-ds-space-4); background: var(--color-fill-1); }
.software-config .software-card { background: var(--app-surface); }
.software-config label { display: block; margin-bottom: var(--mt-ds-space-2); }
.sbom-section { margin-top: var(--mt-ds-space-4); }
.software-card.selected { border-color: var(--app-accent); background: var(--color-primary-light-1); }
.software-grid:has(.selected) { grid-template-columns: minmax(0, 1fr); }
.parts-detail-page :deep(.arco-table) { max-width: 100%; min-width: 0; }
.parts-detail-page .region { border-radius: var(--mt-ds-control-radius); }
.parts-detail-page h3 { font-size: var(--mt-ds-font-title); line-height: var(--mt-ds-line-title); font-weight: var(--mt-ds-weight-title); }
.parts-detail-page :deep(.arco-descriptions-item-label), .parts-detail-page :deep(.arco-descriptions-item-value), .parts-detail-page :deep(.arco-table-th), .parts-detail-page :deep(.arco-table-td) { font-weight: var(--mt-ds-weight-body); }
.parts-detail-page :deep(.arco-descriptions-item-label) { padding-bottom: var(--mt-ds-space-1); color: var(--color-text-3); }
.hardware-toolbar { display: grid; gap: var(--mt-ds-space-3); margin-bottom: var(--mt-ds-space-4); }
.hardware-toolbar > span { color: var(--color-text-3); }
.software-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: var(--mt-ds-space-3); margin-bottom: var(--mt-ds-space-4); }
.software-toolbar > span { flex: 1; min-width: 0; }
.hardware-summary { display: inline; overflow-wrap: anywhere; }
.version-card { cursor: pointer; }
.version-card:hover { border-color: var(--app-accent); }
.version-card:focus-visible { outline: 2px solid var(--app-accent); outline-offset: 2px; }
.software-name { font-size: var(--mt-ds-font-title); font-weight: var(--mt-ds-weight-body); }
.selected-label { color: var(--app-accent); font-weight: var(--mt-ds-weight-body); margin-right: auto; }
.parts-detail-page .hardware { border-radius: var(--mt-ds-control-radius); padding: var(--mt-ds-space-4); }
.parts-detail-page a { color: var(--app-accent); }
.software-card .arco-tag { margin: 4px; }
/* 详情面包屑（与证书/法规模块对齐）：返回按钮默认灰色 + hover 高亮；
   上一级模块文本灰色 + hover 高亮；二级页面名称黑色。基础信息标题右侧状态标签。 */
.parts-detail-page .detail-back { color: var(--color-text-3); }
.parts-detail-page .detail-back:hover { color: var(--app-accent); }
.parts-detail-page .detail-toolbar .arco-breadcrumb a { color: var(--color-text-3); }
.parts-detail-page .detail-toolbar .arco-breadcrumb a:hover { color: var(--app-accent); }
.parts-detail-page .detail-toolbar .arco-breadcrumb-item:last-child { color: var(--color-text-1); }
.block-title { display: flex; align-items: center; gap: var(--mt-ds-space-2); margin: 0 0 16px; }
.block-title h3 { margin: 0; }
.detail-status { flex: none; }
@media (max-width: 1000px) { .software-grid { grid-template-columns: 1fr; } }
@media (max-width: 760px) { .version-layout { grid-template-columns: 1fr; } .initial { padding-top: 80px; } }
</style>

<style scoped>
/* 筛选条（2026-11-09 用户裁决）：字段名在上、控件在下，左对齐，12px 字段名带冒号、
   4px 标签/控件间距、200px 控件、16px 栅栏；查询/重置/筛选设置紧跟最后一个组件右侧。 */
.filters, .parts-list { border-radius: var(--mt-ds-control-radius); }
.filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--mt-ds-space-4); }
.parts-filter-field { display: grid; grid-template-columns: minmax(0, var(--mt-ds-filter-width)); align-items: start; justify-items: start; gap: var(--mt-ds-space-1); min-width: 0; }
.parts-filter-field .app-field-label { font-size: var(--mt-ds-font-caption); font-weight: var(--mt-ds-weight-body); line-height: var(--mt-ds-line-caption); text-align: left; padding: 0; white-space: nowrap; }
.filters :deep(.parts-filter-control) { width: var(--mt-ds-filter-width); max-width: 100%; }
.filters > :deep(.arco-btn) { flex: 0 0 auto; }
.parts-icon-button { display: inline-grid; width: 32px; height: 32px; padding: 0; place-items: center; }

/* 表格：白底、无外框、无斑马纹、行间单线分隔，表头/单元格统一 400 字重
   （DESIGN.md · Table / Enterprise list presentation / Data-list text weight）。 */
.parts-list-actions { justify-content: space-between; display: flex; align-items: center; gap: var(--mt-ds-space-3); margin-bottom: var(--mt-ds-space-3); flex-wrap: wrap; }
.parts-list :deep(.arco-table), .parts-list :deep(.arco-table-container) { border: 0; }
.parts-list :deep(thead) { background: var(--app-table-header); }
.parts-list :deep(.arco-table-th) { height: 44px; padding: 0 12px; border-bottom: 1px solid var(--app-divider); color: var(--color-text-1); background: var(--app-table-header); font-size: var(--mt-ds-font-body); font-weight: var(--mt-ds-weight-body); line-height: var(--mt-ds-line-body); text-align: left; white-space: nowrap; }
.parts-list :deep(.arco-table-td) { height: 52px; padding: 8px 12px; border-bottom: 1px solid var(--app-divider); color: var(--color-text-1); background: var(--app-surface); font-size: var(--mt-ds-font-body); font-weight: var(--mt-ds-weight-body); line-height: var(--mt-ds-line-body); text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.parts-list :deep(.arco-table-tr:hover .arco-table-td) { background: var(--color-fill-1); }
.parts-list :deep(.arco-link), .parts-list :deep(.arco-tag) { font-weight: var(--mt-ds-weight-body); }

/* 行操作：前两个文本链接直显，其余收进 24px「…」气泡（DESIGN.md · Row action overflow）。 */
.parts-row-actions { display: inline-flex; align-items: center; gap: var(--mt-ds-space-3); }
.parts-row-actions > a { color: var(--app-accent); font-weight: var(--mt-ds-weight-body); text-decoration: none; }
.parts-row-actions > a:hover { text-decoration: underline; }
.parts-row-more { display: inline-grid; width: 24px; height: 24px; padding: 0; place-items: center; border: 0; border-radius: var(--mt-ds-control-radius); background: transparent; color: var(--color-text-3); cursor: pointer; }
.parts-row-more:hover { background: var(--color-fill-1); color: var(--color-text-2); }
.parts-row-more:focus-visible { outline: 2px solid var(--app-accent); outline-offset: 2px; }

/* 窄屏：每个筛选单元独占一行、控件占满可用宽度（DESIGN.md · Filter geometry）。 */
@media (max-width: 760px) {
  .filters { align-items: stretch; }
  .parts-filter-field { grid-template-columns: minmax(0, 1fr); width: 100%; }
  .filters :deep(.parts-filter-control) { width: 100%; max-width: 100%; }
}
</style>

<!-- a-modal 会把容器 teleport 到 body，scoped 规则覆盖不到 header / footer / Arco 按钮，
     因此弹窗外壳样式用唯一的 .parts-rule-drawer 前缀做全局限定。 -->
<style>
.parts-rule-drawer { max-width: 100vw; }
.parts-rule-drawer .arco-drawer-body { background: var(--mt-fill-1); padding: var(--mt-ds-space-4); }
.parts-rule-drawer .rule-section { padding: var(--mt-ds-space-4); background: var(--app-surface); border-radius: var(--mt-ds-control-radius); }
.parts-rule-drawer .arco-drawer-header { padding: 0 20px; border-bottom: 1px solid var(--app-divider); }

.parts-rule-drawer .arco-drawer-footer { padding: 16px 20px 20px; border-top: 1px solid var(--app-divider); }
.parts-rule-drawer .arco-drawer-footer .arco-btn { height: 32px; min-width: 64px; border-radius: var(--app-radius-control); font-size: 14px; }
.parts-rule-drawer .arco-drawer-footer .arco-btn:not(.arco-btn-primary) { border: 1px solid var(--color-border-2); background: var(--app-surface); color: var(--color-text-1); }
.parts-rule-drawer .arco-drawer-footer .arco-btn-primary { min-width: 64px; }
.parts-rule-drawer .rule-section + .rule-section { margin-top: var(--mt-ds-space-4); }
.parts-rule-drawer .rule-section-title { margin: 0 0 12px; font-size: 16px; font-weight: 600; line-height: 24px; }
.parts-rule-drawer .rule-row { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; margin-bottom: 16px; }
.parts-rule-drawer .rule-row:last-child { margin-bottom: 0; }
.parts-rule-drawer .rule-row-label { display: inline-flex; flex: none; align-items: center; gap: 4px; font-size: 14px; }
.parts-rule-drawer .rule-required { color: rgb(var(--danger-6)); }
.parts-rule-drawer .rule-radios { display: inline-flex; flex-wrap: wrap; gap: 16px; }
.parts-rule-drawer .rule-radios .arco-radio { margin-right: 0; font-size: 14px; }
.parts-rule-drawer .rule-actions { display: flex; flex-wrap: wrap; gap: 16px; }
.parts-rule-drawer .rule-add { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: auto; padding: 0 12px; height: 32px; border: 1px solid var(--app-accent); border-radius: var(--app-radius-control); background: var(--app-surface); color: var(--app-accent); font-size: 14px; }
.parts-rule-drawer .rule-add:hover { border-color: rgb(var(--primary-5)); background: var(--app-surface); color: rgb(var(--primary-5)); }
.parts-rule-drawer .rule-add:active { border-color: rgb(var(--primary-7)); background: var(--app-surface); color: rgb(var(--primary-7)); }
/* 四个编号段统一结构、等宽等距：流水号不再因缺少删除按钮而少一行标题，
   输入框位置与固定年份卡片完全对齐。 */
.parts-rule-drawer .segments { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 16px; }
.parts-rule-drawer .segment { min-width: 0; padding: 12px; border: 1px solid var(--color-border-2); border-radius: var(--app-radius-control); background: var(--app-surface); }
.parts-rule-drawer .segment-head { display: flex; align-items: center; justify-content: space-between; min-height: 24px; margin-bottom: 12px; }
.parts-rule-drawer .segment-title { color: var(--color-text-3); font-size: 14px; }
.parts-rule-drawer .segment-remove { padding: 0 4px; border: 0; background: transparent; color: rgb(var(--danger-6)); font-size: 18px; line-height: 24px; cursor: pointer; }
.parts-rule-drawer .segment .arco-input-wrapper { height: 32px; border-radius: var(--app-radius-control); }
.parts-rule-drawer .segment .arco-input-wrapper.arco-input-disabled { background: var(--color-fill-1); }
.parts-rule-drawer .rule-preview { margin: 24px 0 0; padding: 12px 16px; border-radius: var(--app-radius-control); background: var(--color-fill-1); font-size: 14px; line-height: 24px; overflow-wrap: anywhere; }
@media (max-width: 900px) {
  .parts-rule-drawer .arco-drawer-header, .parts-rule-drawer .arco-drawer-body, .parts-rule-drawer .arco-drawer-footer { padding-left: 20px; padding-right: 20px; }
  .parts-rule-drawer .segments { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 560px) {
  .parts-rule-drawer .segments { grid-template-columns: minmax(0, 1fr); }
  .parts-rule-drawer .rule-add { width: 100%; }
  .parts-rule-drawer .rule-row { align-items: flex-start; flex-direction: column; gap: 8px; }
}
</style>
